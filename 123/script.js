// הקישור החדש ל-CSV
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRVr_HitWp_UPFptrGvBLcBmgbVCLL2q10Mtn-imC-re1yTluKSIj3pxAkFw7Uo6fh6vnuhTefulJYb/pub?output=csv';

let allEvents = [];
let currentFilter = 'all';

// פונקציה להסרת ניקוד עברית
function removeNiqqud(text) {
    if (!text) return '';
    return text.replace(/[\u0591-\u05C7]/g, '');
}

function loadEvents() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: false,
        skipEmptyLines: 'greedy',
        complete: function(results) {
            const rows = results.data;
            allEvents = [];

            if (!rows || rows.length <= 1) return;

            // עוברים על כל השורות בגיליון (מתחילים משורה 1, אחרי הכותרות)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                // בדיקה פרטנית לכל שורה: האם התא הראשוני מכיל תאריך ושעה של גוגל טופס
                const cell0 = (row[0] || '').trim();
                const isFormResponse = cell0.includes('/') && (cell0.includes(':') || cell0.length > 12);

                const offset = isFormResponse ? 1 : 0;

                const hebrewDate    = removeNiqqud(row[0 + offset] || '').trim();
                const dayOfWeek     = removeNiqqud(row[1 + offset] || '').trim();
                const classGroup    = removeNiqqud(row[2 + offset] || '').trim();
                const track         = removeNiqqud(row[3 + offset] || '').trim();
                const names         = removeNiqqud(row[4 + offset] || '').trim();
                const location      = removeNiqqud(row[5 + offset] || '').trim();
                const eventType     = removeNiqqud(row[6 + offset] || 'חתונה').trim();
                const gregorianDate = (row[7 + offset] || '').trim();

                if (!names && !hebrewDate) continue;

                allEvents.push({
                    hebrewDate,
                    dayOfWeek,
                    classGroup,
                    track,
                    names,
                    location,
                    eventType,
                    gregorianDate
                });
            }

            sortEventsByDate();
            applyFilters();
        },
        error: function(err) {
            console.error('שגיאה בטעינת הנתונים:', err);
            document.getElementById('events-list').innerHTML = '<p style="text-align:center; color:red;">שגיאה בטעינת הנתונים מהגליון</p>';
        }
    });
}

function parseDate(gregorianDateStr) {
    if (!gregorianDateStr) return null;
    const parts = gregorianDateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

function sortEventsByDate() {
    allEvents.sort((a, b) => {
        const dateA = parseDate(a.gregorianDate);
        const dateB = parseDate(b.gregorianDate);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });
}

function getDaysLeftText(gregorianDateStr) {
    const eventDate = parseDate(gregorianDateStr);
    if (!eventDate || isNaN(eventDate.getTime())) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'היום!';
    if (diffDays === 1) return 'מחר!';
    if (diffDays > 1) return `עוד ${diffDays} ימים`;
    if (diffDays < 0) return 'עבר';
    return '';
}

function renderEvents(events) {
    const container = document.getElementById('events-list');
    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; padding: 40px;">לא נמצאו אירועים מתאימים</p>';
        return;
    }

    events.forEach(event => {
        const daysLeftText = getDaysLeftText(event.gregorianDate);
        
        const isEngagement = event.eventType.includes('אירוסין');
        const typeClass = isEngagement ? 'engagement' : 'wedding';
        const typeText = isEngagement ? 'אירוסין' : 'חתונה';

        const moovitUrl = `https://moovitapp.com/?to=${encodeURIComponent(event.location)}&host=moovitapp.com&metroId=1`;

        const card = document.createElement('div');
        card.className = `event-card ${typeClass}`;
        card.innerHTML = `
            <div class="event-main">
                <div class="event-header">
                    <h3>כלה: ${event.names || 'ללא שם'}</h3>
                    <span class="badge ${typeClass}">${typeText}</span>
                </div>
                ${event.classGroup ? `<div class="event-info">🏫 כיתה: ${event.classGroup}</div>` : ''}
                ${event.track ? `<div class="event-info">🎓 מסלול: ${event.track}</div>` : ''}
                ${event.location ? `
                <div class="event-info location-row">
                    <span>📍 אולם: ${event.location}</span>
                    <a href="${moovitUrl}" target="_blank" class="transit-btn" title="דרכי הגעה ב-Moovit">🚌</a>
                </div>` : ''}
            </div>
            <div class="date-box">
                <div class="day">${event.dayOfWeek}</div>
                <div class="hebrew-date">${event.hebrewDate}</div>
                ${daysLeftText ? `<div class="days-left">${daysLeftText}</div>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

    const filtered = allEvents.filter(event => {
        // סינון אירועים שכבר עברו
        const daysLeftText = getDaysLeftText(event.gregorianDate);
        if (daysLeftText === 'עבר') return false;

        const matchesSearch = event.names.toLowerCase().includes(searchTerm) ||
                              event.classGroup.toLowerCase().includes(searchTerm) ||
                              event.track.toLowerCase().includes(searchTerm) ||
                              event.location.toLowerCase().includes(searchTerm) ||
                              event.hebrewDate.toLowerCase().includes(searchTerm);

        if (!matchesSearch) return false;

        const isEngagement = event.eventType.includes('אירוסין');

        if (currentFilter === 'wedding') return !isEngagement;
        if (currentFilter === 'engagement') return isEngagement;
        
        return true;
    });

    renderEvents(filtered);
}

document.getElementById('search-input').addEventListener('input', applyFilters);

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        applyFilters();
    });
});

loadEvents();