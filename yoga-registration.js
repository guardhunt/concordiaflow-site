// ------------------------------------------------------------
// Yoga registration: date picker + time/location + Worker submit
// ------------------------------------------------------------

const WORKER_ENDPOINT = 'https://yoga-reservations.concordiaspring.workers.dev/';

const yogaForm = document.getElementById('yoga-booking-form');
const yogaNameInput = document.getElementById('yoga-name');
const yogaEmailInput = document.getElementById('yoga-email');
const yogaCompanyInput = document.getElementById('yoga-company');
const yogaDateInput = document.getElementById('yoga-class-date');
const yogaTimeSelect = document.getElementById('yoga-class-time');
const yogaLocationInput = document.getElementById('yoga-location');
const yogaLocationField = document.getElementById('yoga-location-field');
const yogaLocationDisplay = document.getElementById('yoga-location-display');
const yogaAttendeesSelect = document.getElementById('yoga-attendees');
const yogaSubmitButton = document.getElementById('yoga-submit');
const yogaStatus = document.getElementById('yoga-form-status');
const SUBMIT_LABEL = 'Submit';
let successResetTimer = null;

const YOGA_LOCATIONS = {
  A: 'Wellspring Wellness, 960 Tunnel Rd, Asheville, NC 28805',
  B: 'The Sol Side, 113 Alexander Pl, Swannanoa, NC 28778',
};

// Day-of-week schedule (0=Sun ... 6=Sat)
const YOGA_SCHEDULE = {
  2: [
    { label: '7:15 AM – 8:30 AM', value: '7:15 AM – 8:30 AM', slot: 'A' },
    { label: '5:00 PM – 6:15 PM', value: '5:00 PM – 6:15 PM', slot: 'B' },
  ],
  5: [
    { label: '7:30 AM – 8:45 AM', value: '7:30 AM – 8:45 AM', slot: 'A' },
    { label: '9:30 AM – 10:45 AM', value: '9:30 AM – 10:45 AM', slot: 'B' },
  ],
};

function setYogaStatus(message, tone) {
  if (!yogaStatus) return;
  yogaStatus.textContent = message || '';
  yogaStatus.dataset.tone = tone || '';
}

function resetYogaLocationDisplay() {
  if (yogaLocationInput) yogaLocationInput.value = '';
  if (yogaLocationDisplay) yogaLocationDisplay.textContent = '';
  if (yogaLocationField) yogaLocationField.hidden = true;
}

function resetYogaTimeAndLocation() {
  if (!yogaTimeSelect) return;

  yogaTimeSelect.innerHTML = '<option value="">Choose a date first…</option>';
  yogaTimeSelect.value = '';
  yogaTimeSelect.disabled = true;
  resetYogaLocationDisplay();
}

function populateYogaTimeOptions(dayOfWeek) {
  if (!yogaTimeSelect) return;

  const slots = YOGA_SCHEDULE[dayOfWeek] || [];
  yogaTimeSelect.innerHTML = '<option value="">Choose a time…</option>';

  slots.forEach((slot) => {
    const option = document.createElement('option');
    option.value = slot.value;
    option.textContent = slot.label;
    option.dataset.slot = slot.slot;
    yogaTimeSelect.appendChild(option);
  });

  yogaTimeSelect.disabled = slots.length === 0;
  resetYogaLocationDisplay();
}

function updateYogaLocationFromTime() {
  if (!yogaTimeSelect || !yogaTimeSelect.value) {
    resetYogaLocationDisplay();
    return;
  }

  const selectedOption = yogaTimeSelect.selectedOptions[0];
  const slot = selectedOption?.dataset.slot;
  const location = slot ? YOGA_LOCATIONS[slot] : '';

  if (yogaLocationInput) yogaLocationInput.value = location;
  if (yogaLocationDisplay) yogaLocationDisplay.textContent = location;
  if (yogaLocationField) yogaLocationField.hidden = !location;
}

function clearSuccessResetTimer() {
  if (successResetTimer) {
    clearTimeout(successResetTimer);
    successResetTimer = null;
  }
}

function resetSubmitButton() {
  if (!yogaSubmitButton) return;
  clearSuccessResetTimer();
  yogaSubmitButton.disabled = false;
  yogaSubmitButton.classList.remove('is-loading', 'is-success');
  yogaSubmitButton.textContent = SUBMIT_LABEL;
}

function setButtonLoading(isLoading) {
  if (!yogaSubmitButton) return;

  clearSuccessResetTimer();
  yogaSubmitButton.classList.remove('is-success');
  yogaSubmitButton.disabled = isLoading;

  if (!isLoading) {
    yogaSubmitButton.classList.remove('is-loading');
    yogaSubmitButton.textContent = SUBMIT_LABEL;
    return;
  }

  yogaSubmitButton.classList.add('is-loading');
  yogaSubmitButton.replaceChildren('Finalizing');

  const dots = document.createElement('span');
  dots.className = 'loading-dots';
  dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = '<span>.</span><span>.</span><span>.</span>';
  yogaSubmitButton.appendChild(dots);
}

function setButtonSuccess() {
  if (!yogaSubmitButton) return;
  yogaSubmitButton.disabled = true;
  yogaSubmitButton.classList.remove('is-loading');
  yogaSubmitButton.classList.add('is-success');
  yogaSubmitButton.textContent = 'Success!';
}

function scheduleSubmitButtonReset() {
  clearSuccessResetTimer();
  successResetTimer = setTimeout(resetSubmitButton, 3000);
}

function yogaPayloadFromForm() {
  const name = (yogaNameInput?.value || '').trim();
  const email = (yogaEmailInput?.value || '').trim();
  const company = (yogaCompanyInput?.value || '').trim();
  const date = (yogaDateInput?.value || '').trim();
  const time = (yogaTimeSelect?.value || '').trim();
  const location = (yogaLocationInput?.value || '').trim();
  const attendeesRaw = (yogaAttendeesSelect?.value || '').trim();
  const attendees = attendeesRaw ? Number(attendeesRaw) : 1;

  return { name, email, company, date, time, location, attendees };
}

function validateYogaPayload(payload) {
  // Name is optional; email required for confirmation, others required by UX.
  if (!payload.email) return 'Please add your email so we can confirm your reservation.';
  if (!payload.date) return 'Please select a class date.';
  if (!payload.time) return 'Please select a class time.';
  if (!payload.location) return 'Please select a time so we can confirm the location.';
  if (!Number.isFinite(payload.attendees) || payload.attendees < 1 || payload.attendees > 10) {
    return 'Please select a valid number of attendees.';
  }
  return '';
}

// Date picker: Tue/Fri only
if (yogaDateInput && window.flatpickr) {
  window.flatpickr(yogaDateInput, {
    dateFormat: 'l, F j, Y',
    minDate: 'today',
    disable: [
      function (date) {
        const day = date.getDay();
        return day !== 2 && day !== 5;
      },
    ],
    onChange: function (_selectedDates, _dateStr, instance) {
      const selectedDate = instance.selectedDates[0];
      if (!selectedDate) {
        resetYogaTimeAndLocation();
        return;
      }
      populateYogaTimeOptions(selectedDate.getDay());
      setYogaStatus('', '');
    },
    onClose: function (_selectedDates, dateStr) {
      if (!dateStr) resetYogaTimeAndLocation();
    },
  });
}

if (yogaTimeSelect) {
  yogaTimeSelect.addEventListener('change', function () {
    updateYogaLocationFromTime();
    setYogaStatus('', '');
  });
}

if (yogaForm) {
  yogaForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    setYogaStatus('', '');

    const payload = yogaPayloadFromForm();

    // Honeypot: if filled, treat as success but do nothing.
    if (payload.company) {
      yogaForm.reset();
      resetYogaTimeAndLocation();
      setYogaStatus("We've recieved your reservation. Check your email for confimation.", 'success');
      setButtonSuccess();
      scheduleSubmitButtonReset();
      return;
    }

    const validationError = validateYogaPayload(payload);
    if (validationError) {
      setYogaStatus(validationError, 'error');
      return;
    }

    try {
      setButtonLoading(true);

      const response = await fetch(WORKER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.status === 200 && data && data.status === 'ok') {
        setYogaStatus("We've recieved your reservation. Check your email for confimation.", 'success');
        yogaForm.reset();
        resetYogaTimeAndLocation();
        setButtonSuccess();
        scheduleSubmitButtonReset();
        return;
      }

      setYogaStatus(
        'Something went wrong submitting your reservation. Please try again, or email me directly.',
        'error',
      );
      setButtonLoading(false);
    } catch {
      setYogaStatus(
        'Something went wrong submitting your reservation. Please try again, or email me directly.',
        'error',
      );
      setButtonLoading(false);
    }
  });
}

