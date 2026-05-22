(function () {
  const STORE_KEY = "iiec-attendance-state-v1";
  const roles = {
    super_admin: "Super Admin",
    admin: "Admin",
    head: "Head",
    joint_head: "Joint Head",
    member: "Member"
  };

  const portfolios = [
    "Incubation",
    "Innovation",
    "Entrepreneurship",
    "Operations",
    "Outreach"
  ];

  const profileFields = [
    "phone",
    "studentId",
    "department",
    "year",
    "skills",
    "emergencyContact",
    "linkedin",
    "address",
    "bio"
  ];

  const memberDefaults = {
    studentId: "",
    department: "",
    year: "",
    skills: "",
    joinedOn: "",
    emergencyContact: "",
    linkedin: "",
    address: "",
    bio: ""
  };

  const seed = {
    sheetUrl: "",
    sheetSecret: "",
    activeUserId: null,
    users: [
      {
        id: "u-super",
        name: "IIEC Super Admin",
        email: "super@iiec.local",
        password: "super123",
        phone: "+91 90000 00001",
        portfolio: "Operations",
        role: "super_admin",
        position: "Faculty Coordinator",
        qrCode: "IIEC-u-super-9281",
        status: "Active",
        studentId: "FAC-001",
        department: "IIEC",
        year: "Coordinator",
        skills: "Mentoring, approvals, operations",
        joinedOn: "2024-07-01",
        emergencyContact: "+91 90000 00101",
        linkedin: "",
        address: "Campus",
        bio: "Super admin for IIEC attendance, approvals, and member records."
      },
      {
        id: "u-admin",
        name: "IIEC Admin",
        email: "admin@iiec.local",
        password: "admin123",
        phone: "+91 90000 00002",
        portfolio: "Innovation",
        role: "admin",
        position: "Student Coordinator",
        qrCode: "IIEC-u-admin-3812",
        status: "Active",
        studentId: "IIEC-ADM-01",
        department: "Computer Science",
        year: "3rd Year",
        skills: "Event coordination, reporting",
        joinedOn: "2024-08-01",
        emergencyContact: "+91 90000 00102",
        linkedin: "",
        address: "Hostel Block A",
        bio: "Admin responsible for meetings, scanning, and leave approvals."
      },
      {
        id: "u-head",
        name: "Aarav Sharma",
        email: "aarav@iiec.local",
        password: "member123",
        phone: "+91 90000 00003",
        portfolio: "Incubation",
        role: "head",
        position: "Head",
        qrCode: "IIEC-u-head-5164",
        status: "Active",
        studentId: "IIEC-INC-01",
        department: "Mechanical Engineering",
        year: "3rd Year",
        skills: "Pitch review, prototyping",
        joinedOn: "2024-08-12",
        emergencyContact: "+91 90000 00103",
        linkedin: "",
        address: "Campus",
        bio: "Leads incubation portfolio work and project follow-ups."
      },
      {
        id: "u-joint",
        name: "Meera Nair",
        email: "meera@iiec.local",
        password: "member123",
        phone: "+91 90000 00004",
        portfolio: "Entrepreneurship",
        role: "joint_head",
        position: "Joint Head",
        qrCode: "IIEC-u-joint-7734",
        status: "Active",
        studentId: "IIEC-ENT-02",
        department: "Business Administration",
        year: "2nd Year",
        skills: "Market research, founder outreach",
        joinedOn: "2024-09-03",
        emergencyContact: "+91 90000 00104",
        linkedin: "",
        address: "Campus",
        bio: "Supports entrepreneurship events and founder sessions."
      },
      {
        id: "u-member",
        name: "Rohan Patel",
        email: "rohan@iiec.local",
        password: "member123",
        phone: "+91 90000 00005",
        portfolio: "Innovation",
        role: "member",
        position: "Member",
        qrCode: "IIEC-u-member-1902",
        status: "Active",
        studentId: "IIEC-INN-12",
        department: "Electronics",
        year: "1st Year",
        skills: "Design thinking, documentation",
        joinedOn: "2025-01-10",
        emergencyContact: "+91 90000 00105",
        linkedin: "",
        address: "Campus",
        bio: "Innovation portfolio member."
      }
    ],
    meetings: [
      {
        id: "m-1",
        title: "Weekly IIEC Review",
        portfolio: "All",
        date: new Date().toISOString().slice(0, 10),
        time: "16:00",
        venue: "Seminar Hall",
        notes: "Bring current project updates.",
        notified: false
      }
    ],
    attendance: [],
    attendanceRequests: [],
    profileRequests: [],
    leaves: []
  };

  let state = load();
  let view = "dashboard";
  let videoStream = null;

  const app = document.getElementById("app");

  function load() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return normalizeState(structuredClone(seed));
    try {
      return normalizeState({ ...structuredClone(seed), ...JSON.parse(raw) });
    } catch {
      return normalizeState(structuredClone(seed));
    }
  }

  function normalizeState(nextState) {
    nextState.users = (nextState.users || []).map((user) => ({
      ...memberDefaults,
      ...user
    }));
    nextState.meetings = nextState.meetings || [];
    nextState.attendance = nextState.attendance || [];
    nextState.attendanceRequests = nextState.attendanceRequests || [];
    nextState.profileRequests = nextState.profileRequests || [];
    nextState.leaves = nextState.leaves || [];
    return nextState;
  }

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function syncSheet(type, payload) {
    if (!state.sheetUrl) return Promise.resolve(false);
    const body = JSON.stringify({
      type,
      payload,
      secret: state.sheetSecret,
      sentAt: new Date().toISOString()
    });
    return fetch(state.sheetUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body
    }).then(() => true).catch(() => false);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function currentUser() {
    return state.users.find((user) => user.id === state.activeUserId);
  }

  function canAdmin(user = currentUser()) {
    return user && ["super_admin", "admin"].includes(user.role);
  }

  function isSuper(user = currentUser()) {
    return user && user.role === "super_admin";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function qrUrl(value) {
    return `https://quickchart.io/qr?text=${encodeURIComponent(value)}&size=360&margin=2`;
  }

  function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function appNav() {
    const user = currentUser();
    const items = [
      ["dashboard", "Dashboard"],
      ["myqr", "Profile"],
      ["teams", "Teams"],
      ["members", "Members"],
      ["meetings", "Meetings"],
      ["attendance", "Attendance"],
      ["leave", "Leave"],
      ["settings", "Sheets"]
    ].filter(([key]) => {
      if (key === "settings") return isSuper(user);
      if (["meetings", "attendance"].includes(key)) return canAdmin(user);
      return true;
    });
    return items.map(([key, label]) =>
      `<button class="${view === key ? "active" : ""}" data-view="${key}">${label}</button>`
    ).join("");
  }

  function render() {
    stopScanner();
    const user = currentUser();
    if (!user) {
      app.innerHTML = loginTemplate();
      bindLogin();
      return;
    }

    app.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">II</div>
            <div>
              <h1>IIEC Attendance</h1>
              <p>Installable member system</p>
            </div>
          </div>
          <nav class="nav">${appNav()}</nav>
          <div class="profile">
            <strong>${escapeHtml(user.name)}</strong>
            <p>${roles[user.role]} · ${escapeHtml(user.portfolio)}</p>
            <button class="btn secondary" id="logoutBtn" type="button" style="width:100%;margin-top:12px;">Logout</button>
          </div>
        </aside>
        <main class="main">${route()}</main>
      </div>
    `;
    bindShell();
    bindRoute();
  }

  function loginTemplate() {
    return `
      <section class="login-page">
        <form class="login-card" id="loginForm">
          <div class="brand" style="color:var(--ink);margin-bottom:18px;">
            <div class="brand-mark">II</div>
            <div>
              <h1>IIEC Attendance</h1>
              <p style="color:var(--muted);">Login to continue</p>
            </div>
          </div>
          <p>Demo accounts: super@iiec.local / super123, admin@iiec.local / admin123, rohan@iiec.local / member123.</p>
          <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="username"></label>
          <label class="field"><span>Password</span><input name="password" type="password" required autocomplete="current-password"></label>
          <button class="btn" type="submit" style="width:100%;">Login</button>
          <p class="notice hide" id="loginError">Invalid email or password.</p>
        </form>
      </section>
    `;
  }

  function route() {
    const user = currentUser();
    const headings = {
      dashboard: ["Dashboard", "Live overview of members, meetings, leaves, and attendance."],
      myqr: ["Profile", "Your personal QR, member details, and profile update requests."],
      teams: ["Teams", "Portfolio-wise team directory for IIEC."],
      members: ["Members", "Portfolio-wise member information and role records."],
      meetings: ["Meetings", "Schedule meetings and notify logged-in members with their QR."],
      attendance: ["Attendance", "Scan personal QR codes and manage change approvals."],
      leave: ["Leave Approval", "Members request leave; admins approve or reject it."],
      settings: ["Google Sheets", "Connect the app to a Sheet through Apps Script."]
    };
    const [title, subtitle] = headings[view] || headings.dashboard;
    return `
      <div class="topbar">
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        <button class="btn secondary" id="installBtn" type="button">Install app</button>
      </div>
      ${view === "dashboard" ? dashboardView() : ""}
      ${view === "myqr" ? myQrView(user) : ""}
      ${view === "teams" ? teamsView() : ""}
      ${view === "members" ? membersView(user) : ""}
      ${view === "meetings" ? meetingsView() : ""}
      ${view === "attendance" ? attendanceView() : ""}
      ${view === "leave" ? leaveView(user) : ""}
      ${view === "settings" ? settingsView() : ""}
    `;
  }

  function dashboardView() {
    const today = new Date().toISOString().slice(0, 10);
    const todayMeetings = state.meetings.filter((meeting) => meeting.date === today).length;
    const present = state.attendance.filter((item) => item.date === today && item.status === "Present").length;
    const pendingLeaves = state.leaves.filter((leave) => leave.status === "Pending").length;
    const pendingChanges = state.attendanceRequests.filter((request) => request.status === "Pending").length;
    const pendingProfiles = state.profileRequests.filter((request) => request.status === "Pending").length;
    return `
      <section class="grid">
        ${metric("Members", state.users.length, "Registered IIEC people")}
        ${metric("Today", todayMeetings, "Meetings scheduled")}
        ${metric("Present", present, "Marked today")}
        ${metric("Pending", pendingLeaves + pendingChanges + pendingProfiles, "Approvals needed")}
        <div class="panel span-6">
          <div class="row between"><h3>Upcoming meetings</h3><button class="btn secondary" data-view="meetings">Open</button></div>
          ${meetingList(state.meetings.slice(-5).reverse())}
        </div>
        <div class="panel span-6">
          <div class="row between"><h3>Portfolio summary</h3><span class="pill">${portfolios.length} portfolios</span></div>
          ${portfolios.map((portfolio) => {
            const members = state.users.filter((user) => user.portfolio === portfolio).length;
            return `<p class="row between"><span>${portfolio}</span><strong>${members}</strong></p>`;
          }).join("")}
        </div>
        <div class="panel span-12">
          <div class="row between"><h3>Team health</h3><button class="btn secondary" data-view="teams">Open teams</button></div>
          <div class="team-grid">${portfolios.map(teamSummaryCard).join("")}</div>
        </div>
      </section>
    `;
  }

  function metric(label, value, sub) {
    return `<div class="panel span-3"><div class="label">${label}</div><div class="metric">${value}</div><div class="label">${sub}</div></div>`;
  }

  function myQrView(user) {
    const myRequests = state.profileRequests.filter((request) => request.userId === user.id);
    return `
      <section class="grid">
        <div class="panel span-5">
          <div class="qr-card">
            <img class="qr-code" src="${qrUrl(user.qrCode)}" alt="Personal QR code">
            <strong>${escapeHtml(user.name)}</strong>
            <span class="pill">${escapeHtml(user.qrCode)}</span>
          </div>
        </div>
        <div class="panel span-7">
          <h3>Member information</h3>
          ${infoRows(user)}
        </div>
        <form class="panel span-7" id="profileRequestForm">
          <h3>Request profile update</h3>
          <div class="grid" style="gap:12px;">
            <div class="span-6">${field("phone", "Phone", user.phone)}</div>
            <div class="span-6">${field("studentId", "Student ID", user.studentId)}</div>
            <div class="span-6">${field("department", "Department", user.department)}</div>
            <div class="span-6">${field("year", "Year", user.year)}</div>
            <div class="span-12">${field("skills", "Skills", user.skills)}</div>
            <div class="span-6">${field("emergencyContact", "Emergency contact", user.emergencyContact)}</div>
            <div class="span-6">${field("linkedin", "LinkedIn", user.linkedin)}</div>
            <div class="span-12">${textareaField("address", "Address", user.address)}</div>
            <div class="span-12">${textareaField("bio", "Bio", user.bio)}</div>
          </div>
          <button class="btn" type="submit">Send profile update</button>
        </form>
        <div class="panel span-5">
          <h3>My update requests</h3>
          ${myRequests.length ? myRequests.slice().reverse().map(profileRequestMini).join("") : `<p class="label">No profile update requests yet.</p>`}
        </div>
      </section>
    `;
  }

  function infoRows(user) {
    return `
      <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(user.phone)}</p>
      <p><strong>Portfolio:</strong> ${escapeHtml(user.portfolio)}</p>
      <p><strong>Role:</strong> ${roles[user.role]}</p>
      <p><strong>Position:</strong> ${escapeHtml(user.position)}</p>
      <p><strong>Student ID:</strong> ${escapeHtml(user.studentId)}</p>
      <p><strong>Department:</strong> ${escapeHtml(user.department)}</p>
      <p><strong>Year:</strong> ${escapeHtml(user.year)}</p>
      <p><strong>Skills:</strong> ${escapeHtml(user.skills)}</p>
      <p><strong>Joined:</strong> ${escapeHtml(user.joinedOn || "Not set")}</p>
      <p><strong>Emergency:</strong> ${escapeHtml(user.emergencyContact)}</p>
      <p><strong>LinkedIn:</strong> ${user.linkedin ? `<a href="${escapeHtml(user.linkedin)}" target="_blank" rel="noreferrer">${escapeHtml(user.linkedin)}</a>` : "Not set"}</p>
      <p><strong>Address:</strong> ${escapeHtml(user.address)}</p>
      <p><strong>Bio:</strong> ${escapeHtml(user.bio)}</p>
      <p><strong>Status:</strong> ${escapeHtml(user.status)}</p>
    `;
  }

  function teamsView() {
    return `
      <section class="grid">
        <div class="panel span-12">
          <div class="row between">
            <h3>Portfolio teams</h3>
            <span class="pill">${state.users.filter((user) => user.status === "Active").length} active members</span>
          </div>
          <div class="team-grid">${portfolios.map(teamCard).join("")}</div>
        </div>
      </section>
    `;
  }

  function teamSummaryCard(portfolio) {
    const members = state.users.filter((user) => user.portfolio === portfolio && user.status === "Active");
    const leads = members.filter((user) => ["head", "joint_head"].includes(user.role)).length;
    return `
      <div class="team-card">
        <span class="label">${portfolio}</span>
        <strong>${members.length} members</strong>
        <p>${leads} heads or joint heads</p>
      </div>
    `;
  }

  function teamCard(portfolio) {
    const members = state.users.filter((user) => user.portfolio === portfolio && user.status === "Active");
    return `
      <div class="team-card">
        <div class="row between">
          <h4>${portfolio}</h4>
          <span class="pill">${members.length}</span>
        </div>
        ${members.length ? members.map(memberCard).join("") : `<p class="label">No active members yet.</p>`}
      </div>
    `;
  }

  function memberCard(user) {
    return `
      <div class="member-card">
        <strong>${escapeHtml(user.name)}</strong>
        <span class="pill">${roles[user.role]}</span>
        <p>${escapeHtml(user.position)} - ${escapeHtml(user.department)} - ${escapeHtml(user.year)}</p>
        <p class="label">${escapeHtml(user.skills || "Skills not added")}</p>
      </div>
    `;
  }

  function membersView(user) {
    const editable = isSuper(user);
    const pendingProfileRequests = state.profileRequests.filter((request) => request.status === "Pending");
    return `
      <section class="grid">
        <div class="panel ${editable ? "span-7" : "span-12"}">
          <div class="row between">
            <h3>All members</h3>
            <select id="portfolioFilter" style="max-width:220px;">
              <option value="All">All portfolios</option>
              ${portfolios.map((portfolio) => `<option>${portfolio}</option>`).join("")}
            </select>
          </div>
          <div class="table-wrap">${membersTable()}</div>
        </div>
        ${editable ? memberForm() : `<div class="panel span-12 notice">Only the super admin can change member information.</div>`}
        ${editable ? `
          <div class="panel span-12">
            <h3>Profile update approvals</h3>
            ${pendingProfileRequests.length ? pendingProfileRequests.map(profileRequestCard).join("") : `<p class="label">No pending profile updates.</p>`}
          </div>
        ` : ""}
      </section>
    `;
  }

  function membersTable(filter = "All") {
    const rows = state.users
      .filter((user) => filter === "All" || user.portfolio === filter)
      .map((user) => `
        <tr>
          <td><strong>${escapeHtml(user.name)}</strong><br><span class="label">${escapeHtml(user.email)}</span></td>
          <td>${escapeHtml(user.phone)}</td>
          <td>${escapeHtml(user.portfolio)}</td>
          <td><span class="pill">${roles[user.role]}</span></td>
          <td>${escapeHtml(user.position)}<br><span class="label">${escapeHtml(user.department)} - ${escapeHtml(user.year)}</span></td>
          <td>${escapeHtml(user.status)}</td>
          <td>${isSuper() ? `<button class="btn secondary" data-edit-member="${user.id}" type="button">Edit</button>` : ""}</td>
        </tr>
      `).join("");
    return `
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Portfolio</th><th>Role</th><th>Position</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function memberForm(member = null) {
    const item = member || {};
    return `
      <form class="panel span-5" id="memberForm">
        <h3>${member ? "Edit member" : "Add member"}</h3>
        <input type="hidden" name="id" value="${escapeHtml(item.id || "")}">
        ${field("name", "Name", item.name || "", true)}
        ${field("email", "Email", item.email || "", true, "email")}
        ${field("phone", "Phone", item.phone || "", true)}
        ${field("studentId", "Student ID", item.studentId || "")}
        ${field("department", "Department", item.department || "")}
        ${field("year", "Year", item.year || "")}
        <label class="field"><span>Portfolio</span><select name="portfolio">${portfolios.map((portfolio) => `<option ${item.portfolio === portfolio ? "selected" : ""}>${portfolio}</option>`).join("")}</select></label>
        <label class="field"><span>Role</span><select name="role">${Object.entries(roles).map(([value, label]) => `<option value="${value}" ${item.role === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        ${field("position", "Position", item.position || "Member", true)}
        ${field("skills", "Skills", item.skills || "")}
        ${field("joinedOn", "Joined on", item.joinedOn || "", false, "date")}
        ${field("emergencyContact", "Emergency contact", item.emergencyContact || "")}
        ${field("linkedin", "LinkedIn", item.linkedin || "")}
        ${textareaField("address", "Address", item.address || "")}
        ${textareaField("bio", "Bio", item.bio || "")}
        ${field("password", "Password", item.password || "member123", true)}
        <label class="field"><span>Status</span><select name="status"><option ${item.status === "Active" ? "selected" : ""}>Active</option><option ${item.status === "Inactive" ? "selected" : ""}>Inactive</option></select></label>
        <button class="btn" type="submit">${member ? "Save changes" : "Add member"}</button>
      </form>
    `;
  }

  function profileRequestMini(request) {
    const cls = request.status === "Approved" ? "ok" : request.status === "Rejected" ? "bad" : "wait";
    return `
      <div style="border-bottom:1px solid var(--line);padding:12px 0;">
        <div class="row between">
          <strong>${formatDate(request.requestedDate)}</strong>
          <span class="pill ${cls}">${escapeHtml(request.status)}</span>
        </div>
        <p class="label">${escapeHtml(request.summary)}</p>
      </div>
    `;
  }

  function profileRequestCard(request) {
    const user = state.users.find((item) => item.id === request.userId);
    return `
      <div style="border-bottom:1px solid var(--line);padding:12px 0;">
        <div class="row between">
          <strong>${escapeHtml(user?.name || "Unknown member")}</strong>
          <span class="pill wait">Pending</span>
        </div>
        <div class="table-wrap">${profileDiffTable(user, request.updates)}</div>
        <div class="row">
          <button class="btn" data-approve-profile="${request.id}" type="button">Approve update</button>
          <button class="btn warn" data-reject-profile="${request.id}" type="button">Reject</button>
        </div>
      </div>
    `;
  }

  function profileDiffTable(user, updates) {
    const rows = profileFields.map((key) => `
      <tr>
        <td>${labelFor(key)}</td>
        <td>${escapeHtml(user?.[key] || "")}</td>
        <td>${escapeHtml(updates?.[key] || "")}</td>
      </tr>
    `).join("");
    return `<table><thead><tr><th>Field</th><th>Current</th><th>Requested</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function labelFor(key) {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  }

  function meetingsView() {
    return `
      <section class="grid">
        <form class="panel span-5" id="meetingForm">
          <h3>Schedule meeting</h3>
          ${field("title", "Meeting title", "", true)}
          <label class="field"><span>Portfolio</span><select name="portfolio"><option>All</option>${portfolios.map((portfolio) => `<option>${portfolio}</option>`).join("")}</select></label>
          ${field("date", "Date", new Date().toISOString().slice(0, 10), true, "date")}
          ${field("time", "Time", "16:00", true, "time")}
          ${field("venue", "Venue", "", true)}
          <label class="field"><span>Notes</span><textarea name="notes"></textarea></label>
          <button class="btn" type="submit">Schedule and notify</button>
        </form>
        <div class="panel span-7">
          <h3>Scheduled meetings</h3>
          ${meetingList(state.meetings.slice().reverse(), true)}
        </div>
      </section>
    `;
  }

  function meetingList(meetings, withActions = false) {
    if (!meetings.length) return `<p class="label">No meetings yet.</p>`;
    return meetings.map((meeting) => `
      <div style="border-bottom:1px solid var(--line);padding:12px 0;">
        <div class="row between">
          <strong>${escapeHtml(meeting.title)}</strong>
          <span class="pill ${meeting.notified ? "ok" : "wait"}">${meeting.notified ? "Notified" : "Draft"}</span>
        </div>
        <p class="label">${formatDate(meeting.date)} · ${escapeHtml(meeting.time)} · ${escapeHtml(meeting.venue)} · ${escapeHtml(meeting.portfolio)}</p>
        ${meeting.notes ? `<p>${escapeHtml(meeting.notes)}</p>` : ""}
        ${withActions ? `<button class="btn secondary" data-notify="${meeting.id}" type="button">Send notification</button>` : ""}
      </div>
    `).join("");
  }

  function attendanceView() {
    const pending = state.attendanceRequests.filter((request) => request.status === "Pending");
    return `
      <section class="grid">
        <div class="panel span-5">
          <h3>Scan attendance</h3>
          <label class="field"><span>Meeting</span><select id="scanMeeting">${state.meetings.map((meeting) => `<option value="${meeting.id}">${escapeHtml(meeting.title)} · ${formatDate(meeting.date)}</option>`).join("")}</select></label>
          <video class="scanner hide" id="scannerVideo" playsinline></video>
          <div class="row">
            <button class="btn" id="startScan" type="button">Start scan</button>
            <button class="btn secondary" id="stopScan" type="button">Stop</button>
          </div>
          <p class="label">If camera scanning is unavailable, enter the member QR code manually.</p>
          <form id="manualScanForm" class="row">
            <input name="code" placeholder="IIEC-u-member-1902" required>
            <button class="btn secondary" type="submit">Mark present</button>
          </form>
        </div>
        <div class="panel span-7">
          <h3>Attendance log</h3>
          <div class="table-wrap">${attendanceTable()}</div>
        </div>
        <form class="panel span-5" id="attendanceRequestForm">
          <h3>Request attendance update</h3>
          <label class="field"><span>Member</span><select name="userId">${state.users.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} · ${escapeHtml(user.portfolio)}</option>`).join("")}</select></label>
          <label class="field"><span>Meeting</span><select name="meetingId">${state.meetings.map((meeting) => `<option value="${meeting.id}">${escapeHtml(meeting.title)} · ${formatDate(meeting.date)}</option>`).join("")}</select></label>
          <label class="field"><span>New status</span><select name="newStatus"><option>Present</option><option>Absent</option><option>On Leave</option></select></label>
          <label class="field"><span>Reason</span><textarea name="reason" required></textarea></label>
          <button class="btn" type="submit">Send to super admin</button>
        </form>
        <div class="panel span-12">
          <h3>Attendance change requests</h3>
          ${pending.length ? pending.map(changeRequestCard).join("") : `<p class="label">No pending requests.</p>`}
        </div>
      </section>
    `;
  }

  function attendanceTable() {
    const rows = state.attendance.slice().reverse().map((record) => {
      const user = state.users.find((item) => item.id === record.userId);
      const meeting = state.meetings.find((item) => item.id === record.meetingId);
      return `
        <tr>
          <td>${escapeHtml(user?.name || "Unknown")}</td>
          <td>${escapeHtml(meeting?.title || "Unknown")}</td>
          <td>${formatDate(record.date)}</td>
          <td><span class="pill ok">${escapeHtml(record.status)}</span></td>
          <td>${escapeHtml(record.markedByName)}</td>
        </tr>
      `;
    }).join("");
    return `<table><thead><tr><th>Member</th><th>Meeting</th><th>Date</th><th>Status</th><th>Marked by</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function changeRequestCard(request) {
    const user = state.users.find((item) => item.id === request.userId);
    const meeting = state.meetings.find((item) => item.id === request.meetingId);
    return `
      <div style="border-bottom:1px solid var(--line);padding:12px 0;">
        <div class="row between">
          <strong>${escapeHtml(user?.name || "Unknown")} · ${escapeHtml(meeting?.title || "Unknown")}</strong>
          <span class="pill wait">Pending</span>
        </div>
        <p>${escapeHtml(request.reason)}</p>
        <div class="row">
          <button class="btn" data-approve-attendance="${request.id}" type="button">Approve</button>
          <button class="btn warn" data-reject-attendance="${request.id}" type="button">Reject</button>
        </div>
      </div>
    `;
  }

  function leaveView(user) {
    const visibleLeaves = canAdmin(user) ? state.leaves : state.leaves.filter((leave) => leave.userId === user.id);
    return `
      <section class="grid">
        <form class="panel span-5" id="leaveForm">
          <h3>Request leave</h3>
          ${field("from", "From", new Date().toISOString().slice(0, 10), true, "date")}
          ${field("to", "To", new Date().toISOString().slice(0, 10), true, "date")}
          <label class="field"><span>Reason</span><textarea name="reason" required></textarea></label>
          <button class="btn" type="submit">Submit leave</button>
        </form>
        <div class="panel span-7">
          <h3>${canAdmin(user) ? "Leave approvals" : "My leaves"}</h3>
          ${visibleLeaves.length ? visibleLeaves.slice().reverse().map(leaveCard).join("") : `<p class="label">No leave records yet.</p>`}
        </div>
      </section>
    `;
  }

  function leaveCard(leave) {
    const user = state.users.find((item) => item.id === leave.userId);
    const cls = leave.status === "Approved" ? "ok" : leave.status === "Rejected" ? "bad" : "wait";
    return `
      <div style="border-bottom:1px solid var(--line);padding:12px 0;">
        <div class="row between">
          <strong>${escapeHtml(user?.name || "Unknown")}</strong>
          <span class="pill ${cls}">${escapeHtml(leave.status)}</span>
        </div>
        <p class="label">${formatDate(leave.from)} to ${formatDate(leave.to)}</p>
        <p>${escapeHtml(leave.reason)}</p>
        ${canAdmin() && leave.status === "Pending" ? `
          <div class="row">
            <button class="btn" data-approve-leave="${leave.id}" type="button">Approve</button>
            <button class="btn warn" data-reject-leave="${leave.id}" type="button">Reject</button>
          </div>` : ""}
      </div>
    `;
  }

  function settingsView() {
    return `
      <section class="grid">
        <form class="panel span-7" id="settingsForm">
          <h3>Sheets connection</h3>
          <p class="notice">Deploy the included Apps Script as a web app, paste its URL here, and updates will be posted into two tabs: TeamInfo and Attendance.</p>
          <label class="field"><span>Apps Script web app URL</span><input name="sheetUrl" value="${escapeHtml(state.sheetUrl)}" placeholder="https://script.google.com/macros/s/.../exec"></label>
          <label class="field"><span>Shared secret</span><input name="sheetSecret" value="${escapeHtml(state.sheetSecret)}" placeholder="Use the same value as SHEET_SECRET"></label>
          <button class="btn" type="submit">Save connection</button>
        </form>
        <div class="panel span-5">
          <h3>Permissions</h3>
          <p><strong>Super admin:</strong> edits members, Sheets connection, and attendance approvals.</p>
          <p><strong>Admin:</strong> schedules meetings, scans QR, approves leave, requests attendance changes.</p>
          <p><strong>Members:</strong> view personal QR, attendance, and leave requests.</p>
        </div>
      </section>
    `;
  }

  function field(name, label, value = "", required = false, type = "text") {
    return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""}></label>`;
  }

  function textareaField(name, label, value = "", required = false) {
    return `<label class="field"><span>${label}</span><textarea name="${name}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea></label>`;
  }

  function bindLogin() {
    document.getElementById("loginForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const user = state.users.find((item) =>
        item.email.toLowerCase() === data.email.toLowerCase() &&
        item.password === data.password &&
        item.status === "Active"
      );
      if (!user) {
        document.getElementById("loginError").classList.remove("hide");
        return;
      }
      state.activeUserId = user.id;
      save();
      render();
    });
  }

  function bindShell() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        view = button.dataset.view;
        render();
      });
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
      state.activeUserId = null;
      save();
      render();
    });
    document.getElementById("installBtn")?.addEventListener("click", installPwa);
  }

  function bindRoute() {
    if (view === "myqr") bindProfile();
    if (view === "members") bindMembers();
    if (view === "meetings") bindMeetings();
    if (view === "attendance") bindAttendance();
    if (view === "leave") bindLeave();
    if (view === "settings") bindSettings();
  }

  function bindProfile() {
    document.getElementById("profileRequestForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const user = currentUser();
      const updates = {};
      profileFields.forEach((key) => {
        updates[key] = String(data[key] || "").trim();
      });
      const changed = profileFields.filter((key) => updates[key] !== String(user[key] || ""));
      if (!changed.length) {
        alert("No profile changes to request.");
        return;
      }
      const request = {
        id: uid("pr"),
        userId: user.id,
        requestedBy: user.id,
        requestedByName: user.name,
        requestedDate: new Date().toISOString().slice(0, 10),
        requestedAt: new Date().toISOString(),
        updates,
        summary: changed.map(labelFor).join(", "),
        status: "Pending",
        decidedBy: "",
        decidedAt: ""
      };
      state.profileRequests.push(request);
      save();
      syncSheet("profile_request_create", request);
      render();
    });
  }

  function bindMembers() {
    document.getElementById("portfolioFilter")?.addEventListener("change", (event) => {
      event.currentTarget.closest(".panel").querySelector(".table-wrap").innerHTML = membersTable(event.target.value);
      bindMembers();
    });
    document.querySelectorAll("[data-edit-member]").forEach((button) => {
      button.addEventListener("click", () => {
        const member = state.users.find((user) => user.id === button.dataset.editMember);
        document.getElementById("memberForm").outerHTML = memberForm(member);
        bindMembers();
      });
    });
    document.querySelectorAll("[data-approve-profile]").forEach((button) => {
      button.addEventListener("click", () => resolveProfileRequest(button.dataset.approveProfile, true));
    });
    document.querySelectorAll("[data-reject-profile]").forEach((button) => {
      button.addEventListener("click", () => resolveProfileRequest(button.dataset.rejectProfile, false));
    });
    document.getElementById("memberForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      if (data.id) {
        const index = state.users.findIndex((user) => user.id === data.id);
        state.users[index] = { ...state.users[index], ...data };
        syncSheet("member_update", state.users[index]);
      } else {
        const member = {
          ...memberDefaults,
          ...data,
          id: uid("u"),
          qrCode: `IIEC-${Date.now().toString(36)}-${Math.floor(Math.random() * 9000 + 1000)}`
        };
        state.users.push(member);
        syncSheet("member_create", member);
      }
      save();
      render();
    });
  }

  function bindMeetings() {
    document.getElementById("meetingForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const meeting = { ...Object.fromEntries(new FormData(event.currentTarget)), id: uid("m"), notified: false };
      state.meetings.push(meeting);
      save();
      syncSheet("meeting_create", meeting);
      notifyMeeting(meeting.id);
      render();
    });
    document.querySelectorAll("[data-notify]").forEach((button) => {
      button.addEventListener("click", () => notifyMeeting(button.dataset.notify));
    });
  }

  function bindAttendance() {
    document.getElementById("startScan")?.addEventListener("click", startScanner);
    document.getElementById("stopScan")?.addEventListener("click", stopScanner);
    document.getElementById("manualScanForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = new FormData(event.currentTarget).get("code");
      markAttendance(code);
      event.currentTarget.reset();
    });
    document.getElementById("attendanceRequestForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const meeting = state.meetings.find((item) => item.id === data.meetingId);
      const request = {
        ...data,
        id: uid("ar"),
        date: meeting?.date || new Date().toISOString().slice(0, 10),
        requestedBy: currentUser().id,
        requestedByName: currentUser().name,
        status: "Pending",
        requestedAt: new Date().toISOString()
      };
      state.attendanceRequests.push(request);
      save();
      syncSheet("attendance_request_create", request);
      render();
    });
    document.querySelectorAll("[data-approve-attendance]").forEach((button) => {
      button.addEventListener("click", () => resolveAttendanceRequest(button.dataset.approveAttendance, true));
    });
    document.querySelectorAll("[data-reject-attendance]").forEach((button) => {
      button.addEventListener("click", () => resolveAttendanceRequest(button.dataset.rejectAttendance, false));
    });
  }

  function bindLeave() {
    document.getElementById("leaveForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const leave = {
        ...Object.fromEntries(new FormData(event.currentTarget)),
        id: uid("l"),
        userId: currentUser().id,
        status: "Pending",
        decidedBy: ""
      };
      state.leaves.push(leave);
      save();
      syncSheet("leave_create", leave);
      render();
    });
    document.querySelectorAll("[data-approve-leave]").forEach((button) => {
      button.addEventListener("click", () => resolveLeave(button.dataset.approveLeave, "Approved"));
    });
    document.querySelectorAll("[data-reject-leave]").forEach((button) => {
      button.addEventListener("click", () => resolveLeave(button.dataset.rejectLeave, "Rejected"));
    });
  }

  function bindSettings() {
    document.getElementById("settingsForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.sheetUrl = new FormData(event.currentTarget).get("sheetUrl").trim();
      state.sheetSecret = new FormData(event.currentTarget).get("sheetSecret").trim();
      save();
      render();
    });
  }

  function notifyMeeting(meetingId) {
    const meeting = state.meetings.find((item) => item.id === meetingId);
    if (!meeting) return;
    const recipients = state.users.filter((user) =>
      user.status === "Active" && (meeting.portfolio === "All" || user.portfolio === meeting.portfolio)
    );
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          recipients.forEach((user) => {
            new Notification(`IIEC: ${meeting.title}`, {
              body: `${formatDate(meeting.date)} at ${meeting.time}. Your QR: ${user.qrCode}`,
              icon: "icons/icon.svg"
            });
          });
        }
      });
    }
    meeting.notified = true;
    save();
    syncSheet("meeting_notify", { meeting, recipients: recipients.map((user) => user.id) });
    render();
  }

  async function startScanner() {
    if (!("BarcodeDetector" in window)) {
      alert("This browser does not support QR scanning. Use manual code entry.");
      return;
    }
    const video = document.getElementById("scannerVideo");
    video.classList.remove("hide");
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = videoStream;
    await video.play();
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const scan = async () => {
      if (!videoStream) return;
      const codes = await detector.detect(video).catch(() => []);
      if (codes.length) {
        markAttendance(codes[0].rawValue);
        stopScanner();
        return;
      }
      requestAnimationFrame(scan);
    };
    scan();
  }

  function stopScanner() {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }
  }

  function markAttendance(code) {
    const user = state.users.find((item) => item.qrCode === String(code).trim());
    const meetingId = document.getElementById("scanMeeting")?.value || state.meetings.at(-1)?.id;
    const meeting = state.meetings.find((item) => item.id === meetingId);
    if (!user || !meeting) {
      alert("QR code or meeting not found.");
      return;
    }
    const existing = state.attendance.find((item) => item.userId === user.id && item.meetingId === meeting.id);
    if (existing) {
      alert("Attendance is already marked for this member and meeting.");
      return;
    }
    const record = {
      id: uid("a"),
      userId: user.id,
      meetingId: meeting.id,
      date: meeting.date,
      status: "Present",
      markedBy: currentUser().id,
      markedByName: currentUser().name,
      markedAt: new Date().toISOString()
    };
    state.attendance.push(record);
    save();
    syncSheet("attendance_create", record);
    render();
  }

  function resolveAttendanceRequest(id, approved) {
    if (!isSuper()) {
      alert("Only the super admin can approve attendance updates.");
      return;
    }
    const request = state.attendanceRequests.find((item) => item.id === id);
    if (!request) return;
    request.status = approved ? "Approved" : "Rejected";
    request.decidedBy = currentUser().id;
    request.decidedAt = new Date().toISOString();
    if (approved) {
      state.attendance.push({
        id: uid("a"),
        userId: request.userId,
        meetingId: request.meetingId,
        date: request.date,
        status: request.newStatus,
        markedBy: currentUser().id,
        markedByName: currentUser().name,
        markedAt: new Date().toISOString()
      });
    }
    save();
    syncSheet("attendance_request_resolve", request);
    render();
  }

  function resolveProfileRequest(id, approved) {
    if (!isSuper()) {
      alert("Only the super admin can approve profile updates.");
      return;
    }
    const request = state.profileRequests.find((item) => item.id === id);
    if (!request) return;
    const user = state.users.find((item) => item.id === request.userId);
    request.status = approved ? "Approved" : "Rejected";
    request.decidedBy = currentUser().id;
    request.decidedAt = new Date().toISOString();
    if (approved && user) {
      profileFields.forEach((key) => {
        user[key] = request.updates[key] || "";
      });
      user.updatedAt = request.decidedAt;
      syncSheet("member_profile_update", user);
    }
    save();
    syncSheet("profile_request_resolve", request);
    render();
  }

  function resolveLeave(id, status) {
    const leave = state.leaves.find((item) => item.id === id);
    if (!leave) return;
    leave.status = status;
    leave.decidedBy = currentUser().id;
    leave.decidedAt = new Date().toISOString();
    save();
    syncSheet("leave_resolve", leave);
    render();
  }

  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });

  function installPwa() {
    if (!installPrompt) {
      alert("Use your browser menu and choose Add to Home screen.");
      return;
    }
    installPrompt.prompt();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  render();
})();
