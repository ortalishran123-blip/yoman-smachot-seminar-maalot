const MAIN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVr_HitWp_UPFptrGvBLcBmgbVCLL2q10Mtn-imC-re1yTluKSIj3pxAkFw7Uo6fh6vnuhTefulJYb/pub?output=csv';
const UPDATES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrG166hqo09whjz3w7F5zKJTHqJ7gIL93sU7p5zy4T7w7FkAdHuzNShKvIK1K5WxXTCzJB4z3I-3-d/pub?output=csv';

const EVENT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf-TX5InPNbEoZrM4sDcTJN20k9Ku8YcA-AjAXvMHWSdNkWkg/viewform';
const UPDATE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdkYAUSIoFMBtpxSyiMzAp8fSZlY2LQLbHHLHKDy1A2v_PinA/viewform?usp=dialog';

let allEvents = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadMainEvents();
    loadUpdatesTicker();
    setupEventListeners();
    setupFormButtons();
});

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        document.getElementById('clear-search').style.display = 'none';
        renderMainEvents();
    }
}

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

    const searchInput = document.getElementById('search-input');
    const searchVal = (searchInput?.value || '').toLowerCase().trim();
    
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) {
        clearBtn.style.display = searchVal ? 'block' : 'none';
    }
    
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

    filtered.sort((a, b) => {
        const dateA = parseDate(getRowValue(a, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']));
        const dateB = parseDate(getRowValue(b, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']));

        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="no-results">לא נמצאו שמחות תואמות</div>';
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const name = getRowValue(item, ['שם הכלה', 'שם', 'שם מלא']) || 'אירוע';
        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה', 'סוג']).trim();
        const classGroup = getRowValue(item, ['כיתה']);
        const track = getRowValue(item, ['מסלול']);
        const dateHebrew = getRowValue(item, ['תאריך עברי', 'תאריך']) || getRowValue(item, ['תאריך לועזי']);
        const dateGregorian = getRowValue(item, ['תאריך לועזי', 'תאריך אירוע']);
        const hall = getRowValue(item, ['אולם']);

        const classTrackText = [classGroup, track].filter(Boolean).join(' ');
        const badgeClass = type.includes('חתונה') ? 'badge-wedding' : 'badge-engagement';
        
        let countdownBadgeHtml = '';
        if (dateGregorian) {
            const eventDate = parseDate(dateGregorian);
            if (eventDate) {
                const diffTime = eventDate.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                let countdownText = diffDays === 0 ? 'היום!' : diffDays === 1 ? 'מחר' : diffDays === 2 ? 'מחרתיים' : `עוד ${diffDays} ימים`;
                const badgeStyleClass = diffDays <= 7 ? 'countdown-badge urgent' : 'countdown-badge normal';
                countdownBadgeHtml = `<div class="${badgeStyleClass}">${countdownText}</div>`;
            }
        }

        const moovitUrl = hall ? `https://moovitapp.com/?q=${encodeURIComponent(hall)}&lang=he` : '';
        const wazeUrl = hall ? `https://www.waze.com/ul?q=${encodeURIComponent(hall)}&navigate=yes` : '';
        const mapsUrl = hall ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hall)}` : '';

        // קישור לשיתוף ב-WhatsApp והוספה ליומן גוגל
        const shareText = `שמחה ביומן: ${name} - ${type} (${dateHebrew}) ${hall ? 'באולם ' + hall : ''}`;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        
        let googleCalUrl = '#';
        if (dateGregorian) {
            const parsed = parseDate(dateGregorian);
            if (parsed) {
                const isoDate = parsed.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 8);
                googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name + ' - ' + type)}&details=${encodeURIComponent(shareText)}&dates=${isoDate}/${isoDate}`;
            }
        }

        html += `
            <div class="event-row-item">
                ${countdownBadgeHtml}
                <div class="event-header-row">
                    ${type ? `<span class="badge ${badgeClass}">${type}</span>` : ''}
                    <h3 class="event-main-info">${name}</h3>
                    ${classTrackText ? `<span class="event-divider">|</span><span class="event-class-track">${classTrackText}</span>` : ''}
                </div>
                <div class="event-date-row">תאריך: ${dateHebrew}</div>
                <div class="event-location-row">
                    ${hall ? `אולם: ${hall}` : ''} 
                    ${moovitUrl ? `<a href="${moovitUrl}" target="_blank" class="moovit-btn">מוביט</a>` : ''}
                    ${wazeUrl ? `<a href="${wazeUrl}" target="_blank" class="moovit-btn">ווייז</a>` : ''}
                    ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="moovit-btn">מפות</a>` : ''}
                </div>
                <div class="event-actions-row">
                    <a href="${waUrl}" target="_blank" class="action-btn btn-wa">שתף ב-WhatsApp</a>
                    ${googleCalUrl !== '#' ? `<a href="${googleCalUrl}" target="_blank" class="action-btn btn-cal">הוסף ליומן</a>` : ''}
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

function setupFormButtons() {
    document.querySelectorAll('button, a').forEach(el => {
        const text = el.textContent || '';
        if (text.includes('הוספת שמחה חדשה')) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(EVENT_FORM_URL, '_blank');
            });
        }
        if (text.includes('הוספת עדכון')) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(UPDATE_FORM_URL, '_blank');
            });
        }
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

        let timeAgoText = diffDays === 0 ? 'היום!' : diffDays === 1 ? 'אתמול' : diffDays === 2 ? 'שלשום' : `לפני ${diffDays} ימים`;

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
