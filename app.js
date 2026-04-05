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
        html += `<div style="margin-top:20px;"><a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4;color:white;display:block;text-align:center;padding:15px;border-radius:8px;text-decoration:none;font-weight:bold;">📍 Route planen</a><p><b>Adresse:</b><br>${obj.adresse}</p></div>`;
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

function oeffneImpressum(e) {
    if(e) e.preventDefault();
    const modal = document.getElementById('event-modal');
    const body = document.getElementById('modal-body');
    
    const impText = `
        <div style="font-size: 13px; line-height: 1.6; color: var(--text-color);">
            <h2 style="margin-top:0;">IMPRESSUM UND RECHTLICHE HINWEISE</h2>
            
            <p><b>Herausgeberin</b><br>
            Kreisstadt Unna<br>
            Rathausplatz 1, 59423 Unna<br>
            Fon (02303) 103-0 (Zentrale) | Fax (02303) 103-9998 (zentral)<br>
            E-Mail: post@stadt-unna.de | Internet: www.unna.de</p>

            <p><b>Vertretungsberechtigter</b><br>
            Bürgermeister Dirk Wigant<br>
            Rathausplatz 1, 59423 Unna<br>
            (Die Kreisstadt Unna ist eine Körperschaft des öffentlichen Rechts.)</p>

            <p><b>Verantwortlich nach § 5 Digitale-Dienste-Gesetz iVm. § 18 II Medienstaatsvertrag</b><br>
            Kreisstadt Unna | Presse- und Öffentlichkeitsarbeit<br>
            Anna Gemünd | E-Mail: anna.gemuend@stadt-unna.de<br>
            Kevin Kohues | E-Mail: kevin.kohues@stadt-unna.de</p>

            <p><b>Redaktion/Programmierung/Entwicklung</b><br>
            Kreisstadt Unna<br>
            Armin Eichenmüller | E-Mail: armin.eichenmueller@stadt-unna.de</p>

            <hr style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">

            <h3>Urheberrecht</h3>
            <p>Layout, Texte, Bilder und sonstige Inhalte der App kultur-in-unna sind urheberrechtlich geschützt. Einzelkopien von Seiten oder Teilen von Seiten für den Privatgebrauch sind unter der Bedingung zulässig, dass der Urheberrechtshinweis der Kreisstadt Unna erhalten bleibt. Die Vervielfältigung von Informationen und Daten ist ohne vorherige schriftliche Zustimmung nicht gestattet.</p>

            <h3>Haftungsausschluss</h3>
            <p>Die Kreisstadt Unna übernimmt keine Gewähr für die Aktualität, Richtigkeit und Vollständigkeit der bereitgestellten Informationen. Dies gilt ebenso für alle anderen Websites, auf die mittels eines Links verwiesen wird.</p>

            <hr style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">

            <h3>Datenschutz</h3>
            <p>Bei jedem Zugriff auf Inhalte dieses Internetangebotes werden Name der angeforderten Datei, Datum/Uhrzeit, Datenmenge, IP-Adresse sowie Statusmeldungen gespeichert. Die Daten sind für die Stadt Unna nicht personenbezogen. Wir nutzen anonyme Informationen ausschließlich zu statistischen Zwecken.</p>
            <p>Personenbezogene Daten werden nur verarbeitet, soweit dies für Formularangebote erforderlich ist. Angaben erfolgen auf freiwilliger Basis. Eine Weitergabe an Dritte erfolgt nur im Einzelfall zum Zwecke der Strafverfolgung.</p>
            <p>Bei Fragen steht der behördliche Beauftragte für Datenschutz bei der Stadt Unna zur Verfügung.</p>

            <h3>Gerichtsstand</h3>
            <p>Es gilt ausschließlich deutsches Recht. Gerichtsstand ist Unna.</p>
        </div>
    `;
    body.innerHTML = impText;
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
    fetch('gastronomie.json').then(r => r.json()).then(d => { gastroDaten = d; rendereListe('gastro-container', d, 'Gastro'); });
    fetch('vereine.json').then(r => r.json()).then(d => { vereinsDaten = d; rendereListe('vereine-container', d, 'Vereine &amp; Freizeit'); });
    fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events').then(r => r.json()).then(d => {
        const evs = (d.events || []).map(e => ({ ...e, name: e.title, bildUrl: (e.image && e.image.url) ? e.image.url : null }));
        rendereListe('events-container', evs.slice(0, 15), 'Veranstaltung');
    });
    fetch('mobilitaet.json?v=' + Date.now()).then(r => r.json()).then(d => {
        rendereListe('parken-container', d.parken, 'Parken');
        rendereListe('rad-container', d.rad, 'Fahrrad');
        const tc = document.getElementById('taxi-container'); if(tc) {
            tc.innerHTML = ''; d.taxi.forEach(t => {
                const a = document.createElement('a'); a.href = `tel:${t.telefon}`; a.className = 'ticket-btn'; a.style.flex = '1 1 140px'; a.innerHTML = `🚕 ${t.name}`; tc.appendChild(a);
            });
        }
    });
    fetch('uebernachtungen.json').then(r => r.json()).then(d => rendereListe('hotels-container', d, 'Hotel'));
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r => r.json()).then(d => {
        const nc = document.getElementById('news-container'); if(nc) {
            nc.innerHTML = ''; d.items.forEach(i => { nc.innerHTML += `<div style="padding:10px 0;border-bottom:1px solid var(--border-color);"><a href="${i.link}" target="_blank" style="text-decoration:none;color:var(--primary-color);font-weight:bold;">${i.title}</a></div>`; });
        }
    });
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
        rendereListe('vereine-container', k === 'alle' ? vereinsDaten : vereinsDaten.filter(x => x.kategorie === k), 'Vereine &amp; Freizeit');
    };
}

// DARK MODE &amp; SHARE
document.getElementById('btn-darkmode').onclick = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkmode', document.body.classList.contains('dark-mode'));
};
if (localStorage.getItem('darkmode') === 'true') document.body.classList.add('dark-mode');
document.getElementById('btn-share').onclick = () => { if (navigator.share) navigator.share({ title: 'Kultur in Unna App', url: window.location.href }); };

// LINKS ANBINDEN
document.getElementById('link-impressum-1').onclick = oeffneImpressum;
document.getElementById('link-impressum-2').onclick = oeffneImpressum;

ladeAlles();