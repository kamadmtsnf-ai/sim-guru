function getAdminDashboardExtendedStats(token) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin")
      return { status: "error" };
    const now = new Date();
    const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const dayIndex = _getIndoDayIndex();
    const allLogs = getData("Teaching_Logs");
    const allSchedules = getData("Schedules");
    const allUsers = getData("Users");
    const allSubstitutes = getData("Substitutes");
    const attendanceData = getData("Daily_Attendance");
    const cfg = _getConfigMap();
    const activeTP = cfg["tahun_pelajaran"] || "";
    const activeSem = cfg["semester"] || "";
    const todayLogs = allLogs.filter((l) => {
      const d = new Date(l.date);
      const dStr = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
      return dStr === todayStr;
    });
    const piketAdjMapToday = _jtmBuildPiketAdjustmentMap_();
    let totalJtmToday = 0;
    todayLogs.forEach((l) => {
      const sid = String(l.schedule_id);
      const sidUpper = sid.toUpperCase();
      if (sid === "PICKET-DUTY" || sid === "PIKET") {
        // Gunakan adjusted JTM jika ada, fallback ke 4
        totalJtmToday += _jtmResolvePiketLogJtm_(piketAdjMapToday, l.user_id, l.date, 4);
      } else if (sid === "CEREMONY-DUTY" || sidUpper.includes("UPACARA")) {
        totalJtmToday += 5;
      } else {
        const jtm = Number(l.jtm_val || 0);
        if (!isNaN(jtm) && jtm > 0) totalJtmToday += jtm;
        else if (sidUpper.includes("PICKET") || sidUpper.includes("PIKET")) totalJtmToday += 4;
        else if (sidUpper.includes("CEREMONY") || sidUpper.includes("UPACARA")) totalJtmToday += 5;
      }
    });
    const allEventAtt = getData("Event_Attendance");
    const todayEventAtt = allEventAtt.filter((a) => {
      if (
        a.journal_submitted !== true &&
        String(a.journal_submitted).toLowerCase() !== "true"
      )
        return false;
      const d = new Date(a.date);
      const dStr = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
      return dStr === todayStr;
    });
    todayEventAtt.forEach((a) => {
      const jtm = Number(a.jtm_val || 0);
      if (!isNaN(jtm) && jtm > 0) totalJtmToday += jtm;
    });
    const todaySchedules = allSchedules.filter((s) => {
      const isToday = String(s.day_index).trim() === String(dayIndex);
      const sTP = s.tahun_pelajaran || activeTP;
      const sSem = s.semester || activeSem;
      return isToday && sTP === activeTP && sSem === activeSem;
    });
    const todayTeacherIds = [
      ...new Set(todaySchedules.map((s) => String(s.user_id))),
    ];
    const todaySubs = allSubstitutes.filter((s) => {
      const sd = Utilities.formatDate(
        new Date(s.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return sd === todayStr;
    });
    const subTeacherIds = todaySubs.map((s) => String(s.substitute_user_id));
    const allTodayIds = [...new Set([...todayTeacherIds, ...subTeacherIds])];
    const confirmedTeacherIds = new Set();
    attendanceData.forEach((a) => {
      const ad = Utilities.formatDate(
        new Date(a.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      if (ad === todayStr && a.status === "Present" && a.schedule_id) {
        confirmedTeacherIds.add(String(a.user_id));
      }
    });
    const subsMapToday = {};
    todaySubs.forEach((sub) => {
      subsMapToday[String(sub.schedule_id)] = sub;
    });
    const uniqueTeacherMap = {};
    todaySchedules.forEach((s) => {
      const schedId = String(s.id);
      const subEntry = subsMapToday[schedId];
      if (subEntry) {
        const subUid = String(subEntry.substitute_user_id);
        const subUser = allUsers.find((u) => String(u.id) === subUid);
        const hasDone = allLogs.some((l) => {
          const ld = Utilities.formatDate(
            new Date(l.date),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          );
          return (
            ld === todayStr &&
            String(l.user_id) === subUid &&
            String(l.schedule_id) === schedId
          );
        });
        if (!uniqueTeacherMap[subUid]) {
          uniqueTeacherMap[subUid] = {
            user_id: subUid,
            name: subUser ? String(subUser.full_name) : "Unknown",
            is_substitute: true,
            schedules: [],
          };
        }
        uniqueTeacherMap[subUid].schedules.push({
          subject: s.subject,
          class_name: s.class_name,
          has_journal: hasDone,
        });
      } else {
        const origUid = String(s.user_id);
        const origUser = allUsers.find((u) => String(u.id) === origUid);
        const hasDone = allLogs.some((l) => {
          const ld = Utilities.formatDate(
            new Date(l.date),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          );
          return (
            ld === todayStr &&
            String(l.user_id) === origUid &&
            String(l.schedule_id) === schedId
          );
        });
        if (!uniqueTeacherMap[origUid]) {
          uniqueTeacherMap[origUid] = {
            user_id: origUid,
            name: origUser ? String(origUser.full_name) : "Unknown",
            is_substitute: false,
            schedules: [],
          };
        }
        uniqueTeacherMap[origUid].schedules.push({
          subject: s.subject,
          class_name: s.class_name,
          has_journal: hasDone,
        });
      }
    });
    const todayAllEvents = allEventAtt.filter((a) => {
      try {
        return (
          Utilities.formatDate(
            new Date(a.date),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          ) === todayStr
        );
      } catch (e) {
        return false;
      }
    });
    todayAllEvents.forEach((e) => {
      const uid = String(e.user_id);
      const isSubmitted = String(e.journal_submitted).toLowerCase() === "true";
      if (!uniqueTeacherMap[uid]) {
        const uObj = allUsers.find((x) => String(x.id) === uid);
        uniqueTeacherMap[uid] = {
          user_id: uid,
          name: uObj ? String(uObj.full_name) : "Unknown",
          is_substitute: false,
          schedules: [],
        };
      }
      uniqueTeacherMap[uid].schedules.push({
        subject: e.event_name || "Acara Sekolah",
        class_name: "Kegiatan",
        has_journal: isSubmitted,
      });
    });
    const teacherList = Object.values(uniqueTeacherMap);
    const doneTeachers = teacherList.filter((t) =>
      t.schedules.every((s) => s.has_journal),
    );
    const notDoneTeachers = teacherList.filter((t) =>
      t.schedules.some((s) => !s.has_journal),
    );
    const pendingResets = getData("Reset_Requests").filter(
      (r) => String(r.status).toLowerCase() === "pending",
    ).length;
    const activePeriod = getData(EXAM_SHEET.PERIODS).find(
      (p) => todayStr >= String(p.date_start) && todayStr <= String(p.date_end),
    );
    let is_exam_period = !!activePeriod;
    let exam_bap_done = 0;
    let exam_bap_total = 0;
    let exam_bap_list = [];
    let exam_hadir_count = 0;
    let exam_hadir_total = 0;
    let exam_substitutes = 0;
    if (is_exam_period) {
      const allExamSessions = getData(EXAM_SHEET.SESSIONS);
      const allExamRooms = getData(EXAM_SHEET.ROOMS);
      const allExamSups = getData(EXAM_SHEET.SUPERVISORS);
      const allExamBaps = getData(EXAM_SHEET.BAP);
      const todayExamSessions = allExamSessions.filter(
        (s) =>
          String(s.period_id) === String(activePeriod.id) &&
          String(s.date) === todayStr,
      );
      const todaySessionIds = new Set(
        todayExamSessions.map((s) => String(s.id)),
      );
      const todayExamRooms = allExamRooms.filter((r) =>
        todaySessionIds.has(String(r.session_id)),
      );
      const todayRoomIds = new Set(todayExamRooms.map((r) => String(r.id)));
      const todaySups = allExamSups.filter(
        (sup) =>
          todayRoomIds.has(String(sup.room_id)) &&
          String(sup.status) === "active",
      );
      exam_bap_total = todaySups.length;
      todaySups.forEach((sup) => {
        const bap = allExamBaps.find(
          (b) => String(b.supervisor_id) === String(sup.id),
        );
        const hasBap = !!(
          bap &&
          bap.submitted_at &&
          String(bap.submitted_at).trim() !== ""
        );
        if (hasBap) exam_bap_done++;
        const userObj = allUsers.find(
          (u) => String(u.id) === String(sup.user_id),
        );
        const userName = userObj ? String(userObj.full_name) : "Unknown";
        const roomObj = todayExamRooms.find(
          (r) => String(r.id) === String(sup.room_id),
        );
        const roomName = roomObj ? String(roomObj.room_name) : "Unknown Room";
        const sesObj = todayExamSessions.find(
          (s) => String(s.id) === String(roomObj ? roomObj.session_id : ""),
        );
        const sesName = sesObj
          ? String(sesObj.session_name)
          : "Unknown Session";
        exam_bap_list.push({
          name: userName,
          room: roomName,
          session: sesName,
          has_bap: hasBap,
          is_substitute: !!sup.is_substitute,
        });
      });
      const allExamCom = getData(EXAM_SHEET.COMMITTEE);
      const todayCom = allExamCom.filter(
        (c) =>
          String(c.period_id) === String(activePeriod.id) &&
          String(c.date) === todayStr &&
          String(c.status) === "active",
      );
      const presentSups = todaySups.filter(
        (sup) => sup.confirmed_at && String(sup.confirmed_at).trim() !== "",
      ).length;
      const presentComs = todayCom.filter(
        (c) => c.confirmed_at && String(c.confirmed_at).trim() !== "",
      ).length;
      const subsSups = todaySups.filter(
        (sup) =>
          sup.is_substitute === true || String(sup.is_substitute) === "true",
      ).length;
      const subsComs = todayCom.filter(
        (c) => c.is_substitute === true || String(c.is_substitute) === "true",
      ).length;
      exam_hadir_count = presentSups + presentComs;
      exam_hadir_total = todaySups.length + todayCom.length;
      exam_substitutes = subsSups + subsComs;
    }
    return {
      status: "success",
      total_jtm_today: totalJtmToday,
      hadir_count: is_exam_period ? exam_hadir_count : confirmedTeacherIds.size,
      hadir_total: is_exam_period ? exam_hadir_total : allTodayIds.length,
      substitutes_today: is_exam_period ? exam_substitutes : todaySubs.length,
      pending_resets: pendingResets,
      journal_done: is_exam_period ? exam_bap_done : doneTeachers.length,
      journal_total: is_exam_period ? exam_bap_total : teacherList.length,
      teachers_not_done: notDoneTeachers.map((t) => ({
        name: t.name,
        is_substitute: !!t.is_substitute,
        subjects_remaining: t.schedules
          .filter((s) => !s.has_journal)
          .map((s) => s.subject + " " + s.class_name),
      })),
      is_exam_period: is_exam_period,
      exam_bap_done: exam_bap_done,
      exam_bap_total: exam_bap_total,
      exam_bap_list: exam_bap_list,
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

// ============================================================
// PIKET DASHBOARD ADMIN — fungsi khusus untuk manajemen piket
// langsung dari halaman Dashboard Admin
// ============================================================

/**
 * Mengambil status piket hari ini beserta daftar guru piket,
 * guru piket pengganti, dan data jam masuk/pulang mereka.
 * Dipakai oleh panel piket di Dashboard Admin.
 */
