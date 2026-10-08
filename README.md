# ✂️ Tailor Lead Capture & Appointment Booking System

A standalone, elegant web booking portal and lead capture form tailored specifically for bespoke tailoring and alterations studios.

Designed for:
- **Tailor Calendar**: `nsabbagh83@gmail.com`
- **Tailor SMS Alert Number**: `+1 (734) 858-7922`

---

## 🌟 Key Features

1. **Lead Capture Form**:
   - Collects Customer **Full Name**, **Phone Number** (with real-time formatting), and optional **Email**.
   - Interactive Garment / Service selection (Hemming, Suits & Tuxedos, Bridal & Gowns, Waist & Tapering, Repairs, Custom fittings).
   - **Date & Time Picker** with convenient morning, afternoon, and evening fitting slots.
   - Garment details & deadline notes.

2. **Instant SMS Alert**:
   - Sends a formatted text notification directly to `+1 (734) 858-7922` every time a customer books.
   - Text includes the customer's full name, phone number, service type, appointment date, time, and notes.

3. **Google Calendar Sync (`nsabbagh83@gmail.com`)**:
   - **One-Click Web App Sync**: Includes a 100% free Google Apps Script that auto-inserts fittings into her Google Calendar and sets reminders.
   - **Customer Add to Calendar**: Generates a 1-click "Add to Google Calendar" button on the confirmation screen pre-filled with fitting details.

4. **Standalone & Independent**:
   - Isolated in its own dedicated directory (`scratch/tailor-booking-app`).
   - Zero dependencies on other projects.
   - Local JSON lead backup (`data/bookings.json`) so no customer inquiry is ever lost.

---

## 🚀 Quick Start (Running Locally)

### 1. Install Dependencies & Start Server
```bash
cd C:\Users\drcin\.gemini\antigravity\scratch\tailor-booking-app
npm install
npm start
```
The booking form is now live at: **`http://localhost:3000`**

---

## 📲 How to Enable Live SMS Alerts (Twilio)

By default, the server runs in **Simulation Mode** (it prints formatted SMS dispatches directly to the terminal and database so you can test freely without incurring costs).

To connect live SMS to text `+1 (734) 858-7922`:
1. Get a Twilio account (or use an existing one) from [twilio.com](https://www.twilio.com).
2. Open the `.env` file in `tailor-booking-app/`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
   ```
3. Restart the server. Any new booking will immediately send a live text message to `+1 (734) 858-7922`.

---

## 📅 How to Connect to Her Google Calendar (2 Minutes, Free)

We provided a ready-to-run Google Apps Script inside `google-apps-script/Code.gs`. This writes events directly to `nsabbagh83@gmail.com`'s primary Google Calendar:

1. Have your friend log into Google with **`nsabbagh83@gmail.com`**.
2. Open **[script.google.com](https://script.google.com)** and click **"New Project"**.
3. Copy the contents of [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) and paste it into the script editor (replace the existing empty code).
4. Click **Deploy** (top right) ➔ **New deployment**.
   - Select type: **Web app** (gear icon ⚙️).
   - Description: `Tailor Appointment Sync`.
   - Execute as: `Me (nsabbagh83@gmail.com)`.
   - Who has access: `Anyone`.
5. Click **Deploy** and authorize the calendar permissions when prompted.
6. Copy the **Web App URL** Google gives you, and paste it into your `.env` file:
   ```env
   GOOGLE_APPS_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
7. Restart the server! Now, whenever a lead is submitted, it automatically creates the event on her Google Calendar with 1-hour and 24-hour reminders!

---

## 📂 Project Structure

```
tailor-booking-app/
├── package.json             # App dependencies & scripts
├── server.js                # Express API backend, SMS dispatch, Calendar logic
├── .env                     # Configuration (Phone, Email, Webhooks, Twilio)
├── .env.example             # Template config
├── data/
│   └── bookings.json        # Persistent local log of all customer appointments
├── google-apps-script/
│   └── Code.gs              # Copy-paste Google Apps Script for Google Calendar sync
└── public/
    ├── index.html           # Atelier boutique booking portal
    ├── style.css            # Luxury responsive styling
    └── app.js               # Dynamic form validation & interactive time slots
```

---

## 🌐 Sharing with Customers / Going Live

You can easily host this so customers can access it from their phone or Instagram bio:
- **Free cloud hosting**: Push this folder to GitHub and deploy to [Render.com](https://render.com) or [Railway.app](https://railway.app) for free in 1 click.
- **Instant temporary public link**: Run `npx localtunnel --port 3000` or `ngrok http 3000` to get an immediate public HTTPS link to share.
