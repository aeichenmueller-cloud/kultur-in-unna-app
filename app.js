// Globaler Speicher
var gastroDaten = [];
var vereinsDaten = [];

// ==========================================
// 1. NAVIGATION
// ==========================================
function wechselTab(tabName) {
    var tabs = ['events', 'maps', 'news', 'tickets', 'tourismus', 'gastro', 'vereine'];
    tabs.forEach(function(name) {
        var el = document.getElementById('content-' + name);
        if (el) el.classList.remove('active');
    });
    var activeTab = document.getElementById('content-' + tabName);
    if (activeTab) activeTab.classList.add('active');
    window.scrollTo(0, 0);
}

function setupNav(id, tab) {
    var b = document.getElementById(id);
    if(b) b.onclick = function() { wechselTab(tab); };
}

setupNav('btn-events', 'events');
setupNav('btn-maps', 'maps');
setupNav('btn-gastro', 'gastro');
setupNav('btn-vereine', 'vereine');
setupNav('btn-news', 'news');
setupNav('btn-tickets', 'tickets');
setupNav('btn-tourismus', 'tourismus');

// ==========================================
// 2. MODAL & IMPRESSUM
// ==========================================
function schliesseModal() {
    var modal = document.getElementById('event-modal');
    if (modal) modal.style.display = 'none';
}

var cb = document.getElementById('btn-close-modal');
if(cb) cb.onclick = schliesseModal;

window.onclick = function(e) {
    if (e.target == document.getElementById('event-modal')) schliesseModal();
};

function oeffneImpressum(e) {
    e.preventDefault();
    var body = document.getElementById('modal-body');
    body.innerHTML = `
        <h2 style="margin-top:0;">Impressum & Datenschutz</h2>
        
        <h3 style="font-size:14px; margin-bottom:5px;">Herausgeberin</h3>
        <p style="font-size:14px; color:#555; margin-top:0;">
            Kreisstadt Unna<br>Rathausplatz 1, 59423 Unna<br>
            Die Kreisstadt Unna ist eine Körperschaft des öffentlichen Rechts.<br>
            Vertretungsberechtigter: Bürgermeister Dirk Wigant
        </p>
        
        <h3 style="font-size:14px; margin-bottom:5px;">Redaktion, App-Entwicklung & Technische Umsetzung</h3>
        <p style="font-size:14px; color:#555; margin-top:0;">
            Armin Eichenmüller<br>E-Mail: <a href="mailto:armin.eichenmueller@stadt-unna.de" style="color:#0056b3;">armin.eichenmueller@stadt-unna.de</a>
        </p>
        
        <h3 style="font-size:14px; margin-bottom:5px;">Behördlicher Datenschutz</h3>
        <p style="font-size:14px; color:#555; margin-top:0;">
            Kreisstadt Unna – Der/Die Datenschutzbeauftragte –<br>
            Rathausplatz 1, 59423 Unna<br>
            E-Mail: <a href="mailto:datenschutz@stadt-unna.de" style="color:#0056b3;">datenschutz@stadt-unna.de</a>
        </p>
        
        <h3 style="font-size:14px; margin-bottom:5px;">Urheberrecht & Haftungsausschluss</h3>
        <p style="font-size:13px; color:#666; margin-top:0; line-height:1.5;">
            Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden derartige Inhalte umgehend entfernt.<br><br>
            Gerichtsstand, anzuwendendes Recht: Alle Informationen oder Daten auf dieser App unterliegen ausschließlich deutschem Recht. Gerichtsstand ist Unna.
        </p>
    `;
    document.getElementById('event-modal').style.display = 'block';
}

var link1 = document.getElementById('link-impressum-1');
var link2 = document.getElementById('link-impressum-2');
if (link1) link1.onclick = oeffneImpressum;
if (link2) link2.onclick = oeffneImpressum;

function oeffneGastroDetails(ort) {
    var body = document.getElementById('modal-body');
    var zeiten = ort.oeffnungszeiten ? `<ul style="list-style:none; padding:0; font-size:14px; color:#444;">${ort.oeffnungszeiten.map(t => `<li style="padding:8px 0; border-bottom:1px solid #eee;">${t}</li>`).join('')}</ul>` : '<p>Keine Zeiten hinterlegt.</p>';
    var mapsLink = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(ort.name + " " + ort.adresse);

    body.innerHTML = `
        <h2 style="margin:0;">${ort.name}</h2>
        <span style="background:#eee; padding:3px 8px; border-radius:10px; font-size:11px; color:#333;">${ort.kategorie}</span>
        <div style="margin-top:20px;">
            <a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4; color:white; display:block; text-align:center; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold; margin-bottom:20px;">📍 Navigiere zu</a>
            <p><b>Adresse:</b><br>${ort.adresse}</p>
        </div>
        <h3 style="border-top:1px solid #ddd; padding-top:15px; margin-top:20px;">🕒 Öffnungszeiten</h3>
        ${zeiten}
        <div style="margin-top:20px;">
            ${ort.telefon ? `<a href="tel:${ort.telefon}" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">📞 Anrufen</a>` : ''}
            ${ort.website ? `<a href="${ort.website}" target="_blank" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none;">🌐 Website</a>` : ''}
        </div>
    `;
    document.getElementById('event-modal').style.display = 'block';
}

function oeffneHotelDetails(h) {
    var body = document.getElementById('modal-body');
    var mapsLink = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(h.name + " " + h.adresse);

    body.innerHTML = `
        <h2 style="margin:0;">${h.name}</h2>
        <span style="background:#eee; padding:3px 8px; border-radius:10px; font-size:11px; color:#333;">Übernachtung</span>
        
        <div style="margin-top:20px;">
            <a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4; color:white; display:block; text-align:center; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold; margin-bottom:20px;">📍 Navigiere zu</a>
            <p><b>Adresse:</b><br>${h.adresse}</p>
        </div>
        
        ${h.beschreibung ? `<h3 style="border-top:1px solid #ddd; padding-top:15px; margin-top:20px;">ℹ️ Info</h3><p style="font-size:14px; color:#555; line-height:1.5;">${h.beschreibung}</p>` : ''}
        
        <div style="margin-top:20px;">
            ${h.telefon ? `<a href="tel:${h.telefon}" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">📞 Anrufen</a>` : ''}
            ${h.website ? `<a href="${h.website}" target="_blank" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none;">🌐 Website</a>` : ''}
        </div>
    `;
    document.getElementById('event-modal').style.display = 'block';
}

// NEU: Vereine im Modal anzeigen (jetzt auch mit Adresse und Navigation!)
function oeffneVereinDetails(v) {
    var body = document.getElementById('modal-body');
    
    // Prüfen ob eine Adresse da ist, um den Maps-Link zu bauen
    var mapsLink = v.adresse ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(v.name + " " + v.adresse) : "";
    var adresseHtml = v.adresse ? `
        <div style="margin-top:20px;">
            <a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4; color:white; display:block; text-align:center; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold; margin-bottom:20px;">📍 Navigiere zu</a>
            <p><b>Adresse:</b><br>${v.adresse}</p>
        </div>` : '';

    body.innerHTML = `
        <h2 style="margin:0;">${v.name}</h2>
        <span style="background:#eee; padding:3px 8px; border-radius:10px; font-size:11px; color:#333;">${v.kategorie || 'Verein'}</span>
        
        ${adresseHtml}
        
        ${v.beschreibung ? `<h3 style="border-top:1px solid #ddd; padding-top:15px; margin-top:20px;">ℹ️ Info</h3><p style="font-size:14px; color:#555; line-height:1.5;">${v.beschreibung}</p>` : ''}
        
        <div style="margin-top:20px;">
            ${v.telefon ? `<a href="tel:${v.telefon}" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">📞 Anrufen</a>` : ''}
            ${v.email ? `<a href="mailto:${v.email}" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">✉️ E-Mail senden</a>` : ''}
            ${v.website ? `<a href="${v.website}" target="_blank" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none;">🌐 Website</a>` : ''}
        </div>
    `;
    document.getElementById('event-modal').style.display = 'block';
}

function oeffneEventDetails(e) {
    var body = document.getElementById('modal-body');
    var datum = new Date(e.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
    body.innerHTML = `<h2>${e.title}</h2><p style="color:#0056b3; font-weight:bold;">📅 ${datum} Uhr</p><div>${e.description || ''}</div><a href="${e.url}" target="_blank" class="ticket-btn" style="display:block; text-align:center; background:#0056b3; color:white; padding:15px; text-decoration:none; border-radius:8px; margin-top:20px;">🔗 Details auf Website</a>`;
    document.getElementById('event-modal').style.display = 'block';
}

// ==========================================
// 3. DATEN LADEN
// ==========================================
function ladeEvents() {
    fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events').then(r => r.json()).then(data => {
        var c = document.getElementById('events-container');
        if(!c) return; c.innerHTML = '';
        if (data.events) {
            data.events.forEach(e => {
                var d = document.createElement('div'); d.className = 'event-item';
                d.innerHTML = `<h3>${e.title}</h3><p style="font-size:13px; color:#666;">📅 ${new Date(e.start_date).toLocaleDateString()}</p>`;
                d.onclick = function() { oeffneEventDetails(e); };
                c.appendChild(d);
            });
        }
    }).catch(err => console.error(err));
}

function ladeGastro() {
    fetch('gastronomie.json?v=' + Date.now()).then(r => r.json()).then(data => {
        gastroDaten = data; rendereGastro(data);
    });
}

function rendereGastro(liste) {
    var c = document.getElementById('gastro-container');
    if(!c) return; c.innerHTML = '';
    liste.forEach(o => {
        var d = document.createElement('div'); d.className = 'event-item';
        d.innerHTML = `<h3>${o.name}</h3><p style="font-size:13px; color:#666;">📍 ${o.adresse}</p>`;
        d.onclick = function() { oeffneGastroDetails(o); };
        c.appendChild(d);
    });
}

function ladeVereine() {
    fetch('vereine.json?v=' + Date.now()).then(r => r.json()).then(data => {
        vereinsDaten = data; rendereVereine(data);
    });
}

function rendereVereine(liste) {
    var c = document.getElementById('vereine-container');
    if(!c) return; c.innerHTML = '';
    liste.forEach(v => {
        var d = document.createElement('div'); 
        d.className = 'event-item'; 
        var vorschau = v.beschreibung ? v.beschreibung.substring(0, 60) + '...' : '';
        d.innerHTML = `<span style="font-size:10px; text-transform:uppercase; color:#888;">${v.kategorie || ''}</span><h3 style="margin:5px 0;">${v.name}</h3><p style="font-size:13px; color:#666;">${vorschau}</p>`;
        d.onclick = function() { oeffneVereinDetails(v); };
        c.appendChild(d);
    });
}

function ladeNews() {
    var c = document.getElementById('news-container');
    if(!c) return;
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r => r.json()).then(data => {
        c.innerHTML = '';
        if (data.items) {
            data.items.forEach(item => {
                var d = document.createElement('div');
                d.style.padding = "10px 0"; d.style.borderBottom = "1px solid #eee";
                d.innerHTML = `<a href="${item.link}" target="_blank" style="text-decoration:none; color:#0056b3; font-weight:bold;">${item.title}</a>`;
                c.appendChild(d);
            });
        }
    });
}

function ladeHotels() {
    var container = document.getElementById('hotels-container');
    if (!container) return;
    fetch('uebernachtungen.json?v=' + Date.now()).then(r => r.json()).then(data => {
        container.innerHTML = '';
        data.forEach(h => {
            var div = document.createElement('div'); 
            div.className = 'event-item';
            div.innerHTML = `<h3>${h.name}</h3><p style="font-size:13px; color:#666;">📍 ${h.adresse}</p>`;
            div.onclick = function() { oeffneHotelDetails(h); };
            container.appendChild(div);
        });
    });
}

// ==========================================
// 4. FILTER LOGIK (Gastro & Vereine)
// ==========================================
function filterGastro() {
    var textInput = document.getElementById('gastro-suche');
    var dropInput = document.getElementById('gastro-filter');
    
    var query = textInput ? textInput.value.toLowerCase() : '';
    var kat = dropInput ? dropInput.value : 'alle';
    
    var gefiltert = gastroDaten.filter(function(o) {
        var matchText = o.name.toLowerCase().includes(query) || (o.kategorie && o.kategorie.toLowerCase().includes(query));
        var matchKat = (kat === 'alle') || (o.kategorie && o.kategorie.includes(kat));
        return matchText && matchKat;
    });
    
    rendereGastro(gefiltert);
}

var gs = document.getElementById('gastro-suche');
var gf = document.getElementById('gastro-filter');
if (gs) gs.addEventListener('input', filterGastro);
if (gf) gf.addEventListener('change', filterGastro);

var vf = document.getElementById('vereins-filter');
if(vf) vf.onchange = function(e) {
    var k = e.target.value;
    rendereVereine(k === 'alle' ? vereinsDaten : vereinsDaten.filter(v => v.kategorie === k));
};

// Start
ladeEvents(); ladeGastro(); ladeVereine(); ladeNews(); ladeHotels();