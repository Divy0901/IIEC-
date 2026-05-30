# IIEC Attendance PWA

An installable phone-friendly attendance system for IIEC meetings. It includes:

- Login roles for super admin, admin, heads, joint heads, and members.
- Super-admin-only member editing and Google Sheets connection.
- Team directory grouped by IIEC portfolio.
- Rich member profiles with department, year, skills, emergency contact, LinkedIn, address, and bio.
- Member profile update requests that require super admin approval.
- Meeting scheduling with browser notifications that include each member's QR code.
- QR attendance scanning with manual fallback.
- Admin attendance correction requests that require super admin approval.
- Leave requests approved by admin or super admin.
- Offline app shell through a service worker.

## Demo logins

- Super admin: `super@iiec.local` / `super123`
- Admin: `admin@iiec.local` / `admin123`
- Member: `rohan@iiec.local` / `member123`

## Google Sheets setup

1. Create a Google Sheet and copy its spreadsheet ID from the URL.
2. Open [Google Apps Script](https://script.google.com/).
3. Create a project and paste `scripts/google-apps-script.js` into `Code.gs`.
4. Replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` with your Sheet ID.
5. Replace `CHANGE_THIS_SECRET` with a private phrase.
6. Deploy as a Web App, executing as yourself, with access set to anyone with the link.
7. Login as the super admin, open `Sheets`, and paste the `/exec` deployment URL plus the same secret.

The app writes to only two worksheet tabs:

- `TeamInfo`: member records and profile update approvals.
- `Attendance`: meetings, QR attendance, attendance correction requests, and leave records.

## Running locally

For install and service worker testing, serve the folder over HTTP:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.
