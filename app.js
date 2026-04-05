var eventDaten = [], gastroDaten = [], vereinsDaten = [], hotelsDaten = [];
var currentDayFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CORE ---
    const clean = (r) => { if(!r) return ""; let t = r.replace(/<p[^>]*>/g,'').replace(/<\/p>/g,'\n\n').replace(/<br\s*[\/]?>/gi,'\n').replace(/ /g,' '); let d = new DOMParser().parseFromString(t,'text/html'); return d.documentElement.textContent.replace(/&/g,'&').replace(/<[^>]*>?/gm,'').trim(); };

    // --- 2. UI HANDLER ---
    const sideMenu = document.getElementById('side-menu'), overlay = document.getElementById('side-menu-overlay'), modal = document.getElementById('event-modal'), modalBody = document.getElementById('modal-body');
    const toggleMenu = (s) => { sideMenu.classList.toggle('open', s); overlay.classList.toggle('open', s); };
    document.getElementById('btn-hamburger').onclick = () => toggleMenu(true);
    document.getElementById('btn-close-menu').onclick = () => toggleMenu(false);
    overlay.onclick = () => toggleMenu(false);

    function wechselTab(t) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.bottom-nav button, .side-nav-btn').forEach(b => b.classList.remove('active'));
        const target = document.getElementById('content-' + t);
        if(target) target.classList.add('active');
        const bBtn = document.querySelector(`.bottom-nav button[data-target="${t}"]`); if(bBtn) bBtn.classList.add('active');
        const sBtn = document.querySelector(`.side-nav-btn[data-target="${t}"]`); if(sBtn) sBtn.classList.add('active');
        toggleMenu(false); window.scrollTo(0,0);
    }
    document.querySelectorAll('[data-target]').forEach(btn => btn.onclick = () => wechselTab(btn.dataset.target));
    document.getElementById('btn-close-modal').onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if(e.target === modal) modal.style.display = 'none'; };

    // --- 3. RENDERING ---
    function oeffneDetails(obj, typ) {
        const title = clean(obj.name || obj.title);
        let html = obj.bildUrl ? `<img src="${obj.bildUrl}" class="modal-img">` : '';
        html += `<h2>${title}</h2>`;
        
        // Kopieren-Button (vollständig überarbeitet)
        html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button id="btn-copy-action" class="copy-btn" style="flex:1;">📋 Text & Daten kopieren</button>
                 </div>`;
                 
        // Route-Button (URL repariert)
        if(obj.adresse) {
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(obj.adresse + ', Unna')}`;
            html += `<button onclick="window.open('${mapsUrl}')" class="ticket-btn" style="background:#4285F4;">🚗 Route planen</button>`;
        }
        
        let desc = clean(obj.description || obj.beschreibung || obj.info || "");
        if(obj.start_date) html += `<p style="font-weight:bold;">📅 ${new Date(obj.start_date).toLocaleString('de-DE')} Uhr</p>`;
        if(desc) html += `<div style="font-size:14px; line-height:1.6; margin-top:15px; white-space:pre-wrap;">${desc}</div>`;
        if(obj.telefon) html += `<a href="tel:${obj.telefon}" class="ticket-btn" style="background:#28a745; margin-top:15px;">📞 Anrufen</a>`;
        if(obj.website) html += `<a href="${obj.website}" target="_blank" class="ticket-btn" style="background:#6c757d;">🌐 Webseite</a>`;
        if(obj.oeffnungszeiten) html += `<div style="margin-top:20px; padding:15px; background:rgba(0,0,0,0.05); border-radius:12px; font-size:13px;"><strong>🕒 Zeiten:</strong><br>${obj.oeffnungszeiten.join('<br>')}</div>`;
        html += `<button class="ticket-btn" style="background:#555; margin-top:30px;" onclick="document.getElementById('event-modal').style.display='none'">Schließen</button>`;
        
        modalBody.innerHTML = html;
        
        // Kopieren-Logik (Datum + Uhrzeit + Adresse)
        document.getElementById('btn-copy-action').onclick = () => { 
            let dateStr = "";
            if (obj.start_date) {
                const d = new Date(obj.start_date);
                dateStr = `📅 ${d.toLocaleDateString('de-DE')} | 🕒 ${d.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr\n`;
            }
            const copyText = `📌 ${title}\n${dateStr}📍 ${obj.adresse || 'Unna'}`;
            navigator.clipboard.writeText(copyText); 
            document.getElementById('btn-copy-action').innerHTML = "✅ Kopiert!"; 
        };
        
        modal.style.display = 'block'; modal.scrollTop = 0;
    }

    function rendereListe(id, daten, typ) {
        const c = document.getElementById(id); if(!c) return;
        c.innerHTML = daten.length ? '' : '<p>Keine Einträge gefunden.</p>';
        daten.forEach(item => {
            const d = document.createElement('div'); d.className = 'event-item';
            let info = (typ === 'Event' && item.start_date) ? `<div class="event-info-line">📅 ${new Date(item.start_date).toLocaleDateString('de-DE')} | 🕒 ${new Date(item.start_date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr</div><div class="event-info-line">📍 ${clean(item.adresse) || 'Unna'}</div>` : `<div class="event-info-line">📍 ${clean(item.adresse) || 'Unna'}</div>`;
            d.innerHTML = `<h3>${clean(item.name || item.title)}</h3>${info}`;
            d.onclick = () => oeffneDetails(item, typ); c.appendChild(d);
        });
    }

    // --- 4. INDEPENDENT FETCHERS ---
    async function init() {
        // News
        fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r=>r.json()).then(d=> {
            const nc = document.getElementById('news-container'); nc.innerHTML = '';
            d.items.forEach(i => nc.innerHTML += `<div class="news-card"><div class="news-date">${new Date(i.pubDate).toLocaleDateString()}</div><h3>${clean(i.title)}</h3><a href="${i.link}" target="_blank" class="ticket-btn" style="background:#666; padding:8px; font-size:11px;">Lesen</a></div>`);
        }).catch(()=> document.getElementById('news-container').innerHTML = 'News aktuell nicht verfügbar.');

        // Mobility
        const garages = [{n:"Neumarkt", f:145, m:350, p:41}, {n:"Bahnhof", f:12, m:280, p:95}, {n:"Hanse", f:92, m:150, p:61}];
        let pHtml = ''; garages.forEach(g => { const color = g.p > 90 ? '#dc3545' : g.p > 75 ? '#ffc107' : '#28a745'; pHtml += `<div class="park-item"><div style="display:flex; justify-content:space-between; font-size:12px;"><span>${g.n}</span><strong>${g.f} frei</strong></div><div class="park-bar-bg"><div class="park-bar-fill" style="width:${g.p}%; background:${color}"></div></div></div>`; });
        document.getElementById('park-status-container').innerHTML = pHtml;
        
        fetch('mobilitaet.json').then(r=>r.json()).then(d=> {
            rendereListe('parken-container', d.parken, 'Parken');
            rendereListe('rad-container', d.rad, 'Rad');
            const tc = document.getElementById('taxi-container'); tc.innerHTML = ''; d.taxi.forEach(t => tc.innerHTML += `<a href="tel:${t.telefon}" class="ticket-btn">🚕 ${t.name}</a>`);
        });

        // Gastro, Vereine, Tourismus
        fetch('gastronomie.json').then(r=>r.json()).then(d => { gastroDaten = d; rendereListe('gastro-container', d, 'Gastro'); });
        fetch('vereine.json').then(r=>r.json()).then(d => { vereinsDaten = d; rendereListe('vereine-container', d, 'Vereine'); });
        fetch('uebernachtungen.json').then(r=>r.json()).then(d => { hotelsDaten = d; rendereListe('hotels-container', d, 'Hotel'); });

        // Events
        fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events?per_page=50').then(r=>r.json()).then(d=> {
            eventDaten = d.events.map(e => ({...e, name: e.title, bildUrl: e.image?.url, adresse: e.venue?.venue}));
            rendereListe('events-container', eventDaten, 'Event');
        });
    }
    init();

    // Filters
    document.querySelectorAll('#time-filter-row .filter-pill').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#time-filter-row .filter-pill').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); currentDayFilter = this.dataset.time;
            
            const q = document.getElementById('event-search').value.toLowerCase();
            const cat = document.getElementById('event-category-filter').value.toLowerCase();
            
            let filtered = eventDaten.filter(e => {
                const matchesSearch = clean(e.name).toLowerCase().includes(q);
                const matchesCat = (cat === 'alle') || (e.description + e.name).toLowerCase().includes(cat);
                if(!matchesSearch || !matchesCat) return false;
                
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
    document.getElementById('gastro-filter').onchange = (e) => { const v = e.target.value; rendereListe('gastro-container', v === 'alle' ? gastroDaten : gastroDaten.filter(x => x.kategorie.includes(v)), 'Gastro'); };
    document.getElementById('vereins-filter').onchange = (e) => { const v = e.target.value; rendereListe('vereine-container', v === 'alle' ? vereinsDaten : vereinsDaten.filter(x => x.kategorie === v), 'Vereine'); };
    
    document.getElementById('btn-darkmode').onclick = () => document.body.classList.toggle('dark-mode');
    document.getElementById('btn-share-app').onclick = () => { if(navigator.share) navigator.share({title: 'Kultur in Unna', url: window.location.href}); };
});