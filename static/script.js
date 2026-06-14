const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TODAY = new Date();

let currentYear = TODAY.getFullYear();
let currentMonth = TODAY.getMonth() + 1;
let selectedDate = null;
let currentType = 'note';
let monthEntries = {};

const calendarGrid = document.getElementById('calendar-grid');
const monthTitle = document.getElementById('month-title');
const modalOverlay = document.getElementById('modal-overlay');
const modalDate = document.getElementById('modal-date');
const entriesList = document.getElementById('entries-list');
const entryForm = document.getElementById('entry-form');
const entryTitle = document.getElementById('entry-title');
const entryContent = document.getElementById('entry-content');
const entryTime = document.getElementById('entry-time');
const entryCategory = document.getElementById('entry-category');
const eventContent = document.getElementById('event-content');
const noteFields = document.getElementById('note-fields');
const eventFields = document.getElementById('event-fields');

document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    loadMonth();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    loadMonth();
});

document.querySelectorAll('.type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentType = tab.dataset.type;
        noteFields.style.display = currentType === 'note' ? 'block' : 'none';
        eventFields.style.display = currentType === 'event' ? 'block' : 'none';
    });
});

document.getElementById('close-modal').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
});

function closeModal() {
    modalOverlay.classList.remove('open');
    entryForm.reset();
    noteFields.style.display = 'block';
    eventFields.style.display = 'none';
    document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.type-tab[data-type="note"]').classList.add('active');
    currentType = 'note';
    selectedDate = null;
}

entryForm.addEventListener('submit', async e => {
    e.preventDefault();

    const data = {
        date: selectedDate,
        type: currentType,
        title: entryTitle.value.trim(),
        content: currentType === 'note' ? entryContent.value.trim() : eventContent.value.trim(),
        time: currentType === 'event' ? entryTime.value || null : null,
        category: currentType === 'event' ? entryCategory.value || null : null,
    };

    const res = await fetch('/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        const entry = await res.json();
        if (!monthEntries[selectedDate]) monthEntries[selectedDate] = [];
        monthEntries[selectedDate].push(entry);

        entryTitle.value = '';
        entryContent.value = '';
        entryTime.value = '';
        entryCategory.value = '';
        eventContent.value = '';

        renderEntriesInModal(selectedDate);
        renderCalendar();
    }
});

async function loadMonth() {
    monthTitle.textContent = `${MONTHS[currentMonth - 1]} ${currentYear}`;
    const res = await fetch(`/entries/${currentYear}/${currentMonth}`);
    const entries = await res.json();

    monthEntries = {};
    entries.forEach(e => {
        if (!monthEntries[e.date]) monthEntries[e.date] = [];
        monthEntries[e.date].push(e);
    });

    renderCalendar();
}

function renderCalendar() {
    const existing = calendarGrid.querySelectorAll('.day-cell');
    existing.forEach(c => c.remove());

    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const day = daysInPrevMonth - firstDay + 1 + i;
        calendarGrid.appendChild(createDayCell(day, true, null));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = currentYear === TODAY.getFullYear()
            && currentMonth === TODAY.getMonth() + 1
            && day === TODAY.getDate();
        calendarGrid.appendChild(createDayCell(day, false, dateStr, isToday));
    }

    const totalCells = firstDay + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder !== 0) {
        for (let i = 1; i <= 7 - remainder; i++) {
            calendarGrid.appendChild(createDayCell(i, true, null));
        }
    }
}

function createDayCell(day, otherMonth, dateStr, isToday = false) {
    const cell = document.createElement('div');
    cell.className = 'day-cell' + (otherMonth ? ' other-month' : '') + (isToday ? ' today' : '');

    const numEl = document.createElement('div');
    numEl.className = 'day-number';
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (dateStr && monthEntries[dateStr]) {
        const chips = document.createElement('div');
        chips.className = 'entry-chips';

        const visible = monthEntries[dateStr].slice(0, 3);
        visible.forEach(entry => {
            const chip = document.createElement('div');
            const cat = (entry.category || 'other').toLowerCase();
            chip.className = `chip ${entry.type === 'note' ? 'note' : `event-${cat}`}`;
            chip.textContent = entry.title;
            chips.appendChild(chip);
        });

        if (monthEntries[dateStr].length > 3) {
            const more = document.createElement('div');
            more.className = 'chip more';
            more.textContent = `+${monthEntries[dateStr].length - 3} more`;
            chips.appendChild(more);
        }

        cell.appendChild(chips);
    }

    if (!otherMonth && dateStr) {
        cell.addEventListener('click', () => openModal(dateStr));
    }

    return cell;
}

function openModal(dateStr) {
    selectedDate = dateStr;
    const [year, month, day] = dateStr.split('-').map(Number);
    modalDate.textContent = `${MONTHS[month - 1]} ${day}, ${year}`;
    renderEntriesInModal(dateStr);
    modalOverlay.classList.add('open');
    entryTitle.focus();
}

function renderEntriesInModal(dateStr) {
    const entries = monthEntries[dateStr] || [];

    if (entries.length === 0) {
        entriesList.innerHTML = '<p class="empty-entries">No entries yet — add one below.</p>';
        return;
    }

    entriesList.innerHTML = '';
    entries.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'entry-item';

        let meta = entry.type === 'note' ? 'Note' : 'Event';
        if (entry.type === 'event') {
            const parts = [];
            if (entry.time) parts.push(formatTime(entry.time));
            if (entry.category) parts.push(entry.category);
            if (parts.length) meta = parts.join(' · ');
        }

        item.innerHTML = `
            <div class="entry-info">
                <div class="entry-title">${escHtml(entry.title)}</div>
                <div class="entry-meta">${escHtml(meta)}</div>
                ${entry.content ? `<div class="entry-content">${escHtml(entry.content)}</div>` : ''}
            </div>
            <button class="delete-btn" title="Delete">&#x2715;</button>
        `;

        item.querySelector('.delete-btn').addEventListener('click', () => deleteEntry(entry.id, dateStr));
        entriesList.appendChild(item);
    });
}

async function deleteEntry(id, dateStr) {
    const res = await fetch(`/entries/${id}`, { method: 'DELETE' });
    if (res.ok) {
        monthEntries[dateStr] = monthEntries[dateStr].filter(e => e.id !== id);
        renderEntriesInModal(dateStr);
        renderCalendar();
    }
}

function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2,'0')} ${ampm}`;
}

function escHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

loadMonth();
