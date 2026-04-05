var gastroDaten = [];
var vereinsDaten = [];

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('event-modal');
    const modalBody = document.getElementById('modal-body');

    function oeffneDetails(obj, typ) {
        if (!obj) return;
        const q = encodeURIComponent(obj.name + " " + (obj.adresse || "59423 Unna"));
        const mapsLink = "https://www.google.com/maps/search/?api=1&query=" + q;
        let html = obj.bildUrl ? `<img src="${obj.bildUrl}" class="modal-img">` : '';
        html += `<h2>${obj.name || obj.title}</h2><span style="background:var(--primary-color);color:white;padding:3px 8px;border-radius:10px;font-size:11px;">${obj.kategorie || typ}</span>`;
        if (obj.adresse) html += `<div style="margin-top:20px;"><a href="${mapsLink}" target="_blank" class="ticket-btn">📍 Route planen</a><p><b>Adresse:</b><br>${obj.adresse}</p></div>`;
        const txt = obj.beschreibung || obj.info || obj.description || "";
        if (txt) html += `<h3 style="border-top:1px solid var(--border-color);padding-top:15px;margin-top:20px;">Info</h3><p>${txt}</p>`;
        html += `<div style="margin-top:20px;">`;
        if (obj.telefon) html += `<a href="tel:${obj.telefon}" class="ticket-btn" style="background:#eee;color:#333;">📞 Anrufen</a>`;
        if (obj.website || obj.url) html += `<a href="${obj.website || obj.url}" target="_blank" class="ticket-btn" style="background:#eee;color:#333;">🌐 Website</a>`;
        html += `</div>`;
        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    function oeffneImpressum(e) {
        if(e) e.preventDefault();
        modalBody.innerHTML = `<h2>Impressum</h2><p><b>Herausgeberin:</b> Kreisstadt Unna<br><b>Redaktion/Entwicklung:</b> Armin Eichenmüller<br><b>E-Mail:</b> armin.eichenmueller(at)stadt-unna.de</p><hr><p>Layout und Inhalte sind urheberrechtlich geschützt.</p>`;
        modal.style.display = 'block';
    }

    document.getElementById('btn-close-modal').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    function wechselTab(t) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        document.getElementById('content-' + t).classList.add('active');
        document.getElementById('btn-' + t).classList.add('active');
        window.scrollTo(0, 0);
    }
    ['events', 'maps', 'mobilitaet', 'gastro', 'vereine', 'news', 'tickets', 'tourismus'].forEach(t => {
        document.getElementById('btn-' + t).onclick = () => wechselTab(t);
    });

    function rendereListe(id, daten, typ) {
        const c = document.getElementById(id); if (!c) return;
        c.innerHTML = daten.length ? '' : '<p>Keine Einträge gefunden.</p>';
        daten.forEach(item => {
            const div = document.createElement('div'); div.className = 'event-item';
            div.innerHTML = `<h3>${item.name || item.title}</h3><p>📍 ${item.adresse || ''}</p>`;
            div.onclick = () => oeffneDetails(item, typ);
            c.appendChild(div);
        });
    }

    async function lade(url, id, typ, setter = null) {
        try {
            const r = await fetch(url); const d = await r.json();
            if (setter) setter(d);
            let final = (typ === 'Event') ? (d.events || []).map(e => ({...e, name: e.title, bildUrl: e.image ? e.image.url : null})) : d;
            rendereListe(id, final, typ);
        } catch (e) { console.log(id + " fail"); }
    }

    // Filter-Logik (Fuzzy-Search für Bar & Kneipe)
    document.getElementById('gastro-suche').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        rendereListe('gastro-container', gastroDaten.filter(x => x.name.toLowerCase().includes(q)), 'Gastro');
    };
    document.getElementById('gastro-filter').onchange = (e) => {
        const k = e.target.value.toLowerCase();
        rendereListe('gastro-container', k === 'alle' ? gastroDaten : gastroDaten.filter(x => x.kategorie && x.kategorie.toLowerCase().includes(k)), 'Gastro');
    };
    document.getElementById('vereins-filter').onchange = (e) => {
        const k = e.target.value.toLowerCase();
        rendereListe('vereine-container', k === 'alle' ? vereinsDaten : vereinsDaten.filter(x => x.kategorie && x.kategorie.toLowerCase().includes(k)), 'Vereine');
    };

    lade('gastronomie.json', 'gastro-container', 'Gastro', (d) => gastroDaten = d);
    lade('vereine.json', 'vereine-container', 'Vereine', (d) => vereinsDaten = d);
    lade('uebernachtungen.json', 'hotels-container', 'Hotel');
    lade('https://kultur-in-unna.de/wp-json/tribe/events/v1/events', 'events-container', 'Event');

    fetch('mobilitaet.json?v=' + Date.now()).then(r => r.json()).then(d => {
        rendereListe('parken-container', d.parken, 'Parken');
        rendereListe('rad-container', d.rad, 'Fahrrad');
        const tc = document.getElementById('taxi-container'); tc.innerHTML = '';
        d.taxi.forEach(t => { tc.innerHTML += `<a href="tel:${t.telefon}" class="ticket-btn" style="flex:1 1 140px;">🚕 ${t.name}</a>`; });
    });

    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r => r.json()).then(d => {
        const nc = document.getElementById('news-container'); nc.innerHTML = '';
        d.items.forEach(i => { nc.innerHTML += `<div style="padding:10px 0;border-bottom:1px solid #ddd;"><a href="${i.link}" target="_blank" style="text-decoration:none;color:#0056b3;font-weight:bold;">${i.title}</a></div>`; });
    });

    document.getElementById('btn-darkmode').onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkmode', document.body.classList.contains('dark-mode'));
    };
    if (localStorage.getItem('darkmode') === 'true') document.body.classList.add('dark-mode');
    document.getElementById('btn-share').onclick = () => { if (navigator.share) navigator.share({ title: 'Unna App', url: window.location.href }); };
    document.querySelectorAll('[id^="link-impressum"]').forEach(l => l.onclick = oeffneImpressum);
});