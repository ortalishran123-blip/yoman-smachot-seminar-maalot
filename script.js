// משתנים גלובליים
let allEvents = [];
let currentFilter = 'all';

// טעינת הנתונים בעליית העמוד
document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    // הגדרת האזנה לחיפוש
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderMainEvents();
        });
    }
});

// פונקציה לטעינת הנתונים (מ-Google Sheets או קובץ מקומי)
function fetchData() {
    if (typeof gapi !== 'undefined' && gapi.client) {
        loadGoogleSheetData();
    } else {
        renderMainEvents();
    }
}

// פונקציית עזר לשליפת ערך מתוך השורה לפי שמות שדות אפשריים
function getRowValue(item, possibleKeys) {
    for (let key of possibleKeys) {
        if (item[key] !== undefined && item[key] !== null) {
            return item[key].toString().trim();
        }
    }
    return '';
}

// פונקציה בטוחה להמרת תאריך בלי לגרום לקריסות
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // ניסיון לזהות פורמט נפוץ כמו DD/MM/YYYY או YYYY-MM-DD
    let parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        let date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
    }
    
    let parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;

    return null; // אם התאריך לא תקין (למשל תאריך עברי מחרוזתי), מחזיר null בבטחה
}

// פונקציה לעדכון מסננים (הכל, חתונות, אירוסין)
function setFilter(filterType) {
    currentFilter = filterType;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (filterType === 'all') document.getElementById('filter-all')?.classList.add('active');
    if (filterType === 'wedding') document.getElementById('filter-wedding')?.classList.add('active');
    if (filterType === 'engagement') document.getElementById('filter-engagement')?.classList.add('active');

    renderMainEvents();
}

// רינדור האירועים המרכזיים בעמוד
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
            // אם הצלחנו לפענח תאריך והוא עבר - נסנן אותו החוצה
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
        const dateStr = getRowValue(item, ['תאריך לועזי', 'תאריך']);
        const dateHebrew = getRowValue(item, ['תאריך עברי', 'תאריך']) || dateStr;
        const hall = getRowValue(item, ['אולם']);

        // חישוב בטוח של הימים שנותרו
        let countdownBadgeHtml = '';
        if (dateStr) {
            const eventDate = parseDate(dateStr);
            if (eventDate) {
                const diffTime = eventDate.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                let countdownText = '';
                let isUrgent = diffDays <= 7;

                if (diffDays === 0) {
                    countdownText = 'היום!';
                } else if (diffDays === 1) {
                    countdownText = 'מחר';
                } else if (diffDays === 2) {
                    countdownText = 'מחרתיים';
                } else if (diffDays === 7) {
                    countdownText = 'עוד שבוע';
                } else {
                    countdownText = `עוד ${diffDays} ימים`;
                }

                const badgeStyleClass = isUrgent ? 'countdown-badge urgent' : 'countdown-badge normal';
                countdownBadgeHtml = `<div class="${badgeStyleClass}">${countdownText}</div>`;
            }
        }

        const classTrackText = [classGroup, track].filter(Boolean).join(' ');
        const badgeClass = type.includes('חתונה') ? 'badge-wedding' : 'badge-engagement';
        
        const moovitUrl = hall ? `https://moovitapp.com/?q=${encodeURIComponent(hall)}&lang=he` : '';
        const wazeUrl = hall ? `https://www.waze.com/ul?q=${encodeURIComponent(hall)}&navigate=yes` : '';
        const mapsUrl = hall ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hall)}` : '';

        const moovitIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-left: 3px;"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v4M6 20v2m12-2v2M5 11h6m-6 4h4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const wazeIcon = `<svg width="22" height="22" viewBox="0 0 512 512" style="vertical-align: middle;"><circle cx="256" cy="256" r="256" fill="#33ccff"/><path d="M120 230 C120 140, 190 90, 275 90 C360 90, 420 150, 420 235 C420 320, 360 380, 275 380 C245 380, 215 370, 190 355 L130 375 L145 320 C128 295, 120 265, 120 230 Z" fill="#ffffff"/><circle cx="195" cy="400" r="32" fill="#1a1c28"/><circle cx="340" cy="380" r="32" fill="#1a1c28"/><circle cx="230" cy="210" r="16" fill="#1a1c28"/><circle cx="320" cy="210" r="16" fill="#1a1c28"/><path d="M 235 255 Q 275 290 315 255" stroke="#1a1c28" stroke-width="12" stroke-linecap="round" fill="none"/></svg>`;
        const mapsIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2.5" style="vertical-align: middle; margin-left: 3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#4285f4"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`;

        html += `
            <div class="event-row-item">
                ${countdownBadgeHtml}
                <div class="event-header-row">
                    ${type ? `<span class="badge ${badgeClass}">${type}</span>` : ''}
                    <h3 class="event-main-info">${name}</h3>
                    ${classTrackText ? `<span class="event-divider">|</span><span class="event-class-track">${classTrackText}</span>` : ''}
                </div>
                <div class="event-date-row">
                    תאריך: ${dateHebrew}
                </div>
                <div class="event-location-row">
                    אולם: ${hall} 
                    ${moovitUrl ? `<a href="${moovitUrl}" target="_blank" class="moovit-btn" title="מוביט">${moovitIcon} מוביט</a>` : ''}
                    ${wazeUrl ? `<a href="${wazeUrl}" target="_blank" class="moovit-btn" title="וויז" style="margin-right: 5px; padding: 2px 4px; display: inline-flex; align-items: center;">${wazeIcon}</a>` : ''}
                    ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="moovit-btn" title="גוגל מפות" style="margin-right: 5px;">${mapsIcon} מפות</a>` : ''}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}
