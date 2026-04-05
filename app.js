// Globale Datencontainer
var gastroDaten = [];
var vereinsDaten = [];

document.addEventListener('DOMContentLoaded', () => {

    // --- NEU: HAMBURGER MENÜ LOGIK ---
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    const btnHamburger = document.getElementById('btn-hamburger');
    const btnCloseMenu = document.getElementById('btn-close-menu');

    function toggleMenu() {
        sideMenu.classList.toggle('open');
        overlay.classList.toggle('open');
    }

    if(btnHamburger) btnHamburger.onclick = toggleMenu;
    if(btnCloseMenu) btnCloseMenu.onclick = toggleMenu;
    if(overlay) overlay.onclick = toggleMenu;


    // 1. MODAL-STEUERUNG
    const modal = document.getElementById('event-modal');
    const modalBody = document.getElementById('modal-body');
    const btnCloseModal = document.getElementById('btn-close-modal');

    function oeffneDetails(obj, typ) {
        if (!obj) return;
        const q = encodeURIComponent(obj.name + " " + (obj.adresse || "59423 Unna"));
        const mapsLink = "https://www.google.com/maps/search/?api=1&query=" + q;
        
        let html = '';
        if (obj.bildUrl) html += `<img src="${obj.bildUrl}" class="modal-img" alt="${obj.name}">`;
        html += `<h2>${obj.name || obj.title}</h2>`;
        html += `<span style="background:#0056b3;color:white;padding:3px 8px;border-radius:10px;font-size:11px;">${obj.kategorie || typ}</span>`;
        
        if (obj.adresse) {
            html += `<div style="margin-top:20px;"><a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4;color:white;display:block;text-align:center;padding:15px;border-radius:8px;text-decoration:none;font-weight:bold;">📍 Route planen</a><p><b>Adresse:</b><br>${obj.adresse}</p></div>`;
        }
        
        const txt = obj.beschreibung || obj.info || obj.description || "";
        if (txt) html += `<h3 style="border-top:1px solid #ddd;padding-top:15px;margin-top:20px;">Info</h3><div style="font-size:14px;line-height:1.5;">${txt}</div>`;
        html += `<div style="margin-top:20px;">`;
        if (obj.telefon) html += `<a href="tel:${obj.telefon}" class="ticket-btn" style="background:#eee;color:#333;display:block;text-align:center;padding:12px;text-decoration:none;margin-bottom:10px;">📞 Anrufen</a>`;
        const web = obj.website || obj.url;
        if (web) html += `<a href="${web}" target="_blank" class="ticket-btn" style="background:#eee;color:#333;display:block;text-align:center;padding:12px;text-decoration:none;">🌐 Details & Website</a>`;
        html += `</div>`;
        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    function oeffneImpressum(e) {
        if(e) e.preventDefault();
        modalBody.innerHTML = `
            <div style="font-size: 13px; line-height: 1.6;">
                <h2 style="margin-top:0;">IMPRESSUM UND RECHTLICHE HINWEISE</h2>
                <p><b>Herausgeberin</b><br>Kreisstadt Unna, Rathausplatz 1, 59423 Unna<br>E-Mail: post(at)stadt-unna.de</p>
                <p><b>Vertretungsberechtigter</b><br>Bürgermeister Dirk Wigant</p>
                <p><b>Redaktion/Programmierung/Entwicklung</b><br>Armin Eichenmüller | armin.eichenmueller(at)stadt-unna.de</p>
                <hr style="border:0; border-top:1px solid #ddd; margin:15px 0;">
                <h3>Urheberrecht</h3>
                <p>Layout, Texte und Bilder der App sind urheberrechtlich geschützt. Vervielfältigung nur mit schriftlicher Zustimmung.</p>
                <h3>Datenschutz</h3>
                <p>Zugriffe werden anonym gespeichert. Personenbezogene Daten werden nur bei Formularnutzung auf freiwilliger Basis erhoben.</p>
            </div>`;
        modal.style.display = 'block';
    }

    if(btnCloseModal) btnCloseModal.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    // 2. NAVIGATION (Updated für Bottom & Side Nav)
    function wechselTab(t) {
        // Inhalte ausblenden
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        // Bottom Nav resetten
        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        // Side Nav resetten
        document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.remove('active'));
        
        // Aktivieren
        document.getElementById('content-' + t).classList.add('active');
        
        const bottomBtn = document.getElementById('btn-' + t);
        if(bottomBtn) bottomBtn.classList.add('active');
        
        const sideBtn = document.querySelector(`.side-nav-btn[data-target="${t}"]`);
        if(sideBtn) sideBtn.classList.add('active');
        
        window.scrollTo(0, 0);
    }

    // Bottom Nav Klicks
    ['events', 'maps', 'mobilitaet', 'gastro', 'vereine', 'news', 'tickets', 'tourismus'].forEach(t => {
        const btn = document.getElementById('btn-' + t);
        if(btn) btn.onclick = () => wechselTab(t);
    });

    // Side Nav Klicks
    document.querySelectorAll('.side-nav-btn').forEach(btn => {
        btn.onclick = () => {
            wechselTab(btn.getAttribute('data-target'));
            toggleMenu(); // Menü nach Klick schließen
        };
    });

    // 3. RENDERING ENGINE
    function rendereListe(containerId, daten, typ) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!daten || daten.length === 0) {
            container.innerHTML = '<p>Keine Daten verfügbar.</p>';
            return;
        }
        daten.forEach(item => {
            const div = document.createElement('div');
            div.className = 'event-item';
            const sub = item.adresse || (item.start_date ? new Date(item.start_date).toLocaleDateString() : '');
            div.innerHTML = `<h3>${item.name || item.title}</h3><p>📍 ${sub}</p>`;
            div.onclick = () => oeffneDetails(item, typ);
            container.appendChild(div);
        });
    }

    // 4. DATEN-LOADER
    async function ladeDaten(url, targetId, typ, globalVarSetter = null) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (globalVarSetter) globalVarSetter(data);
            
            let finalData = data;
            if (typ === 'Event') finalData = (data.events || []).map(e => ({...e, name: e.title, bildUrl: e.image ? e.image.url : null}));
            
            rendereListe(targetId, finalData, typ);
        } catch (e) {
            console.error(targetId + " konnte nicht geladen werden", e);
        }
    }

    // 5. FILTER-LOGIK
    const gSuche = document.getElementById('gastro-suche');
    if (gSuche) {
        gSuche.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            rendereListe('gastro-container', gastroDaten.filter(x => 
                (x.name && x.name.toLowerCase().includes(q)) || 
                (x.kategorie && x.kategorie.toLowerCase().includes(q))
            ), 'Gastro');
        });
    }

    const gFilter = document.getElementById('gastro-filter');
    if (gFilter) {
        gFilter.addEventListener('change', (e) => {
            const k = e.target.value.toLowerCase();
            const gefiltert = k === 'alle' ? gastroDaten : gastroDaten.filter(x => x.kategorie && x.kategorie.toLowerCase().includes(k));
            rendereListe('gastro-container', gefiltert, 'Gastro');
        });
    }

    const vFilter = document.getElementById('vereins-filter');
    if (vFilter) {
        vFilter.addEventListener('change', (e) => {
            const k = e.target.value.toLowerCase();
            const gefiltert = k === 'alle' ? vereinsDaten : vereinsDaten.filter(x => x.kategorie && x.kategorie.toLowerCase().includes(k));
            rendereListe('vereine-container', gefiltert, 'Vereine');
        });
    }

    // INITIALER START
    ladeDaten('gastronomie.json', 'gastro-container', 'Gastro', (d) => { gastroDaten = d; });
    ladeDaten('vereine.json', 'vereine-container', 'Vereine', (d) => { vereinsDaten = d; });
    ladeDaten('uebernachtungen.json', 'hotels-container', 'Hotel');
    ladeDaten('https://kultur-in-unna.de/wp-json/tribe/events/v1/events', 'events-container', 'Event');

    fetch('mobilitaet.json?v=' + Date.now()).then(r => r.json()).then(d => {
        rendereListe('parken-container', d.parken, 'Parken');
        rendereListe('rad-container', d.rad, 'Fahrrad');
        const tc = document.getElementById('taxi-container'); if(tc) {
            tc.innerHTML = '';
            d.taxi.forEach(t => { tc.innerHTML += `<a href="tel:${t.telefon}" class="ticket-btn" style="flex:1 1 140px;">🚕 ${t.name}</a>`; });
        }
    });

    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r => r.json()).then(d => {
        const nc = document.getElementById('news-container'); if(nc) {
            nc.innerHTML = '';
            d.items.forEach(i => { nc.innerHTML += `<div style="padding:10px 0;border-bottom:1px solid #ddd;"><a href="${i.link}" target="_blank" style="text-decoration:none;color:#0056b3;font-weight:bold;">${i.title}</a></div>`; });
        }
    });

    // Dark Mode & Impressum
    document.getElementById('btn-darkmode').onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkmode', document.body.classList.contains('dark-mode'));
    };
    if (localStorage.getItem('darkmode') === 'true') document.body.classList.add('dark-mode');
    
    document.getElementById('btn-share').onclick = () => { if (navigator.share) navigator.share({ title: 'Unna App', url: window.location.href }); };
    
    const impLinks = ['link-impressum-1', 'link-impressum-2'];
    impLinks.forEach(id => {
        const link = document.getElementById(id);
        if(link) link.onclick = oeffneImpressum;
    });
});