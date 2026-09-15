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
    setupThemeToggle();
    setupBackToTop();
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
        },
        error: (err) => {
            console.error("שגיאה בטעינת הנתונים:", err);
            const listContainer = document.getElementById('events-list');
            if (listContainer) {
                listContainer.innerHTML = '<div class="no-results">אירעה שגיאה בטעינת הנתונים. אנא נסו שוב מאוחר יותר.</div>';
            }
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

    filtered.sort((a, b) => {
        const dateAStr = getRowValue(a, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']);
        const dateBStr = getRowValue(b, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']);
        const dateA = parseDate(dateAStr);
        const dateB = parseDate(dateBStr);

        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
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
        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך', 'תאריך אירוע']);

        const classTrackText = [classGroup, track].filter(Boolean).join(' ');
        const badgeClass = type.includes('חתונה') ? 'badge-wedding' : 'badge-engagement';
        
        let countdownBadgeHtml = '';
        let isUrgentClass = '';
        
        if (dateStr) {
            const eventDate = parseDate(dateStr);
            if (eventDate) {
                const diffDays = getDaysDiff(eventDate, today);
                let countdownText = '';
                let isUrgent = diffDays <= 7;

                if (diffDays === 0) countdownText = 'היום!';
                else if (diffDays === 1) countdownText = 'מחר';
                else if (diffDays === 2) countdownText = 'מחרתיים';
                else countdownText = `עוד ${diffDays} ימים`;

                if (diffDays <= 1) isUrgentClass = 'highlight-urgent';

                const badgeStyleClass = isUrgent ? 'countdown-badge urgent' : 'countdown-badge normal';
                countdownBadgeHtml = `<div class="${badgeStyleClass}">${countdownText}</div>`;
            }
        }

        const moovitUrl = hall ? `https://moovitapp.com/?q=${encodeURIComponent(hall)}&lang=he` : '';
        const wazeUrl = hall ? `https://www.waze.com/ul?q=${encodeURIComponent(hall)}&navigate=yes` : '';
        const mapsUrl = hall ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hall)}` : '';

        // קישורים חדשים: WhatsApp ו-Google Calendar
        const shareText = `מזל טוב! ${type} של ${name} ${classTrackText ? '(' + classTrackText + ')' : ''}\nתאריך: ${dateHebrew}\nאולם: ${hall || 'לא צוין'}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        
        const googleCalUrl = createGoogleCalendarUrl(name, type, dateStr, hall);

        const moovitIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-left: 3px;"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v4M6 20v2m12-2v2M5 11h6m-6 4h4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const wazeIcon = `<svg width="22" height="22" viewBox="0 0 512 512" style="vertical-align: middle;"><circle cx="256" cy="256" r="256" fill="#33ccff"/><path d="M120 230 C120 140, 190 90, 275 90 C360 90, 420 150, 420 235 C420 320, 360 380, 275 380 C245 380, 215 370, 190 355 L130 375 L145 320 C128 295, 120 265, 120 230 Z" fill="#ffffff"/><circle cx="195" cy="400" r="32" fill="#1a1c28"/><circle cx="340" cy="380" r="32" fill="#1a1c28"/><circle cx="230" cy="210" r="16" fill="#1a1c28"/><circle cx="320" cy="210" r="16" fill="#1a1c28"/><path d="M 235 255 Q 275 290 315 255" stroke="#1a1c28" stroke-width="12" stroke-linecap="round" fill="none"/></svg>`;
        const mapsIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2.5" style="vertical-align: middle; margin-left: 3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#4285f4"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`;

        html += `
            <div class="event-row-item ${isUrgentClass}">
                ${countdownBadgeHtml}
                <div class="event-header-row">
                    ${type ? `<span class="badge ${badgeClass}">${type}</span>` : ''}
                    <h3 class="event-main-info">${escapeHtml(name)}</h3>
                    ${classTrackText ? `<span class="event-divider">|</span><span class="event-class-track">${escapeHtml(classTrackText)}</span>` : ''}
                </div>
                <div class="event-date-row">
                    תאריך: ${escapeHtml(dateHebrew)}
                </div>
                <div class="event-location-row">
                    ${hall ? `אולם: ${escapeHtml(hall)}` : ''} 
                    ${moovitUrl ? `<a href="${moovitUrl}" target="_blank" class="moovit-btn" title="מוביט">${moovitIcon} מוביט</a>` : ''}
                    ${wazeUrl ? `<a href="${wazeUrl}" target="_blank" class="moovit-btn" title="וויז" style="margin-right: 5px; padding: 2px 4px; display: inline-flex; align-items: center;">${wazeIcon}</a>` : ''}
                    ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="moovit-btn" title="גוגל מפות" style="margin-right: 5px;">${mapsIcon} מפות</a>` : ''}
                </div>
                <!-- שורת כפתורי פעולה נוספים -->
                <div class="event-actions-row">
                    <a href="${whatsappUrl}" target="_blank" class="action-btn wa-btn" title="שיתוף ב-WhatsApp">💬 שיתוף</a>
                    ${googleCalUrl ? `<a href="${googleCalUrl}" target="_blank" class="action-btn cal-btn" title="הוספה ליומן גוגל">📅 ליומן</a>` : ''}
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
    const clearBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (clearBtn) {
                clearBtn.style.display = searchInput.value.trim() !== '' ? 'block' : 'none';
            }
            renderMainEvents();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                clearBtn.style.display = 'none';
                renderMainEvents();
            }
        });
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

        const diffDays = getDaysDiff(today, eventDate);
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
        const diffDays = eventDate ? getDaysDiff(today, eventDate) : 0;

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
                <div class="card-title" style="margin-top: 5px;">${escapeHtml(name)} - ${escapeHtml(type)}</div>
                ${classGroup ? `<div class="card-body">כיתה: ${escapeHtml(classGroup)}</div>` : ''}
                <div class="card-date">${escapeHtml(dateHebrew)}</div>
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
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-body">${escapeHtml(item.content)}</div>
                ${item.expDateStr ? `<div class="card-date">תאריך: ${escapeHtml(item.expDateStr)}</div>` : ''}
            </div>
        `;
    });

    updatesContainer.innerHTML = html;
}

// פונקציות עזר נוספות
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

function getDaysDiff(d1, d2) {
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function createGoogleCalendarUrl(name, type, dateStr, hall) {
    const d = parseDate(dateStr);
    if (!d) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    const isoDate = `${year}${month}${day}`;
    const title = encodeURIComponent(`${type}: ${name}`);
    const location = encodeURIComponent(hall || '');
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${isoDate}/${isoDate}&location=${location}`;
}

function setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeBtn.textContent = isDark ? '☀️ מצב יום' : '🌙 מצב כהה';
    });
}

function setupBackToTop() {
    const btn = document.getElementById('back-to-top-btn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
