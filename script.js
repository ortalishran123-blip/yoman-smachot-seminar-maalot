const MAIN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVr_HitWp_UPFptrGvBLcBmgbVCLL2q10Mtn-imC-re1yTluKSIj3pxAkFw7Uo6fh6vnuhTefulJYb/pub?output=csv';[cite: 1]
const UPDATES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrG166hqo09whjz3w7F5zKJTHqJ7gIL93sU7p5zy4T7w7FkAdHuzNShKvIK1K5WxXTCzJB4z3I-3-d/pub?output=csv';[cite: 1]

const EVENT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf-TX5InPNbEoZrM4sDcTJN20k9Ku8YcA-AjAXvMHWSdNkWkg/viewform';[cite: 1]
const UPDATE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdkYAUSIoFMBtpxSyiMzAp8fSZlY2LQLbHHLHKDy1A2v_PinA/viewform?usp=dialog';[cite: 1]

let allEvents = [];[cite: 1]
let currentFilter = 'all';[cite: 1]

document.addEventListener('DOMContentLoaded', () => {[cite: 1]
    loadMainEvents();[cite: 1]
    loadUpdatesTicker();[cite: 1]
    setupEventListeners();[cite: 1]
    setupFormButtons();[cite: 1]
});[cite: 1]

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

function loadMainEvents() {[cite: 1]
    Papa.parse(MAIN_CSV_URL, {[cite: 1]
        download: true,[cite: 1]
        header: true,[cite: 1]
        skipEmptyLines: true,[cite: 1]
        complete: (results) => {[cite: 1]
            allEvents = results.data;[cite: 1]
            renderMainEvents();[cite: 1]
            renderPastEventsTicker(allEvents);[cite: 1]
        }
    });[cite: 1]
}[cite: 1]

function renderMainEvents() {[cite: 1]
    const listContainer = document.getElementById('events-list');[cite: 1]
    if (!listContainer) return;[cite: 1]

    const searchInput = document.getElementById('search-input');
    const searchVal = (searchInput?.value || '').toLowerCase().trim();
    
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) {
        clearBtn.style.display = searchVal ? 'block' : 'none';
    }
    
    const today = new Date();[cite: 1]
    today.setHours(0, 0, 0, 0);[cite: 1]

    const filtered = allEvents.filter(item => {[cite: 1]
        const hasContent = Object.values(item).some(val => val && val.toString().trim() !== '');[cite: 1]
        if (!hasContent) return false;[cite: 1]

        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']);[cite: 1]
        if (dateStr) {[cite: 1]
            const eventDate = parseDate(dateStr);[cite: 1]
            if (eventDate && eventDate.getTime() < today.getTime()) {[cite: 1]
                return false;[cite: 1]
            }
        }

        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה', 'סוג']).trim();[cite: 1]
        if (currentFilter === 'wedding' && !type.includes('חתונה')) return false;[cite: 1]
        if (currentFilter === 'engagement' && !type.includes('אירוסין')) return false;[cite: 1]

        if (searchVal !== '') {[cite: 1]
            const rowString = Object.values(item).join(' ').toLowerCase();[cite: 1]
            return rowString.includes(searchVal);[cite: 1]
        }

        return true;[cite: 1]
    });

    filtered.sort((a, b) => {[cite: 1]
        const dateA = parseDate(getRowValue(a, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']));[cite: 1]
        const dateB = parseDate(getRowValue(b, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']));[cite: 1]

        if (!dateA) return 1;[cite: 1]
        if (!dateB) return -1;[cite: 1]
        return dateA.getTime() - dateB.getTime();[cite: 1]
    });

    if (filtered.length === 0) {[cite: 1]
        listContainer.innerHTML = '<div class="no-results">לא נמצאו שמחות תואמות</div>';
        return;[cite: 1]
    }

    let html = '';[cite: 1]
    filtered.forEach(item => {[cite: 1]
        const name = getRowValue(item, ['שם הכלה', 'שם', 'שם מלא']) || 'אירוע';[cite: 1]
        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה', 'סוג']).trim();[cite: 1]
        const classGroup = getRowValue(item, ['כיתה']);[cite: 1]
        const track = getRowValue(item, ['מסלול']);[cite: 1]
        const dateHebrew = getRowValue(item, ['תאריך עברי', 'תאריך']) || getRowValue(item, ['תאריך לועזי']);[cite: 1]
        const dateGregorian = getRowValue(item, ['תאריך לועזי', 'תאריך אירוע']);
        const hall = getRowValue(item, ['אולם']);[cite: 1]

        const classTrackText = [classGroup, track].filter(Boolean).join(' ');[cite: 1]
        const badgeClass = type.includes('חתונה') ? 'badge-wedding' : 'badge-engagement';[cite: 1]
        
        let countdownBadgeHtml = '';[cite: 1]
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

        const moovitUrl = hall ? `https://moovitapp.com/?to=${encodeURIComponent(hall)}&metroId=1&lang=he` : '';
        const wazeUrl = hall ? `https://www.waze.com/ul?q=${encodeURIComponent(hall)}&navigate=yes` : '';[cite: 1]
        const mapsUrl = hall ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hall)}` : '';[cite: 1]

        // אייקונים רשמיים עבור אפליקציות הניווט
        const moovitIcon = 'https://cdn-icons-png.flaticon.com/512/3448/3448610.png';
        const wazeIcon = 'https://cdn-icons-png.flaticon.com/512/732/732257.png';
        const mapsIcon = 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png';

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
                <div class="event-location-row" style="display: flex; align-items: center; gap: 8px;">
                    ${hall ? `<span>אולם: ${hall}</span>` : ''} 
                    ${moovitUrl ? `<a href="${moovitUrl}" target="_blank" title="ניווט ב-Moovit"><img src="${moovitIcon}" alt="Moovit" style="width: 22px; height: 22px; vertical-align: middle;"></a>` : ''}
                    ${wazeUrl ? `<a href="${wazeUrl}" target="_blank" title="ניווט ב-Waze"><img src="${wazeIcon}" alt="Waze" style="width: 22px; height: 22px; vertical-align: middle;"></a>` : ''}
                    ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" title="ניווט ב-Google Maps"><img src="${mapsIcon}" alt="Maps" style="width: 22px; height: 22px; vertical-align: middle;"></a>` : ''}
                </div>
                <div class="event-actions-row">
                    <a href="${waUrl}" target="_blank" class="action-btn btn-wa">שתף ב-WhatsApp</a>
                    ${googleCalUrl !== '#' ? `<a href="${googleCalUrl}" target="_blank" class="action-btn btn-cal">הוסף ליומן</a>` : ''}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;[cite: 1]
}

function getRowValue(row, possibleKeys) {[cite: 1]
    for (let key of possibleKeys) {[cite: 1]
        if (row[key] !== undefined && row[key] !== null) {[cite: 1]
            return row[key].toString();[cite: 1]
        }
    }
    return '';[cite: 1]
}

function setupEventListeners() {[cite: 1]
    const searchInput = document.getElementById('search-input');[cite: 1]
    if (searchInput) {[cite: 1]
        searchInput.addEventListener('input', renderMainEvents);[cite: 1]
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {[cite: 1]
        btn.addEventListener('click', (e) => {[cite: 1]
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));[cite: 1]
            e.currentTarget.classList.add('active');[cite: 1]
            currentFilter = e.currentTarget.getAttribute('data-filter');[cite: 1]
            renderMainEvents();[cite: 1]
        });
    });
}

function setupFormButtons() {[cite: 1]
    document.querySelectorAll('button, a').forEach(el => {[cite: 1]
        const text = el.textContent || '';[cite: 1]
        if (text.includes('הוספת שמחה חדשה')) {[cite: 1]
            el.addEventListener('click', (e) => {[cite: 1]
                e.preventDefault();[cite: 1]
                window.open(EVENT_FORM_URL, '_blank');[cite: 1]
            });
        }
        if (text.includes('הוספת עדכון')) {[cite: 1]
            el.addEventListener('click', (e) => {[cite: 1]
                e.preventDefault();[cite: 1]
                window.open(UPDATE_FORM_URL, '_blank');[cite: 1]
            });
        }
    });
}

function renderPastEventsTicker(events) {[cite: 1]
    const pastContainer = document.getElementById('past-events-ticker');[cite: 1]
    if (!pastContainer) return;[cite: 1]

    const today = new Date();[cite: 1]
    today.setHours(0, 0, 0, 0);[cite: 1]

    const pastEvents = events.filter(item => {[cite: 1]
        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך']);[cite: 1]
        if (!dateStr) return false;[cite: 1]
        
        const eventDate = parseDate(dateStr);[cite: 1]
        if (!eventDate) return false;[cite: 1]

        const diffDays = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));[cite: 1]
        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה']).trim();[cite: 1]

        if (type.includes('חתונה') && diffDays > 0 && diffDays <= 30) return true;[cite: 1]
        if (type.includes('אירוסין') && diffDays > 0 && diffDays <= 10) return true;[cite: 1]

        return false;[cite: 1]
    });

    if (pastEvents.length === 0) {[cite: 1]
        pastContainer.innerHTML = '<div class="ticker-card past">אין אירועים שהיו לאחרונה</div>';[cite: 1]
        return;[cite: 1]
    }

    let html = '';[cite: 1]
    pastEvents.forEach(item => {[cite: 1]
        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך']);[cite: 1]
        const eventDate = parseDate(dateStr);[cite: 1]
        const diffDays = eventDate ? Math.floor((today - eventDate) / (1000 * 60 * 60 * 24)) : 0;[cite: 1]

        let timeAgoText = diffDays === 0 ? 'היום!' : diffDays === 1 ? 'אתמול' : diffDays === 2 ? 'שלשום' : `לפני ${diffDays} ימים`;[cite: 1]

        const dateHebrew = getRowValue(item, ['תאריך עברי', 'תאריך']) || dateStr;[cite: 1]
        const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה']);[cite: 1]
        const name = getRowValue(item, ['שם הכלה', 'שם']);[cite: 1]
        const classGroup = getRowValue(item, ['כיתה']);[cite: 1]

        html += `
            <div class="ticker-card past" style="position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; right: 0; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: bold; padding: 2px 8px; border-bottom-left-radius: 6px;">${timeAgoText}</div>
                <div class="card-title" style="margin-top: 5px;">${name} - ${type}</div>
                ${classGroup ? `<div class="card-body">כיתה: ${classGroup}</div>` : ''}
                <div class="card-date">${dateHebrew}</div>
            </div>
        `;[cite: 1]
    });

    pastContainer.innerHTML = html;[cite: 1]
}

function loadUpdatesTicker() {[cite: 1]
    Papa.parse(UPDATES_CSV_URL, {[cite: 1]
        download: true,[cite: 1]
        header: false,[cite: 1]
        skipEmptyLines: true,[cite: 1]
        complete: (results) => {[cite: 1]
            const rows = results.data.slice(1);[cite: 1]
            renderUpdatesTicker(rows);[cite: 1]
        }
    });[cite: 1]
}

function renderUpdatesTicker(rows) {[cite: 1]
    const updatesContainer = document.getElementById('updates-ticker');[cite: 1]
    if (!updatesContainer) return;[cite: 1]

    const today = new Date();[cite: 1]
    today.setHours(0, 0, 0, 0);[cite: 1]

    const activeUpdates = [];[cite: 1]

    rows.forEach(row => {[cite: 1]
        const title = row[1] ? row[1].toString().trim() : '';[cite: 1]
        const content = row[2] ? row[2].toString().trim() : '';[cite: 1]
        const expDateStr = row[3] ? row[3].toString().trim() : '';[cite: 1]

        if (!title && !content) return;[cite: 1]

        if (expDateStr) {[cite: 1]
            const expDate = parseDate(expDateStr);[cite: 1]
            if (expDate && expDate < today) return;[cite: 1]
        }

        activeUpdates.push({ title, content, expDateStr });[cite: 1]
    });

    if (activeUpdates.length === 0) {[cite: 1]
        updatesContainer.innerHTML = '<div class="ticker-card">אין עדכונים חדשים</div>';[cite: 1]
        return;[cite: 1]
    }

    let html = '';[cite: 1]
    activeUpdates.forEach(item => {[cite: 1]
        html += `
            <div class="ticker-card">
                <div class="card-title">${item.title}</div>
                <div class="card-body">${item.content}</div>
                ${item.expDateStr ? `<div class="card-date">תאריך: ${item.expDateStr}</div>` : ''}
            </div>
        `;[cite: 1]
    });

    updatesContainer.innerHTML = html;[cite: 1]
}

function parseDate(dateStr) {[cite: 1]
    if (!dateStr) return null;[cite: 1]
    const cleanStr = dateStr.toString().trim();[cite: 1]
    const parts = cleanStr.split(/[\/.-]/);[cite: 1]
    if (parts.length === 3) {[cite: 1]
        let day = parseInt(parts[0], 10);[cite: 1]
        let month = parseInt(parts[1], 10) - 1;[cite: 1]
        let year = parseInt(parts[2], 10);[cite: 1]
        if (year < 100) year += 2000;[cite: 1]
        const d = new Date(year, month, day);[cite: 1]
        d.setHours(0, 0, 0, 0);[cite: 1]
        return d;[cite: 1]
    }
    return null;[cite: 1]
}
