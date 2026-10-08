document.addEventListener('DOMContentLoaded', () => {
  const bookingForm = document.getElementById('bookingForm');
  const bookingCard = document.getElementById('bookingCard');
  const confirmationCard = document.getElementById('confirmationCard');
  const submitBtn = document.getElementById('submitBtn');
  const phoneInput = document.getElementById('phone');
  const dateInput = document.getElementById('appointmentDate');
  const selectedTimeInput = document.getElementById('selectedTime');
  const timeButtons = document.querySelectorAll('.time-btn');
  const serviceCards = document.querySelectorAll('.service-card');
  const bookAnotherBtn = document.getElementById('bookAnotherBtn');

  // Admin Modal Elements
  const viewAppointmentsLink = document.getElementById('viewAppointmentsLink');
  const adminModal = document.getElementById('adminModal');
  const closeAdminModal = document.getElementById('closeAdminModal');
  const adminModalContent = document.getElementById('adminModalContent');

  // --- 1. Set Default & Minimum Date ---
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDateStr = `${yyyy}-${mm}-${dd}`;
  
  dateInput.min = minDateStr;

  // Default to tomorrow for optimal booking convenience
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomYyyy = tomorrow.getFullYear();
  const tomMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomDd = String(tomorrow.getDate()).padStart(2, '0');
  dateInput.value = `${tomYyyy}-${tomMm}-${tomDd}`;

  // --- 2. Live Phone Number Masking (US Format) ---
  phoneInput.addEventListener('input', (e) => {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
    if (!x[2]) {
      e.target.value = x[1];
    } else {
      e.target.value = !x[3] ? `(${x[1]}) ${x[2]}` : `(${x[1]}) ${x[2]}-${x[3]}`;
    }
    clearError('phoneError');
  });

  // --- 3. Interactive Time Slots ---
  timeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      timeButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTimeInput.value = btn.getAttribute('data-time');
      clearError('timeError');
    });
  });

  // --- 4. Service Selection Styling ---
  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      serviceCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // --- 5. Form Validation & Submission ---
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const fullName = document.getElementById('fullName').value.trim();
    const phone = phoneInput.value.trim();
    const email = document.getElementById('email').value.trim();
    const date = dateInput.value;
    const time = selectedTimeInput.value;
    const serviceRadio = document.querySelector('input[name="service"]:checked');
    const service = serviceRadio ? serviceRadio.value : 'Tailoring & Alterations';
    const notes = document.getElementById('notes').value.trim();

    let hasError = false;

    if (!fullName || fullName.length < 2) {
      showError('fullNameError', 'Please enter your full name.');
      hasError = true;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showError('phoneError', 'Please enter a valid 10-digit phone number.');
      hasError = true;
    }

    if (!date) {
      showError('dateError', 'Please select an appointment date.');
      hasError = true;
    }

    if (!time) {
      showError('timeError', 'Please choose a preferred time slot.');
      hasError = true;
    }

    if (hasError) return;

    // Set Loading State
    setLoading(true);

    try {
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          date,
          time,
          service,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment.');
      }

      // Display Confirmation Card
      document.getElementById('confClientName').textContent = data.booking.fullName;
      document.getElementById('confService').textContent = data.booking.service;
      document.getElementById('confDate').textContent = data.booking.date;
      document.getElementById('confTime').textContent = data.booking.time;
      document.getElementById('confPhone').textContent = phone;

      // Add to Google Calendar link
      const addToCalendarLink = document.getElementById('addToCalendarLink');
      if (data.booking.googleCalendarUrl) {
        addToCalendarLink.href = data.booking.googleCalendarUrl;
      }

      bookingCard.style.display = 'none';
      confirmationCard.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      alert(`Booking Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  });

  // --- 6. Book Another Appointment ---
  bookAnotherBtn.addEventListener('click', () => {
    bookingForm.reset();
    selectedTimeInput.value = '2:30 PM';
    timeButtons.forEach(b => {
      b.classList.toggle('selected', b.getAttribute('data-time') === '2:30 PM');
    });
    serviceCards.forEach((c, idx) => {
      c.classList.toggle('selected', idx === 0);
      const radio = c.querySelector('input[type="radio"]');
      if (radio) radio.checked = (idx === 0);
    });
    dateInput.value = `${tomYyyy}-${tomMm}-${tomDd}`;
    confirmationCard.style.display = 'none';
    bookingCard.style.display = 'block';
  });

  // --- 7. Admin / Recent Appointments Drawer ---
  viewAppointmentsLink.addEventListener('click', async (e) => {
    e.preventDefault();
    adminModal.style.display = 'flex';
    adminModalContent.innerHTML = '<p class="loading-text">Loading appointments...</p>';

    try {
      const res = await fetch('/api/bookings');
      const bookings = await res.json();

      if (!bookings || bookings.length === 0) {
        adminModalContent.innerHTML = '<p>No appointments booked yet.</p>';
        return;
      }

      let html = '';
      bookings.forEach(b => {
        html += `
          <div class="bkg-item">
            <div class="bkg-item-header">
              <span class="bkg-name">${escapeHtml(b.fullName)}</span>
              <span class="bkg-time">${escapeHtml(b.appointmentDate)} @ ${escapeHtml(b.appointmentTime)}</span>
            </div>
            <div class="bkg-detail"><strong>Phone:</strong> ${escapeHtml(b.phone)}</div>
            ${b.email ? `<div class="bkg-detail"><strong>Email:</strong> ${escapeHtml(b.email)}</div>` : ''}
            <div class="bkg-detail"><strong>Service:</strong> ${escapeHtml(b.service)}</div>
            ${b.notes ? `<div class="bkg-detail"><strong>Notes:</strong> ${escapeHtml(b.notes)}</div>` : ''}
            <div class="bkg-detail" style="margin-top: 6px; font-size: 0.8rem;">
              <span style="color: #2e7d32;">SMS Status: ${escapeHtml(b.smsDispatch?.status || 'N/A')}</span> | 
              <a href="${b.googleCalendarUrl}" target="_blank" style="color: #1a73e8; text-decoration: underline;">Open in Google Calendar</a>
            </div>
          </div>
        `;
      });
      adminModalContent.innerHTML = html;
    } catch (err) {
      adminModalContent.innerHTML = `<p style="color: red;">Error loading bookings: ${err.message}</p>`;
    }
  });

  closeAdminModal.addEventListener('click', () => {
    adminModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      adminModal.style.display = 'none';
    }
  });

  // Helpers
  function showError(elemId, msg) {
    const el = document.getElementById(elemId);
    if (el) el.textContent = msg;
  }

  function clearError(elemId) {
    const el = document.getElementById(elemId);
    if (el) el.textContent = '';
  }

  function clearAllErrors() {
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    const textSpan = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.btn-spinner');
    if (isLoading) {
      textSpan.textContent = 'Scheduling Fitting...';
      spinner.style.display = 'inline-block';
    } else {
      textSpan.textContent = 'Confirm Appointment';
      spinner.style.display = 'none';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
