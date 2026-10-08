const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Defaults
const TAILOR_PHONE = process.env.TAILOR_PHONE || '+17348587922';
const TAILOR_EMAIL = process.env.TAILOR_EMAIL || 'nsabbagh83@gmail.com';
const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || '';

// Twilio Setup (Optional, triggers real SMS when keys provided)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✓ Twilio SMS Client initialized.');
  } catch (err) {
    console.warn('⚠️ Could not initialize Twilio client:', err.message);
  }
} else {
  console.log('ℹ️ Twilio credentials not provided. SMS alerts will run in simulation mode.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data persistence file
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), 'utf8');
}

function loadBookings() {
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveBooking(booking) {
  try {
    const bookings = loadBookings();
    bookings.unshift(booking);
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving booking:', err);
  }
}

/**
 * Generates an instant Google Calendar "Add Event" URL
 */
function createGoogleCalendarUrl({ fullName, phone, email, service, notes, startDateTime, endDateTime }) {
  const pad = (n) => String(n).padStart(2, '0');
  const formatGCalDate = (d) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };

  const title = encodeURIComponent(`✂️ Fitting: ${fullName} - Classic Alterations (${service || 'Alterations'})`);
  const details = encodeURIComponent(
    `=== CLASSIC ALTERATIONS APPOINTMENT ===\n` +
    `Client: ${fullName}\n` +
    `Phone: ${phone}\n` +
    `Email: ${email || 'Not provided'}\n` +
    `Service: ${service}\n` +
    `Notes: ${notes || 'None'}\n\n` +
    `Tailor Contact: ${TAILOR_PHONE} (${TAILOR_EMAIL})`
  );
  const location = encodeURIComponent('Classic Alterations Studio');
  const dates = `${formatGCalDate(startDateTime)}/${formatGCalDate(endDateTime)}`;
  const add = encodeURIComponent(TAILOR_EMAIL);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&add=${add}`;
}

/**
 * Sends SMS notification to the tailor
 */
async function sendSmsNotification({ fullName, phone, email, dateStr, timeStr, service, notes }) {
  const smsBody = 
    `✂️ CLASSIC ALTERATIONS - NEW APPOINTMENT!\n\n` +
    `• Client: ${fullName}\n` +
    `• Phone: ${phone}\n` +
    (email ? `• Email: ${email}\n` : '') +
    `• Service: ${service}\n` +
    `• Date: ${dateStr}\n` +
    `• Time: ${timeStr}\n` +
    (notes ? `• Notes: ${notes}\n` : '') +
    `\nSynced to Google Calendar: ${TAILOR_EMAIL}`;

  console.log('----------------------------------------------------');
  console.log(`[SMS DISPATCH] Target: ${TAILOR_PHONE}`);
  console.log(smsBody);
  console.log('----------------------------------------------------');

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body: smsBody,
        from: TWILIO_PHONE_NUMBER,
        to: TAILOR_PHONE
      });
      return { success: true, sid: message.sid, status: 'sent' };
    } catch (err) {
      console.error('Twilio SMS error:', err.message);
      return { success: false, error: err.message, status: 'failed' };
    }
  } else {
    return {
      success: true,
      status: 'simulated',
      message: 'SMS simulated (provide Twilio credentials in .env to send live SMS)'
    };
  }
}

/**
 * Triggers Google Apps Script Webhook to insert event into Google Calendar
 */
async function syncToGoogleCalendarWebhook(payload) {
  if (!GOOGLE_APPS_SCRIPT_WEBHOOK_URL) {
    return {
      synced: false,
      reason: 'GOOGLE_APPS_SCRIPT_WEBHOOK_URL is not set in .env'
    };
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('[Google Calendar Webhook Response]:', result);
    return { synced: true, result };
  } catch (err) {
    console.error('Error calling Google Calendar webhook:', err.message);
    return { synced: false, error: err.message };
  }
}

// =================== API ROUTES ===================

// Health & Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'healthy',
    tailor: {
      phone: TAILOR_PHONE,
      email: TAILOR_EMAIL
    },
    integrations: {
      sms: twilioClient ? 'Twilio Live Connected' : 'Simulation Mode (Set Twilio credentials in .env)',
      googleCalendarWebhook: GOOGLE_APPS_SCRIPT_WEBHOOK_URL ? 'Configured' : 'Not configured (Follow google-apps-script guide)'
    },
    totalBookings: loadBookings().length
  });
});

// Get Bookings List
app.get('/api/bookings', (req, res) => {
  const bookings = loadBookings();
  res.json(bookings);
});

// Book Appointment Endpoint
app.post('/api/book-appointment', async (req, res) => {
  try {
    const { fullName, phone, email, date, time, service, notes } = req.body;

    // Validation
    if (!fullName || !phone || !date || !time) {
      return res.status(400).json({
        error: 'Full Name, Phone Number, Date, and Time are required fields.'
      });
    }

    // Construct start & end Date objects
    // Assuming incoming date: 'YYYY-MM-DD', time: '14:30' or '2:30 PM'
    let hours = 10;
    let minutes = 0;

    if (time.includes(':')) {
      const parts = time.replace(/[^\d:]/g, '').split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10) || 0;
      if (time.toLowerCase().includes('pm') && hours < 12) {
        hours += 12;
      }
      if (time.toLowerCase().includes('am') && hours === 12) {
        hours = 0;
      }
    }

    const startDateTime = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
    if (isNaN(startDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid Date or Time provided.' });
    }

    // 45-minute default fitting duration
    const endDateTime = new Date(startDateTime.getTime() + 45 * 60 * 1000);

    // Format human readable date & time
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatted = startDateTime.toLocaleDateString('en-US', optionsDate);
    const timeFormatted = startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Generate Direct Google Calendar Add Link
    const googleCalendarUrl = createGoogleCalendarUrl({
      fullName,
      phone,
      email,
      service: service || 'Tailoring & Alterations',
      notes,
      startDateTime,
      endDateTime
    });

    const bookingRecord = {
      id: 'BKG-' + Date.now(),
      createdAt: new Date().toISOString(),
      fullName,
      phone,
      email: email || null,
      service: service || 'Tailoring & Alterations',
      appointmentDate: date,
      appointmentTime: timeFormatted,
      startIso: startDateTime.toISOString(),
      endIso: endDateTime.toISOString(),
      notes: notes || '',
      googleCalendarUrl
    };

    // 1. Dispatch SMS notification to Tailor
    const smsResult = await sendSmsNotification({
      fullName,
      phone,
      email,
      dateStr: dateFormatted,
      timeStr: timeFormatted,
      service: service || 'Tailoring & Alterations',
      notes
    });
    bookingRecord.smsDispatch = smsResult;

    // 2. Dispatch to Google Calendar Webhook (if set)
    const calendarWebhookResult = await syncToGoogleCalendarWebhook({
      fullName,
      phone,
      email,
      service: service || 'Tailoring & Alterations',
      notes,
      startTimeIso: startDateTime.toISOString(),
      endTimeIso: endDateTime.toISOString()
    });
    bookingRecord.calendarSync = calendarWebhookResult;

    // 3. Save to local database
    saveBooking(bookingRecord);

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      booking: {
        id: bookingRecord.id,
        fullName,
        service: bookingRecord.service,
        date: dateFormatted,
        time: timeFormatted,
        googleCalendarUrl,
        smsStatus: smsResult.status,
        calendarSyncStatus: calendarWebhookResult.synced ? 'synced' : 'pending_or_manual'
      }
    });

  } catch (error) {
    console.error('Error handling booking request:', error);
    res.status(500).json({
      error: 'An internal server error occurred while processing the appointment.',
      details: error.message
    });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🧵 Tailor Appointment Booking System is Online!`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📱 Tailor Alert Phone: ${TAILOR_PHONE}`);
  console.log(`📅 Tailor Calendar:    ${TAILOR_EMAIL}`);
  console.log(`====================================================`);
});
