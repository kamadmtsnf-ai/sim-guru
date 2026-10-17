function getAdminDashboardData_V2(token) {
  try {
    const user = verifySession(token);
    if (String(user.role).toLowerCase() !== "admin")
      return { status: "error", message: "Akses Ditolak." };
    const snap = _getDataSnapshot();
    const cfg = snap.config;
    const TARIF = Number(cfg["base_salary"] || 0);
    const usersData = snap.users;
    const allSchedules = snap.schedules;
    const allLogs = snap.logs;
    const allAllowances = snap.allowances;
    const allSubstitutes = snap.substitutes;
    const teachers = usersData.filter(
      (u) => String(u.role).toLowerCase() === "guru",
    );
    const userMap = {};
    usersData.forEach((u) => (userMap[u.id] = u.full_name));
    let totalJTM = 0;
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const logsThisMonth = allLogs.filter((l) => {
      const d = new Date(l.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const jtmAdjMap = _jtmBuildKbmAdjustmentMap_();
    const piketAdjMap = _jtmBuildPiketAdjustmentMap_();
    logsThisMonth.forEach((l) => {
      const _sid = String(l.schedule_id);
      if (_sid === "PICKET-DUTY" || _sid === "PIKET") totalJTM += _jtmResolvePiketLogJtm_(piketAdjMap, l.user_id, l.date, 4);
      else if (_sid === "CEREMONY-DUTY" || _sid === "UPACARA") totalJTM += 5;
      else if (_sid === "EXAM-SUPERVISOR" || _sid === "EXAM-COMMITTEE")
        totalJTM += Number(l.jtm_val || 0);
      else if (_sid === "PARTIAL-SUB-KBM" || _sid === "PARTIAL-SUB-EXAM")
        totalJTM += Number(l.jtm_val || 0);
      else {
        const sched = allSchedules.find((s) => String(s.id) === _sid);
        if (sched)
          totalJTM += _jtmResolveKbmLogJtm_(
            jtmAdjMap,
            _sid,
            l.date,
            Number(sched.jtm_val || 0),
          );
      }
    });
    const allEvents = snap.eventAttendance;
    const eventsThisMonth = allEvents.filter((a) => {
      if (
        a.journal_submitted !== true &&
        String(a.journal_submitted).toLowerCase() !== "true"
      )
        return false;
      const d = new Date(a.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    totalJTM += _computeEventJtm(eventsThisMonth);
    teachers.forEach((t) => {
      const bonusDetail = _calculateMonthlyBonusFast_Detailed(t.id, m, y, snap);
      totalJTM += bonusDetail.estimated;
    });
    const totalAllowancesSum = allAllowances.reduce(
      (sum, a) => sum + Number(a.amount || 0),
      0,
    );
    const totalHonor = totalJTM * TARIF + totalAllowancesSum;
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
    const periodId = `${months[m]} ${y}`;
    const transportEnabled =
      String(cfg["transport_allowance_enabled"] || "false")
        .toLowerCase()
        .trim() === "true";
    let totalTransportSchool = 0;
    if (transportEnabled) {
      teachers.forEach((u) => {
        totalTransportSchool += _getMonthlyTransportSumFast(String(u.id), periodId, snap);
      });
    }
    const dayIndex = _getIndoDayIndex();
    const todayStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const activeTP = cfg["tahun_pelajaran"] || "";
    const activeSem = cfg["semester"] || "";
    const todaysSchedules = allSchedules
      .filter((s) => {
        const isToday = String(s.day_index).trim() === String(dayIndex);
        const sTP = s.tahun_pelajaran || activeTP;
        const sSem = s.semester || activeSem;
        return isToday && sTP === activeTP && sSem === activeSem;
      })
      .map((s) => {
        const isDone = allLogs.some(
          (l) =>
            String(l.schedule_id) === String(s.id) &&
            Utilities.formatDate(
              new Date(l.date),
              "Asia/Jakarta",
              "yyyy-MM-dd",
            ) === todayStr,
        );
        const subRecord = allSubstitutes.find(
          (sub) =>
            String(sub.schedule_id) === String(s.id) &&
            Utilities.formatDate(
              new Date(sub.date),
              "Asia/Jakarta",
              "yyyy-MM-dd",
            ) === todayStr,
        );
        let displayGuruName = userMap[s.user_id] || "Unknown";
        if (subRecord) {
          const subName = userMap[subRecord.substitute_user_id] || "Unknown";
          displayGuruName = `${subName} (Gnt)`;
        }
        let tStart = safeTime(s.time_start);
        if (tStart.length > 5) tStart = tStart.substring(0, 5);
        if (!tStart) tStart = "??:??";
        
        let tEnd = safeTime(s.time_end);
        if (tEnd.length > 5) tEnd = tEnd.substring(0, 5);
        if (!tEnd) tEnd = "??:??";
        
        return {
          id: s.id,
          time: tStart + " - " + tEnd,
          guru_name: displayGuruName,
          class_name: s.class_name,
          subject: s.subject,
          status: isDone ? "✅ Sudah Mengajar" : "⏳ Belum",
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
    const eventsTodayForAdmin = allEvents.filter((a) => {
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
    eventsTodayForAdmin.forEach((e) => {
      const isDone = String(e.journal_submitted).toLowerCase() === "true";
      todaysSchedules.push({
        id: "EVENT-" + e.id,
        time: "Acara",
        guru_name: userMap[e.user_id] || "Unknown",
        class_name: "Kegiatan/Acara",
        subject: e.event_name || "Acara Sekolah",
        status: isDone ? "✅ Sudah Mengisi" : "⏳ Belum",
      });
    });
    return {
      status: "success",
      total_guru: teachers.length,
      total_jtm_school: totalJTM,
      est_honor_school: formatRupiah(totalHonor),
      transport_total_school: totalTransportSchool,
      transport_total_school_formatted: formatRupiah(totalTransportSchool),
      transport_enabled: transportEnabled,
      schedules: todaysSchedules,
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}
function getAdminDailyAttendance(token) {
  try {
    const user = verifySession(token);
    if (String(user.role).toLowerCase() !== "admin") return { status: "error" };
    const dayIndex = _getIndoDayIndex();
    const todayStr = Utilities.formatDate(
      new Date(),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    const snap = _getDataSnapshot();
    const schedules = snap.schedules;
    const users = snap.users;
    const attendanceData = snap.attendance;
    const substitutes = snap.substitutes;
    const cfg = snap.config;
    const activeTP = cfg["tahun_pelajaran"] || "";
    const activeSem = cfg["semester"] || "";
    const todaySchedules = schedules.filter((s) => {
      const isToday = String(s.day_index).trim() === String(dayIndex);
      const sTP = s.tahun_pelajaran || activeTP;
      const sSem = s.semester || activeSem;
      return isToday && sTP === activeTP && sSem === activeSem;
    });
    const todaySubstitutes = substitutes.filter(
      (s) =>
        Utilities.formatDate(new Date(s.date), "Asia/Jakarta", "yyyy-MM-dd") ===
        todayStr,
    );
    todaySchedules.sort((a, b) =>
      safeTime(a.time_start).localeCompare(safeTime(b.time_start)),
    );
    const result = todaySchedules.map((s) => {
      const sub = todaySubstitutes.find(
        (x) => String(x.schedule_id) === String(s.id),
      );
      const effectiveUserId = sub
        ? String(sub.substitute_user_id)
        : String(s.user_id);
      const teacher = users.find((u) => String(u.id) === effectiveUserId);
      let displayName = teacher ? teacher.full_name : "Unknown";
      if (sub) displayName += " (Guru Pengganti)";
      const isConfirmed = attendanceData.some(
        (a) =>
          String(a.user_id) === effectiveUserId &&
          Utilities.formatDate(
            new Date(a.date),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          ) === todayStr &&
          String(a.schedule_id || "") === String(s.id),
      );
      let tStart = safeTime(s.time_start);
      if (tStart.length > 5) tStart = tStart.substring(0, 5);
      let tEnd = safeTime(s.time_end);
      if (tEnd.length > 5) tEnd = tEnd.substring(0, 5);
      return {
        user_id: effectiveUserId,
        schedule_id: String(s.id),
        full_name: displayName,
        class_name: String(s.class_name || "-"),
        subject: String(s.subject || "-"),
        time: tStart + " - " + tEnd,
        is_confirmed: isConfirmed,
      };
    });
    return { status: "success", data: result };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function getAdminDailyAttendanceHistory(token, dateStr) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin")
      return { status: "error", message: "Unauthorized" };
    if (!dateStr)
      dateStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
    const users = getData("Users");
    const attendanceData = getData("Daily_Attendance");
    const targetAttendances = attendanceData.filter(
      (a) => safeDate(a.date) === dateStr,
    );
    const transportEnabledStr = String(getConfigValue("transport_allowance_enabled") || "false").toLowerCase().trim();
    const transportEnabled = (transportEnabledStr === "true");
    const tarifPerKm = Number(getConfigValue("tarif_per_km") || 0);
    const result = [];
    const processedUserIds = new Set();
    targetAttendances.forEach((a) => {
      const uId = String(a.user_id);
      if (processedUserIds.has(uId)) return; 
      processedUserIds.add(uId);
      const t = users.find((u) => String(u.id) === uId);
      const fullName = t ? t.full_name : "Unknown";
      const role = t ? t.role : "Guru";
      const rawSchedIn =
        a.sched_time_in ||
        a.jam_jadwal_masuk ||
        a.jam_jadwal_masuk_guru ||
        null;
      const rawSchedOut =
        a.sched_time_out ||
        a.jam_jadwal_pulang ||
        a.jam_jadwal_pulang_guru ||
        null;
      const rawTimeIn =
        a.time_in || a.jam_masuk_aktual || a.jam_masuk_aktual_guru || null;
      const rawTimeOut =
        a.time_out || a.jam_pulang_aktual || a.jam_pulang_aktual_guru || null;
      const schedIn = safeTime(rawSchedIn);
      const schedOut = safeTime(rawSchedOut);
      const timeIn = safeTime(rawTimeIn);
      const timeOut = safeTime(rawTimeOut);
      let durationActualMin = 0;
      if (timeIn && timeOut) {
        const inParts = timeIn.split(":");
        const outParts = timeOut.split(":");
        if (inParts.length >= 2 && outParts.length >= 2) {
          const inMins = parseInt(inParts[0]) * 60 + parseInt(inParts[1]);
          const outMins = parseInt(outParts[0]) * 60 + parseInt(outParts[1]);
          durationActualMin = Math.max(0, outMins - inMins);
        }
      }
      let status = "Belum Datang";
      if (timeIn && timeOut) {
        status = "Hadir";
      } else if (timeIn) {
        status = "Sedang Bekerja";
      }
      let percentage = 0;
      let schedMins = 0;
      if (schedIn && schedOut && durationActualMin > 0) {
        const sInParts = schedIn.split(":");
        const sOutParts = schedOut.split(":");
        if (sInParts.length >= 2 && sOutParts.length >= 2) {
          const sInMins = parseInt(sInParts[0]) * 60 + parseInt(sInParts[1]);
          const sOutMins = parseInt(sOutParts[0]) * 60 + parseInt(sOutParts[1]);
          schedMins = Math.max(0, sOutMins - sInMins);
          if (schedMins > 0) {
            percentage = Math.round((durationActualMin / schedMins) * 100);
            if (percentage > 100) percentage = 100;
          }
        }
      }

      let transportNominal = 0;
      if (transportEnabled && String(role).toLowerCase() === "guru") {
        const km = t ? Number(t.km_distance || 0) : 0;
        if (timeIn && timeOut) {
           transportNominal = km * tarifPerKm * (percentage / 100);
        }
      }

      result.push({
        user_id: uId,
        full_name: fullName,
        role: role,
        sched_time_in: schedIn ? schedIn.substring(0, 5) : null,
        sched_time_out: schedOut ? schedOut.substring(0, 5) : null,
        time_in: timeIn ? timeIn.substring(0, 5) : null,
        time_out: timeOut ? timeOut.substring(0, 5) : null,
        duration_actual_min: durationActualMin,
        percentage: percentage,
        status: status,
        transport_nominal_formatted: formatRupiah(Math.round(transportNominal)),
      });
    });
    users
      .filter(
        (u) =>
          String(u.role).toLowerCase() === "guru" &&
          String(u.is_active) !== "FALSE" &&
          String(u.is_active) !== "false" &&
          u.is_active !== false,
      )
      .forEach((u) => {
        const uId = String(u.id);
        if (!processedUserIds.has(uId)) {
          result.push({
            user_id: uId,
            full_name: u.full_name,
            role: u.role,
            sched_time_in: null,
            sched_time_out: null,
            time_in: null,
            time_out: null,
            duration_actual_min: 0,
            percentage: 0,
            status: "Belum Jadwal",
            transport_nominal_formatted: "Rp 0",
          });
        }
      });
    result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    return { status: "success", list: result };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
