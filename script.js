const MAIN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVr_HitWp_UPFptrGvBLcBmgbVCLL2q10Mtn-imC-re1yTluKSIj3pxAkFw7Uo6fh6vnuhTefulJYb/pub?output=csv';
const UPDATES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrG166hqo09whjz3w7F5zKJTHqJ7gIL93sU7p5zy4T7w7FkAdHuzNShKvIK1K5WxXTCzJB4z3I-3-d/pub?output=csv';

let allEvents = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadMainEvents();
    loadUpdatesTicker();
    setupEventListeners();
});

function loadMainEvents() {
    Papa.parse(MAIN_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            allEvents = results.data;
            renderMainEvents();
            renderPastEventsTicker(allEvents);
        }
    });
}

function renderMainEvents() {
    const listContainer = document.getElementById('events-list');
    if (!listContainer) return;

    const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = allEvents.filter(item => {
        const hasContent = Object.values(item).some(val => val && val.toString().trim() !== '');
        if (!hasContent) return false;

        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']);
        if (dateStr) {
            const eventDate = parseDate(dateStr);
            if (eventDate && eventDate.getTime() < today.getTime()) {
                return false;
            }
        }

        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה', 'סוג']).trim();
        if (currentFilter === 'wedding' && !type.includes('חתונה')) return false;
        if (currentFilter === 'engagement' && !type.includes('אירוסין')) return false;

        if (searchVal !== '') {
            const rowString = Object.values(item).join(' ').toLowerCase();
            return rowString.includes(searchVal);
        }

        return true;
    });

    if (filtered.length === 0) {
        if (currentFilter === 'engagement') {
            listContainer.innerHTML = '<div class="no-results">אין אירוסין בקרוב</div>';
        } else if (currentFilter === 'wedding') {
            listContainer.innerHTML = '<div class="no-results">אין חתונות בקרוב</div>';
        } else {
            listContainer.innerHTML = '<div class="no-results">לא נמצאו שמחות עתידיות תואמות</div>';
        }
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const name = getRowValue(item, ['שם הכלה', 'שם', 'שם מלא']) || 'אירוע';
        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה', 'סוג']).trim();
        const classGroup = getRowValue(item, ['כיתה']);
        const track = getRowValue(item, ['מסלול']);
        const dateHebrew = getRowValue(item, ['תאריך עברי', 'תאריך']) || getRowValue(item, ['תאריך לועזי']);
        const hall = getRowValue(item, ['אולם']);

        const classTrackText = [classGroup, track].filter(Boolean).join(' ');
        
        // הגדרת קישורים לשירותי הניווט
        const moovitUrl = hall ? `https://moovitapp.com/?q=${encodeURIComponent(hall)}&lang=he` : '';
        const wazeUrl = hall ? `https://www.waze.com/ul?q=${encodeURIComponent(hall)}&navigate=yes` : '';
        const mapsUrl = hall ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hall)}` : '';

        // אייקונים
        const moovitIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-left: 3px;"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v4M6 20v2m12-2v2M5 11h6m-6 4h4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const wazeIcon = `<svg width="22" height="22" viewBox="0 0 512 512" style="vertical-align: middle;"><circle cx="256" cy="256" r="256" fill="#33ccff"/><path d="M120 230 C120 140, 190 90, 275 90 C360 90, 420 150, 420 235 C420 320, 360 380, 275 380 C245 380, 215 370, 190 355 L130 375 L145 320 C128 295, 120 265, 120 230 Z" fill="#ffffff"/><circle cx="195" cy="400" r="32" fill="#1a1c28"/><circle cx="340" cy="380" r="32" fill="#1a1c28"/><circle cx="230" cy="210" r="16" fill="#1a1c28"/><circle cx="320" cy="210" r="16" fill="#1a1c28"/><path d="M 235 255 Q 275 290 315 255" stroke="#1a1c28" stroke-width="12" stroke-linecap="round" fill="none"/></svg>`;
        const mapsIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2.5" style="vertical-align: middle; margin-left: 3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#4285f4"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`;

        html += `
            <div class="event-row-item">
                <div class="event-main-info">
                    <h3>${name}</h3>
                    ${classTrackText ? `<div class="event-class-track">${classTrackText}</div>` : ''}
                    ${type ? `<span class="badge ${type.includes('חתונה') ? 'badge-wedding' : 'badge-engagement'}">${type}</span>` : ''}
                </div>
                <div class="event-details-inline">
                    ${dateHebrew ? `<span><strong>תאריך:</strong> ${dateHebrew}</span>` : ''}
                    ${hall ? `<span><strong>אולם:</strong> ${hall} 
                        <a href="${moovitUrl}" target="_blank" class="moovit-btn" title="מוביט">${moovitIcon} מוביט</a>
                        <a href="${wazeUrl}" target="_blank" class="moovit-btn" title="וויז" style="margin-right: 5px; padding: 2px 4px; display: inline-flex; align-items: center;">${wazeIcon}</a>
                        <a href="${mapsUrl}" target="_blank" class="moovit-btn" title="גוגל מפות" style="margin-right: 5px;">${mapsIcon} מפות</a>
                    </span>` : ''}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

function getRowValue(row, possibleKeys) {
    for (let key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null) {
            return row[key].toString();
        }
    }
    return '';
}

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', renderMainEvents);
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.getAttribute('data-filter');
            renderMainEvents();
        });
    });
}

function renderPastEventsTicker(events) {
    const pastContainer = document.getElementById('past-events-ticker');
    if (!pastContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastEvents = events.filter(item => {
        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך']);
        if (!dateStr) return false;
        
        const eventDate = parseDate(dateStr);
        if (!eventDate) return false;

        const diffDays = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));
        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה']).trim();

        if (type.includes('חתונה') && diffDays > 0 && diffDays <= 30) return true;
        if (type.includes('אירוסין') && diffDays > 0 && diffDays <= 10) return true;

        return false;
    });

    if (pastEvents.length === 0) {
        pastContainer.innerHTML = '<div class="ticker-card past">אין אירועים שהיו לאחרונה</div>';
        return;
    }

    let html = '';
    pastEvents.forEach(item => {
        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך']);
        const eventDate = parseDate(dateStr);
        const diffDays = eventDate ? Math.floor((today - eventDate) / (1000 * 60 * 60 * 24)) : 0;

        let timeAgoText = '';
        if (diffDays === 0) {
            timeAgoText = 'היום!';
        } else if (diffDays === 1) {
            timeAgoText = 'אתמול';
        } else if (diffDays === 2) {
            timeAgoText = 'שלשום';
        } else {
            timeAgoText = `לפני ${diffDays} ימים`;
        }

        const dateHebrew = getRowValue(item, ['תאריך עברי', 'תאריך']) || dateStr;
        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה']);
        const name = getRowValue(item, ['שם הכלה', 'שם']);
        const classGroup = getRowValue(item, ['כיתה']);

        html += `
            <div class="ticker-card past" style="position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; right: 0; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: bold; padding: 2px 8px; border-bottom-left-radius: 6px;">${timeAgoText}</div>
                <div class="card-title" style="margin-top: 5px;">${name} - ${type}</div>
                ${classGroup ? `<div class="card-body">כיתה: ${classGroup}</div>` : ''}
                <div class="card-date">${dateHebrew}</div>
            </div>
        `;
    });

    pastContainer.innerHTML = html;
}

function loadUpdatesTicker() {
    Papa.parse(UPDATES_CSV_URL, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            const rows = results.data.slice(1);
            renderUpdatesTicker(rows);
        }
    });
}

function renderUpdatesTicker(rows) {
    const updatesContainer = document.getElementById('updates-ticker');
    if (!updatesContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeUpdates = [];

    rows.forEach(row => {
        const title = row[1] ? row[1].toString().trim() : '';
        const content = row[2] ? row[2].toString().trim() : '';
        const expDateStr = row[3] ? row[3].toString().trim() : '';

        if (!title && !content) return;

        if (expDateStr) {
            const expDate = parseDate(expDateStr);
            if (expDate && expDate < today) return;
        }

        activeUpdates.push({ title, content, expDateStr });
    });

    if (activeUpdates.length === 0) {
        updatesContainer.innerHTML = '<div class="ticker-card">אין עדכונים חדשים</div>';
        return;
    }

    let html = '';
    activeUpdates.forEach(item => {
        html += `
            <div class="ticker-card">
                <div class="card-title">${item.title}</div>
                <div class="card-body">${item.content}</div>
                ${item.expDateStr ? `<div class="card-date">תאריך: ${item.expDateStr}</div>` : ''}
            </div>
        `;
    });

    updatesContainer.innerHTML = html;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const cleanStr = dateStr.toString().trim();
    const parts = cleanStr.split(/[\/.-]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month, day);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    return null;
}
