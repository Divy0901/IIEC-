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
