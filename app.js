// State
let countdowns = JSON.parse(localStorage.getItem('countdowns')) || [];
let currentModalCountdown = null;

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
function createCountdownCard(countdown, isArchived = false, isCanceled = false) {
    const card = document.createElement('div');
    card.className = 'countdown-card';
    card.dataset.id = countdown.id;

    if (isCanceled) {
        card.classList.add('canceled');
        const target = new Date(countdown.targetDate);
        const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        card.innerHTML = `
            <div class="countdown-info">
                <div class="countdown-date">${dateStr}</div>
                <div class="countdown-name">${countdown.name}</div>
            </div>
        `;
        return card;
    }

    if (isArchived) {
        card.classList.add('archived');
        const target = new Date(countdown.targetDate);
        const dateStr = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        card.innerHTML = `
            <div class="countdown-info">
                <div class="countdown-date">Completed ${dateStr}</div>
                <div class="countdown-name">${countdown.name}</div>
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
        <div class="countdown-info">
            <div>
                <span class="countdown-number">${timeDisplay.number}</span>
                <span class="countdown-unit">${timeDisplay.unit}</span>
            </div>
            <div class="countdown-date">${timeDisplay.dateStr}</div>
            <div class="countdown-name">${countdown.name}</div>
        </div>
        <div class="countdown-actions">
            <button class="btn-delete" data-id="${countdown.id}">Delete</button>
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
    active.forEach(countdown => {
        activeList.appendChild(createCountdownCard(countdown));
    });

    // Render archived
    archiveList.innerHTML = '';
    archived.forEach(countdown => {
        archiveList.appendChild(createCountdownCard(countdown, true, false));
    });

    // Render canceled
    canceledList.innerHTML = '';
    canceled.forEach(countdown => {
        canceledList.appendChild(createCountdownCard(countdown, false, true));
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

// Modal: Yes button
document.getElementById('btn-yes').addEventListener('click', () => {
    if (currentModalCountdown) {
        const index = countdowns.findIndex(c => c.id === currentModalCountdown.id);
        if (index !== -1) {
            countdowns[index].status = 'archived';
            saveCountdowns();
            renderCountdowns();
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

let currentPanelCountdown = null;
let notesTimeout = null;

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

    // Show panel
    detailPanel.classList.add('active');
    panelOverlay.classList.add('active');
}

// Close panel
function closePanel() {
    detailPanel.classList.remove('active');
    panelOverlay.classList.remove('active');
    currentPanelCountdown = null;
}

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

    saveCountdowns();
    renderPanelLinks();
}

// Delete link
function deleteLink(linkIndex) {
    if (!currentPanelCountdown) return;

    const index = countdowns.findIndex(c => c.id === currentPanelCountdown.id);
    if (index === -1) return;

    countdowns[index].links.splice(linkIndex, 1);
    saveCountdowns();
    renderPanelLinks();
}

// Save notes (debounced)
function saveNotes(notes) {
    if (!currentPanelCountdown) return;

    const index = countdowns.findIndex(c => c.id === currentPanelCountdown.id);
    if (index === -1) return;

    countdowns[index].notes = notes;
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

// Initial render
renderCountdowns();

// Update interval
setInterval(update, 1000);
