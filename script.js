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
            <div class="ticker-card past">
                <div class="past-time-tag">${timeAgoText}</div>
                <div class="card-title">${escapeHtml(name)} - ${escapeHtml(type)}</div>
                ${classGroup ? `<div class="card-body">כיתה: ${escapeHtml(classGroup)}</div>` : ''}
                <div class="card-date">${escapeHtml(dateHebrew)}</div>
            </div>
        `;
    });

    pastContainer.innerHTML = html;
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
                ${item.title ? `<div class="card-title">${escapeHtml(item.title)}</div>` : ''}
                ${item.content ? `<div class="card-body">${escapeHtml(item.content)}</div>` : ''}
                ${item.expDateStr ? `<div class="card-date">תאריך: ${escapeHtml(item.expDateStr)}</div>` : ''}
            </div>
        `;
    });

    updatesContainer.innerHTML = html;
}
