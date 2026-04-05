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
// 2. MODAL & DETAILS
// ==========================================
function schliesseModal() {
    document.getElementById('event-modal').style.display = 'none';
}

document.getElementById('btn-close-modal').onclick = schliesseModal;
window.onclick = function(e) {
    if (e.target == document.getElementById('event-modal')) schliesseModal();
};

function oeffneDetails(obj, typ) {
    var body = document.getElementById('modal-body');
    var mapsLink = obj.adresse ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(obj.name + " " + obj.adresse) : "";
    
    var html = `<h2 style="margin:0;">${obj.name}</h2>`;
    html += `<span style="background:#eee; padding:3px 8px; border-radius:10px; font-size:11px; color:#333;">${obj.kategorie || typ}</span>`;
    
    if (obj.adresse) {
        html += `<div style="margin-top:20px;">
            <a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4; color:white; display:block; text-align:center; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold; margin-bottom:20px;">📍 Navigiere zu</a>
            <p><b>Adresse:</b><br>${obj.adresse}</p>
        </div>`;
    }

    if (obj.beschreibung) {
        html += `<h3 style="border-top:1px solid #ddd; padding-top:15px; margin-top:20px;">ℹ️ Info</h3><p style="font-size:14px; color:#555; line-height:1.5;">${obj.beschreibung}</p>`;
    }

    html += `<div style="margin-top:20px;">`;
    if (obj.telefon) html += `<a href="tel:${obj.telefon}" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">📞 Anrufen</a>`;
    if (obj.email) html += `<a href="mailto:${obj.email}" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">✉️ E-Mail</a>`;
    if (obj.website) html += `<a href="${obj.website}" target="_blank" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none;">🌐 Website</a>`;
    html += `</div>`;

    body.innerHTML = html;
    document.getElementById('event-modal').style.display = 'block';
}

function oeffneImpressum(e) {
    e.preventDefault();
    var body = document.getElementById('modal-body');
    body.innerHTML = `<h2>Impressum & Datenschutz</h2><p><b>Herausgeberin:</b><br>Kreisstadt Unna<br>Bürgermeister Dirk Wigant</p><p><b>Redaktion:</b><br>Armin Eichenmüller<br>armin.eichenmueller@stadt-unna.de</p><p><b>Datenschutz:</b><br>datenschutz@stadt-unna.de</p>`;
    document.getElementById('event-modal').style.display = 'block';
}

document.getElementById('link-impressum-1').onclick = oeffneImpressum;
document.getElementById('link-impressum-2').onclick = oeffneImpressum;

// ==========================================
// 3. DATEN LADEN
// ==========================================
function ladeEvents() {
    fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events').then(r => r.json()).then(data => {
        var c = document.getElementById('events-container');
        if(!c) return; c.innerHTML = '';
        data.events.slice(0, 15).forEach(e => {
            var d = document.createElement('div'); d.className = 'event-item';
            d.innerHTML = `<h3>${e.title}</h3><p style="font-size:13px; color:#666;">📅 ${new Date(e.start_date).toLocaleDateString()}</p>`;
            d.onclick = function() { 
                var body = document.getElementById('modal-body');
                body.innerHTML = `<h2>${e.title}</h2><p>📅 ${new Date(e.start_date).toLocaleString()}</p><div>${e.description}</div><a href="${e.url}" target="_blank" class="ticket-btn">🔗 Details</a>`;
                document.getElementById('event-modal').style.display = 'block';
            };
            c.appendChild(d);
        });
    });
}

function ladeGastro() {
    fetch('gastronomie.json?v=' + Date.now()).then(r => r.json()).then(data => { gastroDaten = data; rendereGastro(data); });
}
function rendereGastro(liste) {
    var c = document.getElementById('gastro-container');
    if(!c) return; c.innerHTML = '';
    liste.forEach(o => {
        var d = document.createElement('div'); d.className = 'event-item';
        d.innerHTML = `<h3>${o.name}</h3><p>📍 ${o.adresse}</p>`;
        d.onclick = function() { oeffneDetails(o, 'Gastronomie'); };
        c.appendChild(d);
    });
}

function ladeVereine() {
    fetch('vereine.json?v=' + Date.now()).then(r => r.json()).then(data => { vereinsDaten = data; rendereVereine(data); });
}
function rendereVereine(liste) {
    var c = document.getElementById('vereine-container');
    if(!c) return; c.innerHTML = '';
    liste.forEach(v => {
        var d = document.createElement('div'); d.className = 'event-item';
        d.innerHTML = `<span style="font-size:10px; text-transform:uppercase; color:#888;">${v.kategorie}</span><h3>${v.name}</h3>`;
        d.onclick = function() { oeffneDetails(v, 'Verein'); };
        c.appendChild(d);
    });
}

function ladeHotels() {
    fetch('uebernachtungen.json?v=' + Date.now()).then(r => r.json()).then(data => {
        var c = document.getElementById('hotels-container');
        if(!c) return; c.innerHTML = '';
        data.forEach(h => {
            var d = document.createElement('div'); d.className = 'event-item';
            d.innerHTML = `<h3>${h.name}</h3><p>📍 ${h.adresse}</p>`;
            d.onclick = function() { oeffneDetails(h, 'Übernachtung'); };
            c.appendChild(d);
        });
    });
}

function ladeNews() {
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r => r.json()).then(data => {
        var c = document.getElementById('news-container');
        if(!c) return; c.innerHTML = '';
        data.items.forEach(item => {
            var d = document.createElement('div'); d.style.padding = "10px 0"; d.style.borderBottom = "1px solid #eee";
            d.innerHTML = `<a href="${item.link}" target="_blank" style="text-decoration:none; color:#0056b3; font-weight:bold;">${item.title}</a>`;
            c.appendChild(d);
        });
    });
}

// FILTER
document.getElementById('gastro-suche').oninput = function() {
    var q = this.value.toLowerCase();
    rendereGastro(gastroDaten.filter(o => o.name.toLowerCase().includes(q)));
};
document.getElementById('gastro-filter').onchange = function() {
    var k = this.value;
    rendereGastro(k === 'alle' ? gastroDaten : gastroDaten.filter(o => o.kategorie === k));
};
document.getElementById('vereins-filter').onchange = function() {
    var k = this.value;
    rendereVereine(k === 'alle' ? vereinsDaten : vereinsDaten.filter(v => v.kategorie === k));
};

// START
ladeEvents(); ladeGastro(); ladeVereine(); ladeNews(); ladeHotels();