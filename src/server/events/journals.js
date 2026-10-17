function getMyPendingJournals(token) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role || "").toLowerCase() !== "guru") {
      return { status: "error", message: "Akses Ditolak." };
    }
    var tz = Session.getScriptTimeZone();
    var todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    var h1YdayObj = new Date();
    h1YdayObj.setDate(h1YdayObj.getDate() - 1);
    var yesterdayStr = Utilities.formatDate(h1YdayObj, tz, "yyyy-MM-dd");
    // H-MINUS-1: cek apakah fitur aktif
    var cfg = _getConfigMap();
    var h1Enabled = String(cfg["allow_h_minus_1_journal"] || "").toLowerCase() === "true";
    var userId = String(user.id);
    var allAttendance = getData(EVENT_SHEET.ATTENDANCE);
    var pending = allAttendance.filter(function (r) {
      if (String(r.user_id || "") !== userId) return false;
      var rDate = String(r.date || "");
      // Jurnal hari ini selalu ditampilkan
      if (rDate === todayStr) {
        var js = r.journal_submitted;
        if (js === true || String(js).toUpperCase() === "TRUE") return false;
        return true;
      }
      // H-MINUS-1: tampilkan juga kehadiran kemarin jika fitur aktif
      if (h1Enabled && rDate === yesterdayStr) {
        var jsY = r.journal_submitted;
        if (jsY === true || String(jsY).toUpperCase() === "TRUE") return false;
        return true;
      }
      return false;
    });
    var allDefs = getData(EVENT_SHEET.DEFINITIONS);
    var defsMap = {};
    allDefs.forEach(function (d) {
      defsMap[String(d.id || "")] = String(d.name || "");
    });
    var defsTypeMap = {};
    allDefs.forEach(function (d) {
      defsTypeMap[String(d.id || "")] = String(d.type || "");
    });
    var items = pending.map(function (r) {
      var rDate = String(r.date || "");
      var isH1 = h1Enabled && rDate === yesterdayStr;
      return {
        attendance_id: String(r.id || ""),
        event_id: String(r.event_id || ""),
        event_name: defsMap[String(r.event_id || "")] || "",
        event_type: defsTypeMap[String(r.event_id || "")] || "",
        date: rDate,
        time_in: String(r.time_in || ""),
        is_h_minus_1: isH1,
      };
    });
    return { status: "success", items: items };
  } catch (e) {
    console.error("getMyPendingJournals error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function saveEventJournal(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role || "").toLowerCase() !== "guru") {
      return { status: "error", message: "Akses Ditolak." };
    }
    var attendanceId =
      payload && payload.attendance_id
        ? String(payload.attendance_id).trim()
        : "";
    var attendanceRecord = findData(EVENT_SHEET.ATTENDANCE, "id", attendanceId);
    if (!attendanceRecord) {
      return { status: "error", message: "Catatan kehadiran tidak ditemukan." };
    }
    if (String(attendanceRecord.user_id) !== String(user.id)) {
      return {
        status: "error",
        message: "Akses Ditolak: Jurnal ini bukan milik Anda.",
      };
    }
    var js = attendanceRecord.journal_submitted;
    if (js === true || String(js).toUpperCase() === "TRUE") {
      return {
        status: "error",
        message: "Jurnal untuk acara ini sudah pernah diisi.",
      };
    }
    var todayStrJrn = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
    var h1YdayJrn = new Date();
    h1YdayJrn.setDate(h1YdayJrn.getDate() - 1);
    var yesterdayStrJrn = Utilities.formatDate(
      h1YdayJrn,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
    var isH1Entry = String(attendanceRecord.date) === yesterdayStrJrn;
    var isSameDay = String(attendanceRecord.date) === todayStrJrn;
    if (!isSameDay && !isH1Entry) {
      return {
        status: "error",
        message:
          "Jurnal hanya dapat diisi pada hari yang sama dengan kehadiran.",
      };
    }
    // H-MINUS-1: untuk kehadiran kemarin, cek apakah fitur aktif
    if (isH1Entry) {
      var cfgJrn = _getConfigMap();
      var h1EnabledJrn = String(cfgJrn["allow_h_minus_1_journal"] || "").toLowerCase() === "true";
      if (!h1EnabledJrn) {
        return {
          status: "error",
          code: "H1_DISABLED",
          message: "Fitur input jurnal H-1 tidak aktif. Hubungi Admin untuk mengaktifkannya.",
        };
      }
    }
    var description =
      payload && typeof payload.description === "string"
        ? payload.description.trim()
        : "";
    if (!description) {
      return {
        status: "error",
        message: "Deskripsi jurnal tidak boleh kosong.",
      };
    }
    if (description.length > 1000) {
      return {
        status: "error",
        message: "Deskripsi jurnal tidak boleh melebihi 1000 karakter.",
      };
    }
    var eventDef = findData(
      EVENT_SHEET.DEFINITIONS,
      "id",
      attendanceRecord.event_id,
    );
    var jtmSnapshot = eventDef ? Number(eventDef.jtm_val) : 0;
    // H-MINUS-1: terapkan bobot 80% jika jurnal diinput untuk kehadiran kemarin
    if (isH1Entry) {
      jtmSnapshot = Math.round(jtmSnapshot * 0.8 * 10) / 10;
    }
    try {
      getSheet(EVENT_SHEET.JOURNALS).appendRow([
        generateId("EVJ"),
        attendanceRecord.event_id,
        attendanceRecord.id,
        String(user.id),
        attendanceRecord.date,
        description,
        new Date().toISOString(),
      ]);
    } catch (insertErr) {
      console.error("saveEventJournal INSERT error: " + insertErr);
      return { status: "error", message: "Terjadi kesalahan server." };
    }
    var attSheet = getSheet(EVENT_SHEET.ATTENDANCE);
    var attRows = attSheet.getDataRange().getValues();
    var attHeaders = attRows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var colOf = {};
    attHeaders.forEach(function (h, i) {
      colOf[h] = i;
    });
    var idCol = colOf["id"] !== undefined ? colOf["id"] : 0;
    var jsCol =
      colOf["journal_submitted"] !== undefined ? colOf["journal_submitted"] : 7;
    var jtmCol = colOf["jtm_val"] !== undefined ? colOf["jtm_val"] : 8;
    for (var i = 1; i < attRows.length; i++) {
      if (String(attRows[i][idCol]) === String(attendanceRecord.id)) {
        var rowNum = i + 1; 
        attSheet.getRange(rowNum, jsCol + 1).setValue(true);
        attSheet.getRange(rowNum, jtmCol + 1).setValue(jtmSnapshot);
        break;
      }
    }
    try {
      _invalidateDataSnapshot();
    } catch (e) {}
    return { status: "success" };
  } catch (e) {
    console.error("saveEventJournal error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function getEventAttendanceHistory(token, month, year) {
  try {
    var user = verifySession(token);
    if (!user) {
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    }
    var userId = String(user.id);
    var m = Number(month);
    var y = Number(year);
    function pad(n) {
      return String(n).padStart(2, "0");
    }
    var firstDay = y + "-" + pad(m) + "-01";
    var lastDayNum = new Date(y, m, 0).getDate();
    var lastDay = y + "-" + pad(m) + "-" + pad(lastDayNum);
    var allAttendances = getData(EVENT_SHEET.ATTENDANCE);
    var filtered = allAttendances.filter(function (r) {
      return (
        String(r.user_id) === userId &&
        String(r.date) >= firstDay &&
        String(r.date) <= lastDay
      );
    });
    var allDefinitions = getData(EVENT_SHEET.DEFINITIONS);
    var eventMap = {};
    allDefinitions.forEach(function (ev) {
      eventMap[String(ev.id)] = String(ev.name || "");
    });
    var history = filtered.map(function (r) {
      var dateParts = String(r.date).split("-");
      var dateDisplay =
        dateParts.length === 3
          ? dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0]
          : String(r.date);
      var submitted = r.journal_submitted;
      var isSubmitted =
        submitted === true || String(submitted).toUpperCase() === "TRUE";
      var journalStatus = isSubmitted ? "Sudah Diisi" : "Belum Diisi";
      var jtmVal = isSubmitted ? Number(r.jtm_val) || 0 : 0;
      return {
        attendance_id: String(r.id),
        event_id: String(r.event_id),
        event_name: eventMap[String(r.event_id)] || "",
        date: dateDisplay,
        date_raw: String(r.date),
        time_in: String(r.time_in || ""),
        journal_status: journalStatus,
        jtm_val: jtmVal,
      };
    });
    return { status: "success", history: history };
  } catch (e) {
    console.error("getEventAttendanceHistory error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function getEventJournalHistory(token, month, year) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var role = String(user.role || "").toLowerCase();
    var userId = String(user.id);
    if (role !== "guru" && role !== "admin") {
      return { status: "error", message: "Akses ditolak." };
    }
    var m = parseInt(month, 10);
    var y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
      return { status: "error", message: "Parameter bulan/tahun tidak valid." };
    }
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    var firstDay = y + "-" + pad(m) + "-01";
    var lastDayNum = new Date(y, m, 0).getDate();
    var lastDay = y + "-" + pad(m) + "-" + pad(lastDayNum);
    var allJournals = getData(EVENT_SHEET.JOURNALS);
    var filtered = allJournals.filter(function (r) {
      var dateOk = String(r.date) >= firstDay && String(r.date) <= lastDay;
      var roleOk = role === "admin" ? true : String(r.user_id) === userId;
      return dateOk && roleOk;
    });
    var allDefinitions = getData(EVENT_SHEET.DEFINITIONS);
    var eventMap = {};
    allDefinitions.forEach(function (ev) {
      eventMap[String(ev.id)] = String(ev.name || "");
    });
    var allUsers = getData(SHEET_NAME.USERS);
    var userMap = {};
    allUsers.forEach(function (u) {
      userMap[String(u.id)] = String(u.full_name || "");
    });
    var history = filtered.map(function (r) {
      var dateParts = String(r.date).split("-");
      var dateDisplay =
        dateParts.length === 3
          ? dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0]
          : String(r.date);
      var desc = String(r.description || "");
      return {
        id: String(r.id),
        event_name: eventMap[String(r.event_id)] || "Unknown Event",
        user_name: userMap[String(r.user_id)] || "Unknown User",
        date: dateDisplay,
        date_raw: String(r.date),
        description: desc,
        timestamp:
          r.submitted_at instanceof Date
            ? r.submitted_at.toISOString()
            : String(r.submitted_at),
      };
    });
    history.sort(function (a, b) {
      if (a.date_raw > b.date_raw) return -1;
      if (a.date_raw < b.date_raw) return 1;
      if (a.timestamp > b.timestamp) return -1;
      if (a.timestamp < b.timestamp) return 1;
      return 0;
    });
    return { status: "success", history: history };
  } catch (e) {
    console.error("getEventJournalHistory error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
