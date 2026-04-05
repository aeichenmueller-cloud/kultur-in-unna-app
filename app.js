var gastroDaten = [];
var vereinsDaten = [];

// NAVIGATION
function wechselTab(tabName) {
    const tabs = ['events', 'maps', 'mobilitaet', 'news', 'tickets', 'tourismus', 'gastro', 'vereine'];
    tabs.forEach(name => {
        const content = document.getElementById('content-' + name);
        const button = document.getElementById('btn-' + name);
        if (content) content.classList.remove('active');
        if (button) button.classList.remove('active');
    });
    const activeContent = document.getElementById('content-' + tabName);
    const activeButton = document.getElementById('btn-' + tabName);
    if (activeContent) activeContent.classList.add('active');
    if (activeButton) activeButton.classList.add('active');
    window.scrollTo(0, 0);
}

const navTabs = ['events', 'maps', 'mobilitaet', 'gastro', 'vereine', 'news', 'tickets', 'tourismus'];
navTabs.forEach(tab => {
    const btn = document.getElementById('btn-' + tab);
    if (btn) btn.onclick = () => wechselTab(tab);
});

// DARK MODE
const btnDarkMode = document.getElementById('btn-darkmode');
if (btnDarkMode) {
    btnDarkMode.onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkmode', document.body.classList.contains('dark-mode'));
    };
}
if (localStorage.getItem('darkmode') === 'true') document.body.classList.add('dark-mode');

// TEILEN
const btnShare = document.getElementById('btn-share');
if (btnShare) {
    btnShare.onclick = () => {
        if (navigator.share) {
            navigator.share({ title: 'Kultur in Unna App', url: window.location.href });
        }
    };
}

// MODAL
function schliesseModal() { document.getElementById('event-modal').style.display = 'none'; }
document.getElementById('btn-close-modal').onclick = schliesseModal;
window.onclick = function(e) { if (e.target == document.getElementById('event-modal')) schliesseModal(); };

function oeffneDetails(obj, typ) {
    var body = document.getElementById('modal-body');
    var mapsLink = obj.adresse ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(obj.name + " " + obj.adresse) : "";
    var html = `<h2>${obj.name}</h2><span style="background:var(--primary-color); color:white; padding:3px 8px; border-radius:10px; font-size:11px;">${obj.kategorie || typ}</span>`;
    if (obj.adresse) {
        html += `<div style="margin-top:20px;"><a href="${mapsLink}" target="_blank" class="ticket-btn" style="background:#4285F4; color:white; display:block; text-align:center; padding:15px; border-radius:8px; text-decoration:none; font-weight:bold;">📍 Navigiere zu</a><p><b>Adresse:</b><br>${obj.adresse}</p></div>`;
    }
    if (obj.plaetze) html += `<p><b>Stellplätze:</b> ${obj.plaetze}</p>`;
    if (obj.preise) html += `<p><b>Preise:</b><br>${obj.preise}</p>`;
    if (obj.beschreibung || obj.info) html += `<h3 style="border-top:1px solid var(--border-color); padding-top:15px; margin-top:20px;">ℹ️ Info</h3><p>${obj.beschreibung || obj.info}</p>`;
    html += `<div style="margin-top:20px;">`;
    if (obj.telefon) html += `<a href="tel:${obj.telefon}" class="ticket-btn" style="background:var(--card-bg); color:var(--text-color); border:1px solid var(--border-color); display:block; text-align:center; padding:12px; text-decoration:none; margin-bottom:10px;">📞 Anrufen</a>`;
    if (obj.website) html += `<a href="${obj.website}" target="_blank" class="ticket-btn" style="background:var(--card-bg); color:var(--text-color); border:1px solid var(--border-color); display:block; text-align:center; padding:12px; text-decoration:none;">🌐 Website</a>`;
    html += `</div>`;
    body.innerHTML = html;
    document.getElementById('event-modal').style.display = 'block';
}

// RENDERING FUNKTIONEN (FÜR FILTER)
function rendereGastro(liste) {
    var c = document.getElementById('gastro-container'); if(!c) return; c.innerHTML = '';
    liste.forEach(o => {
        var d = document.createElement('div'); d.className = 'event-item'; d.innerHTML = `<h3>${o.name}</h3><p>📍 ${o.adresse}</p>`;
        d.onclick = function() { oeffneDetails(o, 'Gastro'); }; c.appendChild(d);
    });
}

function rendereVereine(liste) {
    var c = document.getElementById('vereine-container'); if(!c) return; c.innerHTML = '';
    liste.forEach(v => {
        var d = document.createElement('div'); d.className = 'event-item';
        d.innerHTML = `<span style="font-size:10px; text-transform:uppercase;">${v.kategorie}</span><h3>${v.name}</h3>`;
        d.onclick = function() { oeffneDetails(v, 'Verein & Freizeit'); }; c.appendChild(d);
    });
}

// DATEN LADEN
function ladeGastro() {
    fetch('gastronomie.json').then(r => r.json()).then(data => { gastroDaten = data; rendereGastro(data); });
}

function ladeVereine() {
    fetch('vereine.json').then(r => r.json()).then(data => { vereinsDaten = data; rendereVereine(data); });
}

function ladeMobilitaet() {
    fetch('mobilitaet.json?v=' + Date.now()).then(r => r.json()).then(data => {
        var pC = document.getElementById('parken-container'); if(pC) { pC.innerHTML = ''; data.parken.forEach(p => {
            var d = document.createElement('div'); d.className = 'event-item'; d.innerHTML = `<h3>${p.name}</h3><p>📍 ${p.adresse}</p>`;
            d.onclick = function() { oeffneDetails(p, 'Parken'); }; pC.appendChild(d);
        }); }
        var rC = document.getElementById('rad-container'); if(rC) { rC.innerHTML = ''; data.rad.forEach(r => {
            var d = document.createElement('div'); d.className = 'event-item'; d.innerHTML = `<h3>${r.name}</h3><p>🚲 ${r.info}</p>`;
            d.onclick = function() { oeffneDetails(r, 'Fahrrad'); }; rC.appendChild(d);
        }); }
        var tC = document.getElementById('taxi-container'); if(tC) { tC.innerHTML = ''; data.taxi.forEach(t => {
            var btn = document.createElement('a'); btn.href = `tel:${t.telefon}`; btn.className = 'ticket-btn'; btn.style.flex = '1 1 140px'; btn.innerHTML = `🚕 ${t.name}`; tC.appendChild(btn);
        }); }
    });
}

function ladeEvents() {
    fetch('https://kultur-in-unna.de/wp-json/tribe/events/v1/events').then(r => r.json()).then(data => {
        var c = document.getElementById('events-container'); if(!c) return; c.innerHTML = '';
        data.events.slice(0, 15).forEach(e => {
            var d = document.createElement('div'); d.className = 'event-item'; d.innerHTML = `<h3>${e.title}</h3><p>📅 ${new Date(e.start_date).toLocaleDateString()}</p>`;
            d.onclick = function() { 
                var body = document.getElementById('modal-body');
                body.innerHTML = `<h2>${e.title}</h2><p>📅 ${new Date(e.start_date).toLocaleString()}</p><div>${e.description}</div><a href="${e.url}" target="_blank" class="ticket-btn">🔗 Details</a>`;
                document.getElementById('event-modal').style.display = 'block';
            }; c.appendChild(d);
        });
    });
}

function ladeHotels() {
    fetch('uebernachtungen.json').then(r => r.json()).then(data => {
        var c = document.getElementById('hotels-container'); if(!c) return; c.innerHTML = '';
        data.forEach(h => {
            var d = document.createElement('div'); d.className = 'event-item'; d.innerHTML = `<h3>${h.name}</h3><p>📍 ${h.adresse}</p>`;
            d.onclick = function() { oeffneDetails(h, 'Übernachtung'); }; c.appendChild(d);
        });
    });
}

function ladeNews() {
    fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.presse-service.de/rss.aspx?p=1032').then(r => r.json()).then(data => {
        var c = document.getElementById('news-container'); if(!c) return; c.innerHTML = '';
        data.items.forEach(item => {
            var d = document.createElement('div'); d.style.padding = "10px 0"; d.style.borderBottom = "1px solid var(--border-color)";
            d.innerHTML = `<a href="${item.link}" target="_blank" style="text-decoration:none; color:var(--primary-color); font-weight:bold;">${item.title}</a>`;
            c.appendChild(d);
        });
    });
}

// FILTER LOGIK EVENT LISTENER
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
ladeEvents(); ladeGastro(); ladeVereine(); ladeNews(); ladeHotels(); ladeMobilitaet();