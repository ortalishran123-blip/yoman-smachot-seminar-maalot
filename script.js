// ==========================================
// פונקציות עזר מוגנות (Crash Guards)
// ==========================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getRowValue(item, keys) {
    if (!item) return '';
    for (let key of keys) {
        if (item[key] !== undefined && item[key] !== null) {
            return item[key].toString().trim();
        }
    }
    return '';
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(/[\/\.-]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function getDaysDiff(today, targetDate) {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffTime = t - d;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ==========================================
// פונקציות לרינדור הסיידברים
// ==========================================

function renderPastEventsTicker(events) {
    try {
        const pastContainer = document.getElementById('past-events-ticker');
        if (!pastContainer) return;

        if (!Array.isArray(events)) {
            pastContainer.innerHTML = '<div class="ticker-card">אין נתונים להצגה</div>';
            return;
        }

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
            if (diffDays === 0) timeAgoText = 'היום!';
            else if (diffDays === 1) timeAgoText = 'אתמול';
            else if (diffDays === 2) timeAgoText = 'שלשום';
            else timeAgoText = `לפני ${diffDays} ימים`;

            const dateHebrew = getRowValue(item, ['תאריך עברי', 'תאריך']) || dateStr;
            const type = getRowValue(item, ['חתונה/ אירוסין', 'סוג השמחה']);
            const name = getRowValue(item, ['שם הכלה', 'שם']);
            const classGroup = getRowValue(item, ['כיתה']);

            html += `
                <div class="ticker-card past">
                    <div class="past-time-tag">${timeAgoText}</div>
                    <div class="card-title">${escapeHtml(name)} - ${escapeHtml(type)}</div>
                    ${classGroup ? `<div class="card-body">כיתה: ${escapeHtml(classGroup)}</div>` : ''}
                    <div class="card-date">${escapeHtml(dateHebrew)}</div>
                </div>
            `;
        });

        pastContainer.innerHTML = html;
    } catch (err) {
        console.error("שגיאה בהצגת אירועים שהיו:", err);
    }
}

function renderUpdatesTicker(rows) {
    try {
        const updatesContainer = document.getElementById('updates-ticker');
        if (!updatesContainer) return;

        if (!Array.isArray(rows)) {
            updatesContainer.innerHTML = '<div class="ticker-card">אין עדכונים להצגה</div>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeUpdates = [];

        rows.forEach(row => {
            if (!row) return;

            const title = Array.isArray(row) ? (row[1] || '') : (row.title || row.כותרת || '');
            const content = Array.isArray(row) ? (row[2] || '') : (row.content || row.תוכן || '');
            const expDateStr = Array.isArray(row) ? (row[3] || '') : (row.expDate || row.תפוגה || '');

            const cleanTitle = title.toString().trim();
            const cleanContent = content.toString().trim();
            const cleanExp = expDateStr.toString().trim();

            if (!cleanTitle && !cleanContent) return;

            if (cleanExp) {
                const expDate = parseDate(cleanExp);
                if (expDate && expDate < today) return;
            }

            activeUpdates.push({ title: cleanTitle, content: cleanContent, expDateStr: cleanExp });
        });

        if (activeUpdates.length === 0) {
            updatesContainer.innerHTML = '<div class="ticker-card">אין עדכונים חדשים</div>';
            return;
        }

        let html = '';
        activeUpdates.forEach(item => {
            html += `
                <div class="ticker-card">
                    ${item.title ? `<div class="card-title">${escapeHtml(item.title)}</div>` : ''}
                    ${item.content ? `<div class="card-body">${escapeHtml(item.content)}</div>` : ''}
                    ${item.expDateStr ? `<div class="card-date">תאריך: ${escapeHtml(item.expDateStr)}</div>` : ''}
                </div>
            `;
        });

        updatesContainer.innerHTML = html;
    } catch (err) {
        console.error("שגיאה בהצגת עדכונים:", err);
    }
}
