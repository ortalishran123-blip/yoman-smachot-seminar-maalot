const MAIN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT4sD0e69J_cUX043g8x2Z809Y8jK2f-5H-7uJ1x-m5N5F3G1L-0y6V7-N/pub?output=csv';
const UPDATES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTrG166hqo09whjz3w7F5zKJTHqJ7gIL93sU7p5zy4T7w7FkAdHuzNShKvIK1K5WxXTCzJB4z3I-3-d/pub?output=csv';

document.addEventListener('DOMContentLoaded', () => {
    loadMainEvents();
    loadUpdatesTicker();
});

// טעינת אירועים ראשיים + סרגל אירועים שעברו
function loadMainEvents() {
    Papa.parse(MAIN_CSV_URL, {
        download: true,
        header: true,
        complete: (results) => {
            const data = results.data;
            renderMainEvents(data);
            renderPastEventsTicker(data);
        }
    });
}

// עיבוד ורנדור סרגל שמאל (אירועים שהיו)
function renderPastEventsTicker(events) {
    const pastContainer = document.getElementById('past-events-ticker');
    if (!pastContainer) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastEvents = events.filter(item => {
        if (!item['תאריך']) return false;
        const eventDate = parseDate(item['תאריך']);
        if (!eventDate) return false;

        const diffDays = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));
        const type = (item['סוג השמחה'] || '').trim();

        if (type === 'חתונה' && diffDays > 0 && diffDays <= 30) return true;
        if (type === 'אירוסין' && diffDays > 0 && diffDays <= 10) return true;

        return false;
    });

    if (pastEvents.length === 0) {
        pastContainer.innerHTML = '<div class="ticker-card past">אין אירועים שהיו לאחרונה</div>';
        return;
    }

    let html = '';
    pastEvents.forEach(item => {
        html += `
            <div class="ticker-card past">
                <div class="card-title">${item['שם הכלה'] || ''} - ${item['סוג השמחה'] || ''}</div>
                <div class="card-body">${item['כיתה'] || ''} | ${item['אולם'] || ''}</div>
                <div class="card-date">${item['תאריך'] || ''}</div>
            </div>
        `;
    });

    // הכפלת התוכן ליצירת הלולאה האינסופית
    pastContainer.innerHTML = html + html;
}

// טעינת סרגל ימין (עדכונים מיוחדים)
function loadUpdatesTicker() {
    Papa.parse(UPDATES_CSV_URL, {
        download: true,
        header: false, // קריאה לפי אינדקסים כדי להתעלם מהכותרות ומשעת המילוי
        complete: (results) => {
            const rows = results.data.slice(1); // דילוג על שורת הכותרות
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
        // התעלמות מעמודה 0 (חותמת הזמן)
        const title = row[1] ? row[1].trim() : '';
        const content = row[2] ? row[2].trim() : '';
        const expDateStr = row[3] ? row[3].trim() : '';

        if (!title && !content) return;

        if (expDateStr) {
            const expDate = parseDate(expDateStr);
            if (expDate && expDate < today) return; // הסרה אם התאריך עבר
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
                ${item.expDateStr ? `<div class="card-date">בתוקף עד: ${item.expDateStr}</div>` : ''}
            </div>
        `;
    });

    // הכפלת התוכן ליצירת הלולאה האינסופית
    updatesContainer.innerHTML = html + html;
}

// פונקציית עזר להמרת מחרוזת תאריך לאובייקט Date
function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(/[\/.-]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }
    return null;
}
