// State
let countdowns = JSON.parse(localStorage.getItem('countdowns')) || [];
let projects = JSON.parse(localStorage.getItem('projects')) || [];
let currentModalCountdown = null;
let mustardUnlocked = localStorage.getItem('mustardUnlocked') === 'true';

// Get color class based on index
function getColorClass(index) {
    if (mustardUnlocked) {
        const colors = ['color-teal', 'color-coral', 'color-mustard'];
        return colors[index % 3];
    } else {
        return index % 2 === 0 ? 'color-teal' : 'color-coral';
    }
}

// Tab Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const countdownsNav = document.getElementById('countdowns-nav');

// View Switcher Elements
const viewButtons = document.querySelectorAll('.view-btn');
let currentView = 'list';

// Projects Nav
const projectsNav = document.getElementById('projects-nav');
const projectNavButtons = document.querySelectorAll('#projects-nav .nav-btn');
const projectPages = document.querySelectorAll('#tab-projects .page');

// Tab Switching
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `tab-${tab}`) {
                content.classList.add('active');
            }
        });
        // Show/hide nav based on tab
        countdownsNav.style.display = tab === 'countdowns' ? 'flex' : 'none';
        projectsNav.style.display = tab === 'projects' ? 'flex' : 'none';
    });
});

// Project Navigation
projectNavButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        projectNavButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        projectPages.forEach(p => {
            p.classList.remove('active');
            if (p.id === `page-${page}`) {
                p.classList.add('active');
            }
        });
    });
});

// View Switching
viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === currentView) return;

        currentView = view;
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update list classes (all countdown and project lists)
        const lists = document.querySelectorAll('.countdowns-list, .projects-list');
        lists.forEach(list => {
            list.classList.toggle('grid-view', view === 'grid');
        });

        // Align project form with grid
        const addProject = document.querySelector('.add-project');
        if (addProject) {
            addProject.classList.toggle('align-grid', view === 'grid');
        }

        // Re-render to update card content
        renderCountdowns();
        renderProjects();
    });
});

// DOM Elements
const form = document.getElementById('countdown-form');
const dateInput = document.getElementById('countdown-date');
const timeInput = document.getElementById('countdown-time');
const nameInput = document.getElementById('countdown-name');
const activeList = document.getElementById('active-list');
const archiveList = document.getElementById('archive-list');
const canceledList = document.getElementById('canceled-list');
const emptyActive = document.getElementById('empty-active');
const emptyArchive = document.getElementById('empty-archive');
const emptyCanceled = document.getElementById('empty-canceled');
const modal = document.getElementById('completion-modal');
const modalEventName = document.getElementById('modal-event-name');
const modalActionsMain = document.getElementById('modal-actions-main');
const modalActionsExtend = document.getElementById('modal-actions-extend');
const modalActionsDays = document.getElementById('modal-actions-days');
const extendDaysInput = document.getElementById('extend-days');
const navButtons = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');

// Set minimum date to today
dateInput.min = new Date().toISOString().split('T')[0];

// Navigation
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pages.forEach(p => {
            p.classList.remove('active');
            if (p.id === `page-${page}`) {
                p.classList.add('active');
            }
        });
    });
});

// Form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = dateInput.value;
    const time = timeInput.value || '00:00';
    const name = nameInput.value.trim();

    if (!date || !name) return;

    const countdown = {
        id: Date.now(),
        name,
        targetDate: `${date}T${time}`,
        status: 'active',
        createdAt: new Date().toISOString()
    };

    countdowns.push(countdown);
    saveCountdowns();
    renderCountdowns();

    form.reset();
    dateInput.min = new Date().toISOString().split('T')[0];
});

// Save to localStorage
function saveCountdowns() {
    localStorage.setItem('countdowns', JSON.stringify(countdowns));
}

// Format time display based on rules
function formatTimeDisplay(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;

    if (diff <= 0) {
        return { number: 0, unit: '', dateStr: 'Completed', urgent: true };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const dateOptions = { month: 'short', day: 'numeric' };
    const dayName = target.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = target.toLocaleDateString('en-US', dateOptions);

    // >7 days: Show "14 days | Jan 15"
    if (days > 7) {
        return {
            number: days,
            unit: days === 1 ? 'day' : 'days',
            dateStr: dateStr,
            urgent: false
        };
    }

    // ≤7 days but >36 hours: Show "4 days | Thursday, Jan 15"
    if (hours > 36) {
        return {
            number: days,
            unit: days === 1 ? 'day' : 'days',
            dateStr: `${dayName}, ${dateStr}`,
            urgent: false
        };
    }

    // ≤36 hours but >60 minutes: Show hours
    if (minutes > 60) {
        return {
            number: hours,
            unit: hours === 1 ? 'hour' : 'hours',
            dateStr: `${dayName}, ${dateStr}`,
            urgent: true
        };
    }

    // ≤60 minutes: Show minutes
    return {
        number: Math.max(minutes, 1),
        unit: minutes === 1 ? 'minute' : 'minutes',
        dateStr: `${dayName}, ${dateStr}`,
        urgent: true
    };
}

// Create countdown card HTML
function createCountdownCard(countdown, isArchived = false, isCanceled = false, index = 0) {
    const card = document.createElement('div');
    card.className = 'countdown-card';
    card.dataset.id = countdown.id;

    // Alternating colors based on unlock state
    const colorClass = getColorClass(index);
    card.classList.add(colorClass);

    if (isCanceled) {
        card.classList.add('canceled');
        const target = new Date(countdown.targetDate);
        const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        card.innerHTML = `
            <div class="countdown-color-block">
                <span class="countdown-number">—</span>
            </div>
            <div class="countdown-info">
                <div class="countdown-name">${countdown.name}</div>
                <div class="countdown-date">${dateStr}</div>
            </div>
            <div class="countdown-actions">
                <button class="btn-delete" data-id="${countdown.id}">Delete</button>
            </div>
            <div class="grid-content">
                <span class="grid-number">—</span>
            </div>
        `;
        return card;
    }

    if (isArchived) {
        card.classList.add('archived');
        const target = new Date(countdown.targetDate);
        const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        card.innerHTML = `
            <div class="countdown-color-block">
                <span class="countdown-number">✓</span>
            </div>
            <div class="countdown-info">
                <div class="countdown-name">${countdown.name}</div>
                <div class="countdown-date">Completed ${dateStr}</div>
            </div>
            <div class="countdown-actions">
                <button class="btn-delete" data-id="${countdown.id}">Delete</button>
            </div>
            <div class="grid-content">
                <span class="grid-number">✓</span>
            </div>
        `;
        return card;
    }

    const timeDisplay = formatTimeDisplay(countdown.targetDate);

    if (timeDisplay.urgent) {
        card.classList.add('urgent');
    } else if (timeDisplay.number <= 7) {
        card.classList.add('soon');
    }

    card.innerHTML = `
        <div class="countdown-color-block">
            <span class="countdown-number">${timeDisplay.number}</span>
            <span class="countdown-unit">${timeDisplay.unit}</span>
        </div>
        <div class="countdown-info">
            <div class="countdown-name">${countdown.name}</div>
            <div class="countdown-date">${timeDisplay.dateStr}</div>
        </div>
        <div class="countdown-actions">
            <button class="btn-delete" data-id="${countdown.id}">Delete</button>
        </div>
        <div class="grid-content">
            <span class="grid-number">${timeDisplay.number}</span>
            <span class="grid-unit">${timeDisplay.unit}</span>
        </div>
    `;

    return card;
}

// Render all countdowns
function renderCountdowns() {
    const active = countdowns.filter(c => c.status === 'active');
    const archived = countdowns.filter(c => c.status === 'archived');
    const canceled = countdowns.filter(c => c.status === 'canceled');

    // Sort active by urgency (soonest first)
    active.sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));

    // Render active
    activeList.innerHTML = '';
    active.forEach((countdown, index) => {
        activeList.appendChild(createCountdownCard(countdown, false, false, index));
    });

    // Render archived
    archiveList.innerHTML = '';
    archived.forEach((countdown, index) => {
        archiveList.appendChild(createCountdownCard(countdown, true, false, index));
    });

    // Render canceled
    canceledList.innerHTML = '';
    canceled.forEach((countdown, index) => {
        canceledList.appendChild(createCountdownCard(countdown, false, true, index));
    });

    // Show/hide empty states
    emptyActive.classList.toggle('hidden', active.length > 0);
    emptyArchive.classList.toggle('hidden', archived.length > 0);
    emptyCanceled.classList.toggle('hidden', canceled.length > 0);

    // Add delete event listeners
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            countdowns = countdowns.filter(c => c.id !== id);
            saveCountdowns();
            renderCountdowns();
        });
    });
}

// Check for completed countdowns
function checkCompletions() {
    const now = new Date();
    const active = countdowns.filter(c => c.status === 'active');

    for (const countdown of active) {
        const target = new Date(countdown.targetDate);
        if (target <= now && !currentModalCountdown) {
            showCompletionModal(countdown);
            break;
        }
    }
}

// Show completion modal
function showCompletionModal(countdown) {
    currentModalCountdown = countdown;
    modalEventName.textContent = countdown.name;
    modalActionsMain.classList.remove('hidden');
    modalActionsExtend.classList.add('hidden');
    modalActionsDays.classList.add('hidden');
    modal.classList.add('active');
}

// Hide modal
function hideModal() {
    modal.classList.remove('active');
    currentModalCountdown = null;
}

// Unlock modal
const unlockModal = document.getElementById('unlock-modal');

function showUnlockModal() {
    unlockModal.classList.add('active');
}

function hideUnlockModal() {
    unlockModal.classList.remove('active');
    // Re-render to show new colors
    renderCountdowns();
    renderProjects();
}

document.getElementById('btn-unlock-ok').addEventListener('click', hideUnlockModal);

// Modal: Yes button
document.getElementById('btn-yes').addEventListener('click', () => {
    if (currentModalCountdown) {
        const index = countdowns.findIndex(c => c.id === currentModalCountdown.id);
        if (index !== -1) {
            countdowns[index].status = 'archived';
            saveCountdowns();
            renderCountdowns();

            // Check if this is the first successful completion
            if (!mustardUnlocked) {
                mustardUnlocked = true;
                localStorage.setItem('mustardUnlocked', 'true');
                showUnlockModal();
            }
        }
    }
    hideModal();
});

// Modal: No button
document.getElementById('btn-no').addEventListener('click', () => {
    modalActionsMain.classList.add('hidden');
    modalActionsExtend.classList.remove('hidden');
});

// Modal: Extend button
document.getElementById('btn-extend').addEventListener('click', () => {
    modalActionsExtend.classList.add('hidden');
    modalActionsDays.classList.remove('hidden');
    extendDaysInput.value = 1;
    extendDaysInput.focus();
});

// Modal: Cancel countdown button
document.getElementById('btn-cancel-countdown').addEventListener('click', () => {
    if (currentModalCountdown) {
        const index = countdowns.findIndex(c => c.id === currentModalCountdown.id);
        if (index !== -1) {
            countdowns[index].status = 'canceled';
            saveCountdowns();
            renderCountdowns();
        }
    }
    hideModal();
});

// Modal: Confirm extend button
document.getElementById('btn-confirm-extend').addEventListener('click', () => {
    if (currentModalCountdown) {
        const days = parseInt(extendDaysInput.value) || 1;
        const index = countdowns.findIndex(c => c.id === currentModalCountdown.id);
        if (index !== -1) {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + days);
            countdowns[index].targetDate = newDate.toISOString();
            saveCountdowns();
            renderCountdowns();
        }
    }
    hideModal();
});

// Update every second
function update() {
    renderCountdowns();
    checkCompletions();
}

// ============================================
// Inline Time Picker (Drum Roller / Wheel Picker)
// ============================================

const wheelHour = document.getElementById('wheel-hour');
const wheelMinute = document.getElementById('wheel-minute');
const wheelPeriod = document.getElementById('wheel-period');

const ITEM_HEIGHT = 26;
const CENTER_OFFSET = 13; // Half of item height to center in 52px container

let pickerState = {
    hour: 12,
    minute: 0,
    period: 'AM'
};

// Update hidden input when picker changes
function updateTimeInput() {
    let hour24 = pickerState.hour;
    if (pickerState.period === 'PM' && hour24 !== 12) {
        hour24 += 12;
    } else if (pickerState.period === 'AM' && hour24 === 12) {
        hour24 = 0;
    }
    timeInput.value = `${String(hour24).padStart(2, '0')}:${String(pickerState.minute).padStart(2, '0')}`;
}

// Generate wheel items
function generateWheelItems(wheel, values, selectedValue) {
    wheel.innerHTML = '';
    values.forEach((value, index) => {
        const item = document.createElement('div');
        item.className = 'wheel-item';
        item.textContent = value;
        item.dataset.value = value;
        item.dataset.index = index;
        if (value === selectedValue || value === String(selectedValue).padStart(2, '0')) {
            item.classList.add('selected');
        }
        wheel.appendChild(item);
    });
}

// Initialize wheels
function initializeWheels() {
    // Hours 1-12
    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    generateWheelItems(wheelHour, hours, String(pickerState.hour).padStart(2, '0'));

    // Minutes 00-59
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    generateWheelItems(wheelMinute, minutes, String(pickerState.minute).padStart(2, '0'));

    // AM/PM
    generateWheelItems(wheelPeriod, ['AM', 'PM'], pickerState.period);

    // Position wheels
    scrollToValue(wheelHour, pickerState.hour - 1);
    scrollToValue(wheelMinute, pickerState.minute);
    scrollToValue(wheelPeriod, pickerState.period === 'AM' ? 0 : 1);
}

// Scroll wheel to specific index
function scrollToValue(wheel, index) {
    const offset = -(index * ITEM_HEIGHT) + CENTER_OFFSET;
    wheel.style.transform = `translateY(${offset}px)`;
    updateSelectedItem(wheel, index);
}

// Update selected item styling
function updateSelectedItem(wheel, index) {
    const items = wheel.querySelectorAll('.wheel-item');
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });
}

// Get current index from wheel transform
function getCurrentIndex(wheel) {
    const transform = wheel.style.transform;
    const match = transform.match(/translateY\((.+)px\)/);
    if (match) {
        const offset = parseFloat(match[1]);
        return Math.round((CENTER_OFFSET - offset) / ITEM_HEIGHT);
    }
    return 0;
}

// Handle wheel scroll/drag
function setupWheelInteraction(wheel, maxIndex, onChange) {
    let isDragging = false;
    let startY = 0;
    let startOffset = 0;
    let velocity = 0;
    let lastY = 0;
    let lastTime = 0;
    let animationFrame = null;

    function getOffset() {
        const transform = wheel.style.transform;
        const match = transform.match(/translateY\((.+)px\)/);
        return match ? parseFloat(match[1]) : CENTER_OFFSET;
    }

    function setOffset(offset) {
        wheel.style.transform = `translateY(${offset}px)`;
    }

    function snapToNearest() {
        let offset = getOffset();
        let index = Math.round((CENTER_OFFSET - offset) / ITEM_HEIGHT);
        index = Math.max(0, Math.min(maxIndex, index));

        const targetOffset = -(index * ITEM_HEIGHT) + CENTER_OFFSET;
        wheel.style.transition = 'transform 0.2s ease-out';
        setOffset(targetOffset);
        updateSelectedItem(wheel, index);

        setTimeout(() => {
            wheel.style.transition = 'transform 0.1s ease-out';
            onChange(index);
            updateTimeInput();
        }, 200);
    }

    function momentumScroll() {
        if (Math.abs(velocity) < 0.3) {
            snapToNearest();
            return;
        }

        let offset = getOffset() + velocity;
        const minOffset = -(maxIndex * ITEM_HEIGHT) + (CENTER_OFFSET);
        const maxOffset = CENTER_OFFSET;

        if (offset > maxOffset) {
            offset = maxOffset;
            velocity = 0;
        } else if (offset < minOffset) {
            offset = minOffset;
            velocity = 0;
        }

        setOffset(offset);
        velocity *= 0.9;

        animationFrame = requestAnimationFrame(momentumScroll);
    }

    function handleStart(e) {
        isDragging = true;
        startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        startOffset = getOffset();
        lastY = startY;
        lastTime = Date.now();
        velocity = 0;

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        wheel.style.transition = 'none';
    }

    function handleMove(e) {
        if (!isDragging) return;
        e.preventDefault();

        const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const diff = currentY - startY;
        const now = Date.now();
        const dt = now - lastTime;

        if (dt > 0) {
            velocity = (currentY - lastY) / dt * 16;
        }

        lastY = currentY;
        lastTime = now;

        let newOffset = startOffset + diff;
        const minOffset = -(maxIndex * ITEM_HEIGHT) + (CENTER_OFFSET);
        const maxOffset = CENTER_OFFSET;

        // Rubber band effect
        if (newOffset > maxOffset) {
            newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
        } else if (newOffset < minOffset) {
            newOffset = minOffset + (newOffset - minOffset) * 0.3;
        }

        setOffset(newOffset);
    }

    function handleEnd() {
        if (!isDragging) return;
        isDragging = false;

        if (Math.abs(velocity) > 1.5) {
            momentumScroll();
        } else {
            snapToNearest();
        }
    }

    // Mouse events
    wheel.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    wheel.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    // Click on item
    wheel.addEventListener('click', (e) => {
        if (e.target.classList.contains('wheel-item')) {
            const index = parseInt(e.target.dataset.index);
            scrollToValue(wheel, index);
            setTimeout(() => {
                onChange(index);
                updateTimeInput();
            }, 220);
        }
    });

    // Mouse wheel scroll
    wheel.parentElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        let index = getCurrentIndex(wheel);
        index += e.deltaY > 0 ? 1 : -1;
        index = Math.max(0, Math.min(maxIndex, index));
        scrollToValue(wheel, index);
        onChange(index);
        updateTimeInput();
    }, { passive: false });
}

// Setup wheel interactions
setupWheelInteraction(wheelHour, 11, (index) => {
    pickerState.hour = index + 1;
});

setupWheelInteraction(wheelMinute, 59, (index) => {
    pickerState.minute = index;
});

setupWheelInteraction(wheelPeriod, 1, (index) => {
    pickerState.period = index === 0 ? 'AM' : 'PM';
});

// Initialize wheels on load
initializeWheels();

// Reset time picker on form reset
const originalReset = form.reset.bind(form);
form.reset = function() {
    originalReset();
    pickerState = { hour: 12, minute: 0, period: 'AM' };
    timeInput.value = '00:00';
    scrollToValue(wheelHour, 11); // 12 is index 11
    scrollToValue(wheelMinute, 0);
    scrollToValue(wheelPeriod, 0);
};

// ============================================
// Detail Panel
// ============================================

const detailPanel = document.getElementById('detail-panel');
const panelOverlay = document.getElementById('panel-overlay');
const panelClose = document.getElementById('panel-close');
const panelTitle = document.getElementById('panel-title');
const panelCountdown = document.getElementById('panel-countdown');
const panelLinks = document.getElementById('panel-links');
const panelNotes = document.getElementById('panel-notes');
const addLinkForm = document.getElementById('add-link-form');
const btnAddLink = document.getElementById('btn-add-link');
const linkLabelInput = document.getElementById('link-label');
const linkUrlInput = document.getElementById('link-url');
const btnLinkSave = document.getElementById('btn-link-save');
const btnLinkCancel = document.getElementById('btn-link-cancel');

// Edit elements
const btnEditCountdown = document.getElementById('btn-edit-countdown');
const panelEditForm = document.getElementById('panel-edit-form');
const editNameInput = document.getElementById('edit-name');
const editDateInput = document.getElementById('edit-date');
const editTimeInput = document.getElementById('edit-time');
const btnEditSave = document.getElementById('btn-edit-save');
const btnEditCancel = document.getElementById('btn-edit-cancel');

let currentPanelCountdown = null;
let notesTimeout = null;
let isEditMode = false;

// Open panel
function openPanel(countdownId) {
    const countdown = countdowns.find(c => c.id === countdownId);
    if (!countdown) return;

    currentPanelCountdown = countdown;

    // Initialize links and notes if not present
    if (!countdown.links) countdown.links = [];
    if (!countdown.notes) countdown.notes = '';

    // Populate panel
    panelTitle.textContent = countdown.name;
    updatePanelCountdown();
    renderPanelLinks();
    panelNotes.value = countdown.notes;

    // Reset link form
    addLinkForm.classList.add('hidden');
    btnAddLink.classList.remove('hidden');

    // Reset edit mode
    closeEditMode();

    // Show panel
    detailPanel.classList.add('active');
    panelOverlay.classList.add('active');
}

// Close panel
function closePanel() {
    detailPanel.classList.remove('active');
    panelOverlay.classList.remove('active');
    currentPanelCountdown = null;
    closeEditMode();
}

// Edit Mode Functions
function openEditMode() {
    if (!currentPanelCountdown) return;

    const countdown = countdowns.find(c => c.id === currentPanelCountdown.id);
    if (!countdown) return;

    // Parse current date/time
    const targetDate = new Date(countdown.targetDate);
    const dateStr = targetDate.toISOString().split('T')[0];
    const hours = targetDate.getHours().toString().padStart(2, '0');
    const minutes = targetDate.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Populate edit fields
    editNameInput.value = countdown.name;
    editDateInput.value = dateStr;
    editTimeInput.value = timeStr;

    // Show edit form, hide display
    panelEditForm.classList.remove('hidden');
    panelTitle.classList.add('hidden');
    panelCountdown.classList.add('hidden');
    btnEditCountdown.classList.add('hidden');

    isEditMode = true;
}

function closeEditMode() {
    panelEditForm.classList.add('hidden');
    panelTitle.classList.remove('hidden');
    panelCountdown.classList.remove('hidden');
    btnEditCountdown.classList.remove('hidden');
    isEditMode = false;
}

function saveEdit() {
    if (!currentPanelCountdown) return;

    const index = countdowns.findIndex(c => c.id === currentPanelCountdown.id);
    if (index === -1) return;

    const newName = editNameInput.value.trim();
    const newDate = editDateInput.value;
    const newTime = editTimeInput.value || '00:00';

    if (!newName || !newDate) return;

    // Update countdown
    countdowns[index].name = newName;
    countdowns[index].targetDate = `${newDate}T${newTime}`;
    countdowns[index].modifiedAt = new Date().toISOString();

    saveCountdowns();
    renderCountdowns();

    // Update panel display
    panelTitle.textContent = newName;
    updatePanelCountdown();

    closeEditMode();
}

// Edit button click
btnEditCountdown.addEventListener('click', openEditMode);

// Edit save
btnEditSave.addEventListener('click', saveEdit);

// Edit cancel
btnEditCancel.addEventListener('click', closeEditMode);

// Update panel countdown display
function updatePanelCountdown() {
    if (!currentPanelCountdown) return;

    const countdown = countdowns.find(c => c.id === currentPanelCountdown.id);
    if (!countdown) return;

    if (countdown.status === 'archived') {
        const target = new Date(countdown.targetDate);
        const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        panelCountdown.innerHTML = `
            <span class="countdown-date">Completed ${dateStr}</span>
        `;
    } else if (countdown.status === 'canceled') {
        const target = new Date(countdown.targetDate);
        const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        panelCountdown.innerHTML = `
            <span class="countdown-date">Canceled - ${dateStr}</span>
        `;
    } else {
        const timeDisplay = formatTimeDisplay(countdown.targetDate);
        panelCountdown.innerHTML = `
            <span class="countdown-number">${timeDisplay.number}</span>
            <span class="countdown-unit">${timeDisplay.unit}</span>
            <span class="countdown-date">${timeDisplay.dateStr}</span>
        `;
    }
}

// Render links in panel
function renderPanelLinks() {
    if (!currentPanelCountdown) return;

    const countdown = countdowns.find(c => c.id === currentPanelCountdown.id);
    if (!countdown || !countdown.links) {
        panelLinks.innerHTML = '';
        return;
    }

    panelLinks.innerHTML = countdown.links.map((link, index) => `
        <div class="panel-link">
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>
            <button class="btn-delete-link" data-index="${index}">&times;</button>
        </div>
    `).join('');

    // Add delete listeners
    panelLinks.querySelectorAll('.btn-delete-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteLink(index);
        });
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add link
function addLink(label, url) {
    if (!currentPanelCountdown) return;

    const index = countdowns.findIndex(c => c.id === currentPanelCountdown.id);
    if (index === -1) return;

    if (!countdowns[index].links) countdowns[index].links = [];
    countdowns[index].links.push({ label, url });
    countdowns[index].modifiedAt = new Date().toISOString();

    saveCountdowns();
    renderPanelLinks();
}

// Delete link
function deleteLink(linkIndex) {
    if (!currentPanelCountdown) return;

    const index = countdowns.findIndex(c => c.id === currentPanelCountdown.id);
    if (index === -1) return;

    countdowns[index].links.splice(linkIndex, 1);
    countdowns[index].modifiedAt = new Date().toISOString();

    saveCountdowns();
    renderPanelLinks();
}

// Save notes (debounced)
function saveNotes(notes) {
    if (!currentPanelCountdown) return;

    const index = countdowns.findIndex(c => c.id === currentPanelCountdown.id);
    if (index === -1) return;

    countdowns[index].notes = notes;
    countdowns[index].modifiedAt = new Date().toISOString();
    saveCountdowns();
}

// Panel event listeners
panelClose.addEventListener('click', closePanel);
panelOverlay.addEventListener('click', closePanel);

// Add link button
btnAddLink.addEventListener('click', () => {
    addLinkForm.classList.remove('hidden');
    btnAddLink.classList.add('hidden');
    linkLabelInput.value = '';
    linkUrlInput.value = '';
    linkLabelInput.focus();
});

// Cancel link form
btnLinkCancel.addEventListener('click', () => {
    addLinkForm.classList.add('hidden');
    btnAddLink.classList.remove('hidden');
});

// Save link
btnLinkSave.addEventListener('click', () => {
    const label = linkLabelInput.value.trim();
    const url = linkUrlInput.value.trim();

    if (!label || !url) return;

    // Add https if no protocol
    let finalUrl = url;
    if (!url.match(/^https?:\/\//)) {
        finalUrl = 'https://' + url;
    }

    addLink(label, finalUrl);

    addLinkForm.classList.add('hidden');
    btnAddLink.classList.remove('hidden');
});

// Save link on Enter
linkUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        btnLinkSave.click();
    }
});

// Notes auto-save
panelNotes.addEventListener('input', () => {
    if (notesTimeout) clearTimeout(notesTimeout);
    notesTimeout = setTimeout(() => {
        saveNotes(panelNotes.value);
    }, 500);
});

// Card click handler (using event delegation)
function setupCardClickHandlers() {
    document.querySelectorAll('.countdown-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open panel if clicking delete button
            if (e.target.classList.contains('btn-delete')) return;

            const id = parseInt(card.dataset.id);
            openPanel(id);
        });
    });
}

// Override renderCountdowns to add click handlers
const originalRenderCountdowns = renderCountdowns;
renderCountdowns = function() {
    originalRenderCountdowns();
    setupCardClickHandlers();

    // Update panel if open
    if (currentPanelCountdown) {
        updatePanelCountdown();
    }
};

// ============================================
// Projects
// ============================================

const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectColorPicker = document.getElementById('project-color-picker');
const projectsList = document.getElementById('projects-list');
const projectsArchiveList = document.getElementById('projects-archive-list');
const projectsCanceledList = document.getElementById('projects-canceled-list');
const emptyProjects = document.getElementById('empty-projects');
const emptyProjectsArchive = document.getElementById('empty-projects-archive');
const emptyProjectsCanceled = document.getElementById('empty-projects-canceled');

// Track selected color for new projects
let selectedProjectColor = 'teal';

// Color picker for new project form
projectColorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
        e.preventDefault();
        projectColorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedProjectColor = swatch.dataset.color;
    });
});

// Project Detail Panel Elements
const projectDetailPanel = document.getElementById('project-detail-panel');
const projectPanelOverlay = document.getElementById('project-panel-overlay');
const projectPanelClose = document.getElementById('project-panel-close');
const projectPanelTitle = document.getElementById('project-panel-title');
const projectPanelLinks = document.getElementById('project-panel-links');
const projectPanelNotes = document.getElementById('project-panel-notes');
const projectAddLinkForm = document.getElementById('project-add-link-form');
const projectBtnAddLink = document.getElementById('project-btn-add-link');
const projectLinkLabelInput = document.getElementById('project-link-label');
const projectLinkUrlInput = document.getElementById('project-link-url');
const projectBtnLinkSave = document.getElementById('project-btn-link-save');
const projectBtnLinkCancel = document.getElementById('project-btn-link-cancel');
const projectStatusActions = document.getElementById('project-status-actions');
const btnCompleteProject = document.getElementById('btn-complete-project');
const btnCancelProject = document.getElementById('btn-cancel-project');
const btnShareProject = document.getElementById('btn-share-project');
const projectPanelColorPicker = document.getElementById('project-panel-color-picker');

// Time Log Elements
const timeLogEntries = document.getElementById('time-log-entries');
const timeLogTotal = document.getElementById('time-log-total');
const addTimeForm = document.getElementById('add-time-form');
const btnAddTime = document.getElementById('btn-add-time');
const timeLogDateInput = document.getElementById('time-log-date');
const timeLogHoursInput = document.getElementById('time-log-hours');
const timeLogNoteInput = document.getElementById('time-log-note');
const btnTimeSave = document.getElementById('btn-time-save');
const btnTimeCancel = document.getElementById('btn-time-cancel');

// Time Export Elements
const btnExportTime = document.getElementById('btn-export-time'); // Header button
const btnExportTimePanel = document.getElementById('btn-export-time-panel'); // Panel button
const timeExportModal = document.getElementById('time-export-modal');
const timeExportStart = document.getElementById('time-export-start');
const timeExportEnd = document.getElementById('time-export-end');
const btnTimeExportConfirm = document.getElementById('btn-time-export-confirm');
const btnTimeExportCancel = document.getElementById('btn-time-export-cancel');

let currentPanelProject = null;
let projectNotesTimeout = null;

// Save projects to localStorage
function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
}

// Add project
projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = projectNameInput.value.trim();
    if (!name) return;

    const project = {
        id: Date.now(),
        name,
        color: selectedProjectColor,
        status: 'active',
        links: [],
        notes: '',
        createdAt: new Date().toISOString()
    };

    projects.push(project);
    saveProjects();
    renderProjects();
    projectForm.reset();

    // Reset color picker to default (teal)
    selectedProjectColor = 'teal';
    projectColorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    projectColorPicker.querySelector('[data-color="teal"]').classList.add('selected');
});

// Get color class from project color value
function getProjectColorClass(colorValue) {
    const colorMap = {
        'teal': 'color-teal',
        'coral': 'color-coral',
        'mustard': 'color-mustard',
        'charcoal': 'color-charcoal'
    };
    return colorMap[colorValue] || 'color-teal';
}

// Create project card
function createProjectCard(project, index = 0, isArchived = false, isCanceled = false) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = project.id;

    // Use project's assigned color (default to teal for legacy projects)
    const colorClass = getProjectColorClass(project.color || 'teal');
    card.classList.add(colorClass);

    if (isArchived) {
        card.classList.add('archived');
    }

    if (isCanceled) {
        card.classList.add('canceled');
    }

    card.innerHTML = `
        <div class="project-color-block"></div>
        <div class="project-info">
            <div class="project-name">${escapeHtml(project.name)}</div>
            ${isArchived ? '<div class="project-status-label">Completed</div>' : ''}
            ${isCanceled ? '<div class="project-status-label">Canceled</div>' : ''}
        </div>
        <div class="project-actions">
            <button class="btn-delete" data-id="${project.id}">Delete</button>
        </div>
        <div class="grid-content">
            <span class="grid-name">${escapeHtml(project.name)}</span>
        </div>
    `;

    return card;
}

// Render projects
function renderProjects() {
    const active = projects.filter(p => !p.status || p.status === 'active');
    const archived = projects.filter(p => p.status === 'archived');
    const canceled = projects.filter(p => p.status === 'canceled');

    // Sort alphabetically
    active.sort((a, b) => a.name.localeCompare(b.name));
    archived.sort((a, b) => a.name.localeCompare(b.name));
    canceled.sort((a, b) => a.name.localeCompare(b.name));

    // Render active
    projectsList.innerHTML = '';
    active.forEach((project, index) => {
        projectsList.appendChild(createProjectCard(project, index));
    });

    // Render archived
    projectsArchiveList.innerHTML = '';
    archived.forEach((project, index) => {
        projectsArchiveList.appendChild(createProjectCard(project, index, true, false));
    });

    // Render canceled
    projectsCanceledList.innerHTML = '';
    canceled.forEach((project, index) => {
        projectsCanceledList.appendChild(createProjectCard(project, index, false, true));
    });

    // Show/hide empty states
    emptyProjects.classList.toggle('hidden', active.length > 0);
    emptyProjectsArchive.classList.toggle('hidden', archived.length > 0);
    emptyProjectsCanceled.classList.toggle('hidden', canceled.length > 0);

    // Add click handlers
    setupProjectClickHandlers();
}

// Setup project click handlers
function setupProjectClickHandlers() {
    document.querySelectorAll('#tab-projects .project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const id = parseInt(e.target.dataset.id);
                projects = projects.filter(p => p.id !== id);
                saveProjects();
                renderProjects();
                return;
            }
            const id = parseInt(card.dataset.id);
            openProjectPanel(id);
        });
    });
}

// Open project panel
function openProjectPanel(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    currentPanelProject = project;

    projectPanelTitle.textContent = project.name;
    renderProjectPanelLinks();
    projectPanelNotes.value = project.notes || '';

    projectAddLinkForm.classList.add('hidden');
    projectBtnAddLink.classList.remove('hidden');

    // Set up panel color picker
    const currentColor = project.color || 'teal';
    projectPanelColorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.dataset.color === currentColor);
    });

    // Show/hide status actions and color picker based on project status
    const isActive = !project.status || project.status === 'active';
    projectStatusActions.classList.toggle('hidden', !isActive);
    projectPanelColorPicker.classList.toggle('hidden', !isActive);

    projectDetailPanel.classList.add('active');
    projectPanelOverlay.classList.add('active');
}

// Close project panel
function closeProjectPanel() {
    projectDetailPanel.classList.remove('active');
    projectPanelOverlay.classList.remove('active');
    currentPanelProject = null;
}

projectPanelClose.addEventListener('click', closeProjectPanel);
projectPanelOverlay.addEventListener('click', closeProjectPanel);

// Panel color picker - change project color
projectPanelColorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        if (!currentPanelProject) return;

        const newColor = swatch.dataset.color;
        const index = projects.findIndex(p => p.id === currentPanelProject.id);
        if (index === -1) return;

        // Update project color
        projects[index].color = newColor;
        projects[index].modifiedAt = new Date().toISOString();
        saveProjects();
        renderProjects();

        // Update panel color picker selection
        projectPanelColorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
    });
});

// Render project panel links
function renderProjectPanelLinks() {
    if (!currentPanelProject) return;

    const project = projects.find(p => p.id === currentPanelProject.id);
    if (!project || !project.links) {
        projectPanelLinks.innerHTML = '';
        return;
    }

    projectPanelLinks.innerHTML = project.links.map((link, index) => `
        <div class="panel-link">
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>
            <button class="btn-delete-link" data-index="${index}">&times;</button>
        </div>
    `).join('');

    projectPanelLinks.querySelectorAll('.btn-delete-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteProjectLink(index);
        });
    });
}

// Add project link
function addProjectLink(label, url) {
    if (!currentPanelProject) return;

    const index = projects.findIndex(p => p.id === currentPanelProject.id);
    if (index === -1) return;

    if (!projects[index].links) projects[index].links = [];
    projects[index].links.push({ label, url });
    projects[index].modifiedAt = new Date().toISOString();

    saveProjects();
    renderProjectPanelLinks();
}

// Delete project link
function deleteProjectLink(linkIndex) {
    if (!currentPanelProject) return;

    const index = projects.findIndex(p => p.id === currentPanelProject.id);
    if (index === -1) return;

    projects[index].links.splice(linkIndex, 1);
    projects[index].modifiedAt = new Date().toISOString();

    saveProjects();
    renderProjectPanelLinks();
}

// Project add link button
projectBtnAddLink.addEventListener('click', () => {
    projectAddLinkForm.classList.remove('hidden');
    projectBtnAddLink.classList.add('hidden');
    projectLinkLabelInput.value = '';
    projectLinkUrlInput.value = '';
    projectLinkLabelInput.focus();
});

// Project cancel link form
projectBtnLinkCancel.addEventListener('click', () => {
    projectAddLinkForm.classList.add('hidden');
    projectBtnAddLink.classList.remove('hidden');
});

// Project save link
projectBtnLinkSave.addEventListener('click', () => {
    const label = projectLinkLabelInput.value.trim();
    const url = projectLinkUrlInput.value.trim();

    if (!label || !url) return;

    let finalUrl = url;
    if (!url.match(/^https?:\/\//)) {
        finalUrl = 'https://' + url;
    }

    addProjectLink(label, finalUrl);

    projectAddLinkForm.classList.add('hidden');
    projectBtnAddLink.classList.remove('hidden');
});

// Project save link on Enter
projectLinkUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        projectBtnLinkSave.click();
    }
});

// Project notes auto-save
projectPanelNotes.addEventListener('input', () => {
    if (projectNotesTimeout) clearTimeout(projectNotesTimeout);
    projectNotesTimeout = setTimeout(() => {
        if (!currentPanelProject) return;

        const index = projects.findIndex(p => p.id === currentPanelProject.id);
        if (index === -1) return;

        projects[index].notes = projectPanelNotes.value;
        projects[index].modifiedAt = new Date().toISOString();
        saveProjects();
    }, 500);
});

// Complete project
btnCompleteProject.addEventListener('click', () => {
    if (!currentPanelProject) return;

    const index = projects.findIndex(p => p.id === currentPanelProject.id);
    if (index !== -1) {
        projects[index].status = 'archived';
        projects[index].completedAt = new Date().toISOString();
        saveProjects();
        renderProjects();
        closeProjectPanel();
    }
});

// Cancel project
btnCancelProject.addEventListener('click', () => {
    if (!currentPanelProject) return;

    const index = projects.findIndex(p => p.id === currentPanelProject.id);
    if (index !== -1) {
        projects[index].status = 'canceled';
        projects[index].canceledAt = new Date().toISOString();
        saveProjects();
        renderProjects();
        closeProjectPanel();
    }
});

// ============================================
// Time Logging for Projects
// ============================================

// Render time log entries
function renderTimeLogEntries() {
    if (!currentPanelProject) return;

    const project = projects.find(p => p.id === currentPanelProject.id);
    if (!project) return;

    const entries = project.timeLog || [];

    if (entries.length === 0) {
        timeLogEntries.innerHTML = '<div class="time-log-empty">No time entries yet</div>';
        timeLogTotal.textContent = '';
        return;
    }

    // Sort by date (most recent first)
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

    timeLogEntries.innerHTML = sortedEntries.map((entry, index) => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="time-log-entry">
                <div class="time-log-entry-info">
                    <div class="time-log-entry-main">
                        <span class="time-log-date">${dateStr}</span>
                        <span class="time-log-hours">${entry.hours}h</span>
                    </div>
                    ${entry.note ? `<span class="time-log-note">${escapeHtml(entry.note)}</span>` : ''}
                </div>
                <button class="time-log-delete" data-index="${index}">&times;</button>
            </div>
        `;
    }).join('');

    // Add delete handlers
    timeLogEntries.querySelectorAll('.time-log-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteTimeEntry(index);
        });
    });

    // Update total
    updateTimeLogTotal();
}

// Update time log total
function updateTimeLogTotal() {
    if (!currentPanelProject) return;

    const project = projects.find(p => p.id === currentPanelProject.id);
    if (!project || !project.timeLog || project.timeLog.length === 0) {
        timeLogTotal.textContent = '';
        return;
    }

    const total = project.timeLog.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
    timeLogTotal.textContent = `Total: ${total.toFixed(2)} hours`;
}

// Add time entry
function addTimeEntry(date, hours, note) {
    if (!currentPanelProject) return;

    const index = projects.findIndex(p => p.id === currentPanelProject.id);
    if (index === -1) return;

    if (!projects[index].timeLog) projects[index].timeLog = [];

    projects[index].timeLog.push({
        id: Date.now(),
        date: date,
        hours: parseFloat(hours),
        note: note || ''
    });
    projects[index].modifiedAt = new Date().toISOString();

    saveProjects();
    renderTimeLogEntries();
}

// Delete time entry
function deleteTimeEntry(sortedIndex) {
    if (!currentPanelProject) return;

    const index = projects.findIndex(p => p.id === currentPanelProject.id);
    if (index === -1) return;

    const entries = projects[index].timeLog || [];
    // Get sorted entries to find the actual entry to delete
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    const entryToDelete = sortedEntries[sortedIndex];

    // Find and remove by id
    const actualIndex = entries.findIndex(e => e.id === entryToDelete.id);
    if (actualIndex !== -1) {
        projects[index].timeLog.splice(actualIndex, 1);
        projects[index].modifiedAt = new Date().toISOString();
        saveProjects();
        renderTimeLogEntries();
    }
}

// Show add time form
btnAddTime.addEventListener('click', () => {
    addTimeForm.classList.remove('hidden');
    btnAddTime.classList.add('hidden');
    // Set default date to today
    timeLogDateInput.value = new Date().toISOString().split('T')[0];
    timeLogHoursInput.value = '';
    timeLogNoteInput.value = '';
    timeLogHoursInput.focus();
});

// Cancel add time form
btnTimeCancel.addEventListener('click', () => {
    addTimeForm.classList.add('hidden');
    btnAddTime.classList.remove('hidden');
});

// Save time entry
btnTimeSave.addEventListener('click', () => {
    const date = timeLogDateInput.value;
    const hours = timeLogHoursInput.value;
    const note = timeLogNoteInput.value.trim();

    if (!date || !hours || parseFloat(hours) <= 0) return;

    addTimeEntry(date, hours, note);

    addTimeForm.classList.add('hidden');
    btnAddTime.classList.remove('hidden');
});

// Save time on Enter in hours input
timeLogHoursInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        btnTimeSave.click();
    }
});

// Export time log button
// Open time export modal function
function openTimeExportModal() {
    if (!currentPanelProject) {
        alert('Please open a project to export its time log.');
        return;
    }

    const project = projects.find(p => p.id === currentPanelProject.id);
    if (!project || !project.timeLog || project.timeLog.length === 0) {
        alert('No time entries to export.');
        return;
    }

    // Set default date range (all entries)
    const entries = project.timeLog;
    const dates = entries.map(e => new Date(e.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    timeExportStart.value = minDate.toISOString().split('T')[0];
    timeExportEnd.value = maxDate.toISOString().split('T')[0];

    timeExportModal.classList.add('active');
}

// Header Time Log button
btnExportTime.addEventListener('click', openTimeExportModal);

// Panel Export CSV button
btnExportTimePanel.addEventListener('click', openTimeExportModal);

// Cancel time export
btnTimeExportCancel.addEventListener('click', () => {
    timeExportModal.classList.remove('active');
});

// Close modal on overlay click
timeExportModal.addEventListener('click', (e) => {
    if (e.target === timeExportModal) {
        timeExportModal.classList.remove('active');
    }
});

// Confirm time export
btnTimeExportConfirm.addEventListener('click', () => {
    if (!currentPanelProject) return;

    const project = projects.find(p => p.id === currentPanelProject.id);
    if (!project || !project.timeLog) return;

    const startDate = new Date(timeExportStart.value);
    const endDate = new Date(timeExportEnd.value);
    endDate.setHours(23, 59, 59, 999); // Include full end day

    // Filter entries by date range
    const filteredEntries = project.timeLog.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
    });

    if (filteredEntries.length === 0) {
        alert('No entries in the selected date range.');
        return;
    }

    // Sort by date
    filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Generate CSV
    const csvRows = ['Project,Date,Hours,Notes'];
    filteredEntries.forEach(entry => {
        const date = new Date(entry.date).toISOString().split('T')[0];
        const note = entry.note ? `"${entry.note.replace(/"/g, '""')}"` : '';
        csvRows.push(`"${project.name.replace(/"/g, '""')}",${date},${entry.hours},${note}`);
    });

    // Add total row
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    csvRows.push(`"TOTAL",,${totalHours.toFixed(2)},`);

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Sanitize filename
    const sanitizedName = project.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);

    const dateRange = `${timeExportStart.value}_${timeExportEnd.value}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `time-log-${sanitizedName}-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    timeExportModal.classList.remove('active');
});

// Update openProjectPanel to render time log
const originalOpenProjectPanel = openProjectPanel;
openProjectPanel = function(projectId) {
    originalOpenProjectPanel(projectId);
    renderTimeLogEntries();
};

// Share project (export single project)
btnShareProject.addEventListener('click', () => {
    if (!currentPanelProject) return;

    const project = projects.find(p => p.id === currentPanelProject.id);
    if (!project) return;

    // Create single-project export
    const data = {
        type: 'single-project',
        version: 1,
        exportedAt: new Date().toISOString(),
        project: {
            name: project.name,
            color: project.color || 'teal',
            links: project.links || [],
            notes: project.notes || '',
            timeLog: project.timeLog || []
        }
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Sanitize filename (remove special chars, replace spaces with hyphens)
    const sanitizedName = project.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);

    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${sanitizedName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Initial projects render
renderProjects();

// ============================================
// Export / Import
// ============================================

const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importFile = document.getElementById('import-file');
const importModal = document.getElementById('import-modal');
const btnImportReplace = document.getElementById('btn-import-replace');
const btnImportMerge = document.getElementById('btn-import-merge');

let pendingImportData = null;
let pendingImportProjects = null;

// Export data
btnExport.addEventListener('click', () => {
    const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        countdowns: countdowns,
        projects: projects
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Format date for filename
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Import button - trigger file picker
btnImport.addEventListener('click', () => {
    importFile.click();
});

// File selected
importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            // Check if this is a single-project export
            if (data.type === 'single-project' && data.project) {
                importSingleProject(data.project);
                return;
            }

            // Validate data structure (countdowns required, projects optional for backward compatibility)
            if (!data.countdowns || !Array.isArray(data.countdowns)) {
                alert('Invalid backup file format.');
                return;
            }

            pendingImportData = data.countdowns;
            pendingImportProjects = Array.isArray(data.projects) ? data.projects : [];
            importModal.classList.add('active');
        } catch (err) {
            alert('Error reading file. Please ensure it\'s a valid JSON backup.');
        }
    };
    reader.readAsText(file);

    // Reset file input so same file can be selected again
    importFile.value = '';
});

// Import single project (from Share)
function importSingleProject(projectData) {
    const newProject = {
        id: Date.now(),
        name: projectData.name,
        color: projectData.color || 'teal',
        status: 'active',
        links: projectData.links || [],
        notes: projectData.notes || '',
        timeLog: projectData.timeLog || [],
        createdAt: new Date().toISOString(),
        importedAt: new Date().toISOString()
    };

    projects.push(newProject);
    saveProjects();
    renderProjects();

    const timeLogInfo = projectData.timeLog && projectData.timeLog.length > 0
        ? ` with ${projectData.timeLog.length} time entries`
        : '';
    alert(`Project "${projectData.name}" imported successfully${timeLogInfo}!`);
}

// Import - Replace all
btnImportReplace.addEventListener('click', () => {
    if (!pendingImportData) return;

    countdowns = pendingImportData;
    projects = pendingImportProjects || [];
    saveCountdowns();
    saveProjects();
    renderCountdowns();
    renderProjects();

    importModal.classList.remove('active');
    pendingImportData = null;
    pendingImportProjects = null;

    alert(`Imported ${countdowns.length} countdown(s) and ${projects.length} project(s). All previous data replaced.`);
});

// Import - Merge
btnImportMerge.addEventListener('click', () => {
    if (!pendingImportData) return;

    let addedCountdowns = 0;
    let updatedCountdowns = 0;
    let addedProjects = 0;
    let updatedProjects = 0;

    // Merge countdowns
    pendingImportData.forEach(imported => {
        const existingIndex = countdowns.findIndex(c => c.id === imported.id);

        if (existingIndex === -1) {
            countdowns.push(imported);
            addedCountdowns++;
        } else {
            const existing = countdowns[existingIndex];
            const existingDate = new Date(existing.createdAt || 0);
            const importedDate = new Date(imported.createdAt || 0);
            const existingModified = existing.modifiedAt ? new Date(existing.modifiedAt) : existingDate;
            const importedModified = imported.modifiedAt ? new Date(imported.modifiedAt) : importedDate;

            if (importedModified > existingModified) {
                countdowns[existingIndex] = imported;
                updatedCountdowns++;
            }
        }
    });

    // Merge projects
    if (pendingImportProjects) {
        pendingImportProjects.forEach(imported => {
            const existingIndex = projects.findIndex(p => p.id === imported.id);

            if (existingIndex === -1) {
                projects.push(imported);
                addedProjects++;
            } else {
                const existing = projects[existingIndex];
                const existingDate = new Date(existing.createdAt || 0);
                const importedDate = new Date(imported.createdAt || 0);
                const existingModified = existing.modifiedAt ? new Date(existing.modifiedAt) : existingDate;
                const importedModified = imported.modifiedAt ? new Date(imported.modifiedAt) : importedDate;

                if (importedModified > existingModified) {
                    projects[existingIndex] = imported;
                    updatedProjects++;
                }
            }
        });
    }

    saveCountdowns();
    saveProjects();
    renderCountdowns();
    renderProjects();

    importModal.classList.remove('active');
    pendingImportData = null;
    pendingImportProjects = null;

    alert(`Import complete.\nCountdowns - Added: ${addedCountdowns}, Updated: ${updatedCountdowns}\nProjects - Added: ${addedProjects}, Updated: ${updatedProjects}`);
});

// Close import modal on overlay click
importModal.addEventListener('click', (e) => {
    if (e.target === importModal) {
        importModal.classList.remove('active');
        pendingImportData = null;
        pendingImportProjects = null;
    }
});

// ============================================
// About Panel
// ============================================

const btnAbout = document.getElementById('btn-about');
const aboutPanel = document.getElementById('about-panel');
const aboutOverlay = document.getElementById('about-overlay');
const aboutClose = document.getElementById('about-close');

// Open about panel
btnAbout.addEventListener('click', () => {
    aboutPanel.classList.add('active');
    aboutOverlay.classList.add('active');
});

// Close about panel
function closeAboutPanel() {
    aboutPanel.classList.remove('active');
    aboutOverlay.classList.remove('active');
}

aboutClose.addEventListener('click', closeAboutPanel);
aboutOverlay.addEventListener('click', closeAboutPanel);

// Initial render
renderCountdowns();

// Update interval
setInterval(update, 1000);

// ============================================
// Pomodoro Timer
// ============================================

const pomodoroClock = document.getElementById('pomodoro-clock');
const clockFace = document.querySelector('.clock-face');
const minuteHand = document.getElementById('minute-hand');
const secondHand = document.getElementById('second-hand');
const pomodoroStatus = document.getElementById('pomodoro-status');
const pomodoroReset = document.getElementById('pomodoro-reset');
const pomodoroMute = document.getElementById('pomodoro-mute');
const soundIcon = document.getElementById('sound-icon');
const pomodoroMinimize = document.getElementById('pomodoro-minimize');
const pomodoroExpand = document.getElementById('pomodoro-expand');

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

let pomodoroState = {
    running: false,
    paused: false,
    startTime: null,
    pausedAt: null,
    elapsedBeforePause: 0,
    totalTime: WORK_DURATION,
    isBreak: false,
    muted: localStorage.getItem('pomodoroMuted') === 'true'
};

let animationFrameId = null;

// Audio context for chime
let audioContext = null;

function playChime() {
    if (pomodoroState.muted) return;

    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Create a pleasant chime sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);

        // Second tone
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.setValueAtTime(1760, audioContext.currentTime); // A6
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.8);
        }, 200);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function getElapsedSeconds() {
    if (!pomodoroState.startTime) return 0;
    const now = pomodoroState.paused ? pomodoroState.pausedAt : Date.now();
    return pomodoroState.elapsedBeforePause + (now - pomodoroState.startTime) / 1000;
}

function getTimeRemaining() {
    const elapsed = getElapsedSeconds();
    return Math.max(0, pomodoroState.totalTime - elapsed);
}

function updateClockDisplay() {
    const elapsed = getElapsedSeconds();
    const timeRemaining = getTimeRemaining();
    const progress = elapsed / pomodoroState.totalTime;

    // Minute hand shows overall progress (full rotation over the session)
    const minuteAngle = progress * 360;
    minuteHand.setAttribute('transform', `rotate(${minuteAngle} 50 50)`);

    // Second hand moves continuously (full rotation per minute)
    const secondAngle = (elapsed % 60) * 6;
    secondHand.setAttribute('transform', `rotate(${secondAngle} 50 50)`);

    // Update time display (shows whole seconds)
    const minutes = Math.floor(timeRemaining / 60);
    const secs = Math.floor(timeRemaining % 60);
    pomodoroStatus.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function animatePomodoro() {
    if (!pomodoroState.running || pomodoroState.paused) return;

    updateClockDisplay();

    const timeRemaining = getTimeRemaining();

    if (timeRemaining <= 0) {
        // Timer complete
        cancelAnimationFrame(animationFrameId);
        playChime();

        if (!pomodoroState.isBreak) {
            // Work session complete, start break
            pomodoroState.isBreak = true;
            pomodoroState.totalTime = BREAK_DURATION;
            pomodoroState.startTime = Date.now();
            pomodoroState.elapsedBeforePause = 0;
            pomodoroClock.classList.add('break-mode');

            // Auto-start break after a short delay
            setTimeout(() => {
                if (pomodoroState.isBreak && pomodoroState.running) {
                    animationFrameId = requestAnimationFrame(animatePomodoro);
                }
            }, 1000);
        } else {
            // Break complete, reset to work mode
            resetPomodoro();
            playChime();
        }
        return;
    }

    animationFrameId = requestAnimationFrame(animatePomodoro);
}

function startPomodoro() {
    if (pomodoroState.running && !pomodoroState.paused) {
        // Pause
        pomodoroState.paused = true;
        pomodoroState.pausedAt = Date.now();
        pomodoroClock.classList.add('paused');
        pomodoroClock.classList.remove('running');
        cancelAnimationFrame(animationFrameId);
        return;
    }

    if (pomodoroState.paused) {
        // Resume
        pomodoroState.elapsedBeforePause = getElapsedSeconds();
        pomodoroState.startTime = Date.now();
        pomodoroState.paused = false;
        pomodoroState.pausedAt = null;
        pomodoroClock.classList.remove('paused');
        pomodoroClock.classList.add('running');
    } else {
        // Start fresh
        pomodoroState.running = true;
        pomodoroState.paused = false;
        pomodoroState.startTime = Date.now();
        pomodoroState.elapsedBeforePause = 0;
        pomodoroClock.classList.add('running');
    }

    animationFrameId = requestAnimationFrame(animatePomodoro);
}

function resetPomodoro() {
    cancelAnimationFrame(animationFrameId);
    pomodoroState.running = false;
    pomodoroState.paused = false;
    pomodoroState.isBreak = false;
    pomodoroState.startTime = null;
    pomodoroState.pausedAt = null;
    pomodoroState.elapsedBeforePause = 0;
    pomodoroState.totalTime = WORK_DURATION;

    pomodoroClock.classList.remove('running', 'paused', 'break-mode');

    // Reset hands
    minuteHand.setAttribute('transform', 'rotate(0 50 50)');
    secondHand.setAttribute('transform', 'rotate(0 50 50)');
    pomodoroStatus.textContent = '25:00';
}

function toggleMute() {
    pomodoroState.muted = !pomodoroState.muted;
    localStorage.setItem('pomodoroMuted', pomodoroState.muted);
    pomodoroMute.classList.toggle('muted', pomodoroState.muted);

    // Update icon
    if (pomodoroState.muted) {
        soundIcon.innerHTML = '<path fill="currentColor" d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else {
        soundIcon.innerHTML = '<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
}

// Event listeners
clockFace.addEventListener('click', startPomodoro);
pomodoroReset.addEventListener('click', (e) => {
    e.stopPropagation();
    resetPomodoro();
});
pomodoroMute.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMute();
});

// Minimize/Expand functionality
let pomodoroHidden = localStorage.getItem('pomodoroHidden') !== 'false';

function hidePomodoroClock() {
    pomodoroClock.classList.add('hidden');
    pomodoroExpand.classList.add('visible');
    pomodoroHidden = true;
    localStorage.setItem('pomodoroHidden', 'true');
}

function showPomodoroClock() {
    pomodoroClock.classList.remove('hidden');
    pomodoroExpand.classList.remove('visible');
    pomodoroHidden = false;
    localStorage.setItem('pomodoroHidden', 'false');
}

pomodoroMinimize.addEventListener('click', (e) => {
    e.stopPropagation();
    hidePomodoroClock();
});

pomodoroExpand.addEventListener('click', showPomodoroClock);

// Initialize display
if (pomodoroHidden) {
    pomodoroClock.classList.add('hidden');
    pomodoroExpand.classList.add('visible');
}

pomodoroStatus.textContent = '25:00';
if (pomodoroState.muted) {
    pomodoroMute.classList.add('muted');
    soundIcon.innerHTML = '<path fill="currentColor" d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
}

// ============================================
// Fidget Widget (Colorforms)
// ============================================

const fidgetToggle = document.getElementById('fidget-toggle');
const fidgetWidget = document.getElementById('fidget-widget');
const fidgetMinimize = document.getElementById('fidget-minimize');
const fidgetClear = document.getElementById('fidget-clear');
const fidgetPalette = document.getElementById('fidget-palette');
const fidgetCanvas = document.getElementById('fidget-canvas');

let selectedShape = null;
let shapeZIndex = 1;
let isDraggingNew = false;
let draggedElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let shapeRotations = new Map(); // Track rotation per shape

// Open/close fidget widget
fidgetToggle.addEventListener('click', () => {
    fidgetWidget.classList.remove('hidden');
    fidgetToggle.classList.add('hidden');
});

fidgetMinimize.addEventListener('click', () => {
    fidgetWidget.classList.add('hidden');
    fidgetToggle.classList.remove('hidden');
    // Deselect any selected shape
    if (selectedShape) {
        selectedShape.classList.remove('selected');
        selectedShape = null;
    }
});

// Clear all shapes
fidgetClear.addEventListener('click', () => {
    fidgetCanvas.innerHTML = '';
    selectedShape = null;
    shapeZIndex = 1;
});

// Create shape from palette
function createShape(shapeType, size, color, x, y, rotation = 0) {
    const shape = document.createElement('div');
    shape.className = 'fidget-shape';
    shape.dataset.shape = shapeType;
    shape.dataset.size = size;
    shape.dataset.color = color;
    shape.style.left = x + 'px';
    shape.style.top = y + 'px';
    shape.style.zIndex = shapeZIndex++;
    shape.style.transform = `rotate(${rotation}deg)`;
    shapeRotations.set(shape, rotation);

    // Make shape draggable
    shape.addEventListener('mousedown', startDragShape);
    shape.addEventListener('touchstart', startDragShape, { passive: false });

    // Select on click
    shape.addEventListener('click', (e) => {
        e.stopPropagation();
        selectShape(shape);
    });

    // Double-click to rotate 45 degrees
    shape.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        rotateShape(shape, 45);
    });

    return shape;
}

// Rotate a shape
function rotateShape(shape, degrees) {
    const currentRotation = shapeRotations.get(shape) || 0;
    const newRotation = (currentRotation + degrees) % 360;
    shapeRotations.set(shape, newRotation);
    shape.style.transform = `rotate(${newRotation}deg)`;
}

// Select a shape
function selectShape(shape) {
    if (selectedShape) {
        selectedShape.classList.remove('selected');
    }
    selectedShape = shape;
    shape.classList.add('selected');
    // Bring to front
    shape.style.zIndex = shapeZIndex++;
}

// Deselect when clicking canvas
fidgetCanvas.addEventListener('click', (e) => {
    if (e.target === fidgetCanvas && selectedShape) {
        selectedShape.classList.remove('selected');
        selectedShape = null;
    }
});

// Drag from palette
fidgetPalette.querySelectorAll('.fidget-shape-btn').forEach(btn => {
    btn.addEventListener('mousedown', startDragFromPalette);
    btn.addEventListener('touchstart', startDragFromPalette, { passive: false });
});

function startDragFromPalette(e) {
    e.preventDefault();
    const btn = e.currentTarget;

    const shapeType = btn.dataset.shape;
    const size = btn.dataset.size;
    const color = btn.dataset.color;

    // Create a preview shape that follows the cursor
    const preview = document.createElement('div');
    preview.className = 'fidget-shape fidget-drag-preview';
    preview.dataset.shape = shapeType;
    preview.dataset.size = size;
    preview.dataset.color = color;
    document.body.appendChild(preview);

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    // Get dimensions after adding to DOM
    const previewRect = preview.getBoundingClientRect();
    dragOffsetX = previewRect.width / 2;
    dragOffsetY = previewRect.height / 2;

    preview.style.left = (clientX - dragOffsetX) + 'px';
    preview.style.top = (clientY - dragOffsetY) + 'px';

    isDraggingNew = true;
    draggedElement = preview;

    function moveDrag(e) {
        if (!isDraggingNew) return;
        e.preventDefault();
        const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        preview.style.left = (cx - dragOffsetX) + 'px';
        preview.style.top = (cy - dragOffsetY) + 'px';
    }

    function endDrag(e) {
        if (!isDraggingNew) return;
        isDraggingNew = false;

        const cx = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const cy = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;

        // Check if dropped on canvas
        const canvasRect = fidgetCanvas.getBoundingClientRect();
        if (cx >= canvasRect.left && cx <= canvasRect.right &&
            cy >= canvasRect.top && cy <= canvasRect.bottom) {
            // Add shape to canvas
            const newShape = createShape(shapeType, size, color,
                cx - canvasRect.left - dragOffsetX,
                cy - canvasRect.top - dragOffsetY);
            fidgetCanvas.appendChild(newShape);
            selectShape(newShape);
        }

        if (preview.parentNode) {
            preview.parentNode.removeChild(preview);
        }
        document.removeEventListener('mousemove', moveDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', moveDrag);
        document.removeEventListener('touchend', endDrag);
    }

    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

// Drag existing shape on canvas
function startDragShape(e) {
    e.preventDefault();
    e.stopPropagation();

    const shape = e.currentTarget;
    selectShape(shape);

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    const rect = shape.getBoundingClientRect();
    const canvasRect = fidgetCanvas.getBoundingClientRect();

    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;

    function moveShape(e) {
        const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        let newX = cx - canvasRect.left - dragOffsetX;
        let newY = cy - canvasRect.top - dragOffsetY;

        // Keep within canvas bounds
        newX = Math.max(0, Math.min(canvasRect.width - rect.width, newX));
        newY = Math.max(0, Math.min(canvasRect.height - rect.height, newY));

        shape.style.left = newX + 'px';
        shape.style.top = newY + 'px';
    }

    function endMove() {
        document.removeEventListener('mousemove', moveShape);
        document.removeEventListener('mouseup', endMove);
        document.removeEventListener('touchmove', moveShape);
        document.removeEventListener('touchend', endMove);
    }

    document.addEventListener('mousemove', moveShape);
    document.addEventListener('mouseup', endMove);
    document.addEventListener('touchmove', moveShape, { passive: false });
    document.addEventListener('touchend', endMove);
}

// ============================================
// Pong Widget (Meditative)
// ============================================

const pongToggle = document.getElementById('pong-toggle');
const pongWidget = document.getElementById('pong-widget');
const pongMinimize = document.getElementById('pong-minimize');
const pongCanvas = document.getElementById('pong-canvas');
const pongCtx = pongCanvas.getContext('2d');

let pongRunning = false;
let pongAnimationId = null;

// Game colors
const PONG_PADDLE_COLOR = '#4A9B9B'; // Teal
const PONG_BALL_COLOR = '#D85846'; // Coral
const PONG_BORDER_COLOR = '#1A1A1A'; // Charcoal

// Game objects
const pongPaddle = {
    x: 125,
    y: 280,
    width: 50,
    height: 8,
    speed: 6
};

const pongBall = {
    x: 150,
    y: 150,
    radius: 8,
    speedX: 2,
    speedY: 3,
    baseSpeed: 3
};

// Input state
let pongKeys = { up: false, down: false };
let pongMouseX = null;

// Open/close pong widget
pongToggle.addEventListener('click', () => {
    pongWidget.classList.remove('hidden');
    pongToggle.classList.add('hidden');
    startPong();
});

pongMinimize.addEventListener('click', () => {
    pongWidget.classList.add('hidden');
    pongToggle.classList.remove('hidden');
    stopPong();
});

function startPong() {
    if (pongRunning) return;
    pongRunning = true;
    resetBall();
    pongLoop();
}

function stopPong() {
    pongRunning = false;
    if (pongAnimationId) {
        cancelAnimationFrame(pongAnimationId);
        pongAnimationId = null;
    }
}

function resetBall() {
    pongBall.x = pongCanvas.width / 2;
    pongBall.y = pongCanvas.height / 3;

    // Random direction (mostly downward)
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -30 to 30 degrees from vertical
    pongBall.speedX = Math.sin(angle) * pongBall.baseSpeed;
    pongBall.speedY = Math.cos(angle) * pongBall.baseSpeed;
}

function updatePong() {
    // Paddle movement via keyboard (left/right now)
    if (pongKeys.up && pongPaddle.x > 0) {
        pongPaddle.x -= pongPaddle.speed;
    }
    if (pongKeys.down && pongPaddle.x < pongCanvas.width - pongPaddle.width) {
        pongPaddle.x += pongPaddle.speed;
    }

    // Paddle movement via mouse (horizontal)
    if (pongMouseX !== null) {
        const targetX = pongMouseX - pongPaddle.width / 2;
        pongPaddle.x = Math.max(0, Math.min(pongCanvas.width - pongPaddle.width, targetX));
    }

    // Ball movement
    pongBall.x += pongBall.speedX;
    pongBall.y += pongBall.speedY;

    // Ball collision with left/right walls
    if (pongBall.x - pongBall.radius <= 0 || pongBall.x + pongBall.radius >= pongCanvas.width) {
        pongBall.speedX = -pongBall.speedX;
        pongBall.x = Math.max(pongBall.radius, Math.min(pongCanvas.width - pongBall.radius, pongBall.x));
    }

    // Ball collision with top wall (bounces back down)
    if (pongBall.y - pongBall.radius <= 0) {
        pongBall.speedY = Math.abs(pongBall.speedY);
    }

    // Ball collision with paddle (bottom)
    if (pongBall.y + pongBall.radius >= pongPaddle.y &&
        pongBall.y - pongBall.radius <= pongPaddle.y + pongPaddle.height &&
        pongBall.x >= pongPaddle.x &&
        pongBall.x <= pongPaddle.x + pongPaddle.width) {

        pongBall.speedY = -Math.abs(pongBall.speedY);

        // Add slight angle based on where ball hits paddle
        const hitPos = (pongBall.x - pongPaddle.x) / pongPaddle.width;
        pongBall.speedX = (hitPos - 0.5) * pongBall.baseSpeed * 2;
    }

    // Ball goes off bottom - gently reset
    if (pongBall.y - pongBall.radius > pongCanvas.height) {
        resetBall();
    }
}

function drawPong() {
    // Clear canvas
    pongCtx.clearRect(0, 0, pongCanvas.width, pongCanvas.height);

    // Draw subtle center line (horizontal)
    pongCtx.setLineDash([5, 10]);
    pongCtx.strokeStyle = 'rgba(26, 26, 26, 0.1)';
    pongCtx.lineWidth = 1;
    pongCtx.beginPath();
    pongCtx.moveTo(0, pongCanvas.height / 2);
    pongCtx.lineTo(pongCanvas.width, pongCanvas.height / 2);
    pongCtx.stroke();
    pongCtx.setLineDash([]);

    // Draw paddle (horizontal at bottom)
    pongCtx.fillStyle = PONG_PADDLE_COLOR;
    pongCtx.fillRect(pongPaddle.x, pongPaddle.y, pongPaddle.width, pongPaddle.height);

    // Draw ball
    pongCtx.fillStyle = PONG_BALL_COLOR;
    pongCtx.beginPath();
    pongCtx.arc(pongBall.x, pongBall.y, pongBall.radius, 0, Math.PI * 2);
    pongCtx.fill();
}

function pongLoop() {
    if (!pongRunning) return;

    updatePong();
    drawPong();

    pongAnimationId = requestAnimationFrame(pongLoop);
}

// Keyboard controls for Pong
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') pongKeys.up = true;
    if (e.key === 'ArrowRight') pongKeys.down = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') pongKeys.up = false;
    if (e.key === 'ArrowRight') pongKeys.down = false;
});

// Mouse control
pongCanvas.addEventListener('mousemove', (e) => {
    const rect = pongCanvas.getBoundingClientRect();
    pongMouseX = e.clientX - rect.left;
});

pongCanvas.addEventListener('mouseleave', () => {
    pongMouseX = null;
});

// Touch control
pongCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = pongCanvas.getBoundingClientRect();
    pongMouseX = e.touches[0].clientX - rect.left;
}, { passive: false });

pongCanvas.addEventListener('touchend', () => {
    pongMouseX = null;
});

// Keyboard controls for selected shape
document.addEventListener('keydown', (e) => {
    // Don't handle if focus is in an input
    if (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA') {
        return;
    }

    if (!selectedShape) return;

    // Delete selected shape with Delete/Backspace key
    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        shapeRotations.delete(selectedShape);
        selectedShape.remove();
        selectedShape = null;
    }

    // Rotate with R key (45 degrees clockwise)
    if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotateShape(selectedShape, e.shiftKey ? -45 : 45);
    }
});
