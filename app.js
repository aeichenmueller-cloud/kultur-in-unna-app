var eventDaten = [], gastroDaten = [], vereinsDaten = [], hotelsDaten = [], gesundheitDaten = [];
var currentDayFilter = 'all';
var userLat = null, userLon = null;
var leafletMap = null;
var mapInitialized = false;

// Globale Favoriten-Liste und Leaflet Layer Groups
var favorites = JSON.parse(localStorage.getItem('unna_favorites') || '[]');
var layerGroups = {}; 

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CORE ---
    const clean = (r) => { 
        if(!r) return ""; 
        let t = r.replace(/<p[^>]*>/g,'').replace(/<\/p>/g,'\n\n').replace(/<br\s*[\/]?>/gi,'\n').replace(/ /g,' '); 
        let d = new DOMParser().parseFromString(t,'text/html'); 
        return d.documentElement.textContent.replace(/&/g,'&amp;').replace(/<[^>]*>?/gm,'').trim(); 
    };

    // --- LIVE STATUS LOGIK ---
    function getLiveStatus(item) {
        if (!item.hoursLive || Object.keys(item.hoursLive).length === 0) return { status: 'unknown' };
        
        const now = new Date(); 
        const currentDay = now.getDay(); 
        const prevDay = (currentDay + 6) % 7; 
        const minsNow = now.getHours() * 60 + now.getMinutes();
        
        let isOpen = false; 
        let closingIn = -1; 
        let closesAt = "";

        const checkPeriod = (startStr, endStr) => {
            let s = parseInt(startStr.split(':')[0]) * 60 + parseInt(startStr.split(':')[1]);
            let e = parseInt(endStr.split(':')[0]) * 60 + parseInt(endStr.split(':')[1]);
            return {s, e};
        };

        for (let period of (item.hoursLive[prevDay] || [])) {
            let p = checkPeriod(...period.split('-'));
            if (p.s > p.e && minsNow < p.e) { 
                isOpen = true; closingIn = p.e - minsNow; closesAt = period.split('-')[1]; 
            }
        }
        
        if (!isOpen) {
            for (let period of (item.hoursLive[currentDay] || [])) {
                let p = checkPeriod(...period.split('-'));
                if (p.s <= p.e) {
                    if (minsNow >= p.s && minsNow < p.e) { 
                        isOpen = true; closingIn = p.e - minsNow; closesAt = period.split('-')[1]; break; 
                    }
                } else { 
                    if (minsNow >= p.s) { 
                        isOpen = true; closingIn = (24 * 60 - minsNow) + p.e; closesAt = period.split('-')[1]; break; 
                    }
                }
            }
        }

        if (isOpen) {
            if (closingIn <= 60) return { status: 'closing', text: `🟠 Schließt in ${closingIn} Min.`, color: '#ffc107' };
            return { status: 'open', text: `🟢 Geöffnet bis ${closesAt} Uhr`, color: '#28a745' };
        }

        let nextOpenDayOffset = -1;
        let nextOpenMins = -1;
        let nextOpenTimeStr = "";
        
        for (let offset = 0; offset < 7; offset++) {
            let checkDay = (currentDay + offset) % 7;
            let periods = item.hoursLive[checkDay] || [];
            
            for (let period of periods) {
                let p = checkPeriod(...period.split('-'));
                if (offset === 0) {
                    if (p.s > minsNow) {
                        if (nextOpenMins === -1 || p.s < nextOpenMins) {
                            nextOpenMins = p.s; nextOpenDayOffset = 0; nextOpenTimeStr = period.split('-')[0];
                        }
                    }
                } else {
                    if (nextOpenMins === -1 || p.s < nextOpenMins) {
                        nextOpenMins = p.s; nextOpenDayOffset = offset; nextOpenTimeStr = period.split('-')[0];
                    }
                }
            }
            if (nextOpenDayOffset !== -1) break; 
        }

        if (nextOpenDayOffset !== -1) {
            let opensInMins = -1;
            if (nextOpenDayOffset === 0) opensInMins = nextOpenMins - minsNow;
            else if (nextOpenDayOffset === 1) opensInMins = (24 * 60 - minsNow) + nextOpenMins;

            if (opensInMins !== -1 && opensInMins <= 60) {
                return { status: 'closed', text: `🔴 Öffnet in ${opensInMins} Min.`, color: '#dc3545' };
            } else if (nextOpenDayOffset === 0) {
                return { status: 'closed', text: `🔴 Öffnet heute um ${nextOpenTimeStr} Uhr`, color: '#dc3545' };
            } else if (nextOpenDayOffset === 1) {
                return { status: 'closed', text: `🔴 Öffnet morgen um ${nextOpenTimeStr} Uhr`, color: '#dc3545' };
            } else {
                const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                let targetDay = (currentDay + nextOpenDayOffset) % 7;
                return { status: 'closed', text: `🔴 Öffnet ${dayNames[targetDay]} um ${nextOpenTimeStr} Uhr`, color: '#dc3545' };
            }
        }
        return { status: 'closed', text: `🔴 Derzeit geschlossen`, color: '#dc3545' };
    }

    // --- PWA INSTALL PROMPT ---
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e;
        const pwaPrompt = document.getElementById('pwa-prompt');
        if(pwaPrompt) pwaPrompt.style.display = 'flex';
    });
    const btnInstallPwa = document.getElementById('btn-install-pwa');
    if(btnInstallPwa) { btnInstallPwa.onclick = () => { if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; document.getElementById('pwa-prompt').style.display = 'none'; }); } }; }
    const btnClosePwa = document.getElementById('btn-close-pwa');
    if(btnClosePwa) { btnClosePwa.onclick = () => { document.getElementById('pwa-prompt').style.display = 'none'; }; }

    // --- 2. UI HANDLER ---
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    const modal = document.getElementById('event-modal');
    const modalBody = document.getElementById('modal-body');
          
    const toggleMenu = (s) => { if(sideMenu) sideMenu.classList.toggle('open', s); if(overlay) overlay.classList.toggle('open', s); };
    document.getElementById('btn-hamburger').onclick = () => toggleMenu(true);
    document.getElementById('btn-close-menu').onclick = () => toggleMenu(false);
    if(overlay) overlay.onclick = () => toggleMenu(false);

    // --- IMPRESSUM ---
    const btnImpressum = document.getElementById('btn-impressum-side');
    if(btnImpressum) {
        btnImpressum.onclick = () => {
            toggleMenu(false); 
            const html = `
                <h2>Impressum &amp; Rechtliche Hinweise</h2>
                <h3 style="margin-top:15px; margin-bottom:5px; font-size:15px;">Herausgeberin</h3>
                <p style="font-size:13px; line-height:1.5; margin-top:0;"><strong>Kreisstadt Unna</strong><br>Rathausplatz 1, 59423 Unna<br>Fon: (02303) 103-0 (Zentrale) | Fax: (02303) 103-9998<br>E-Mail: post(at)stadt-unna.de | Internet: www.unna.de</p>
                <h3 style="margin-top:15px; margin-bottom:5px; font-size:15px;">Vertretungsberechtigter</h3>
                <p style="font-size:13px; line-height:1.5; margin-top:0;"><strong>Bürgermeister Dirk Wigant</strong><br>Rathausplatz 1, 59423 Unna<br>(Die Kreisstadt Unna ist eine Körperschaft des öffentlichen Rechts.)</p>
                <h3 style="margin-top:15px; margin-bottom:5px; font-size:15px;">Verantwortlich nach § 5 DDG iVm. § 18 II MStV</h3>
                <p style="font-size:13px; line-height:1.5; margin-top:0;"><strong>Kreisstadt Unna | Presse- und Öffentlichkeitsarbeit</strong><br>Anna Gemünd | E-Mail: anna.gemuend(at)stadt-unna.de<br>Kevin Kohues | E-Mail: kevin.kohues(at)stadt-unna.de</p>
                <h3 style="margin-top:15px; margin-bottom:5px; font-size:15px;">Programmierung/Entwicklung/Redaktion</h3>
                <p style="font-size:13px; line-height:1.5; margin-top:0;"><strong>Kreisstadt Unna</strong><br>Armin Eichenmüller | E-Mail: armin.eichenmueller(at)stadt-unna.de</p>
                <hr style="border:0; border-top:1px solid var(--border); margin: 20px 0;">
                <h3 style="margin-top:15px; margin-bottom:5px; font-size:15px;">Datenschutz</h3>
                <p style="font-size:13px; line-height:1.5; margin-top:0;">Diese App speichert Einstellungen lokal in deinem Browser. Es werden keine personenbezogenen Daten auf unseren Servern gespeichert. Die Entfernungsberechnung (GPS) findet <strong>ausschließlich lokal</strong> auf deinem Endgerät statt.</p>
                <button class="ticket-btn" style="background:#555; margin-top:30px; margin-bottom:15px;" onclick="document.getElementById('event-modal').style.display='none'">Schließen</button>
            `;
            if(modalBody && modal) { modalBody.innerHTML = html; modal.style.display = 'block'; modal.scrollTop = 0; }
        };
    }

    function wechselTab(t) {
        const globalSearch = document.getElementById('global-search-input');
        if(globalSearch) globalSearch.value = ''; 
        document.getElementById('content-search').style.display = 'none';
        document.getElementById('tab-wrappers').style.display = 'block';
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.bottom-nav button, .side-nav-btn').forEach(b => b.classList.remove('active'));
        
        const target = document.getElementById('content-' + t);
        if(target) target.classList.add('active');
        
        const bBtn = document.querySelector(`.bottom-nav button[data-target="${t}"]`); if(bBtn) bBtn.classList.add('active');
        const sBtn = document.querySelector(`.side-nav-btn[data-target="${t}"]`); if(sBtn) sBtn.classList.add('active');
        
        toggleMenu(false); window.scrollTo(0,0);
        
        if(t === 'maps') setTimeout(initLeafletMap, 100);
        if(t === 'favoriten') rendereListe('favoriten-container', favorites, 'Mixed');
    }
    
    document.querySelectorAll('[data-target]').forEach(btn => btn.onclick = () => wechselTab(btn.dataset.target));
    document.getElementById('btn-close-modal').onclick = () => modal.style.display = 'none';
    if(modal) modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };

    function formatDistance(dist) {
        if (dist === Infinity) return "";
        if (dist < 1) return Math.round(dist * 1000) + ' m';
        return dist.toFixed(1).replace('.', ',') + ' km';
    }

    function sortiereNachNaehe(datenArray, containerId, typ) {
        const R = 6371;
        const getDistance = (lat1, lon1, lat2, lon2) => {
            if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
            const dLat = (lat2 - lat1) * (Math.PI / 180), dLon = (lon2 - lon1) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const prozessSortierung = () => {
            let sortierteDaten = datenArray.map(item => { item.entfernung = getDistance(userLat, userLon, item.lat, item.lon); return item; }).sort((a, b) => a.entfernung - b.entfernung);
            rendereListe(containerId, sortierteDaten, typ);
        };

        if (userLat && userLon) {
            prozessSortierung();
        } else if ("geolocation" in navigator) {
            const btn = document.getElementById('btn-sort-' + typ.toLowerCase());
            if(!btn) return;
            const originalText = btn.innerHTML;
            btn.innerHTML = "⏳ Suche Standort...";
            navigator.geolocation.getCurrentPosition(
                (pos) => { userLat = pos.coords.latitude; userLon = pos.coords.longitude; btn.innerHTML = "✅ Sortiert"; btn.style.background = "#28a745"; prozessSortierung(); },
                () => { alert("Standortfreigabe verweigert."); btn.innerHTML = originalText; }, { timeout: 10000 }
            );
        }
    }

    // --- LEAFLET MAP IN-APP (MIT LAYER FILTERN) ---
    function initLeafletMap() {
        if(mapInitialized) { if(leafletMap) leafletMap.invalidateSize(); return; }
        const mapContainer = document.getElementById('inapp-map');
        if(!mapContainer || typeof L === 'undefined') return; 

        leafletMap = L.map('inapp-map').setView([51.5344, 7.6888], 14); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(leafletMap);

        layerGroups = {
            Gastro: L.layerGroup().addTo(leafletMap),
            Gesundheit: L.layerGroup().addTo(leafletMap),
            Hotel: L.layerGroup().addTo(leafletMap)
        };

        const createMarker = (item, type, iconStr, layerGrp) => {
            if(item.lat && item.lon) {
                let markerColor = '#0056b3'; 
                let tooltipText = `<div style="text-align:center;"><strong>${iconStr} ${item.name}</strong>`;
                
                if (type === 'Gastro') {
                    const ls = getLiveStatus(item);
                    if (ls.status === 'open') markerColor = '#28a745';
                    else if (ls.status === 'closing') markerColor = '#ffc107';
                    else if (ls.status === 'closed') markerColor = '#dc3545';
                    else markerColor = '#6c757d'; 
                    if(ls.status !== 'unknown') tooltipText += `<br><span style="font-size:11px; font-weight:bold; color:${markerColor};">${ls.text}</span>`;
                } else if (type === 'Gesundheit') {
                    markerColor = '#e83e8c'; 
                    if (item.fachrichtung) tooltipText += `<br><span style="font-size:11px; color:#555;">${item.fachrichtung}</span>`;
                } else {
                    markerColor = '#17a2b8'; 
                }
                
                tooltipText += `</div>`;
                
                const customIcon = L.divIcon({
                    html: `<div style="background-color:${markerColor}; width:30px; height:30px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:16px;">${iconStr}</div>`,
                    className: '', iconSize: [30, 30], iconAnchor: [15, 15]
                });

                const m = L.marker([item.lat, item.lon], {icon: customIcon}).addTo(layerGrp);
                m.bindTooltip(tooltipText, {direction: 'top'});
                m.on('click', () => oeffneDetails(item, type));
            }
        };

        gastroDaten.forEach(g => createMarker(g, 'Gastro', '🍽️', layerGroups.Gastro));
        hotelsDaten.forEach(h => createMarker(h, 'Hotel', '🛏️', layerGroups.Hotel));
        gesundheitDaten.forEach(g => {
            let gIcon = '⚕️';
            if (g.kategorie === 'Apotheke') gIcon = '💊';
            else if (g.kategorie === 'Krankenhaus') gIcon = '🏥';
            else if (g.kategorie === 'Arzt') gIcon = '🩺';
            else if (g.kategorie === 'Physiotherapie') gIcon = '💆';
            else if (g.kategorie === 'Sanitätshaus') gIcon = '🦽';
            else if (g.kategorie === 'Fitnessstudio') gIcon = '🏋️';
            else if (g.kategorie === 'Psychotherapie') gIcon = '🛋️';
            else if (g.kategorie === 'Psychiatrie') gIcon = '🧠';
            createMarker(g, 'Gesundheit', gIcon, layerGroups.Gesundheit);
        });
        
        mapInitialized = true;
    }

    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        btn.onclick = (e) => {
            let layerName = e.target.dataset.layer;
            e.target.classList.toggle('active');
            if(layerGroups[layerName]) {
                if(e.target.classList.contains('active')) {
                    leafletMap.addLayer(layerGroups[layerName]);
                } else {
                    leafletMap.removeLayer(layerGroups[layerName]);
                }
            }
        };
    });

    const btnLocate = document.getElementById('btn-locate-map');
    if(btnLocate) {
        btnLocate.onclick = () => {
            if ("geolocation" in navigator && typeof L !== 'undefined' && leafletMap) {
                navigator.geolocation.getCurrentPosition(pos => {
                    userLat = pos.coords.latitude; userLon = pos.coords.longitude;
                    L.circleMarker([userLat, userLon], {color: '#d9534f', radius: 8, fillOpacity: 0.8}).addTo(leafletMap).bindTooltip("Dein Standort").openTooltip();
                    leafletMap.setView([userLat, userLon], 15);
                });
            }
        };
    }

    // --- 3. RENDERING (MODAL) ---
    function oeffneDetails(obj, typ) {
        const title = clean(obj.name || obj.title);
        const favId = title + '_' + typ;
        const isFav = favorites.some(f => f.id === favId);
        const favIcon = isFav ? '❤️' : '🤍';

        if (typ === 'News') {
            let imgSrc = obj.thumbnail || (obj.enclosure && obj.enclosure.link) || '';
            if(!imgSrc) { const match = (obj.content || obj.description).match(/<img[^>]+src="([^">]+)"/); if(match) imgSrc = match[1]; }
            let html = imgSrc ? `<img src="${imgSrc}" class="modal-img" style="margin-bottom:10px;">` : '';
            html += `<div style="display:flex; justify-content:space-between; align-items:flex-start;"><h2 style="margin-top:0;">${title}</h2></div>`;
            html += `<p style="font-weight:bold; color:#555; font-size:13px;">📅 ${new Date(obj.pubDate).toLocaleDateString('de-DE')}</p>`;
            let rawContent = obj.content || obj.description || ""; rawContent = rawContent.replace(/<img[^>]*>/gi, ""); 
            html += `<div style="font-size:15px; line-height:1.6; margin-top:15px; overflow-wrap: break-word;">${rawContent}</div>`;
            html += `<a href="${obj.link}" target="_blank" class="ticket-btn" style="background:#0056b3; margin-top:25px;">🔗 Vollständige Meldung auf unna.de lesen</a>`;
            html += `<button class="ticket-btn" style="background:#555; margin-top:10px;" onclick="document.getElementById('event-modal').style.display='none'">Schließen</button>`;
            if(modalBody) modalBody.innerHTML = html;
            if(modal) { modal.style.display = 'block'; modal.scrollTop = 0; }
            return; 
        }

        let html = obj.bildUrl ? `<img src="${obj.bildUrl}" class="modal-img">` : '';
        
        html += `<div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h2 style="margin-top:0;">${title}</h2>
                    <button id="btn-toggle-fav" style="background:none; border:none; font-size:24px; padding:0 0 0 10px; cursor:pointer;">${favIcon}</button>
                 </div>`;
        
        if (typ === 'Gesundheit' || obj._type === 'Gesundheit') {
            let tagsHTML = `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:15px; font-size:11px;">`;
            if (obj.kategorie) {
                let gIcon = '⚕️'; 
                if (obj.kategorie === 'Apotheke') gIcon = '💊'; 
                else if (obj.kategorie === 'Krankenhaus') gIcon = '🏥'; 
                else if (obj.kategorie === 'Arzt') gIcon = '🩺';
                else if (obj.kategorie === 'Physiotherapie') gIcon = '💆';
                else if (obj.kategorie === 'Sanitätshaus') gIcon = '🦽';
                else if (obj.kategorie === 'Fitnessstudio') gIcon = '🏋️';
                else if (obj.kategorie === 'Psychotherapie') gIcon = '🛋️';
                else if (obj.kategorie === 'Psychiatrie') gIcon = '🧠';
                tagsHTML += `<span class="status-badge" style="background:#e2e3e5; border:none; color:#383d41; margin-top:0;">${gIcon} ${obj.kategorie}</span>`;
            }
            if (obj.fachrichtung) tagsHTML += `<span class="status-badge" style="background:#cce5ff; border:none; color:#004085; margin-top:0;">${obj.fachrichtung}</span>`;
            tagsHTML += `</div>`;
            html += tagsHTML;
        }

        if (typ === 'Gastro' || obj._type === 'Gastro') {
            const ls = getLiveStatus(obj);
            if(ls.status !== 'unknown') {
                const bg = ls.status === 'open' ? '#d4edda' : ls.status === 'closing' ? '#fff3cd' : '#f8d7da';
                const col = ls.status === 'open' ? '#155724' : ls.status === 'closing' ? '#856404' : '#721c24';
                html += `<div class="status-badge" style="background:${bg}; color:${col}; margin-bottom:15px; margin-top:0; display:inline-block; font-size:13px;">${ls.text}</div><br>`;
            }

            let tagsHTML = `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:15px; font-size:11px;">`;
            if (obj.kueche) tagsHTML += `<span class="status-badge" style="background:#e9ecef; border:none; color:#333; margin-top:0;">🍴 ${obj.kueche}</span>`;
            if (obj.aussenplaetze === 'Ja') tagsHTML += `<span class="status-badge" style="background:#d4edda; border:none; color:#155724; margin-top:0;">☀️ Außenplätze</span>`;
            if (obj.kartenzahlung === 'Ja') tagsHTML += `<span class="status-badge" style="background:#cce5ff; border:none; color:#004085; margin-top:0;">💳 Kartenzahlung</span>`;
            if (obj.lieferdienst === 'Ja') tagsHTML += `<span class="status-badge" style="background:#fff3cd; border:none; color:#856404; margin-top:0;">🛵 Lieferdienst</span>`;
            tagsHTML += `</div>`;
            html += tagsHTML;
        }
        
        let shareBtnHTML = navigator.share ? `<button id="btn-share-item" class="ticket-btn" style="background:#17a2b8; flex:1;">📤 Teilen</button>` : '';
        html += `<div style="display:flex; gap:10px; margin-bottom:15px;">${shareBtnHTML}<button id="btn-copy-action" class="copy-btn" style="flex:1;">📋 Kopieren</button></div>`;
                 
        if ((typ === 'Event' || obj._type === 'Event') && obj.start_date) html += `<button id="btn-calendar-export" class="ticket-btn" style="background:#ffc107; color:#000 !important;">📅 In Kalender eintragen</button>`;
        
        if(obj.adresse) {
            const mapsUrl = `http://googleusercontent.com/maps.google.com/?daddr=${encodeURIComponent(obj.adresse + ', Unna')}`;
            html += `<button onclick="window.open('${mapsUrl}', '_blank')" class="ticket-btn" style="background:#4285F4;">🚗 Route in Google Maps</button>`;
        }
        
        let desc = clean(obj.description || obj.beschreibung || obj.info || "");
        if(obj.start_date) html += `<p style="font-weight:bold;">📅 ${new Date(obj.start_date).toLocaleString('de-DE')} Uhr</p>`;
        if(desc) html += `<div style="font-size:14px; line-height:1.6; margin-top:15px; white-space:pre-wrap;">${desc}</div>`;
        if(obj.telefon) html += `<a href="tel:${obj.telefon.replace(/[^0-9+]/g, '')}" class="ticket-btn" style="background:#28a745; margin-top:15px;">📞 Anrufen</a>`;
        if(obj.website) html += `<a href="${obj.website}" target="_blank" class="ticket-btn" style="background:#6c757d;">🌐 Webseite</a>`;
        
        if(obj.oeffnungszeiten && obj.oeffnungszeiten.length > 0) {
            html += `<div style="margin-top:20px; padding:15px; background:rgba(0,0,0,0.05); border-radius:12px; font-size:13px;"><strong>🕒 Öffnungszeiten:</strong><br>${obj.oeffnungszeiten.join('<br>').replace(/&/g,'&amp;')}</div>`;
        }
        
        html += `<a href="mailto:a.eichenmueller@gmail.com?subject=App-Feedback%20zu%20${encodeURIComponent(title)}&body=Hallo%20Armin,%0A%0Aich%20habe%20einen%20Fehler%20bei%20'${encodeURIComponent(title)}'%20entdeckt:%0A%0A" class="ticket-btn" style="background:transparent; color:var(--text) !important; border:2px solid var(--border); margin-top:20px;">✉️ Fehler entdeckt? Änderung vorschlagen</a>`;
        html += `<button class="ticket-btn" style="background:#555; margin-top:10px;" onclick="document.getElementById('event-modal').style.display='none'">Schließen</button>`;
        if(modalBody) modalBody.innerHTML = html;
        
        // Favoriten Logik
        const favBtn = document.getElementById('btn-toggle-fav');
        if(favBtn) {
            favBtn.onclick = () => {
                const idx = favorites.findIndex(f => f.id === favId);
                if(idx > -1) {
                    favorites.splice(idx, 1);
                } else {
                    favorites.push({...obj, _type: typ, id: favId});
                }
                localStorage.setItem('unna_favorites', JSON.stringify(favorites));
                oeffneDetails(obj, typ); 
                if (document.getElementById('content-favoriten').classList.contains('active')) {
                    rendereListe('favoriten-container', favorites, 'Mixed');
                }
            };
        }

        const copyAction = document.getElementById('btn-copy-action');
        if(copyAction) {
            copyAction.onclick = () => { 
                let dateStr = "";
                if (obj.start_date) { const d = new Date(obj.start_date); dateStr = `📅 ${d.toLocaleDateString('de-DE')} | 🕒 ${d.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr\n`; }
                navigator.clipboard.writeText(`📌 ${title.replace(/&/g, '&amp;')}\n${dateStr}📍 ${obj.adresse || 'Unna'}`); 
                copyAction.innerHTML = "✅ Kopiert!"; setTimeout(() => { copyAction.innerHTML = "📋 Kopieren"; }, 2000);
            };
        }

        const btnShare = document.getElementById('btn-share-item');
        if (btnShare) btnShare.onclick = () => { navigator.share({ title: title, text: `Schau mal: ${title}\n📍 ${obj.adresse || 'Unna'}`, url: obj.website || window.location.href }).catch(()=>{}); };

        const btnCal = document.getElementById('btn-calendar-export');
        if (btnCal) {
            btnCal.onclick = () => {
                const start = new Date(obj.start_date); const end = new Date(start.getTime() + 2*60*60*1000); 
                const formatD = (date) => date.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
                const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${formatD(start)}\nDTEND:${formatD(end)}\nSUMMARY:${title}\nLOCATION:${obj.adresse || 'Unna'}\nDESCRIPTION:${clean(desc).replace(/\n/g, '\\n')}\nEND:VEVENT\nEND:VCALENDAR`;
                const blob = new Blob([ics], { type: 'text/calendar' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`; a.click();
            };
        }
        
        if(modal) { modal.style.display = 'block'; modal.scrollTop = 0; }
    }

    function rendereListe(id, daten, typ) {
        const c = document.getElementById(id); if(!c) return;
        c.innerHTML = daten.length ? '' : '<p style="padding:15px; color:#555;">Noch keine Einträge vorhanden.</p>';
        daten.forEach(item => {
            const d = document.createElement('div'); d.className = 'event-item';
            let info = "";
            
            if (typ === 'Mixed') info += `<div class="status-badge badge-search" style="margin-top:0;">🏷️ ${item._type}</div>`;
            if ((typ === 'Event' || item._type === 'Event') && item.start_date) info += `<div class="event-info-line">📅 ${new Date(item.start_date).toLocaleDateString('de-DE')} | 🕒 ${new Date(item.start_date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr</div>`;
            if (item.adresse) info += `<div class="event-info-line" style="margin-bottom: 5px;">📍 ${clean(item.adresse)}</div>`;
            if ((typ === 'Gastro' || item._type === 'Gastro') && item.kueche) info += `<div class="event-info-line" style="margin-bottom: 5px; color:#555;">🍴 ${item.kueche}</div>`;
            if ((typ === 'Gesundheit' || item._type === 'Gesundheit') && item.fachrichtung) info += `<div class="event-info-line" style="margin-bottom: 5px; color:#555;">🩺 ${item.fachrichtung}</div>`;
            if (item.entfernung && item.entfernung !== Infinity) info += `<div class="event-info-line" style="margin-bottom: 5px; color:#0056b3; font-weight:bold;">🚶 ${formatDistance(item.entfernung)} Luftlinie</div>`;

            if ((typ === 'Gastro' || item._type === 'Gastro')) {
                const ls = getLiveStatus(item);
                if (ls.status !== 'unknown') {
                    let badgeClass = ls.status === 'open' ? 'status-open' : ls.status === 'closing' ? 'status-closing' : 'status-closed';
                    info += `<div class="status-badge ${badgeClass}">${ls.text}</div>`;
                }
            }

            d.innerHTML = `<h3>${clean(item.name || item.title)}</h3>${info}`;
            d.onclick = () => oeffneDetails(item, typ === 'Mixed' ? item._type : typ); 
            c.appendChild(d);
        });
    }

    // --- GLOBALE SUCHE ---
    const globalSearchInput = document.getElementById('global-search-input');
    if(globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const tabWrappers = document.getElementById('tab-wrappers');
            const contentSearch = document.getElementById('content-search');
            
            if(q.length > 2) {
                if(tabWrappers) tabWrappers.style.display = 'none';
                if(contentSearch) contentSearch.style.display = 'block';
                
                let results = [];
                eventDaten.filter(x => (x.name||x.title||'').toLowerCase().includes(q)).forEach(x => results.push({...x, _type: 'Event'}));
                gastroDaten.filter(x => (x.name||'').toLowerCase().includes(q) || (x.kueche||'').toLowerCase().includes(q)).forEach(x => results.push({...x, _type: 'Gastro'}));
                gesundheitDaten.filter(x => (x.name||'').toLowerCase().includes(q) || (x.fachrichtung||'').toLowerCase().includes(q)).forEach(x => results.push({...x, _type: 'Gesundheit'}));
                vereinsDaten.filter(x => (x.name||'').toLowerCase().includes(q)).forEach(x => results.push({...x, _type: 'Verein'}));
                hotelsDaten.filter(x => (x.name||'').toLowerCase().includes(q)).forEach(x => results.push({...x, _type: 'Hotel'}));
                
                rendereListe('search-results-container', results, 'Mixed');
            } else if(q.length === 0) {
                if(contentSearch) contentSearch.style.display = 'none';
                if(tabWrappers) tabWrappers.style.display = 'block';
            }
        });
    }

    // --- 4. FETCH DATEN ---
    async function init() {
        fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5344&longitude=7.6888&current_weather=true')
            .then(r => r.json())
            .then(d => {
                const wc = document.getElementById('weather-container');
                if (wc && d.current_weather) {
                    const temp = Math.round(d.current_weather.temperature);
                    const code = d.current_weather.weathercode;
                    let icon = '⛅';
                    if (code === 0) icon = '☀️'; else if (code === 1 || code === 2) icon = '🌤️'; else if (code === 3) icon = '☁️';
                    else if (code >= 45 && code <= 67) icon = '🌫️'; else if (code >= 71 && code <= 82) icon = '🌧️'; else if (code >= 95) icon = '⛈️';
                    wc.innerHTML = `<div style="background:var(--item-bg); border:1px solid var(--border); border-radius:16px; padding:15px; margin-bottom:20px; display:flex; align-items:center; justify-content:center; gap:20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"><div style="font-size:40px; line-height:1;">${icon}</div><div style="text-align:left;"><div style="font-size:12px; color:#888; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Aktuell in Unna</div><div style="font-size:22px; font-weight:900;">${temp}°C</div></div></div>`;
                }
            }).catch(e => console.log("Wetterfehler", e));

        fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r=>r.json()).then(d=> {
            const nc = document.getElementById('news-container'); if(!nc) return; nc.innerHTML = '';
            d.items.forEach(i => {
                const card = document.createElement('div'); card.className = 'news-card'; card.style.cursor = 'pointer';
                card.innerHTML = `<div class="news-date">📅 ${new Date(i.pubDate).toLocaleDateString('de-DE')}</div><h3 style="margin-top:5px; margin-bottom:10px;">${clean(i.title)}</h3><button class="ticket-btn" style="background:var(--accent); color:var(--text) !important; padding:8px; font-size:12px; margin:0; border:1px solid var(--border);">Meldung lesen</button>`;
                card.onclick = () => oeffneDetails(i, 'News'); nc.appendChild(card);
            });
        }).catch(()=>{ if(document.getElementById('news-container')) document.getElementById('news-container').innerHTML = 'News aktuell nicht verfügbar.'; });

        fetch('gastronomie.json').then(r=>r.json()).then(d => { gastroDaten = d.sort((a, b) => a.name.localeCompare(b.name, 'de')); rendereListe('gastro-container', gastroDaten, 'Gastro'); }).catch(()=>{});
        fetch('gesundheit.json').then(r=>r.json()).then(d => { gesundheitDaten = d.sort((a, b) => a.name.localeCompare(b.name, 'de')); rendereListe('gesundheit-container', gesundheitDaten, 'Gesundheit'); }).catch(()=>{});
        fetch('vereine.json').then(r=>r.json()).then(d => { vereinsDaten = d; rendereListe('vereine-container', d, 'Vereine'); }).catch(()=>{});
        fetch('uebernachtungen.json').then(r=>r.json()).then(d => { hotelsDaten = d; rendereListe('hotels-container', d, 'Hotel'); }).catch(()=>{});

        fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events?per_page=50').then(r=>r.json()).then(d=> {
            if(d.events) { eventDaten = d.events.map(e => ({...e, name: e.title, bildUrl: e.image?.url, adresse: e.venue?.venue})); rendereListe('events-container', eventDaten, 'Event'); }
        }).catch(()=>{});

        // NEU: INTELLIGENTER LIVE ABFAHRTSMONITOR (DB API)
        const fetchAbfahrten = async (lat = 51.5393, lon = 7.6895, custom = false) => {
            const container = document.getElementById('oepnv-live-container'); 
            if(!container) return;
            if(custom) container.innerHTML = '<p style="color:#555; font-size:13px;">⏳ Suche Haltestellen in der Nähe...</p>';

            try {
                // Holt die 2 nächsten Haltestellen (Umkreis 1,5km)
                const locRes = await fetch(`https://v6.db.transport.rest/locations/nearby?latitude=${lat}&longitude=${lon}&distance=1500&results=2&stops=true`);
                const locData = await locRes.json();
                
                if(!locData || locData.length === 0) {
                    container.innerHTML = '<p style="color:#555; font-size:13px;">Keine Haltestellen in der Nähe gefunden.</p>'; return;
                }

                let html = '';
                for(let stop of locData) {
                    // Abfahrten der Haltestelle abfragen
                    const depRes = await fetch(`https://v6.db.transport.rest/stops/${stop.id}/departures?duration=120&results=5`);
                    const depData = await depRes.json();
                    let deps = depData.departures || depData; 

                    if(Array.isArray(deps) && deps.length > 0) {
                        html += `<div style="margin-top:15px; margin-bottom:5px; font-weight:bold; color:#0056b3;">🚏 ${stop.name} <span style="font-size:11px; color:#888;">(${Math.round(stop.distance)}m)</span></div>`;
                        deps.forEach(dep => {
                            let time = new Date(dep.when || dep.plannedWhen).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
                            let delayText = "";
                            if(dep.delay > 0) delayText = `<span style="color:#dc3545; font-weight:bold;">(+${Math.round(dep.delay/60)})</span>`;
                            else if(dep.delay <= 0) delayText = `<span style="color:#28a745; font-size:11px;">(pünktlich)</span>`;

                            let lineName = dep.line ? dep.line.name : "Zug";
                            let direction = dep.direction || "Fahrt";
                            
                            html += `<div style="background:var(--item-bg); border:1px solid var(--border); padding:10px 15px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div style="font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:10px;"><strong>${lineName}</strong> <span style="color:#555;">&rarr; ${direction}</span></div>
                                <div style="font-size:14px; white-space:nowrap; text-align:right;">${time} ${delayText}</div>
                            </div>`;
                        });
                    }
                }
                if(!html) html = '<p style="color:#555; font-size:13px;">Keine aktuellen Abfahrten gefunden.</p>';
                container.innerHTML = html;
            } catch(e) { 
                container.innerHTML = '<p style="color:#dc3545; font-size:12px; padding: 10px; background: #f8d7da; border-radius: 8px;">Fahrplandaten aktuell nicht erreichbar.</p>'; 
            }
        };
        // Standardmäßig für den Bahnhof Unna (Koordinaten) abfragen
        fetchAbfahrten();

        const btnOepnv = document.getElementById('btn-locate-oepnv');
        if(btnOepnv) {
            btnOepnv.onclick = () => {
                if ("geolocation" in navigator) {
                    btnOepnv.innerHTML = "⏳ Suche Standort...";
                    navigator.geolocation.getCurrentPosition(
                        pos => {
                            btnOepnv.innerHTML = "📍 Haltestellen in meiner Nähe suchen";
                            fetchAbfahrten(pos.coords.latitude, pos.coords.longitude, true);
                        },
                        () => {
                            alert("Standortfreigabe verweigert.");
                            btnOepnv.innerHTML = "📍 Haltestellen in meiner Nähe suchen";
                        }
                    );
                }
            };
        }

        // LIVE PARKDATEN GWA
        const fetchParkData = async () => {
            const container = document.getElementById('park-status-container'); if(!container) return;
            const garagesMeta = [ {n: "TG Bahnhof", id: "bahnhof", m: 520}, {n: "PH Neue Mühle", id: "mühle", m: 316}, {n: "TG Neumarkt", id: "neumarkt", m: 300}, {n: "PH Massener Straße", id: "massener", m: 247}, {n: "TG Flügelstraße", id: "flügelstraße", m: 104} ];
            try {
                const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.wirtschaftsbetriebe-unna.de/'));
                const data = await res.json(); const doc = new DOMParser().parseFromString(data.contents, 'text/html'); let foundGarages = [];
                doc.querySelectorAll('.isotope-item-content-wrapper').forEach(item => {
                    const spotsEl = item.querySelector('.spots');
                    if(spotsEl) {
                        const freeSpots = parseInt(spotsEl.innerText.replace(/[^0-9]/g, '')) || 0;
                        let match = garagesMeta.find(g => item.innerText.toLowerCase().includes(g.id));
                        if(match) foundGarages.push({ n: match.n, f: freeSpots, m: match.m });
                    }
                });
                if(foundGarages.length === 0) throw new Error("Struktur geändert");
                let pHtml = ''; 
                foundGarages.forEach(g => { 
                    let p = Math.round(((g.m - g.f) / g.m) * 100); if (p > 100) p = 100; if (p < 0) p = 0; 
                    const color = p > 90 ? '#dc3545' : p > 75 ? '#ffc107' : '#28a745'; 
                    pHtml += `<div class="park-item" style="margin-bottom: 12px;"><div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom: 4px;"><span>${g.n} <span style="color:#888;">(Kap: ${g.m})</span></span><strong>${g.f} frei</strong></div><div class="park-bar-bg"><div class="park-bar-fill" style="width:${p}%; background:${color}"></div></div></div>`; 
                });
                container.innerHTML = pHtml;
            } catch(e) { container.innerHTML = '<p style="color:#dc3545; font-size:12px; padding: 10px; background: #f8d7da; border-radius: 8px;">Live-Daten aktuell nicht erreichbar.</p>'; }
        };
        fetchParkData(); 

        fetch('mobilitaet.json').then(r=>r.json()).then(d=> {
            rendereListe('parken-container', d.parken, 'Parken'); rendereListe('rad-container', d.rad, 'Rad');
            const tc = document.getElementById('taxi-container'); if(tc) { tc.innerHTML = ''; d.taxi.forEach(t => tc.innerHTML += `<a href="tel:${t.telefon}" class="ticket-btn">🚕 ${t.name}</a>`); }
        }).catch(()=>{});
    }
    init();

    // --- ABFALLKALENDER LOGIK (Dynamische Demo) ---
    const abfallSelect = document.getElementById('abfall-bezirk-select');
    if(abfallSelect) {
        abfallSelect.onchange = (e) => {
            const container = document.getElementById('abfall-container');
            const val = e.target.value;
            if(!val) { container.innerHTML = ''; return; }
            
            let heute = new Date();
            let d1 = new Date(heute); d1.setDate(heute.getDate() + 2);
            let d2 = new Date(heute); d2.setDate(heute.getDate() + 6);
            let d3 = new Date(heute); d3.setDate(heute.getDate() + 11);

            let termine = [
                { typ: "🟤 Biotonne", date: d1 },
                { typ: "🟡 Wertstoff", date: d2 },
                { typ: "⚫ Restmüll", date: d3 }
            ];

            let html = `<h3>Nächste Leerungen in ${e.target.options[e.target.selectedIndex].text}</h3>`;
            termine.forEach(t => {
                html += `<div style="background:var(--item-bg); border:1px solid var(--border); padding:15px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:bold; font-size:16px;">${t.typ}</div>
                            <div style="font-size:14px; color:#555;">${t.date.toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'})}</div>
                         </div>`;
            });
            html += `<p style="font-size:12px; color:#888; margin-top:20px;">Die hier angezeigten Daten sind eine technische Demo-Umgebung. Sobald die offiziellen JSON-Daten der GWA vorliegen, werden hier die echten Termine angezeigt.</p>`;
            container.innerHTML = html;
        };
    }

    // --- Filter-Logik Events ---
    const filterEventsData = () => {
        const catFilter = document.getElementById('event-category-filter'); const cat = catFilter ? catFilter.value.toLowerCase() : 'alle';
        let filtered = eventDaten.filter(e => {
            const matchesCat = (cat === 'alle') || ((e.description || '') + (e.name || '')).toLowerCase().includes(cat);
            if(!matchesCat) return false;
            if(currentDayFilter === 'all') return true;
            const eDate = new Date(e.start_date); const today = new Date(); today.setHours(0,0,0,0); const tomorrow = new Date(today.getTime() + 86400000);
            if(currentDayFilter === 'today') return eDate.toDateString() === today.toDateString();
            if(currentDayFilter === 'tomorrow') return eDate.toDateString() === tomorrow.toDateString();
            if(currentDayFilter === 'weekend') return [5, 6, 0].includes(eDate.getDay());
            return true;
        });
        rendereListe('events-container', filtered, 'Event');
    };
    document.querySelectorAll('#time-filter-row .filter-pill').forEach(btn => {
        btn.onclick = function() { document.querySelectorAll('#time-filter-row .filter-pill').forEach(b => b.classList.remove('active')); this.classList.add('active'); currentDayFilter = this.dataset.time; filterEventsData(); };
    });
    const evtCatFilter = document.getElementById('event-category-filter'); if (evtCatFilter) evtCatFilter.addEventListener('change', filterEventsData); 

    // --- Filter-Logik Gesundheit ---
    const filterGesundheitData = () => {
        const typVal = document.getElementById('gesundheit-typ-filter') ? document.getElementById('gesundheit-typ-filter').value : 'alle';
        const fachVal = document.getElementById('gesundheit-fach-filter') ? document.getElementById('gesundheit-fach-filter').value : 'alle';

        const fachSelect = document.getElementById('gesundheit-fach-filter');
        if(fachSelect) fachSelect.style.display = typVal === 'Arzt' ? 'block' : 'none';

        let filtered = gesundheitDaten.filter(x => {
            if (typVal !== 'alle' && x.kategorie !== typVal) return false;
            if (fachVal !== 'alle' && typVal === 'Arzt' && (!x.fachrichtung || !x.fachrichtung.includes(fachVal))) return false;
            return true;
        });
        rendereListe('gesundheit-container', filtered, 'Gesundheit');
        return filtered;
    };
    ['gesundheit-typ-filter', 'gesundheit-fach-filter'].forEach(id => {
        const el = document.getElementById(id); if(el) el.addEventListener('change', filterGesundheitData);
    });

    // --- Filter-Logik Gastro ---
    const filterGastroData = () => {
        const typVal = document.getElementById('gastro-typ-filter') ? document.getElementById('gastro-typ-filter').value : 'alle';
        const kuecheVal = document.getElementById('gastro-kueche-filter') ? document.getElementById('gastro-kueche-filter').value : 'alle';
        const aussenVal = document.getElementById('gastro-aussen-filter') ? document.getElementById('gastro-aussen-filter').value : 'alle';
        const karteVal = document.getElementById('gastro-karte-filter') ? document.getElementById('gastro-karte-filter').value : 'alle';
        const openVal = document.getElementById('gastro-open-filter') ? document.getElementById('gastro-open-filter').value : 'alle';

        const isNightlife = (item) => {
            if (item.kategorie && item.kategorie.includes("Bar")) return true;
            if (item.hoursLive) {
                for (let day in item.hoursLive) {
                    for (let period of item.hoursLive[day]) {
                        let endStr = period.split('-')[1]; if (!endStr) continue;
                        let endHour = parseInt(endStr.split(':')[0]);
                        if (endHour >= 22 || endHour < 6) return true;
                    }
                }
            }
            return false;
        };

        let filtered = gastroDaten.filter(x => {
            if (typVal !== 'alle' && (!x.kategorie || !x.kategorie.includes(typVal))) return false;
            if (kuecheVal !== 'alle' && (!x.kueche || !x.kueche.includes(kuecheVal))) return false;
            if (aussenVal !== 'alle' && x.aussenplaetze !== aussenVal) return false;
            if (karteVal !== 'alle' && x.kartenzahlung !== karteVal) return false;
            
            if (openVal === 'nightlife') { if (!isNightlife(x)) return false; } 
            else if (openVal === 'ja') { const ls = getLiveStatus(x); if (ls.status !== 'open' && ls.status !== 'closing') return false; }
            return true;
        });
        rendereListe('gastro-container', filtered, 'Gastro'); return filtered; 
    };
    ['gastro-typ-filter', 'gastro-kueche-filter', 'gastro-aussen-filter', 'gastro-karte-filter', 'gastro-open-filter'].forEach(id => {
        const el = document.getElementById(id); if(el) el.addEventListener('change', filterGastroData);
    });

    const vereinsFilter = document.getElementById('vereins-filter');
    if(vereinsFilter) { vereinsFilter.onchange = (e) => { const v = e.target.value; rendereListe('vereine-container', v === 'alle' ? vereinsDaten : vereinsDaten.filter(x => x.kategorie === v), 'Vereine'); }; }
    
    document.getElementById('btn-darkmode').onclick = () => document.body.classList.toggle('dark-mode');
    
    const btnSortGastro = document.getElementById('btn-sort-gastro'); if(btnSortGastro) { btnSortGastro.onclick = () => { sortiereNachNaehe(filterGastroData(), 'gastro-container', 'Gastro'); } }
    const btnSortHotels = document.getElementById('btn-sort-hotels'); if(btnSortHotels) btnSortHotels.onclick = () => sortiereNachNaehe(hotelsDaten, 'hotels-container', 'Hotel');
    const btnSortGesundheit = document.getElementById('btn-sort-gesundheit'); if(btnSortGesundheit) { btnSortGesundheit.onclick = () => { sortiereNachNaehe(filterGesundheitData(), 'gesundheit-container', 'Gesundheit'); } }
});