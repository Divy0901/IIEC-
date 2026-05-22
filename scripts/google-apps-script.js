/**
 * IIEC Attendance Google Sheets backend.
 *
 * Setup:
 * 1. Open https://script.google.com and create a new Apps Script project.
 * 2. Paste this file into Code.gs.
 * 3. Set SHEET_ID to your Google Sheet ID.
 * 4. Set SHEET_SECRET to any private phrase.
 * 5. Deploy as Web app, execute as yourself, allow access to anyone with link.
 * 6. Paste the deployed /exec URL and the same secret into Super Admin > Sheets.
 */

const SHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_SECRET = "CHANGE_THIS_SECRET";

const HEADERS = {
  TeamInfo: [
    "Id",
    "Name",
    "Email",
    "Phone",
    "Portfolio",
    "Role",
    "StudentId",
    "Department",
    "Year",
    "Contact",
    "Linkedin",
    "qrCode",
    "status",
  ],
  Attendance: [
    "timestamp",
    "Id",
    "userId",
    "MeetingId",
    "Title",
    "Portfolio",
    "Date",
    "Time",
    "Venue",
    "Status",
    "reason",
    "markedBy",
    "markedByName",
    "requestedBy",
    "decidedBy",
  ]
};

function doPost(event) {
  const data = JSON.parse(event.postData.contents || "{}");
  if (data.secret !== SHEET_SECRET) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const type = data.type || "unknown";
  const payload = data.payload || {};
  const ss = SpreadsheetApp.openById(SHEET_ID);

  if (isTeamInfoEvent(type)) {
    appendRow(ss, "TeamInfo", normalizeTeamInfoRow(type, payload));
  }

  if (isAttendanceEvent(type)) {
    appendRow(ss, "Attendance", normalizeAttendanceRow(type, payload));
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function isTeamInfoEvent(type) {
  return type.indexOf("member_") === 0 || type.indexOf("profile_request_") === 0;
}

function isAttendanceEvent(type) {
  return type.indexOf("meeting_") === 0 ||
    type.indexOf("attendance_") === 0 ||
    type.indexOf("leave_") === 0;
}

function normalizeTeamInfoRow(type, payload) {
  const updates = payload.updates || {};
  return {
    timestamp: new Date().toISOString(),
    eventType: type,
    id: payload.id || payload.userId || "",
    name: payload.name || payload.requestedByName || "",
    email: payload.email || "",
    phone: payload.phone || updates.phone || "",
    portfolio: payload.portfolio || "",
    role: payload.role || "",
    position: payload.position || "",
    studentId: payload.studentId || updates.studentId || "",
    department: payload.department || updates.department || "",
    year: payload.year || updates.year || "",
    skills: payload.skills || updates.skills || "",
    joinedOn: payload.joinedOn || "",
    emergencyContact: payload.emergencyContact || updates.emergencyContact || "",
    linkedin: payload.linkedin || updates.linkedin || "",
    address: payload.address || updates.address || "",
    bio: payload.bio || updates.bio || "",
    qrCode: payload.qrCode || "",
    status: payload.status || "",
    requestStatus: payload.status || "",
    summary: payload.summary || "",
    payload
  };
}

function normalizeAttendanceRow(type, payload) {
  const meeting = payload.meeting || {};
  return {
    timestamp: new Date().toISOString(),
    eventType: type,
    id: payload.id || meeting.id || "",
    userId: payload.userId || "",
    meetingId: payload.meetingId || meeting.id || "",
    title: payload.title || meeting.title || "",
    portfolio: payload.portfolio || meeting.portfolio || "",
    date: payload.date || meeting.date || payload.from || "",
    time: payload.time || meeting.time || "",
    venue: payload.venue || meeting.venue || "",
    status: payload.status || "",
    newStatus: payload.newStatus || "",
    reason: payload.reason || payload.notes || meeting.notes || "",
    markedBy: payload.markedBy || "",
    markedByName: payload.markedByName || "",
    requestedBy: payload.requestedBy || "",
    decidedBy: payload.decidedBy || "",
    payload
  };
}

function appendRow(ss, sheetName, payload) {
  const sheet = getSheet(ss, sheetName);
  const headers = HEADERS[sheetName];
  const row = headers.map((key) => {
    if (payload[key] === undefined) return "";
    if (typeof payload[key] === "object") return JSON.stringify(payload[key]);
    return payload[key];
  });
  sheet.appendRow(row);
}

function getSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(HEADERS[sheetName]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
