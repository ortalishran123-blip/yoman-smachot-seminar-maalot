const MAIN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT4sD0e69J_cUX043g8x2Z809Y8jK2f-5H-7uJ1x-m5N5F3G1L-0y6V7-N/pub?output=csv';
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
    const searchVal = (document.getElementById('search-input').value || '').toLowerCase().trim();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = allEvents.filter(item => {
        const hasContent = Object.values(item).some(val => val && val.trim() !== '');
        if (!hasContent) return false;

        // סינון תאריך עתידי
        if (item['תאריך']) {
            const eventDate = parseDate(item['תאריך']);
            if (eventDate && eventDate < today) return false;
        }

        // סינון קטגוריה
        const type = (item['סוג השמחה'] || '').trim();
        if (currentFilter === 'wedding' && type !== 'חתונה') return false;
        if (currentFilter === 'engagement' && type !== 'אירוסין') return false;

        // סינון חיפוש
        if (searchVal !== '') {
            const rowString = Object.values(item).join(' ').toLowerCase();
            return rowString.includes(searchVal);
        }

        return true;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="no-results">לא נמצאו שמחות תואמות</div>';
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const name = item['שם הכלה'] || item['שם'] || 'שמחה מיוחדת';
        const type = item['סוג השמחה'] || '';
        const classGroup = item['כיתה'] || '';
        const track = item['מסלול'] || '';
        const date = item['תאריך'] || '';
        const hall = item['אולם'] || '';

        html += `
            <div class="event-card">
                <div class="card-header-row">
                    <h3>${name}</h3>
                    ${type ? `<span class="badge ${type === 'חתונה' ? 'badge-wedding' : 'badge-engagement'}">${type}</span>` : ''}
                </div>
                <div class="card-details">
                    ${(classGroup || track) ? `<p><strong>כיתה/מסלול:</strong> ${classGroup} ${track}</p>` : ''}
                    ${date ? `<p><strong>תאריך:</strong> ${date}</p>` : ''}
                    ${hall ? `<p><strong>אולם:</strong> ${hall}</p>` : ''}
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', renderMainEvents);
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
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

    pastContainer.innerHTML = html + html;
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
        const title = row[1] ? row[1].trim() : '';
        const content = row[2] ? row[2].trim() : '';
        const expDateStr = row[3] ? row[3].trim() : '';

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
                ${item.expDateStr ? `<div class="card-date">בתוקף עד: ${item.expDateStr}</div>` : ''}
            </div>
        `;
    });

    updatesContainer.innerHTML = html + html;
}

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
