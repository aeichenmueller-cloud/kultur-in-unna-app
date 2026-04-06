var eventDaten = [], gastroDaten = [], vereinsDaten = [], hotelsDaten = [];
var currentDayFilter = 'all';
var userLat = null, userLon = null;
var leafletMap = null;
var mapInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CORE ---
    const clean = (r) => { 
        if(!r) return ""; 
        let t = r.replace(/<p[^>]*>/g,'').replace(/<\/p>/g,'\n\n').replace(/<br\s*[\/]?>/gi,'\n').replace(/ /g,' '); 
        let d = new DOMParser().parseFromString(t,'text/html'); 
        return d.documentElement.textContent.replace(/&/g,'&').replace(/<[^>]*>?/gm,'').trim(); 
    };

    // --- LIVE STATUS LOGIK ---
    function getLiveStatus(item) {
        if (!item.hoursLive || Object.keys(item.hoursLive).length === 0) return { status: 'unknown' };
        
        const now = new Date(); 
        const day = now.getDay(); 
        const prevDay = (day + 6) % 7; 
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
            for (let period of (item.hoursLive[day] || [])) {
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
        return { status: 'closed', text: `🔴 Derzeit geschlossen`, color: '#dc3545' };
    }

    // --- PWA INSTALL PROMPT ---
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const pwaPrompt = document.getElementById('pwa-prompt');
        if(pwaPrompt) pwaPrompt.style.display = 'flex';
    });
    
    const btnInstallPwa = document.getElementById('btn-install-pwa');
    if(btnInstallPwa) {
        btnInstallPwa.onclick = () => {
            if(deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(() => { 
                    deferredPrompt = null; 
                    const pwaPrompt = document.getElementById('pwa-prompt');
                    if(pwaPrompt) pwaPrompt.style.display = 'none'; 
                });
            }
        };
    }
    
    const btnClosePwa = document.getElementById('btn-close-pwa');
    if(btnClosePwa) {
        btnClosePwa.onclick = () => {
            const pwaPrompt = document.getElementById('pwa-prompt');
            if(pwaPrompt) pwaPrompt.style.display = 'none';
        };
    }

    // --- 2. UI HANDLER ---
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    const modal = document.getElementById('event-modal');
    const modalBody = document.getElementById('modal-body');
          
    const toggleMenu = (s) => { 
        if(sideMenu) sideMenu.classList.toggle('open', s); 
        if(overlay) overlay.classList.toggle('open', s); 
    };
    
    const btnHamburger = document.getElementById('btn-hamburger');
    if(btnHamburger) btnHamburger.onclick = () => toggleMenu(true);
    
    const btnCloseMenu = document.getElementById('btn-close-menu');
    if(btnCloseMenu) btnCloseMenu.onclick = () => toggleMenu(false);
    
    if(overlay) overlay.onclick = () => toggleMenu(false);

    function wechselTab(t) {
        const globalSearch = document.getElementById('global-search-input');
        if(globalSearch) globalSearch.value = ''; 
        
        const contentSearch = document.getElementById('content-search');
        if(contentSearch) contentSearch.style.display = 'none';
        
        const tabWrappers = document.getElementById('tab-wrappers');
        if(tabWrappers) tabWrappers.style.display = 'block';

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.bottom-nav button, .side-nav-btn').forEach(b => b.classList.remove('active'));
        
        const target = document.getElementById('content-' + t);
        if(target) target.classList.add('active');
        
        const bBtn = document.querySelector(`.bottom-nav button[data-target="${t}"]`); 
        if(bBtn) bBtn.classList.add('active');
        
        const sBtn = document.querySelector(`.side-nav-btn[data-target="${t}"]`); 
        if(sBtn) sBtn.classList.add('active');
        
        toggleMenu(false); 
        window.scrollTo(0,0);

        if(t === 'maps') {
            setTimeout(initLeafletMap, 100);
        }
    }
    
    document.querySelectorAll('[data-target]').forEach(btn => btn.onclick = () => wechselTab(btn.dataset.target));
    
    const btnCloseModal = document.getElementById('btn-close-modal');
    if(btnCloseModal) btnCloseModal.onclick = () => modal.style.display = 'none';
    
    if(modal) modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };

    // --- STANDORT & ENTFERNUNG ---
    function getDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function formatDistance(dist) {
        if (dist === Infinity) return "";
        if (dist < 1) return Math.round(dist * 1000) + ' m';
        return dist.toFixed(1).replace('.', ',') + ' km';
    }

    function sortiereNachNaehe(datenArray, containerId, typ) {
        const prozessSortierung = () => {
            let sortierteDaten = datenArray.map(item => {
                item.entfernung = getDistance(userLat, userLon, item.lat, item.lon);
                return item;
            }).sort((a, b) => a.entfernung - b.entfernung);
            rendereListe(containerId, sortierteDaten, typ);
        };

        if (userLat && userLon) {
            prozessSortierung();
        } else if ("geolocation" in navigator) {
            const btn = document.getElementById(containerId === 'gastro-container' ? 'btn-sort-gastro' : 'btn-sort-hotels');
            if(!btn) return;
            const originalText = btn.innerHTML;
            btn.innerHTML = "⏳ Suche Standort...";
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userLat = pos.coords.latitude; userLon = pos.coords.longitude;
                    btn.innerHTML = "✅ Sortiert nach Nähe"; btn.style.background = "#28a745";
                    prozessSortierung();
                },
                (err) => { alert("Standortfreigabe verweigert."); btn.innerHTML = originalText; },
                { timeout: 10000 }
            );
        } else {
            alert("Browser unterstützt keine Standortabfrage.");
        }
    }

    // --- LEAFLET MAP IN-APP ---
    function initLeafletMap() {
        if(mapInitialized) {
            if(leafletMap) leafletMap.invalidateSize(); 
            return;
        }
        
        const mapContainer = document.getElementById('inapp-map');
        if(!mapContainer) return; 
        
        if(typeof L === 'undefined') return;

        leafletMap = L.map('inapp-map').setView([51.5344, 7.6888], 14); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(leafletMap);

        const createMarker = (item, type, iconStr) => {
            if(item.lat && item.lon) {
                let markerColor = '#0056b3'; 
                let tooltipText = `<strong>${iconStr} ${item.name}</strong>`;
                
                if (type === 'Gastro') {
                    const ls = getLiveStatus(item);
                    if (ls.status === 'open') markerColor = '#28a745';
                    else if (ls.status === 'closing') markerColor = '#ffc107';
                    else if (ls.status === 'closed') markerColor = '#dc3545';
                    else markerColor = '#6c757d'; // Grau für unbekannt/fehlende Daten
                    
                    if(ls.status !== 'unknown') tooltipText += `<br><span style="font-size:11px;">${ls.text}</span>`;
                } else {
                    markerColor = '#17a2b8'; // Hotels etc.
                }
                
                const customIcon = L.divIcon({
                    html: `<div style="background-color:${markerColor}; width:30px; height:30px; border-radius:50%; border:2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:16px;">${iconStr}</div>`,
                    className: '',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                const m = L.marker([item.lat, item.lon], {icon: customIcon}).addTo(leafletMap);
                m.bindTooltip(tooltipText, {direction: 'top'});
                m.on('click', () => oeffneDetails(item, type));
            }
        };

        gastroDaten.forEach(g => createMarker(g, 'Gastro', '🍽️'));
        hotelsDaten.forEach(h => createMarker(h, 'Hotel', '🛏️'));
        
        mapInitialized = true;
    }

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
        let html = obj.bildUrl ? `<img src="${obj.bildUrl}" class="modal-img">` : '';
        html += `<h2>${title}</h2>`;
        
        // --- Live Status & Meta-Tags im Detail-Modal anzeigen ---
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
        html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
                    ${shareBtnHTML}
                    <button id="btn-copy-action" class="copy-btn" style="flex:1;">📋 Kopieren</button>
                 </div>`;
                 
        if ((typ === 'Event' || obj._type === 'Event') && obj.start_date) {
            html += `<button id="btn-calendar-export" class="ticket-btn" style="background:#ffc107; color:#000 !important;">📅 In Kalender eintragen</button>`;
        }

        if(obj.adresse) {
            const mapsUrl = `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(obj.adresse + ', Unna')}`;
            html += `<button onclick="window.open('${mapsUrl}')" class="ticket-btn" style="background:#4285F4;">🚗 Route in Google Maps</button>`;
        }
        
        let desc = clean(obj.description || obj.beschreibung || obj.info || "");
        if(obj.start_date) html += `<p style="font-weight:bold;">📅 ${new Date(obj.start_date).toLocaleString('de-DE')} Uhr</p>`;
        if(desc) html += `<div style="font-size:14px; line-height:1.6; margin-top:15px; white-space:pre-wrap;">${desc}</div>`;
        if(obj.telefon) html += `<a href="tel:${obj.telefon.replace(/[^0-9+]/g, '')}" class="ticket-btn" style="background:#28a745; margin-top:15px;">📞 Anrufen</a>`;
        if(obj.website) html += `<a href="${obj.website}" target="_blank" class="ticket-btn" style="background:#6c757d;">🌐 Webseite</a>`;
        
        if(obj.oeffnungszeiten && obj.oeffnungszeiten.length > 0) {
            html += `<div style="margin-top:20px; padding:15px; background:rgba(0,0,0,0.05); border-radius:12px; font-size:13px;"><strong>🕒 Öffnungszeiten:</strong><br>${obj.oeffnungszeiten.join('<br>').replace(/&/g,'&')}</div>`;
        }
        
        html += `<button class="ticket-btn" style="background:#555; margin-top:30px;" onclick="document.getElementById('event-modal').style.display='none'">Schließen</button>`;
        
        if(modalBody) modalBody.innerHTML = html;
        
        const copyAction = document.getElementById('btn-copy-action');
        if(copyAction) {
            copyAction.onclick = () => { 
                let dateStr = "";
                if (obj.start_date) {
                    const d = new Date(obj.start_date);
                    dateStr = `📅 ${d.toLocaleDateString('de-DE')} | 🕒 ${d.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr\n`;
                }
                const copyText = `📌 ${title.replace(/&/g, '&')}\n${dateStr}📍 ${obj.adresse || 'Unna'}`;
                navigator.clipboard.writeText(copyText); 
                copyAction.innerHTML = "✅ Kopiert!"; 
                setTimeout(() => { copyAction.innerHTML = "📋 Kopieren"; }, 2000);
            };
        }

        const btnShare = document.getElementById('btn-share-item');
        if (btnShare) {
            btnShare.onclick = () => {
                navigator.share({ title: title, text: `Schau mal: ${title}\n📍 ${obj.adresse || 'Unna'}`, url: obj.website || window.location.href }).catch(()=>{});
            };
        }

        const btnCal = document.getElementById('btn-calendar-export');
        if (btnCal) {
            btnCal.onclick = () => {
                const start = new Date(obj.start_date);
                const end = new Date(start.getTime() + 2*60*60*1000); 
                const formatD = (date) => date.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
                const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${formatD(start)}\nDTEND:${formatD(end)}\nSUMMARY:${title}\nLOCATION:${obj.adresse || 'Unna'}\nDESCRIPTION:${clean(desc).replace(/\n/g, '\\n')}\nEND:VEVENT\nEND:VCALENDAR`;
                const blob = new Blob([ics], { type: 'text/calendar' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
                a.click();
            };
        }
        
        if(modal) {
            modal.style.display = 'block'; 
            modal.scrollTop = 0;
        }
    }

    function rendereListe(id, daten, typ) {
        const c = document.getElementById(id); if(!c) return;
        c.innerHTML = daten.length ? '' : '<p>Keine Einträge gefunden.</p>';
        daten.forEach(item => {
            const d = document.createElement('div'); d.className = 'event-item';
            let info = "";
            
            if (typ === 'Mixed') {
                info += `<div class="status-badge badge-search" style="margin-top:0;">🏷️ ${item._type}</div>`;
            }

            if ((typ === 'Event' || item._type === 'Event') && item.start_date) {
                info += `<div class="event-info-line">📅 ${new Date(item.start_date).toLocaleDateString('de-DE')} | 🕒 ${new Date(item.start_date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr</div>`;
            }
            if (item.adresse) {
                info += `<div class="event-info-line" style="margin-bottom: 5px;">📍 ${clean(item.adresse)}</div>`;
            }
            
            if ((typ === 'Gastro' || item._type === 'Gastro') && item.kueche) {
                info += `<div class="event-info-line" style="margin-bottom: 5px; color:#555;">🍴 ${item.kueche}</div>`;
            }

            if (item.entfernung && item.entfernung !== Infinity) {
                info += `<div class="event-info-line" style="margin-bottom: 5px; color:#0056b3; font-weight:bold;">🚶 ${formatDistance(item.entfernung)} Luftlinie</div>`;
            }

            // --- Live Status Icon in der Liste ---
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
                vereinsDaten.filter(x => (x.name||'').toLowerCase().includes(q)).forEach(x => results.push({...x, _type: 'Verein'}));
                hotelsDaten.filter(x => (x.name||'').toLowerCase().includes(q)).forEach(x => results.push({...x, _type: 'Hotel'}));
                
                rendereListe('search-results-container', results, 'Mixed');
            } else if(q.length === 0) {
                if(contentSearch) contentSearch.style.display = 'none';
                if(tabWrappers) tabWrappers.style.display = 'block';
            }
        });
    }

    // --- 4. INDEPENDENT FETCHERS ---
    async function init() {
        const newsContainer = document.getElementById('news-container');
        fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032')
        .then(r=>r.json())
        .then(d=> {
            if(!newsContainer) return;
            newsContainer.innerHTML = '';
            d.items.forEach(i => newsContainer.innerHTML += `<div class="news-card"><div class="news-date">${new Date(i.pubDate).toLocaleDateString()}</div><h3>${clean(i.title)}</h3><a href="${i.link}" target="_blank" class="ticket-btn" style="background:#666; padding:8px; font-size:11px;">Lesen</a></div>`);
        }).catch(()=> { if(newsContainer) newsContainer.innerHTML = 'News aktuell nicht verfügbar.'; });

        const fetchParkData = async () => {
            const container = document.getElementById('park-status-container');
            if(!container) return;
            const garagesMeta = [ {n: "TG Bahnhof", id: "bahnhof", m: 520}, {n: "PH Neue Mühle", id: "mühle", m: 316}, {n: "TG Neumarkt", id: "neumarkt", m: 300}, {n: "PH Massener Straße", id: "massener", m: 247}, {n: "TG Flügelstraße", id: "flügelstraße", m: 104} ];
            try {
                const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.wirtschaftsbetriebe-unna.de/'));
                const data = await res.json();
                const doc = new DOMParser().parseFromString(data.contents, 'text/html');
                let foundGarages = [];

                doc.querySelectorAll('.isotope-item-content-wrapper').forEach(item => {
                    const spotsEl = item.querySelector('.spots');
                    if(spotsEl) {
                        const freeSpots = parseInt(spotsEl.innerText.replace(/[^0-9]/g, '')) || 0;
                        const blockText = item.innerText.toLowerCase();
                        let match = garagesMeta.find(g => blockText.includes(g.id));
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
            rendereListe('parken-container', d.parken, 'Parken');
            rendereListe('rad-container', d.rad, 'Rad');
            const tc = document.getElementById('taxi-container'); 
            if(tc) {
                tc.innerHTML = ''; 
                d.taxi.forEach(t => tc.innerHTML += `<a href="tel:${t.telefon}" class="ticket-btn">🚕 ${t.name}</a>`);
            }
        }).catch(e => console.log("Fehler bei Mobilität", e));

        fetch('gastronomie.json').then(r=>r.json()).then(d => { 
            gastroDaten = d.sort((a, b) => a.name.localeCompare(b.name, 'de')); 
            rendereListe('gastro-container', gastroDaten, 'Gastro'); 
        }).catch(e => console.log("Fehler bei Gastro", e));
        
        fetch('vereine.json').then(r=>r.json()).then(d => { 
            vereinsDaten = d; 
            rendereListe('vereine-container', d, 'Vereine'); 
        }).catch(e => console.log("Fehler bei Vereine", e));
        
        fetch('uebernachtungen.json').then(r=>r.json()).then(d => { 
            hotelsDaten = d; 
            rendereListe('hotels-container', d, 'Hotel'); 
        }).catch(e => console.log("Fehler bei Hotels", e));

        fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events?per_page=50').then(r=>r.json()).then(d=> {
            if(d.events) {
                eventDaten = d.events.map(e => ({...e, name: e.title, bildUrl: e.image?.url, adresse: e.venue?.venue}));
                rendereListe('events-container', eventDaten, 'Event');
            }
        }).catch(e => console.log("Fehler bei Events", e));
    }
    
    // START
    init();

    // Filters & Buttons
    document.querySelectorAll('#time-filter-row .filter-pill').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#time-filter-row .filter-pill').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); currentDayFilter = this.dataset.time;
            
            const catFilter = document.getElementById('event-category-filter');
            const cat = catFilter ? catFilter.value.toLowerCase() : 'alle';
            
            let filtered = eventDaten.filter(e => {
                const matchesCat = (cat === 'alle') || ((e.description || '') + (e.name || '')).toLowerCase().includes(cat);
                if(!matchesCat) return false;
                if(currentDayFilter === 'all') return true;
                const eDate = new Date(e.start_date);
                const today = new Date(); today.setHours(0,0,0,0);
                const tomorrow = new Date(today.getTime() + 86400000);
                if(currentDayFilter === 'today') return eDate.toDateString() === today.toDateString();
                if(currentDayFilter === 'tomorrow') return eDate.toDateString() === tomorrow.toDateString();
                if(currentDayFilter === 'weekend') return [5, 6, 0].includes(eDate.getDay());
                return true;
            });
            rendereListe('events-container', filtered, 'Event');
        };
    });
    
    const filterGastroData = () => {
        const typVal = document.getElementById('gastro-typ-filter') ? document.getElementById('gastro-typ-filter').value : 'alle';
        const kuecheVal = document.getElementById('gastro-kueche-filter') ? document.getElementById('gastro-kueche-filter').value : 'alle';
        const aussenVal = document.getElementById('gastro-aussen-filter') ? document.getElementById('gastro-aussen-filter').value : 'alle';
        const karteVal = document.getElementById('gastro-karte-filter') ? document.getElementById('gastro-karte-filter').value : 'alle';

        let filtered = gastroDaten.filter(x => {
            if (typVal !== 'alle' && (!x.kategorie || !x.kategorie.includes(typVal))) return false;
            if (kuecheVal !== 'alle' && (!x.kueche || !x.kueche.includes(kuecheVal))) return false;
            if (aussenVal !== 'alle' && x.aussenplaetze !== aussenVal) return false;
            if (karteVal !== 'alle' && x.kartenzahlung !== karteVal) return false;
            return true;
        });

        rendereListe('gastro-container', filtered, 'Gastro');
        return filtered; 
    };

    ['gastro-typ-filter', 'gastro-kueche-filter', 'gastro-aussen-filter', 'gastro-karte-filter'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', filterGastroData);
    });

    const vereinsFilter = document.getElementById('vereins-filter');
    if(vereinsFilter) {
        vereinsFilter.onchange = (e) => { 
            const v = e.target.value; 
            rendereListe('vereine-container', v === 'alle' ? vereinsDaten : vereinsDaten.filter(x => x.kategorie === v), 'Vereine'); 
        };
    }
    
    const btnDarkMode = document.getElementById('btn-darkmode');
    if(btnDarkMode) btnDarkMode.onclick = () => document.body.classList.toggle('dark-mode');
    
    const btnShareApp = document.getElementById('btn-share-app');
    if(btnShareApp) btnShareApp.onclick = () => { if(navigator.share) navigator.share({title: 'Kultur in Unna', url: window.location.href}); };

    const btnSortGastro = document.getElementById('btn-sort-gastro');
    if(btnSortGastro) {
        btnSortGastro.onclick = () => {
            const gefilterteDaten = filterGastroData();
            sortiereNachNaehe(gefilterteDaten, 'gastro-container', 'Gastro');
        }
    }

    const btnSortHotels = document.getElementById('btn-sort-hotels');
    if(btnSortHotels) btnSortHotels.onclick = () => sortiereNachNaehe(hotelsDaten, 'hotels-container', 'Hotel');
});