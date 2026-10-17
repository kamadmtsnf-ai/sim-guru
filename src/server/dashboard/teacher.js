function getDashboardStats(token) {
  const user = verifySession(token);
  if (!user) return { status: "error" };
  try {
    const now = new Date();
    const currentMonth = parseInt(Utilities.formatDate(now, "Asia/Jakarta", "M"), 10) - 1;
    const currentYear = parseInt(Utilities.formatDate(now, "Asia/Jakarta", "yyyy"), 10);
    const snap = _getDataSnapshot();
    const userLogs = snap.logsByUserId[user.id] || [];
    const logs = userLogs.filter((l) => {
      const d = new Date(l.date + (String(l.date).length === 10 ? "T00:00:00" : ""));
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const jtmAdjMap = _jtmBuildKbmAdjustmentMap_();
    const piketAdjMap = _jtmBuildPiketAdjustmentMap_();
    let totalJtmRecorded = 0;
    logs.forEach((l) => {
      const _sid = String(l.schedule_id);
      const isAutoLibur = String(l.notes).includes(
        "Auto-generated: Libur Bonus",
      );
      if (isAutoLibur) {
      } else if (_sid === "PICKET-DUTY" || _sid === "PIKET") {
        totalJtmRecorded += _jtmResolvePiketLogJtm_(piketAdjMap, l.user_id, l.date, 4);
      } else if (_sid === "CEREMONY-DUTY" || _sid === "UPACARA") {
        totalJtmRecorded += 5;
      } else if (
        _sid === "EXAM-SUPERVISOR" ||
        _sid === "EXAM-COMMITTEE" ||
        _sid === "PARTIAL-SUB-KBM" ||
        _sid === "PARTIAL-SUB-EXAM"
      ) {
        totalJtmRecorded += Number(l.jtm_val || 0);
      } else {
        const s = snap.schedulesById[_sid];
        if (s) {
          totalJtmRecorded += _jtmResolveKbmLogJtm_(
            jtmAdjMap,
            _sid,
            l.date,
            Number(s.jtm_val || 0),
          );
        } else {
          totalJtmRecorded += Number(l.jtm_val || 0);
        }
      }
    });
    const userEventLogs = snap.eventAttendanceByUserId[user.id] || [];
    const eventLogs = userEventLogs.filter((l) => {
      const d = new Date(l.date + (String(l.date).length === 10 ? "T00:00:00" : ""));
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalEventJtm = _computeEventJtm(eventLogs);
    const bonusDetail = _calculateMonthlyBonusFast_Detailed(
      user.id,
      currentMonth,
      currentYear,
      snap,
    );
    const autoRecordedBonus = bonusDetail.auto;
    const totalPendingBonus = bonusDetail.estimated;
    const displayTotalBonus = autoRecordedBonus + totalPendingBonus;
    const grandTotalJtm = totalJtmRecorded + totalEventJtm + displayTotalBonus;
    const allowances = snap.allowancesByUserId[user.id] || [];
    const totalAllowance = allowances.reduce(
      (sum, a) => sum + Number(a.amount || 0),
      0,
    );
    const baseSalary = Number(snap.config["base_salary"] || 0);
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const currentPeriodId = `${months[currentMonth]} ${currentYear}`;
    const transportEnabled =
      String(snap.config["transport_allowance_enabled"] || "false")
        .toLowerCase()
        .trim() === "true";
    const transportDesimal = transportEnabled
      ? _getMonthlyTransportSumFast(String(user.id), currentPeriodId, snap)
      : 0;
    const transportTotal = _applyThreePointRounding(transportDesimal);
    const grandTotalHonor =
      grandTotalJtm * baseSalary + totalAllowance + transportTotal;
    const todayStr = Utilities.formatDate(
      now,
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    let jtmToday = 0;
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const dStr = Utilities.formatDate(
        new Date(l.date + (String(l.date).length === 10 ? "T00:00:00" : "")),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      if (dStr !== todayStr) continue;
      const _sid = String(l.schedule_id);
      const isAutoLibur = String(l.notes).includes("Auto-generated: Libur Bonus");
      if (isAutoLibur) continue;
      if (_sid === "PICKET-DUTY" || _sid === "PIKET") {
        jtmToday += _jtmResolvePiketLogJtm_(piketAdjMap, l.user_id, l.date, 4);
      } else if (_sid === "CEREMONY-DUTY" || _sid === "UPACARA") {
        jtmToday += 5;
      } else if (
        _sid === "EXAM-SUPERVISOR" || _sid === "EXAM-COMMITTEE" ||
        _sid === "PARTIAL-SUB-KBM" || _sid === "PARTIAL-SUB-EXAM" ||
        _sid === "PARTIAL-SUB-PIKET"
      ) {
        jtmToday += Number(l.jtm_val || 0);
      } else {
        const s = snap.schedulesById[_sid];
        if (s) {
          jtmToday += _jtmResolveKbmLogJtm_(jtmAdjMap, _sid, l.date, Number(s.jtm_val || 0));
        } else {
          jtmToday += Number(l.jtm_val || 0);
        }
      }
    }
    for (let i = 0; i < eventLogs.length; i++) {
      const eLog = eventLogs[i];
      if (
        eLog.journal_submitted !== true &&
        String(eLog.journal_submitted).toLowerCase() !== "true"
      )
        continue;
      const dStr = Utilities.formatDate(
        new Date(eLog.date + (String(eLog.date).length === 10 ? "T00:00:00" : "")),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      if (dStr === todayStr) {
        const val = Number(eLog.jtm_val);
        if (!isNaN(val) && val > 0) jtmToday += val;
      }
    }
    return {
      status: "success",
      total_jtm: grandTotalJtm,
      bonus_jtm: displayTotalBonus,
      est_honor_formatted: formatRupiah(grandTotalHonor),
      jtm_hari_ini: jtmToday,
      transport_monthly: transportDesimal,
      transport_monthly_formatted: formatRupiah(transportDesimal),
      transport_enabled: transportEnabled,
      breakdown: {
        auto_libur_jtm: autoRecordedBonus,
        estimated_remaining: totalPendingBonus,
        event_jtm: totalEventJtm,
      },
    };
  } catch (e) {
    return {
      status: "error",
      message: "Gagal memuat statistik: " + (e && e.message ? e.message : e),
    };
  }
}
function _calculateMonthlyBonusFast_Detailed(userId, month, year, snapshot) {
  const cutoffDate = new Date();
  cutoffDate.setHours(23, 59, 59, 999);
  const holidays = snapshot.holidays.filter((h) => {
    const d = new Date(h.date);
    return (
      d.getMonth() === month &&
      d.getFullYear() === year &&
      String(h.is_holiday).toLowerCase() === "true"
    );
  });
  if (holidays.length === 0) return { auto: 0, estimated: 0 };
  const userLogs = snapshot.logsByUserId[userId] || [];
  const autoLogJtmByDate = {};
  for (let i = 0; i < userLogs.length; i++) {
    const l = userLogs[i];
    if (String(l.notes).indexOf("Auto-generated: Libur Bonus") < 0) continue;
    const ld = new Date(l.date);
    if (ld.getMonth() !== month || ld.getFullYear() !== year) continue;
    const dStr = Utilities.formatDate(ld, "Asia/Jakarta", "yyyy-MM-dd");
    autoLogJtmByDate[dStr] =
      (autoLogJtmByDate[dStr] || 0) + Number(l.jtm_val || 0);
  }
  // Filter jadwal: hanya user yang bersangkutan DAN semester/tahun pelajaran aktif
  const activeTP = (snapshot.config && snapshot.config["tahun_pelajaran"]) || "";
  const activeSem = (snapshot.config && snapshot.config["semester"]) || "";
  const userSchedules = snapshot.schedules.filter((s) => {
    if (String(s.user_id) !== String(userId)) return false;
    const sTP = s.tahun_pelajaran || activeTP;
    const sSem = s.semester || activeSem;
    return sTP === activeTP && sSem === activeSem;
  });
  const schedulesByDay = {};
  userSchedules.forEach((s) => {
    const k = Number(s.day_index);
    if (!schedulesByDay[k]) schedulesByDay[k] = [];
    schedulesByDay[k].push(s);
  });
  let estimated = 0;
  holidays.forEach((h) => {
    const d = new Date(h.date);
    const dStr = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
    if (autoLogJtmByDate[dStr]) return;
    const dayIdx = d.getDay();
    const list = schedulesByDay[dayIdx] || [];
    list.forEach((s) => {
      estimated += Number(s.jtm_val || 0);
    });
  });
  let auto = 0;
  Object.keys(autoLogJtmByDate).forEach((k) => {
    auto += Number(autoLogJtmByDate[k] || 0);
  });
  return { auto: auto, estimated: estimated };
}
function _getIndoDayIndex() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakartaTime = new Date(utc + 7 * 3600000);
  return jakartaTime.getDay();
}
function _getConfigMap() {
  const data = getData("Config");
  let conf = {};
  data.forEach((d) => (conf[d.key] = d.value));
  return conf;
}
function getTodaySchedule(token) {
  try {
    const user = verifySession(token);
    const dayIndex = _getIndoDayIndex();
    const snap = _getDataSnapshot();
    const allSchedules = snap.schedules;
    const allLogs = snap.logs;
    const attendanceData = snap.attendance;
    const substitutes = snap.substitutes;
    const todayStr = Utilities.formatDate(
      new Date(),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    let config = snap.config;
    const activeTP = config.tahun_pelajaran || "";
    const activeSem = config.semester || "";
    let mySchedules = allSchedules.filter((s) => {
      const isMe = String(s.user_id).trim() === String(user.id).trim();
      const isToday = String(s.day_index).trim() === String(dayIndex);
      const sTP = s.tahun_pelajaran || activeTP;
      const sSem = s.semester || activeSem;
      return isMe && isToday && sTP === activeTP && sSem === activeSem;
    });
    const mySubJobs = substitutes.filter(
      (s) =>
        String(s.substitute_user_id).trim() === String(user.id).trim() &&
        Utilities.formatDate(new Date(s.date + (String(s.date).length === 10 ? "T00:00:00" : "")), "Asia/Jakarta", "yyyy-MM-dd") ===
          todayStr,
    );
    mySubJobs.forEach((sub) => {
      const sched = allSchedules.find(
        (s) => String(s.id) === String(sub.schedule_id),
      );
      if (sched) {
        const subSched = { ...sched, is_substitute_job: true };
        mySchedules.push(subSched);
      }
    });
    const finalResult = mySchedules.map((s) => {
      let start = s.time_start;
      let end = s.time_end;
      if (start instanceof Date)
        start = Utilities.formatDate(start, "Asia/Jakarta", "HH:mm");
      if (end instanceof Date)
        end = Utilities.formatDate(end, "Asia/Jakarta", "HH:mm");
      start = String(start).substring(0, 5);
      end = String(end).substring(0, 5);
      const isDone = allLogs.some((log) => {
        const logDate = Utilities.formatDate(
          new Date(log.date + (String(log.date).length === 10 ? "T00:00:00" : "")),
          "Asia/Jakarta",
          "yyyy-MM-dd",
        );
        return String(log.schedule_id) === String(s.id) && logDate === todayStr;
      });
      const attendanceRecord = attendanceData.find(
        (a) =>
          String(a.user_id).trim() === String(user.id).trim() &&
          Utilities.formatDate(
            new Date(a.date + (String(a.date).length === 10 ? "T00:00:00" : "")),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          ) === todayStr &&
          String(a.schedule_id || "") === String(s.id),
      );
      let subjectLabel = s.subject;
      if (s.is_substitute_job) subjectLabel += " (GURU PENGGANTI)";
      return {
        id: s.id,
        time_start: start,
        time_end: end,
        class_name: String(s.class_name || "-"),
        subject: subjectLabel,
        jtm_val: String(s.jtm_val || "0"),
        has_log: isDone,
        attendance_confirmed: !!attendanceRecord,
      };
    });
    finalResult.sort((a, b) => a.time_start.localeCompare(b.time_start));
    // H-MINUS-1: Tambahkan jadwal kemarin yang belum diisi jika fitur aktif
    if (String(config["allow_h_minus_1_journal"] || "").toLowerCase() === "true") {
      const _h1Yesterday = new Date();
      _h1Yesterday.setDate(_h1Yesterday.getDate() - 1);
      const _h1YesterdayStr = Utilities.formatDate(_h1Yesterday, "Asia/Jakarta", "yyyy-MM-dd");
      const _h1YesterdayDayIdx = _h1Yesterday.getDay();
      // Jadwal kemarin yang memang milik guru ini
      const _h1YestSchedules = allSchedules.filter((s) => {
        const isMe = String(s.user_id).trim() === String(user.id).trim();
        const isYday = String(s.day_index).trim() === String(_h1YesterdayDayIdx);
        const sTP = s.tahun_pelajaran || activeTP;
        const sSem = s.semester || activeSem;
        return isMe && isYday && sTP === activeTP && sSem === activeSem;
      });
      // H-MINUS-1: Jadwal kemarin di mana guru ini bertindak sebagai PENGGANTI
      const _h1YestSubJobs = substitutes.filter((sub) => {
        const subDate = Utilities.formatDate(
          new Date(sub.date + (String(sub.date).length === 10 ? "T00:00:00" : "")),
          "Asia/Jakarta",
          "yyyy-MM-dd",
        );
        return (
          subDate === _h1YesterdayStr &&
          String(sub.substitute_user_id).trim() === String(user.id).trim()
        );
      });
      _h1YestSubJobs.forEach((sub) => {
        const origSched = allSchedules.find((s) => String(s.id) === String(sub.schedule_id));
        if (!origSched) return;
        // Hanya tambahkan jika belum ada di _h1YestSchedules (hindari duplikasi)
        if (_h1YestSchedules.some((s) => String(s.id) === String(sub.schedule_id))) return;
        _h1YestSchedules.push({ ...origSched, is_h1_substitute_job: true });
      });
      _h1YestSchedules.forEach((s) => {
        const alreadyDone = allLogs.some((log) => {
          const logDate = Utilities.formatDate(
            new Date(log.date + (String(log.date).length === 10 ? "T00:00:00" : "")),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          );
          // Untuk jadwal pengganti, log ditulis atas nama user ini (bukan pemilik asli jadwal)
          return String(log.schedule_id) === String(s.id) && logDate === _h1YesterdayStr &&
            String(log.user_id) === String(user.id);
        });
        if (!alreadyDone) {
          let h1Start = s.time_start;
          let h1End = s.time_end;
          if (h1Start instanceof Date) h1Start = Utilities.formatDate(h1Start, "Asia/Jakarta", "HH:mm");
          if (h1End instanceof Date) h1End = Utilities.formatDate(h1End, "Asia/Jakarta", "HH:mm");
          h1Start = String(h1Start).substring(0, 5);
          h1End = String(h1End).substring(0, 5);
          const h1Jtm = Math.round(Number(s.jtm_val || 0) * 0.8 * 10) / 10;
          // H-MINUS-1: cek kehadiran kemarin sudah dikonfirmasi (Daily_Attendance)
          const h1AttConfirmed = attendanceData.some((a) => {
            const aDate = Utilities.formatDate(
              new Date(a.date + (String(a.date).length === 10 ? "T00:00:00" : "")),
              "Asia/Jakarta",
              "yyyy-MM-dd",
            );
            return (
              String(a.user_id).trim() === String(user.id).trim() &&
              aDate === _h1YesterdayStr &&
              String(a.schedule_id || "") === String(s.id)
            );
          });
          // Jadwal pengganti kemarin TIDAK perlu cek h1IsReplaced (guru ini sudah jadi pengganti)
          const h1IsReplaced = !s.is_h1_substitute_job && substitutes.some((sub) => {
            const subDate = Utilities.formatDate(
              new Date(sub.date + (String(sub.date).length === 10 ? "T00:00:00" : "")),
              "Asia/Jakarta",
              "yyyy-MM-dd",
            );
            return (
              subDate === _h1YesterdayStr &&
              String(sub.schedule_id) === String(s.id) &&
              String(sub.original_user_id).trim() === String(user.id).trim()
            );
          });
          const subjectLabel = s.is_h1_substitute_job
            ? s.subject + " (GURU PENGGANTI)"
            : s.subject;
          finalResult.push({
            id: s.id,
            time_start: h1Start,
            time_end: h1End,
            class_name: String(s.class_name || "-"),
            subject: subjectLabel,
            jtm_val: String(s.jtm_val || "0"),
            has_log: false,
            attendance_confirmed: h1AttConfirmed,
            is_h_minus_1_eligible: true,
            h1_eligible_jtm: h1Jtm,
            h1_target_date: _h1YesterdayStr,
            h1_is_replaced: h1IsReplaced,
            h1_is_substitute_job: !!s.is_h1_substitute_job,
          });
        }
      });
    }
    return finalResult;
  } catch (e) {
    return [];
  }
}
