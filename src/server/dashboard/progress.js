function getGuruTodayScheduleProgress(token) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error" };
    const now = new Date();
    const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const dayIndex = _getIndoDayIndex();
    const allSchedules = getData("Schedules");
    const allLogs = getData("Teaching_Logs");
    const allUsers = getData("Users");
    const cfg = _getConfigMap();
    const activeTP = cfg["tahun_pelajaran"] || "";
    const activeSem = cfg["semester"] || "";
    const mySchedules = allSchedules.filter((s) => {
      const isMe = String(s.user_id).trim() === String(user.id).trim();
      const isToday = String(s.day_index).trim() === String(dayIndex);
      const sTP = s.tahun_pelajaran || activeTP;
      const sSem = s.semester || activeSem;
      return isMe && isToday && sTP === activeTP && sSem === activeSem;
    });
    const todaySubs = getData("Substitutes").filter((s) => {
      try {
        return (
          Utilities.formatDate(
            new Date(s.date),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          ) === todayStr
        );
      } catch (e) {
        return false;
      }
    });
    const replacedSchedIds = new Set(
      todaySubs
        .filter(
          (sub) =>
            String(sub.original_user_id).trim() === String(user.id).trim(),
        )
        .map((sub) => String(sub.schedule_id)),
    );
    const mySubEntries = todaySubs.filter(
      (sub) => String(sub.substitute_user_id).trim() === String(user.id).trim(),
    );
    const progress = [];
    mySchedules.forEach((s) => {
      let tStart = s.time_start;
      if (tStart instanceof Date)
        tStart = Utilities.formatDate(tStart, "Asia/Jakarta", "HH:mm");
      tStart = String(tStart).substring(0, 5);
      if (replacedSchedIds.has(String(s.id))) {
        const subEntry = todaySubs.find(
          (sub) =>
            String(sub.schedule_id) === String(s.id) &&
            String(sub.original_user_id).trim() === String(user.id).trim(),
        );
        const subUser = subEntry
          ? allUsers.find(
              (u) => String(u.id) === String(subEntry.substitute_user_id),
            )
          : null;
        progress.push({
          schedule_id: s.id,
          subject: s.subject,
          class_name: s.class_name,
          time_start: tStart,
          jtm_val: s.jtm_val,
          has_journal: true,
          is_replaced: true,
          substitute_name: subUser
            ? String(subUser.full_name)
            : "Guru Pengganti",
        });
      } else {
        const hasDone = allLogs.some((l) => {
          const ld = Utilities.formatDate(
            new Date(l.date),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          );
          return (
            ld === todayStr &&
            String(l.schedule_id) === String(s.id) &&
            String(l.user_id) === String(user.id)
          );
        });
        progress.push({
          schedule_id: s.id,
          subject: s.subject,
          class_name: s.class_name,
          time_start: tStart,
          jtm_val: s.jtm_val,
          has_journal: hasDone,
          is_replaced: false,
        });
      }
    });
    mySubEntries.forEach((sub) => {
      const origSched = allSchedules.find(
        (s) => String(s.id) === String(sub.schedule_id),
      );
      if (!origSched) return;
      if (
        progress.some(
          (p) =>
            String(p.schedule_id) === String(sub.schedule_id) && !p.is_replaced,
        )
      )
        return;
      let tStart = origSched.time_start;
      if (tStart instanceof Date)
        tStart = Utilities.formatDate(tStart, "Asia/Jakarta", "HH:mm");
      tStart = String(tStart).substring(0, 5);
      const hasDone = allLogs.some((l) => {
        const ld = Utilities.formatDate(
          new Date(l.date),
          "Asia/Jakarta",
          "yyyy-MM-dd",
        );
        return (
          ld === todayStr &&
          String(l.schedule_id) === String(sub.schedule_id) &&
          String(l.user_id) === String(user.id)
        );
      });
      const origUser = allUsers.find(
        (u) => String(u.id) === String(sub.original_user_id),
      );
      progress.push({
        schedule_id: sub.schedule_id,
        subject: origSched.subject,
        class_name: origSched.class_name,
        time_start: tStart,
        jtm_val: origSched.jtm_val,
        has_journal: hasDone,
        is_substitute: true,
        is_replaced: false,
        original_teacher: origUser ? String(origUser.full_name) : "Guru Asli",
      });
    });
    const myEventsToday = getData("Event_Attendance").filter((a) => {
      try {
        return (
          String(a.user_id).trim() === String(user.id).trim() &&
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
    myEventsToday.forEach((e) => {
      const hasDone = String(e.journal_submitted).toLowerCase() === "true";
      progress.push({
        schedule_id: "EVENT-" + e.id,
        subject: e.event_name || "Acara Sekolah",
        class_name: "Kegiatan/Acara",
        time_start: "Acara",
        jtm_val: e.jtm_val || 0,
        has_journal: hasDone,
        is_replaced: false,
      });
    });
    // H-MINUS-1: Tambahkan jadwal kemarin yang belum diisi ke progress jika fitur aktif
    const _h1ProgEnabled = String(cfg["allow_h_minus_1_journal"] || "").toLowerCase() === "true";
    if (_h1ProgEnabled) {
      const _h1ProgYday = new Date();
      _h1ProgYday.setDate(_h1ProgYday.getDate() - 1);
      const _h1ProgYdayStr = Utilities.formatDate(_h1ProgYday, "Asia/Jakarta", "yyyy-MM-dd");
      const _h1ProgYdayIdx = _h1ProgYday.getDay();
      // Jadwal kemarin milik guru ini sendiri
      const _h1ProgMyYdayScheds = allSchedules.filter((s) => {
        const isMe = String(s.user_id).trim() === String(user.id).trim();
        const isYday = String(s.day_index).trim() === String(_h1ProgYdayIdx);
        const sTP = s.tahun_pelajaran || activeTP;
        const sSem = s.semester || activeSem;
        return isMe && isYday && sTP === activeTP && sSem === activeSem;
      });
      const allAttendance = getData("Daily_Attendance");
      const allSubstitutes = getData("Substitutes");
      // H-MINUS-1: Jadwal kemarin di mana guru ini bertindak sebagai PENGGANTI
      const _h1ProgYdaySubJobs = allSubstitutes.filter((sub) => {
        const subDate = Utilities.formatDate(new Date(sub.date), "Asia/Jakarta", "yyyy-MM-dd");
        return (
          subDate === _h1ProgYdayStr &&
          String(sub.substitute_user_id).trim() === String(user.id).trim()
        );
      });
      _h1ProgYdaySubJobs.forEach((sub) => {
        const origSched = allSchedules.find((s) => String(s.id) === String(sub.schedule_id));
        if (!origSched) return;
        // Hindari duplikasi jika jadwal tsb sudah ada di daftar jadwal asli guru ini
        if (_h1ProgMyYdayScheds.some((s) => String(s.id) === String(sub.schedule_id))) return;
        _h1ProgMyYdayScheds.push({ ...origSched, is_h1_substitute_job: true });
      });
      _h1ProgMyYdayScheds.forEach((s) => {
        const alreadyDone = allLogs.some((l) => {
          const ld = Utilities.formatDate(new Date(l.date), "Asia/Jakarta", "yyyy-MM-dd");
          return ld === _h1ProgYdayStr && String(l.schedule_id) === String(s.id) && String(l.user_id) === String(user.id);
        });
        if (!alreadyDone) {
          let _h1TS = s.time_start;
          if (_h1TS instanceof Date) _h1TS = Utilities.formatDate(_h1TS, "Asia/Jakarta", "HH:mm");
          _h1TS = String(_h1TS).substring(0, 5);
          const h1JtmProg = Math.round(Number(s.jtm_val || 0) * 0.8 * 10) / 10;
          // H-MINUS-1: cek kehadiran kemarin sudah dikonfirmasi
          const h1AttConfirmed = allAttendance.some((a) => {
            const aDate = Utilities.formatDate(new Date(a.date), "Asia/Jakarta", "yyyy-MM-dd");
            return (
              String(a.user_id).trim() === String(user.id).trim() &&
              aDate === _h1ProgYdayStr &&
              String(a.schedule_id || "") === String(s.id)
            );
          });
          // Jadwal pengganti kemarin TIDAK perlu cek h1IsReplaced (guru ini sudah jadi pengganti)
          const h1IsReplaced = !s.is_h1_substitute_job && allSubstitutes.some((sub) => {
            const subDate = Utilities.formatDate(new Date(sub.date), "Asia/Jakarta", "yyyy-MM-dd");
            return (
              subDate === _h1ProgYdayStr &&
              String(sub.schedule_id) === String(s.id) &&
              String(sub.original_user_id).trim() === String(user.id).trim()
            );
          });
          const subjectLabel = s.is_h1_substitute_job
            ? s.subject + " (GURU PENGGANTI)"
            : s.subject;
          progress.push({
            schedule_id: s.id,
            subject: subjectLabel,
            class_name: s.class_name,
            time_start: _h1TS,
            jtm_val: s.jtm_val,
            has_journal: false,
            is_replaced: h1IsReplaced,
            is_h_minus_1: true,
            h1_attendance_confirmed: h1AttConfirmed,
            h1_is_replaced: h1IsReplaced,
            h1_is_substitute_job: !!s.is_h1_substitute_job,
            h1_jtm_display: h1JtmProg,
            h1_target_date: _h1ProgYdayStr,
          });
        }
      });
    }
    progress.sort((a, b) =>
      (a.time_start || "").localeCompare(b.time_start || ""),
    );
    const activeItems = progress.filter((p) => !p.is_replaced);
    const done = activeItems.filter((p) => p.has_journal).length;
    const total = activeItems.length;
    return {
      status: "success",
      items: progress,
      done: done,
      total: total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}
