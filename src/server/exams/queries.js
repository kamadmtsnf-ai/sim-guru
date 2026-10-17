function getExamPageData(token, dateStr) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    const targetDate = dateStr ? String(dateStr) : _examToday_();
    const activePeriod = getData(EXAM_SHEET.PERIODS).find(
      (p) =>
        targetDate >= String(p.date_start) && targetDate <= String(p.date_end),
    );
    if (!activePeriod) {
      return {
        status: "success",
        is_exam_period: false,
        supervisor_duties: [],
        committee_duties: [],
        role: "none",
        is_confirmed_panitia: false,
        supervisors_to_confirm: [],
      };
    }
    const periodObj = {
      id: String(activePeriod.id),
      name: String(activePeriod.name || ""),
      date_start: String(activePeriod.date_start),
      date_end: String(activePeriod.date_end),
      jtm_committee_per_day: Number(activePeriod.jtm_committee_per_day) || 0,
      description: String(activePeriod.description || ""),
    };
    const allUsers = getData("Users");
    const allSessions = getData(EXAM_SHEET.SESSIONS).filter(
      (s) =>
        String(s.period_id) === String(activePeriod.id) &&
        String(s.date) === targetDate,
    );
    const allRooms = getData(EXAM_SHEET.ROOMS);
    const allSups = getData(EXAM_SHEET.SUPERVISORS);
    const allBaps = getData(EXAM_SHEET.BAP);
    const allCom = getData(EXAM_SHEET.COMMITTEE);
    const supervisorDuties = [];
    allSessions.forEach((s) => {
      const te = _examFormatTime_(s.time_end);
      const [teH, teM] = te.split(":").map(Number);
      const activeTotal = teH * 60 + teM + 5;
      const bapActiveTime =
        String(Math.floor(activeTotal / 60)).padStart(2, "0") +
        ":" +
        String(activeTotal % 60).padStart(2, "0");
      allRooms
        .filter((r) => String(r.session_id) === String(s.id))
        .forEach((r) => {
          const mySup = allSups.find(
            (sup) =>
              String(sup.room_id) === String(r.id) &&
              String(sup.user_id) === String(user.id) &&
              String(sup.status) === "active",
          );
          if (!mySup) return;
          const bap = allBaps.find(
            (b) => String(b.supervisor_id) === String(mySup.id),
          );
          const hasBap = !!(
            bap &&
            bap.submitted_at &&
            String(bap.submitted_at).trim() !== ""
          );
          supervisorDuties.push({
            supervisor_id: String(mySup.id),
            session_id: String(s.id),
            session_name: String(s.session_name || ""),
            date: String(s.date),
            time_start: _examFormatTime_(s.time_start),
            time_end: te,
            bap_active_time: bapActiveTime,
            jtm_val: Number(mySup.jtm_val) || 0,
            room_id: String(r.id),
            room_name: String(r.room_name || ""),
            subject: String(r.subject || ""),
            class_name: String(r.class_name || ""),
            is_substitute:
              mySup.is_substitute === true ||
              String(mySup.is_substitute) === "true",
            confirmed_by: String(mySup.confirmed_by || ""),
            confirmed_at: String(mySup.confirmed_at || ""),
            has_bap: hasBap,
            bap: hasBap
              ? {
                  id: String(bap.id),
                  peserta_hadir: Number(bap.peserta_hadir) || 0,
                  peserta_absen: Number(bap.peserta_absen) || 0,
                  catatan: String(bap.catatan || ""),
                  submitted_at: String(bap.submitted_at || ""),
                  updated_at: String(bap.updated_at || ""),
                }
              : null,
          });
        });
    });
    const committeeDuties = allCom
      .filter(
        (c) =>
          String(c.period_id) === String(activePeriod.id) &&
          String(c.date) === targetDate &&
          String(c.user_id) === String(user.id) &&
          String(c.status) === "active",
      )
      .map((c) => ({
        committee_id: String(c.id),
        date: String(c.date),
        jtm_val: Number(c.jtm_val) || 0,
        is_substitute:
          c.is_substitute === true || String(c.is_substitute) === "true",
        confirmed_by: String(c.confirmed_by || ""),
        confirmed_at: String(c.confirmed_at || ""),
      }));
    const isConfirmedPanitia = committeeDuties.some(
      (c) => c.confirmed_by && String(c.confirmed_by).trim() !== "",
    );
    let role = "none";
    if (supervisorDuties.length > 0) role = "supervisor";
    else if (committeeDuties.length > 0) role = "committee";
    const supervisorsToConfirm = [];
    if (isConfirmedPanitia) {
      allSessions.forEach((s) => {
        const roomsInSession = allRooms.filter(
          (r) => String(r.session_id) === String(s.id),
        );
        roomsInSession.forEach((r) => {
          const supsInRoom = allSups
            .filter((sup) => String(sup.room_id) === String(r.id))
            .map((sup) => {
              const g = allUsers.find(
                (u) => String(u.id) === String(sup.user_id),
              );
              const bap = allBaps.find(
                (b) => String(b.supervisor_id) === String(sup.id),
              );
              return {
                supervisor_id: String(sup.id),
                user_id: String(sup.user_id),
                guru_name: g ? String(g.full_name) : "Tidak Dikenal",
                status: String(sup.status || "active"),
                is_substitute:
                  sup.is_substitute === true ||
                  String(sup.is_substitute) === "true",
                original_user_id: String(sup.original_user_id || ""),
                confirmed_by: String(sup.confirmed_by || ""),
                confirmed_at: String(sup.confirmed_at || ""),
                has_bap: !!(
                  bap &&
                  bap.submitted_at &&
                  String(bap.submitted_at).trim() !== ""
                ),
              };
            });
          if (supsInRoom.length > 0) {
            supervisorsToConfirm.push({
              session_id: String(s.id),
              session_name: String(s.session_name || ""),
              time_start: _examFormatTime_(s.time_start),
              time_end: _examFormatTime_(s.time_end),
              room_id: String(r.id),
              room_name: String(r.room_name || ""),
              subject: String(r.subject || ""),
              supervisors: supsInRoom,
            });
          }
        });
      });
    }
    return {
      status: "success",
      is_exam_period: true,
      period: periodObj,
      role,
      supervisor_duties: supervisorDuties,
      committee_duties: committeeDuties,
      is_confirmed_panitia: isConfirmedPanitia,
      supervisors_to_confirm: supervisorsToConfirm,
      student_attendance_complete: _isPanitiaStudentAttendanceComplete_(targetDate),
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function getSupervisorBapDetail(token, supervisorId) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    if (!supervisorId)
      return { status: "error", message: "Supervisor ID kosong." };
    const sups = getData(EXAM_SHEET.SUPERVISORS);
    const sup = sups.find((s) => String(s.id) === String(supervisorId));
    if (!sup)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    const isOwner = String(sup.user_id) === String(user.id);
    const isAdmin = String(user.role).toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return {
        status: "error",
        message: "Anda tidak memiliki akses ke BAP ini.",
      };
    }
    const rooms = getData(EXAM_SHEET.ROOMS);
    const room = rooms.find((r) => String(r.id) === String(sup.room_id));
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const sessions = getData(EXAM_SHEET.SESSIONS);
    const session = sessions.find(
      (s) => String(s.id) === String(room.session_id),
    );
    if (!session)
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    const periods = getData(EXAM_SHEET.PERIODS);
    const period = periods.find(
      (p) => String(p.id) === String(session.period_id),
    );
    const baps = getData(EXAM_SHEET.BAP);
    const bap = baps.find(
      (b) => String(b.supervisor_id) === String(supervisorId),
    );
    const hasBap = !!(
      bap &&
      bap.submitted_at &&
      String(bap.submitted_at).trim() !== ""
    );
    const today = _examToday_();
    const periodOver = !!(period && today > String(period.date_end));
    const isCancelled = String(sup.status) === "cancelled";
    const te = _examFormatTime_(session.time_end);
    return {
      status: "success",
      supervisor_id: String(sup.id),
      session_name: String(session.session_name || ""),
      date: String(session.date),
      time_start: _examFormatTime_(session.time_start),
      time_end: te,
      jtm_val: Number(session.jtm_val) || 0,
      room_name: String(room.room_name || ""),
      subject: String(room.subject || ""),
      class_name: String(room.class_name || ""),
      is_substitute:
        sup.is_substitute === true || String(sup.is_substitute) === "true",
      status: String(sup.status || ""),
      is_cancelled: isCancelled,
      period_over: periodOver,
      period: period
        ? {
            id: String(period.id),
            name: String(period.name || ""),
            date_start: String(period.date_start),
            date_end: String(period.date_end),
          }
        : null,
      has_bap: hasBap,
      bap: hasBap
        ? {
            id: String(bap.id),
            peserta_hadir: Number(bap.peserta_hadir) || 0,
            peserta_absen: Number(bap.peserta_absen) || 0,
            catatan: String(bap.catatan || ""),
            submitted_at: String(bap.submitted_at || ""),
            updated_at: String(bap.updated_at || ""),
          }
        : null,
    };
  } catch (e) {
    return {
      status: "error",
      message: "Server error: " + (e && e.message ? e.message : e),
    };
  }
}
function getExamRecapData(token, period_id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat melihat rekap.",
      };
    }
    if (!period_id)
      return { status: "error", message: "ID periode wajib diisi." };
    const period = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(period_id),
    );
    if (!period)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    const today = _examToday_();
    const ds = String(period.date_start);
    const de = String(period.date_end);
    const pStatus =
      today < ds ? "Akan Datang" : today > de ? "Selesai" : "Berlangsung";
    const allUsers = getData("Users");
    const allSessions = getData(EXAM_SHEET.SESSIONS).filter(
      (s) => String(s.period_id) === String(period_id),
    );
    const allRooms = getData(EXAM_SHEET.ROOMS);
    const allSups = getData(EXAM_SHEET.SUPERVISORS);
    const allCom = getData(EXAM_SHEET.COMMITTEE).filter(
      (c) => String(c.period_id) === String(period_id),
    );
    const allBaps = getData(EXAM_SHEET.BAP);
    const sessionIds = new Set(allSessions.map((s) => String(s.id)));
    const sessionMap = {};
    allSessions.forEach((s) => {
      sessionMap[String(s.id)] = s;
    });
    const roomsInPeriod = allRooms.filter((r) =>
      sessionIds.has(String(r.session_id)),
    );
    const roomMap = {};
    roomsInPeriod.forEach((r) => {
      roomMap[String(r.id)] = r;
    });
    const roomIds = new Set(roomsInPeriod.map((r) => String(r.id)));
    const supsInPeriod = allSups.filter((sup) =>
      roomIds.has(String(sup.room_id)),
    );
    const jtmMap = {};
    const initGuru = (userId) => {
      if (!jtmMap[userId]) {
        const g = allUsers.find((u) => String(u.id) === userId);
        jtmMap[userId] = {
          user_id: userId,
          guru_name: g ? String(g.full_name) : "Tidak Dikenal",
          jtm_supervisor: 0,
          jtm_committee: 0,
          sessions_done: 0,
          sessions_confirmed: 0,
          bap_submitted: 0,
          duty_detail: [],
        };
      }
    };
    supsInPeriod.forEach((sup) => {
      if (String(sup.status) === "cancelled") return;
      const room = roomMap[String(sup.room_id)];
      const session = room ? sessionMap[String(room.session_id)] : null;
      if (!session) return;
      const userId = String(sup.user_id);
      initGuru(userId);
      const isConfirmed = !!(
        sup.confirmed_by && String(sup.confirmed_by).trim() !== ""
      );
      const bap = allBaps.find(
        (b) => String(b.supervisor_id) === String(sup.id),
      );
      const hasBap = !!(
        bap &&
        bap.submitted_at &&
        String(bap.submitted_at).trim() !== ""
      );
      let supJtm =
        Number(sup.jtm_val) > 0
          ? Number(sup.jtm_val)
          : Number(session.jtm_val) || 0;
      const jtmAdjustment = _jtmReadAdjustment_("EXAM", String(sup.id));
      if (jtmAdjustment) {
        const tz = Session.getScriptTimeZone();
        const sessionDateStr =
          session.date instanceof Date
            ? Utilities.formatDate(session.date, tz, "yyyy-MM-dd")
            : String(session.date);
        const adjDateStr =
          jtmAdjustment.date instanceof Date
            ? Utilities.formatDate(jtmAdjustment.date, tz, "yyyy-MM-dd")
            : String(jtmAdjustment.date);
        const storedAdjusted = jtmAdjustment.adjusted_jtm;
        const dateMatches = !adjDateStr || adjDateStr === sessionDateStr;
        if (
          dateMatches &&
          storedAdjusted !== null &&
          storedAdjusted !== undefined &&
          storedAdjusted !== "" &&
          !isNaN(Number(storedAdjusted))
        ) {
          supJtm = Number(storedAdjusted);
        }
      }
      if (isConfirmed) jtmMap[userId].sessions_confirmed++;
      if (hasBap) {
        jtmMap[userId].bap_submitted++;
        jtmMap[userId].sessions_done++;
        jtmMap[userId].jtm_supervisor += supJtm;
      }
      jtmMap[userId].duty_detail.push({
        type: "supervisor",
        date: String(session.date),
        session_name: String(session.session_name || ""),
        room_name: String(room.room_name || ""),
        is_substitute:
          sup.is_substitute === true || String(sup.is_substitute) === "true",
        is_confirmed: isConfirmed,
        has_bap: hasBap,
        jtm_val: hasBap ? supJtm : 0,
      });
    });
    allCom.forEach((c) => {
      if (String(c.status) === "cancelled") return;
      const userId = String(c.user_id);
      initGuru(userId);
      const isConfirmed = !!(
        c.confirmed_by && String(c.confirmed_by).trim() !== ""
      );
      if (isConfirmed) {
        jtmMap[userId].jtm_committee += Number(c.jtm_val) || 0;
      }
      jtmMap[userId].duty_detail.push({
        type: "committee",
        date: String(c.date),
        is_substitute:
          c.is_substitute === true || String(c.is_substitute) === "true",
        is_confirmed: isConfirmed,
        jtm_val: isConfirmed ? Number(c.jtm_val) || 0 : 0,
      });
    });
    const recapJtm = Object.values(jtmMap)
      .map((g) => ({
        ...g,
        total_jtm: g.jtm_supervisor + g.jtm_committee,
      }))
      .sort((a, b) => a.guru_name.localeCompare(b.guru_name));
    const recapBap = [];
    supsInPeriod.forEach((sup) => {
      const bap = allBaps.find(
        (b) => String(b.supervisor_id) === String(sup.id),
      );
      if (!bap || !bap.submitted_at || String(bap.submitted_at).trim() === "")
        return;
      const room = roomMap[String(sup.room_id)];
      const session = room ? sessionMap[String(room.session_id)] : null;
      const g = allUsers.find((u) => String(u.id) === String(sup.user_id));
      recapBap.push({
        supervisor_id: String(sup.id),
        user_id: String(sup.user_id),
        guru_name: g ? String(g.full_name) : "Tidak Dikenal",
        is_substitute:
          sup.is_substitute === true || String(sup.is_substitute) === "true",
        status: String(sup.status || ""),
        date: session ? String(session.date) : "",
        session_name: session ? String(session.session_name || "") : "",
        time_start: session ? _examFormatTime_(session.time_start) : "",
        time_end: session ? _examFormatTime_(session.time_end) : "",
        jtm_val:
          Number(sup.jtm_val) > 0
            ? Number(sup.jtm_val)
            : session
              ? Number(session.jtm_val) || 0
              : 0,
        room_name: room ? String(room.room_name || "") : "",
        subject: room ? String(room.subject || "") : "",
        class_name: room ? String(room.class_name || "") : "",
        peserta_hadir: Number(bap.peserta_hadir) || 0,
        peserta_absen: Number(bap.peserta_absen) || 0,
        catatan: String(bap.catatan || ""),
        submitted_at: String(bap.submitted_at || ""),
        updated_at: String(bap.updated_at || ""),
      });
    });
    recapBap.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.session_name.localeCompare(b.session_name);
    });
    return {
      status: "success",
      period: {
        id: String(period.id),
        name: String(period.name || ""),
        date_start: ds,
        date_end: de,
        jtm_committee_per_day: Number(period.jtm_committee_per_day) || 0,
        status: pStatus,
      },
      recap_jtm: recapJtm,
      recap_bap: recapBap,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
