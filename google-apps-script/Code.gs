/**
 * GOOGLE APPS SCRIPT FOR TAILOR APPOINTMENT BOOKING
 * 
 * Target Calendar: nsabbagh83@gmail.com
 * Tailor Phone: +1 (734) 858-7922
 * 
 * How to deploy this script:
 * 1. Log in to Google as nsabbagh83@gmail.com (or share calendar).
 * 2. Visit https://script.google.com and click "New Project".
 * 3. Replace all default code with this entire file.
 * 4. Click "Save" (disk icon), then click "Deploy" > "New deployment".
 * 5. Select type: "Web app".
 * 6. Set Description: "Tailor Appointment Sync".
 * 7. Set "Execute as": "Me (nsabbagh83@gmail.com)".
 * 8. Set "Who has access": "Anyone" (allows your booking form server to post leads).
 * 9. Click "Deploy", click "Authorize access", and copy the Web App URL.
 * 10. Paste the Web App URL into your .env file as GOOGLE_APPS_SCRIPT_WEBHOOK_URL.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No post data received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const fullName = data.fullName || "Customer";
    const phone = data.phone || "Not provided";
    const email = data.email || "";
    const service = data.service || "Tailoring & Alterations";
    const notes = data.notes || "No special notes";
    const startTimeIso = data.startTimeIso;
    const endTimeIso = data.endTimeIso;

    if (!startTimeIso) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Missing startTimeIso parameter"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const startTime = new Date(startTimeIso);
    let endTime;
    if (endTimeIso) {
      endTime = new Date(endTimeIso);
    } else {
      // Default to 45-minute fitting appointment
      endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    }

    // Get Primary Calendar for the current user
    const calendar = CalendarApp.getDefaultCalendar();

    // Event title and formatted description
    const eventTitle = `✂️ Fitting: ${fullName} - Classic Alterations (${service})`;
    const eventDescription = 
      "=== NEW CLASSIC ALTERATIONS APPOINTMENT ===\n\n" +
      "Client Name: " + fullName + "\n" +
      "Phone Number: " + phone + "\n" +
      "Email: " + (email || "Not provided") + "\n" +
      "Service Requested: " + service + "\n" +
      "Garment / Notes: " + notes + "\n\n" +
      "Booked automatically via Classic Alterations Booking Portal";

    const options = {
      description: eventDescription,
      location: "Classic Alterations Studio"
    };

    if (email && email.includes("@")) {
      options.guests = email;
      options.sendInvites = true;
    }

    // Create the event on Google Calendar
    const event = calendar.createEvent(eventTitle, startTime, endTime, options);

    // Set reminders: 24 hours before and 1 hour before
    event.addPopupReminder(60);     // 60 minutes before
    event.addEmailReminder(1440);   // 24 hours before

    // Also send an instant email notification to the tailor
    const tailorEmail = "nsabbagh83@gmail.com";
    const emailSubject = `🧵 Classic Alterations - New Fitting: ${fullName} on ${Utilities.formatDate(startTime, Session.getScriptTimeZone(), "EEE, MMM d, yyyy 'at' h:mm a")}`;
    const emailBody = 
      "You have a new tailoring appointment booked!\n\n" +
      "• Client: " + fullName + "\n" +
      "• Phone: " + phone + "\n" +
      "• Email: " + (email || "N/A") + "\n" +
      "• Service: " + service + "\n" +
      "• Date & Time: " + Utilities.formatDate(startTime, Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy 'at' h:mm a") + "\n" +
      "• Notes: " + notes + "\n\n" +
      "This appointment has already been added to your Google Calendar.";

    MailApp.sendEmail(tailorEmail, emailSubject, emailBody);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      eventId: event.getId(),
      eventTitle: eventTitle,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Tailor Calendar Webhook is active and listening for bookings."
  })).setMimeType(ContentService.MimeType.JSON);
}
