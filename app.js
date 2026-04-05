// Globaler Speicher
var gastroDaten = [];
var vereinsDaten = [];

// ==========================================
// 1. NAVIGATION
// ==========================================
function wechselTab(tabName) {
    var tabs = ['events', 'maps', 'mobilitaet', 'news', 'tickets', 'tourismus', 'gastro', 'vereine'];
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
setupNav('btn-mobilitaet', 'mobilitaet');
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
window.onclick = function(e) { if (e.target == document.getElementById('event-modal')) schliesseModal(); };

function oeffneDetails(obj, typ) {
    var body = document.getElementById('modal-body');
    var mapsLink = obj.adresse ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(obj.name + " " + obj.adresse) : "";
    
    var html = `<h2>${obj.name}</h2>`;
    html += `<span style="background:#eee; padding:3px 8px; border-radius:10px; font-size:11px;">${obj.kategorie || typ}</span>`;
    
    if (obj.adresse) {
        html += `<div style="margin-top:20px;">
            <a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4; color:white; display:block; text-align:center; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold; margin-bottom:20px;">📍 Navigiere zu</a>
            <p><b>Adresse:</b><br>${obj.adresse}</p>
        </div>`;
    }

    if (obj.plaetze) html += `<p><b>Stellplätze:</b> ${obj.plaetze}</p>`;
    if (obj.preise) html += `<p><b>Preise:</b><br>${obj.preise}</p>`;
    if (obj.beschreibung || obj.info) html += `<h3 style="border-top:1px solid #ddd; padding-top:15px; margin-top:20px;">ℹ️ Info</h3><p>${obj.beschreibung || obj.info}</p>`;

    html += `<div style="margin-top:20px;">`;
    if (obj.telefon) html += `<a href="tel:${obj.telefon}" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">📞 Anrufen</a>`;
    if (obj.website) html += `<a href="${obj.website}" target="_blank" class="ticket-btn" style="background:#f8f9fa; color:#333; border:1px solid #ddd; display:block; text-align:center; padding:12px; text-decoration:none;">🌐 Website</a>`;
    html += `</div>`;

    body.innerHTML = html;
    document.getElementById('event-modal').style.display = 'block';
}

function oeffneImpressum(e) {
    e.preventDefault();
    var body = document.getElementById('modal-body');
    body.innerHTML = `<h2>Impressum & Datenschutz</h2><p><b>Herausgeberin:</b> Kreisstadt Unna</p><p><b>Redaktion:</b> Armin Eichenmüller</p>`;
    document.getElementById('event-modal').style.display = 'block';
}
document.getElementById('link-impressum-1').onclick = oeffneImpressum;
document.getElementById('link-impressum-2').onclick = oeffneImpressum;

// ==========================================
// 3. DATEN LADEN
// ==========================================
function ladeMobilitaet() {
    fetch('mobilitaet.json?v=' + Date.now()).then(r => r.json()).then(data => {
        var pContainer = document.getElementById('parken-container');
        if(pContainer) {
            pContainer.innerHTML = '';
            data.parken.forEach(p => {
                var d = document.createElement('div'); d.className = 'event-item';
                d.innerHTML = `<h3>${p.name}</h3><p>📍 ${p.adresse}</p>`;
                d.onclick = function() { oeffneDetails(p, 'Parken'); };
                pContainer.appendChild(d);
            });
        }
        var rContainer = document.getElementById('rad-container');
        if(rContainer) {
            rContainer.innerHTML = '';
            data.rad.forEach(r => {
                var d = document.createElement('div'); d.className = 'event-item';
                d.innerHTML = `<h3>${r.name}</h3><p>🚲 ${r.info}</p>`;
                d.onclick = function() { oeffneDetails(r, 'Fahrrad'); };
                rContainer.appendChild(d);
            });
        }
        var tContainer = document.getElementById('taxi-container');
        if(tContainer) {
            tContainer.innerHTML = '';
            data.taxi.forEach(t => {
                var btn = document.createElement('a');
                btn.href = `tel:${t.telefon}`;
                btn.className = 'ticket-btn';
                btn.style.flex = '1 1 140px';
                btn.style.fontSize = '14px';
                btn.style.background = '#f8f9fa';
                btn.style.color = '#333';
                btn.style.border = '1px solid #ddd';
                btn.innerHTML = `🚕 ${t.name}`;
                tContainer.appendChild(btn);
            });
        }
    });
}

function ladeEvents() {
    fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events').then(r => r.json()).then(data => {
        var c = document.getElementById('events-container');
        if(!c) return; c.innerHTML = '';
        data.events.slice(0, 15).forEach(e => {
            var d = document.createElement('div'); d.className = 'event-item';
            d.innerHTML = `<h3>${e.title}</h3><p>📅 ${new Date(e.start_date).toLocaleDateString()}</p>`;
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
    fetch('gastronomie.json').then(r => r.json()).then(data => {
        var c = document.getElementById('gastro-container');
        if(!c) return; c.innerHTML = '';
        data.forEach(o => {
            var d = document.createElement('div'); d.className = 'event-item';
            d.innerHTML = `<h3>${o.name}</h3><p>📍 ${o.adresse}</p>`;
            d.onclick = function() { oeffneDetails(o, 'Gastro'); };
            c.appendChild(d);
        });
    });
}

function ladeVereine() {
    fetch('vereine.json').then(r => r.json()).then(data => {
        var c = document.getElementById('vereine-container');
        if(!c) return; c.innerHTML = '';
        data.forEach(v => {
            var d = document.createElement('div'); d.className = 'event-item';
            d.innerHTML = `<span style="font-size:10px; text-transform:uppercase;">${v.kategorie}</span><h3>${v.name}</h3>`;
            d.onclick = function() { oeffneDetails(v, 'Verein & Freizeit'); };
            c.appendChild(d);
        });
    });
}

function ladeHotels() {
    fetch('uebernachtungen.json').then(r => r.json()).then(data => {
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

// START
ladeEvents(); ladeGastro(); ladeVereine(); ladeNews(); ladeHotels(); ladeMobilitaet();