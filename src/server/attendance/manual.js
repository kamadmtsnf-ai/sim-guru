function addExtraAttendee(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var tz = Session.getScriptTimeZone();
    var targetUserId = String((payload && payload.target_user_id) || "").trim();
    var dateStr = String((payload && payload.date) || "").trim();
    var reason = String((payload && payload.reason) || "").trim();
    if (!targetUserId || !dateStr) {
      return {
        status: "error",
        message: "target_user_id dan date wajib diisi.",
      };
    }
    if (!reason) {
      return { status: "error", message: "Alasan penambahan wajib diisi." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { status: "error", message: "Format tanggal tidak valid." };
    }
    if (!isAdmin) {
      var picketSchedules = getData(SHEET_NAME.PICKET_SCHEDULES);
      var allSubstitutes = getData(SHEET_NAME.SUBSTITUTES);
      var allAttendance = getData(SHEET_NAME.ATTENDANCE);
      var targetDateObj = new Date(dateStr + "T00:00:00");
      var targetDayIndex = (function () {
        var utc =
          targetDateObj.getTime() + targetDateObj.getTimezoneOffset() * 60000;
        return new Date(utc + 7 * 3600000).getDay();
      })();
      var isPicketOriginal = picketSchedules.some(function (p) {
        return (
          String(p.user_id) === String(user.id) &&
          String(p.day_index).trim() === String(targetDayIndex)
        );
      });
      var isPicketSub = allSubstitutes.some(function (s) {
        return (
          String(s.substitute_user_id) === String(user.id) &&
          String(s.schedule_id) === "PICKET-DUTY" &&
          String(s.date) === dateStr
        );
      });
      if (!isPicketOriginal && !isPicketSub) {
        return {
          status: "error",
          message: "Hanya admin atau guru piket yang dapat menambahkan guru.",
        };
      }
      var myRec = allAttendance.find(function (a) {
        return (
          String(a.user_id) === String(user.id) && String(a.date) === dateStr
        );
      });
      if (!myRec || !String(myRec.time_in || "").trim()) {
        return {
          status: "error",
          message: "Kehadiran piket Anda belum dikonfirmasi admin.",
        };
      }
    }
    var targetUser = findData(SHEET_NAME.USERS, "id", targetUserId);
    if (!targetUser) {
      return { status: "error", message: "Guru yang dipilih tidak ditemukan." };
    }
    if (String(targetUser.role).toLowerCase() === "admin") {
      return {
        status: "error",
        message: "Akun admin tidak dapat ditambahkan ke daftar kehadiran guru.",
      };
    }
    var attSheet = getSheet(SHEET_NAME.ATTENDANCE);
    var attRows = attSheet.getDataRange().getValues();
    var attHdrs = attRows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var attCI = {};
    attHdrs.forEach(function (h, i) {
      attCI[h] = i;
    });
    var ensureCol = function (col) {
      if (attCI[col] !== undefined) return;
      var nc = attSheet.getLastColumn() + 1;
      attSheet.getRange(1, nc).setValue(col);
      attCI[col] = nc - 1;
      attHdrs.push(col);
    };
    ensureCol("notes");
    ensureCol("extra_attendee");
    var foundRowNum = -1;
    var existingRecord = null;
    for (var i = 1; i < attRows.length; i++) {
      var rowUid = String(
        attRows[i][attCI["user_id"] !== undefined ? attCI["user_id"] : 2] || "",
      );
      var rowDateRaw =
        attRows[i][attCI["date"] !== undefined ? attCI["date"] : 1];
      var rowDateStr =
        rowDateRaw instanceof Date
          ? Utilities.formatDate(rowDateRaw, tz, "yyyy-MM-dd")
          : String(rowDateRaw || "");
      if (rowUid === targetUserId && rowDateStr === dateStr) {
        foundRowNum = i + 1;
        existingRecord = attRows[i];
        break;
      }
    }
    if (existingRecord) {
      var existingSchedIn = String(
        existingRecord[attCI["sched_time_in"]] || "",
      ).trim();
      if (existingSchedIn) {
        return {
          status: "error",
          message:
            String(targetUser.full_name) +
            " sudah memiliki jadwal resmi hari ini dan sudah ada di Daftar Kehadiran.",
        };
      }
    }
    var targetDateObj2 = new Date(dateStr + "T00:00:00");
    var targetDayIndex2 = (function () {
      var utc =
        targetDateObj2.getTime() + targetDateObj2.getTimezoneOffset() * 60000;
      return new Date(utc + 7 * 3600000).getDay();
    })();
    var examPeriods3 = getData(EXAM_SHEET.PERIODS);
    var isExamDay = examPeriods3.some(function (p) {
      var ps = String(p.date_start || ""),
        pe = String(p.date_end || "");
      return ps && pe && dateStr >= ps && dateStr <= pe;
    });
    var activeType3 = isExamDay ? "UJIAN" : "KBM";
    var allTpl3 = getData(SHEET_NAME.ATTENDANCE_SCHED_TEMPLATES);
    var tpl3 = allTpl3.find(function (t) {
      return (
        Number(t.day_index) === targetDayIndex2 &&
        String(t.sched_type || "")
          .toUpperCase()
          .trim() === activeType3
      );
    });
    var rTime3 = /^([01]\d|2[0-3]):([0-5]\d)$/;
    var tplSchedIn = tpl3
      ? String(tpl3.sched_time_in || "")
          .trim()
          .substring(0, 5)
      : "";
    var tplSchedOut = tpl3
      ? String(tpl3.sched_time_out || "")
          .trim()
          .substring(0, 5)
      : "";
    if (!rTime3.test(tplSchedIn)) tplSchedIn = "";
    if (!rTime3.test(tplSchedOut)) tplSchedOut = "";
    ensureCol("sched_time_in");
    ensureCol("sched_time_out");
    var noteValue = "[TAMBAH MANUAL] " + reason.substring(0, 250);
    if (foundRowNum > 0) {
      if (attCI["notes"] !== undefined)
        attSheet.getRange(foundRowNum, attCI["notes"] + 1).setValue(noteValue);
      if (attCI["extra_attendee"] !== undefined)
        attSheet
          .getRange(foundRowNum, attCI["extra_attendee"] + 1)
          .setValue("true");
      if (tplSchedIn && attCI["sched_time_in"] !== undefined)
        attSheet
          .getRange(foundRowNum, attCI["sched_time_in"] + 1)
          .setValue(tplSchedIn);
      if (tplSchedOut && attCI["sched_time_out"] !== undefined)
        attSheet
          .getRange(foundRowNum, attCI["sched_time_out"] + 1)
          .setValue(tplSchedOut);
    } else {
      var newRow = attHdrs.map(function () {
        return "";
      });
      if (attCI["id"] !== undefined) newRow[attCI["id"]] = generateId("ATT");
      if (attCI["date"] !== undefined) newRow[attCI["date"]] = dateStr;
      if (attCI["user_id"] !== undefined)
        newRow[attCI["user_id"]] = targetUserId;
      if (attCI["notes"] !== undefined) newRow[attCI["notes"]] = noteValue;
      if (attCI["extra_attendee"] !== undefined)
        newRow[attCI["extra_attendee"]] = "true";
      if (tplSchedIn && attCI["sched_time_in"] !== undefined)
        newRow[attCI["sched_time_in"]] = tplSchedIn;
      if (tplSchedOut && attCI["sched_time_out"] !== undefined)
        newRow[attCI["sched_time_out"]] = tplSchedOut;
      attSheet.appendRow(newRow);
    }
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message:
        String(targetUser.full_name) +
        " berhasil ditambahkan ke Daftar Kehadiran.",
    };
  } catch (e) {
    console.error("addExtraAttendee error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function saveAttendanceManual(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    if (!isAdmin) {
      return {
        status: "error",
        message: "Hanya admin yang dapat menyimpan detail.",
      };
    }
    var targetUserId = String((payload && payload.user_id) || "").trim();
    var dateStr = String((payload && payload.date) || "").trim();
    var timeIn = String((payload && payload.time_in) || "").trim();
    var timeOut = String((payload && payload.time_out) || "").trim();
    var attStatus = String((payload && payload.status) || "").trim();
    if (!targetUserId || !dateStr) {
      return { status: "error", message: "user_id dan date wajib diisi." };
    }
    var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (timeIn && !rTime.test(timeIn)) {
      return {
        status: "error",
        message:
          "Format jam datang tidak valid. Gunakan HH:mm (contoh: 07:30).",
      };
    }
    if (timeOut && !rTime.test(timeOut)) {
      return {
        status: "error",
        message:
          "Format jam pulang tidak valid. Gunakan HH:mm (contoh: 14:30).",
      };
    }
    if (timeIn && timeOut) {
      var inMins =
        parseInt(timeIn.split(":")[0], 10) * 60 +
        parseInt(timeIn.split(":")[1], 10);
      var outMins =
        parseInt(timeOut.split(":")[0], 10) * 60 +
        parseInt(timeOut.split(":")[1], 10);
      if (outMins < inMins) {
        return {
          status: "error",
          message: "Jam pulang tidak boleh lebih awal dari jam datang.",
        };
      }
    }
    var sheet = getSheet(SHEET_NAME.ATTENDANCE);
    var rows = sheet.getDataRange().getValues();
    var tz = Session.getScriptTimeZone();
    var headers = rows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var colIdx = {};
    headers.forEach(function (h, i) {
      colIdx[h] = i;
    });
    var ensureCol = function (colName) {
      if (colIdx[colName] !== undefined) return;
      var newColNum = sheet.getLastColumn() + 1;
      sheet.getRange(1, newColNum).setValue(colName);
      colIdx[colName] = newColNum - 1;
    };
    ensureCol("time_in");
    ensureCol("time_out");
    ensureCol("status");
    var foundRowNum = -1;
    for (var i = 1; i < rows.length; i++) {
      var rowUserId = String(
        rows[i][colIdx["user_id"] !== undefined ? colIdx["user_id"] : 2] || "",
      );
      var rowDateRaw =
        rows[i][colIdx["date"] !== undefined ? colIdx["date"] : 1];
      var rowDateStr =
        rowDateRaw instanceof Date
          ? Utilities.formatDate(rowDateRaw, tz, "yyyy-MM-dd")
          : String(rowDateRaw || "");
      if (rowUserId === String(targetUserId) && rowDateStr === dateStr) {
        foundRowNum = i + 1;
        break;
      }
    }
    if (foundRowNum > 0) {
      sheet.getRange(foundRowNum, colIdx["time_in"] + 1).setValue(timeIn);
      sheet.getRange(foundRowNum, colIdx["time_out"] + 1).setValue(timeOut);
      sheet.getRange(foundRowNum, colIdx["status"] + 1).setValue(attStatus);
    } else {
      var newRowLength = headers.length;
      var newRow = [];
      for (var j = 0; j < newRowLength; j++) newRow.push("");
      if (colIdx["id"] !== undefined) newRow[colIdx["id"]] = generateId("ATT");
      if (colIdx["date"] !== undefined) newRow[colIdx["date"]] = dateStr;
      if (colIdx["user_id"] !== undefined)
        newRow[colIdx["user_id"]] = targetUserId;
      if (colIdx["status"] !== undefined) newRow[colIdx["status"]] = attStatus;
      if (colIdx["time_in"] !== undefined) newRow[colIdx["time_in"]] = timeIn;
      if (colIdx["time_out"] !== undefined)
        newRow[colIdx["time_out"]] = timeOut;
      sheet.appendRow(newRow);
    }
    return { status: "success", message: "Data kehadiran berhasil disimpan." };
  } catch (e) {
    console.error("saveAttendanceManual error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
