var gastroDaten = [];
var vereinsDaten = [];

// ==========================================
// 1. MODAL-STEUERUNG
// ==========================================
function oeffneDetails(obj, typ) {
    if (!obj) return;
    const modal = document.getElementById('event-modal');
    const body = document.getElementById('modal-body');
    
    const query = encodeURIComponent(obj.name + " " + (obj.adresse || "59423 Unna"));
    const mapsLink = "https://www.google.com/maps/search/?api=1&query=" + query;
    
    let html = '';
    if (obj.bildUrl) html += `<img src="${obj.bildUrl}" class="modal-img" alt="${obj.name}">`;

    html += `<h2>${obj.name || obj.title}</h2>`;
    html += `<span style="background:var(--primary-color);color:white;padding:3px 8px;border-radius:10px;font-size:11px;">${obj.kategorie || typ}</span>`;
    
    if (obj.adresse) {
        html += `<div style="margin-top:20px;">
            <a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4;color:white;display:block;text-align:center;padding:15px;border-radius:8px;text-decoration:none;font-weight:bold;">📍 Route planen</a>
            <p><b>Adresse:</b><br>${obj.adresse}</p>
        </div>`;
    }
    
    const beschreibung = obj.beschreibung || obj.info || obj.description || "";
    if (beschreibung) html += `<h3 style="border-top:1px solid var(--border-color);padding-top:15px;margin-top:20px;">Info</h3><div style="font-size:14px;line-height:1.5;">${beschreibung}</div>`;

    html += `<div style="margin-top:20px;">`;
    if (obj.telefon) html += `<a href="tel:${obj.telefon}" class="ticket-btn" style="background:var(--card-bg);color:var(--text-color);border:1px solid var(--border-color);display:block;text-align:center;padding:12px;text-decoration:none;margin-bottom:10px;">📞 Anrufen</a>`;
    const web = obj.website || obj.url;
    if (web) html += `<a href="${web}" target="_blank" class="ticket-btn" style="background:var(--card-bg);color:var(--text-color);border:1px solid var(--border-color);display:block;text-align:center;padding:12px;text-decoration:none;">🌐 Details &amp; Website</a>`;
    html += `</div>`;

    body.innerHTML = html;
    modal.style.display = 'block';
}

function schliesseModal() { document.getElementById('event-modal').style.display = 'none'; }
const btnCloseModal = document.getElementById('btn-close-modal');
if (btnCloseModal) btnCloseModal.onclick = schliesseModal;
window.onclick = (e) => { if (e.target == document.getElementById('event-modal')) schliesseModal(); };

// ==========================================
// 2. NAVIGATION
// ==========================================
function wechselTab(tabName) {
    const tabs = ['events', 'maps', 'mobilitaet', 'news', 'tickets', 'tourismus', 'gastro', 'vereine'];
    tabs.forEach(name => {
        const c = document.getElementById('content-' + name);
        const b = document.getElementById('btn-' + name);
        if (c) c.classList.remove('active');
        if (b) b.classList.remove('active');
    });
    document.getElementById('content-' + tabName).classList.add('active');
    document.getElementById('btn-' + tabName).classList.add('active');
    window.scrollTo(0, 0);
}
['events', 'maps', 'mobilitaet', 'gastro', 'vereine', 'news', 'tickets', 'tourismus'].forEach(t => {
    const btn = document.getElementById('btn-' + t);
    if (btn) btn.onclick = () => wechselTab(t);
});

// ==========================================
// 3. RENDERING
// ==========================================
function rendereListe(containerId, daten, typ) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    if (!daten || daten.length === 0) {
        c.innerHTML = '<p style="padding:10px;">Keine Einträge gefunden.</p>';
        return;
    }
    daten.forEach(item => {
        const d = document.createElement('div');
        d.className = 'event-item';
        const subtext = item.adresse || (item.start_date ? new Date(item.start_date).toLocaleDateString() : '');
        d.innerHTML = `<h3>${item.name || item.title}</h3><p>📍 ${subtext}</p>`;
        d.onclick = () => oeffneDetails(item, typ);
        c.appendChild(d);
    });
}

// ==========================================
// 4. DATEN LADEN
// ==========================================
function ladeAlles() {
    fetch('gastronomie.json').then(r => r.json()).then(d => { gastroDaten = d; rendereListe('gastro-container', d, 'Gastro'); }).catch(e => console.log("Gastro Fail"));
    fetch('vereine.json').then(r => r.json()).then(d => { vereinsDaten = d; rendereListe('vereine-container', d, 'Verein & Freizeit'); }).catch(e => console.log("Vereins Fail"));
    fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events').then(r => r.json()).then(d => {
        const evs = (d.events || []).map(e => ({ ...e, name: e.title, bildUrl: (e.image && e.image.url) ? e.image.url : null }));
        rendereListe('events-container', evs.slice(0, 15), 'Veranstaltung');
    }).catch(e => { document.getElementById('events-container').innerHTML = "Fehler beim Laden."; });
    fetch('mobilitaet.json?v=' + Date.now()).then(r => r.json()).then(d => {
        rendereListe('parken-container', d.parken, 'Parken');
        rendereListe('rad-container', d.rad, 'Fahrrad');
        const tc = document.getElementById('taxi-container'); if(tc) {
            tc.innerHTML = ''; d.taxi.forEach(t => {
                const a = document.createElement('a'); a.href = `tel:${t.telefon}`; a.className = 'ticket-btn'; a.style.flex = '1 1 140px'; a.innerHTML = `🚕 ${t.name}`; tc.appendChild(a);
            });
        }
    }).catch(e => console.log("Mobil Fail"));
    fetch('uebernachtungen.json').then(r => r.json()).then(d => rendereListe('hotels-container', d, 'Hotel')).catch(e => console.log("Hotels Fail"));
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r => r.json()).then(d => {
        const nc = document.getElementById('news-container'); if(nc) {
            nc.innerHTML = ''; d.items.forEach(i => { nc.innerHTML += `<div style="padding:10px 0;border-bottom:1px solid var(--border-color);"><a href="${i.link}" target="_blank" style="text-decoration:none;color:var(--primary-color);font-weight:bold;">${i.title}</a></div>`; });
        }
    }).catch(e => console.log("News Fail"));
}

// FILTER-LOGIK
const gSuche = document.getElementById('gastro-suche');
if (gSuche) {
    gSuche.oninput = (e) => {
        const q = e.target.value.toLowerCase();
        rendereListe('gastro-container', gastroDaten.filter(x => x.name.toLowerCase().includes(q)), 'Gastro');
    };
}
const gFilter = document.getElementById('gastro-filter');
if (gFilter) {
    gFilter.onchange = (e) => {
        const k = e.target.value;
        rendereListe('gastro-container', k === 'alle' ? gastroDaten : gastroDaten.filter(x => x.kategorie === k), 'Gastro');
    };
}
const vFilter = document.getElementById('vereins-filter');
if (vFilter) {
    vFilter.onchange = (e) => {
        const k = e.target.value;
        rendereListe('vereine-container', k === 'alle' ? vereinsDaten : vereinsDaten.filter(x => x.kategorie === k), 'Verein & Freizeit');
    };
}

// DARK MODE & SHARE
document.getElementById('btn-darkmode').onclick = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkmode', document.body.classList.contains('dark-mode'));
};
if (localStorage.getItem('darkmode') === 'true') document.body.classList.add('dark-mode');
document.getElementById('btn-share').onclick = () => { if (navigator.share) navigator.share({ title: 'Kultur in Unna App', url: window.location.href }); };

const impFunc = (e) => { e.preventDefault(); oeffneDetails({name:"Impressum &amp; Datenschutz", info:"Herausgeber: Kreisstadt Unna<br>Redaktion: Armin Eichenmüller"}, "Info"); };
document.getElementById('link-impressum-1').onclick = impFunc;
document.getElementById('link-impressum-2').onclick = impFunc;

ladeAlles();