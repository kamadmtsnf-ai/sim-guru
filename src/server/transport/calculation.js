function _getMonthlyTransportSum(userId, periodeStr) {
  _lastEventDaysCount = 0;
  var transportEnabled = String(
    getConfigValue("transport_allowance_enabled") || "false",
  )
    .toLowerCase()
    .trim();
  if (transportEnabled !== "true") return 0;
  var tarifPerKm = Number(getConfigValue("tarif_per_km") || 0);
  if (!isFinite(tarifPerKm) || tarifPerKm <= 0) return 0;
  var userRow = findData(SHEET_NAME.USERS, "id", userId);
  var kmDistance = userRow ? Number(userRow.km_distance || 0) : 0;
  if (!isFinite(kmDistance) || kmDistance <= 0) return 0;
  var monthNames = [
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
  var parts = String(periodeStr || "")
    .trim()
    .split(" ");
  var targetMonthIndex = monthNames.indexOf(parts[0]);
  var targetYear = parseInt(parts[1], 10);
  if (targetMonthIndex === -1 || isNaN(targetYear)) return 0;
  var mm =
    targetMonthIndex + 1 < 10
      ? "0" + (targetMonthIndex + 1)
      : String(targetMonthIndex + 1);
  var firstDay = targetYear + "-" + mm + "-01";
  var lastDayDate = new Date(targetYear, targetMonthIndex + 1, 0);
  var lastDd =
    lastDayDate.getDate() < 10
      ? "0" + lastDayDate.getDate()
      : String(lastDayDate.getDate());
  var lastDay = targetYear + "-" + mm + "-" + lastDd;
  var allAttendance = getData(SHEET_NAME.ATTENDANCE);
  var userEntries = allAttendance.filter(function (row) {
    if (String(row.user_id) !== String(userId)) return false;
    var d = new Date(row.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === targetMonthIndex && d.getFullYear() === targetYear;
  });
  var bestByDate = {};
  userEntries.forEach(function (entry) {
    var dateKey = String(entry.date || "");
    var isExtra = String(entry.extra_attendee || "").toLowerCase() === "true";
    var durasiJadwal;
    if (isExtra && !String(entry.sched_time_in || "").trim()) {
      durasiJadwal = _minutesBetween(
        String(entry.time_in || ""),
        String(entry.time_out || ""),
      );
    } else {
      durasiJadwal = _minutesBetween(
        String(entry.sched_time_in || ""),
        String(entry.sched_time_out || ""),
      );
    }
    if (!bestByDate[dateKey]) {
      bestByDate[dateKey] = { entry: entry, durasiJadwal: durasiJadwal };
    } else {
      if (durasiJadwal > bestByDate[dateKey].durasiJadwal) {
        bestByDate[dateKey] = { entry: entry, durasiJadwal: durasiJadwal };
      }
    }
  });
  var eventAttAll = getData(EVENT_SHEET.ATTENDANCE);
  var eventAttRecords = eventAttAll.filter(function (r) {
    return (
      String(r.user_id || "") === String(userId) &&
      String(r.date || "") >= firstDay &&
      String(r.date || "") <= lastDay
    );
  });
  var regularDates = Object.keys(bestByDate);
  var allUniqueDates = regularDates;
  var seenEventDates = {};
  var eventDaysCountVal = 0;
  eventAttRecords.forEach(function (r) {
    var submitted =
      r.journal_submitted === true ||
      String(r.journal_submitted).toUpperCase() === "TRUE";
    if (submitted && r.date) {
      var d = String(r.date);
      if (!seenEventDates[d]) {
        seenEventDates[d] = true;
        eventDaysCountVal++;
      }
    }
  });
  _lastEventDaysCount = eventDaysCountVal;
  if (allUniqueDates.length === 0) return 0;
  var total = 0;
  var allLeaves = getData(SHEET_NAME.ATTENDANCE_LEAVES);
  var blokTransportList = _loadBlokTransportActive();
  var userLeaves = allLeaves.filter(function (lv) {
    if (String(lv.user_id) !== String(userId)) return false;
    var d = new Date(lv.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === targetMonthIndex && d.getFullYear() === targetYear;
  });
  for (var i = 0; i < allUniqueDates.length; i++) {
    var dateKey = allUniqueDates[i];
    // Cek blokir transportasi (list sudah dimuat sekali di atas, tidak baca sheet per iterasi)
    if (_isDateBlockedByList(dateKey, blokTransportList)) continue;
    if (bestByDate[dateKey]) {
      var item = bestByDate[dateKey];
      var e = item.entry;
      var dJadwal = item.durasiJadwal;
      var dAktual = _minutesBetween(
        String(e.time_in || ""),
        String(e.time_out || ""),
      );
      var totalLeaveMinutes = 0;
      userLeaves.forEach(function (lv) {
        if (String(lv.date) === dateKey) {
          totalLeaveMinutes += _minutesBetween(
            String(lv.leave_time || ""),
            String(lv.return_time || ""),
          );
        }
      });
      var dAktualEfektif = dAktual - totalLeaveMinutes;
      if (dAktualEfektif < 0) dAktualEfektif = 0;
      total += _calcDailyTransport(
        kmDistance,
        tarifPerKm,
        dAktualEfektif,
        dJadwal,
        true,
      );
    }
  }
  return total;
}

function _getMonthlyTransportSumFast(userId, periodeStr, snapshot) {
  _lastEventDaysCount = 0;
  var transportEnabled = String(
    snapshot.config["transport_allowance_enabled"] || "false",
  )
    .toLowerCase()
    .trim();
  if (transportEnabled !== "true") return 0;
  var tarifPerKm = Number(snapshot.config["tarif_per_km"] || 0);
  if (!isFinite(tarifPerKm) || tarifPerKm <= 0) return 0;
  var userRow = snapshot.usersById[userId];
  var kmDistance = userRow ? Number(userRow.km_distance || 0) : 0;
  if (!isFinite(kmDistance) || kmDistance <= 0) return 0;
  var monthNames = [
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
  var parts = String(periodeStr || "")
    .trim()
    .split(" ");
  var targetMonthIndex = monthNames.indexOf(parts[0]);
  var targetYear = parseInt(parts[1], 10);
  if (targetMonthIndex === -1 || isNaN(targetYear)) return 0;
  var mm =
    targetMonthIndex + 1 < 10
      ? "0" + (targetMonthIndex + 1)
      : String(targetMonthIndex + 1);
  var firstDay = targetYear + "-" + mm + "-01";
  var lastDayDate = new Date(targetYear, targetMonthIndex + 1, 0);
  var lastDd =
    lastDayDate.getDate() < 10
      ? "0" + lastDayDate.getDate()
      : String(lastDayDate.getDate());
  var lastDay = targetYear + "-" + mm + "-" + lastDd;
  
  var userEntries = snapshot.attendanceByUserId[userId] || [];
  userEntries = userEntries.filter(function (row) {
    var d = new Date(row.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === targetMonthIndex && d.getFullYear() === targetYear;
  });
  
  var bestByDate = {};
  userEntries.forEach(function (entry) {
    var dateKey = String(entry.date || "");
    var isExtra = String(entry.extra_attendee || "").toLowerCase() === "true";
    var durasiJadwal;
    if (isExtra && !String(entry.sched_time_in || "").trim()) {
      durasiJadwal = _minutesBetween(
        String(entry.time_in || ""),
        String(entry.time_out || ""),
      );
    } else {
      durasiJadwal = _minutesBetween(
        String(entry.sched_time_in || ""),
        String(entry.sched_time_out || ""),
      );
    }
    if (!bestByDate[dateKey]) {
      bestByDate[dateKey] = { entry: entry, durasiJadwal: durasiJadwal };
    } else {
      if (durasiJadwal > bestByDate[dateKey].durasiJadwal) {
        bestByDate[dateKey] = { entry: entry, durasiJadwal: durasiJadwal };
      }
    }
  });
  
  var eventAttRecords = snapshot.eventAttendanceByUserId[userId] || [];
  eventAttRecords = eventAttRecords.filter(function (r) {
    return (
      String(r.date || "") >= firstDay &&
      String(r.date || "") <= lastDay
    );
  });
  
  var regularDates = Object.keys(bestByDate);
  var allUniqueDates = regularDates;
  var seenEventDates = {};
  var eventDaysCountVal = 0;
  eventAttRecords.forEach(function (r) {
    var submitted =
      r.journal_submitted === true ||
      String(r.journal_submitted).toUpperCase() === "TRUE";
    if (submitted && r.date) {
      var d = String(r.date);
      if (!seenEventDates[d]) {
        seenEventDates[d] = true;
        eventDaysCountVal++;
      }
    }
  });
  _lastEventDaysCount = eventDaysCountVal;
  if (allUniqueDates.length === 0) return 0;
  
  var total = 0;
  var blokTransportList = _loadBlokTransportActive();
  var userLeaves = snapshot.attendanceLeavesByUserId[userId] || [];
  userLeaves = userLeaves.filter(function (lv) {
    var d = new Date(lv.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === targetMonthIndex && d.getFullYear() === targetYear;
  });
  
  for (var i = 0; i < allUniqueDates.length; i++) {
    var dateKey = allUniqueDates[i];
    // Cek blokir transportasi (list sudah dimuat sekali di atas, tidak baca sheet per iterasi)
    if (_isDateBlockedByList(dateKey, blokTransportList)) continue;
    if (bestByDate[dateKey]) {
      var item = bestByDate[dateKey];
      var e = item.entry;
      var dJadwal = item.durasiJadwal;
      var dAktual = _minutesBetween(
        String(e.time_in || ""),
        String(e.time_out || ""),
      );
      var totalLeaveMinutes = 0;
      userLeaves.forEach(function (lv) {
        if (String(lv.date) === dateKey) {
          totalLeaveMinutes += _minutesBetween(
            String(lv.leave_time || ""),
            String(lv.return_time || ""),
          );
        }
      });
      var dAktualEfektif = dAktual - totalLeaveMinutes;
      if (dAktualEfektif < 0) dAktualEfektif = 0;
      total += _calcDailyTransport(
        kmDistance,
        tarifPerKm,
        dAktualEfektif,
        dJadwal,
        true,
      );
    }
  }
  return total;
}
