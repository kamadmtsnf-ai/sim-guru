function getTodayEvents(token) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var isPicket = _isPicketOfficer(user);
    var tz = Session.getScriptTimeZone();
    var now = new Date();
    var todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    // Panitia ujian terkonfirmasi dengan time_in juga diizinkan
    var isPanitia = !isAdmin && !isPicket && _examIsConfirmedPanitia_(user.id, todayStr) && _hasTimeInToday(user.id);
    if (!isAdmin && !isPicket && !isPanitia) {
      return {
        status: "error",
        message:
          "Akses Ditolak: Halaman ini hanya untuk Admin, Guru Piket, atau Panitia Ujian yang sudah dikonfirmasi.",
      };
    }
    var isPicketConfirmed = isAdmin
      ? true
      : (isPicket && _hasTimeInToday(user.id)) || isPanitia;
    var dayIndexStr = Utilities.formatDate(now, tz, "u");
    var dayOfWeek = Number(dayIndexStr) % 7;
    var allDefs = getData(EVENT_SHEET.DEFINITIONS);
    var filteredEvents = allDefs.filter(function (ev) {
      try {
        var type = String(ev.type || "")
          .trim()
          .toLowerCase();
        if (type === "rutin") {
          return Number(ev.recurrence_day_index) === dayOfWeek;
        } else if (type === "insidental") {
          if (!ev.dates_json) return false;
          var dates;
          try {
            dates = JSON.parse(String(ev.dates_json));
          } catch (_) {
            return false;
          }
          if (!Array.isArray(dates)) return false;
          return dates.indexOf(todayStr) !== -1;
        }
        return false;
      } catch (_) {
        return false;
      }
    });
    return {
      status: "success",
      events: filteredEvents,
      today: todayStr,
      isPicketConfirmed: isPicketConfirmed,
    };
  } catch (e) {
    console.error("getTodayEvents error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function getEventAttendance(token, eventId, date) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var isPicketConfirmed = _isPicketOfficer(user);
    var eId = String(eventId || "").trim();
    var dateStr = String(date || "").trim();
    // Panitia ujian terkonfirmasi dengan time_in juga diizinkan membaca data acara
    var isPanitia = !isAdmin && !isPicketConfirmed
      && _examIsConfirmedPanitia_(user.id, dateStr || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"))
      && _hasTimeInToday(user.id);
    if (!isAdmin && !isPicketConfirmed && !isPanitia) {
      return {
        status: "error",
        message: "Akses Ditolak: Halaman ini hanya untuk Admin, Guru Piket, atau Panitia Ujian yang sudah dikonfirmasi.",
      };
    }
    var allUsers = getData(SHEET_NAME.USERS).filter(function (u) {
      return (
        String(u.role || "").toLowerCase() === "guru" &&
        String(u.username || "") !== "PenjagaMadrasah"
      );
    });
    var allAttendance = getData(EVENT_SHEET.ATTENDANCE).filter(function (r) {
      return (
        String(r.event_id || "") === eId && String(r.date || "") === dateStr
      );
    });
    var rows = allUsers.map(function (u) {
      var userId = String(u.id || "");
      var name = String(u.full_name || u.name || "");
      var record = allAttendance.find(function (r) {
        return String(r.user_id || "") === userId;
      });
      if (record) {
        return {
          user_id: userId,
          full_name: name,
          time_in: String(record.time_in || ""),
          journal_submitted:
            record.journal_submitted === true ||
            String(record.journal_submitted).toLowerCase() === "true",
          jtm_val:
            record.jtm_val !== undefined && record.jtm_val !== ""
              ? record.jtm_val
              : "",
          attendance_id: String(record.id || ""),
        };
      } else {
        return {
          user_id: userId,
          full_name: name,
          time_in: "",
          journal_submitted: false,
          jtm_val: "",
          attendance_id: "",
        };
      }
    });
    return { status: "success", rows: rows };
  } catch (e) {
    console.error("getEventAttendance error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function _upsertAttendanceRecord(
  existing,
  newTimeIn,
  confirmedBy,
  confirmedAt,
) {
  if (existing) {
    var updated = {};
    var keys = Object.keys(existing);
    for (var k = 0; k < keys.length; k++) {
      updated[keys[k]] = existing[keys[k]];
    }
    updated.time_in = newTimeIn;
    updated.confirmed_by = confirmedBy;
    updated.confirmed_at = confirmedAt;
    return updated;
  }
  return {
    time_in: newTimeIn,
    confirmed_by: confirmedBy,
    confirmed_at: confirmedAt,
    journal_submitted: false,
    jtm_val: "",
  };
}
function saveEventAttendance(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    // Ambil dateStr dari payload untuk pengecekan panitia
    var _dateForCheck = payload && typeof payload.date === "string" ? String(payload.date).trim() : "";
    var _isPanitiaForEvent = !isAdmin && !_isPicketOfficer(user) &&
      _examIsConfirmedPanitia_(user.id, _dateForCheck || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")) &&
      _hasTimeInToday(user.id);
    var isPicketConfirmed = isAdmin
      ? true
      : (_isPicketOfficer(user) && _hasTimeInToday(user.id)) || _isPanitiaForEvent;
    if (!_authorizeAttendanceWriter(user, isPicketConfirmed)) {
      return {
        status: "error",
        message: _isPanitiaForEvent === false && !_isPicketOfficer(user)
          ? "Akses Ditolak: Halaman ini hanya untuk Admin, Guru Piket, atau Panitia Ujian yang sudah dikonfirmasi."
          : "Akses Ditolak: Jam masuk aktual Anda belum diinput admin.",
      };
    }
    var HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
    var YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
    var timeIn =
      payload && typeof payload.time_in === "string"
        ? payload.time_in.trim()
        : "";
    var dateStr =
      payload && typeof payload.date === "string" ? payload.date.trim() : "";
    if (timeIn !== "" && !HH_MM.test(timeIn)) {
      return {
        status: "error",
        message: "Format jam masuk tidak valid (gunakan HH:mm).",
      };
    }
    if (!YYYY_MM_DD.test(dateStr)) {
      return {
        status: "error",
        message: "Format tanggal tidak valid (gunakan YYYY-MM-DD).",
      };
    }
    var eventId =
      payload && payload.event_id ? String(payload.event_id).trim() : "";
    var userId =
      payload && payload.user_id ? String(payload.user_id).trim() : "";
    if (!eventId)
      return { status: "error", message: "event_id tidak boleh kosong." };
    if (!userId)
      return { status: "error", message: "user_id tidak boleh kosong." };
    var eventDef = findData(EVENT_SHEET.DEFINITIONS, "id", eventId);
    if (!eventDef) {
      return {
        status: "error",
        message: "Acara dengan event_id tersebut tidak ditemukan.",
      };
    }
    // Validasi: jam masuk tidak boleh kurang dari jam mulai acara
    var eventTimeStart = String(eventDef.time_start || "").trim();
    if (timeIn !== "" && eventTimeStart && HH_MM.test(eventTimeStart) && timeIn < eventTimeStart) {
      return {
        status: "error",
        message: "Jam masuk (" + timeIn + ") tidak boleh kurang dari jam mulai acara (" + eventTimeStart + ").",
      };
    }
    // Validasi: jam masuk tidak boleh melebihi jam selesai acara
    var eventTimeEnd = String(eventDef.time_end || "").trim();
    if (timeIn !== "" && eventTimeEnd && HH_MM.test(eventTimeEnd) && timeIn >= eventTimeEnd) {
      return {
        status: "error",
        message: "Jam masuk (" + timeIn + ") tidak boleh melebihi jam selesai acara (" + eventTimeEnd + ").",
      };
    }
    var targetUser = findData(SHEET_NAME.USERS, "id", userId);
    if (!targetUser || String(targetUser.role || "").toLowerCase() !== "guru") {
      return {
        status: "error",
        message: "Pengguna dengan user_id tersebut bukan guru yang terdaftar.",
      };
    }
    var confirmedAt = new Date().toISOString();
    var confirmedBy = String(user.id);
    var allAttendance = getData(EVENT_SHEET.ATTENDANCE);
    var existing = allAttendance.find(function (r) {
      return (
        String(r.event_id || "") === eventId &&
        String(r.user_id || "") === userId &&
        String(r.date || "") === dateStr
      );
    });
    if (existing) {
      var attSheet = getSheet(EVENT_SHEET.ATTENDANCE);
      var attRows = attSheet.getDataRange().getValues();
      var attHeaders = attRows[0].map(function (h) {
        return String(h).toLowerCase().trim().replace(/\s+/g, "_");
      });
      var colOf = {};
      attHeaders.forEach(function (h, i) {
        colOf[h] = i;
      });
      var existingId = String(existing.id || "");
      var idCol = colOf["id"] !== undefined ? colOf["id"] : 0;
      for (var i = 1; i < attRows.length; i++) {
        if (String(attRows[i][idCol]) === existingId) {
          var rowNum = i + 1; 
          if (timeIn === "") {
            var js = existing.journal_submitted;
            if (js === true || String(js).toUpperCase() === "TRUE") {
              return {
                status: "error",
                message:
                  "Tidak dapat membatalkan kehadiran karena jurnal acara sudah diisi.",
              };
            }
            attSheet.deleteRow(rowNum);
          } else {
            attSheet
              .getRange(
                rowNum,
                (colOf["time_in"] !== undefined ? colOf["time_in"] : 4) + 1,
              )
              .setValue(timeIn);
            attSheet
              .getRange(
                rowNum,
                (colOf["confirmed_by"] !== undefined
                  ? colOf["confirmed_by"]
                  : 5) + 1,
              )
              .setValue(confirmedBy);
            attSheet
              .getRange(
                rowNum,
                (colOf["confirmed_at"] !== undefined
                  ? colOf["confirmed_at"]
                  : 6) + 1,
              )
              .setValue(confirmedAt);
          }
          break;
        }
      }
    } else {
      if (timeIn === "") {
        return { status: "success" };
      }
      var newRecord = _upsertAttendanceRecord(
        null,
        timeIn,
        confirmedBy,
        confirmedAt,
      );
      var newId = generateId("EVA");
      getSheet(EVENT_SHEET.ATTENDANCE).appendRow([
        newId,
        eventId,
        dateStr,
        userId,
        newRecord.time_in,
        newRecord.confirmed_by,
        newRecord.confirmed_at,
        newRecord.journal_submitted,
        newRecord.jtm_val,
      ]);
    }
    try {
      var email = _notifGetEmail_(payload.user_id);
      if (email) {
        var isCancelled = timeIn === "";
        var eventName = _escHtml_(eventDef.name || "Acara");
        var teacherName = _escHtml_(
          targetUser.full_name || targetUser.name || "Guru",
        );
        var subject = isCancelled
          ? "Pembatalan Kehadiran Acara"
          : "Kehadiran Acara Tercatat";
        var gradient = isCancelled
          ? "linear-gradient(135deg,#DC2626,#EF4444)"
          : "linear-gradient(135deg,#059669,#10B981)";
        var actionText = isCancelled
          ? "Kehadiran Anda pada acara <strong>" +
            eventName +
            "</strong> telah dibatalkan."
          : "Kehadiran Anda pada acara <strong>" +
            eventName +
            "</strong> telah berhasil dicatat pada jam <strong>" +
            _escHtml_(timeIn) +
            "</strong>.";
        var htmlBody =
          '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">' +
          '<div style="background:' +
          gradient +
          ';color:white;padding:20px 24px;border-radius:14px 14px 0 0;">' +
          '<div style="font-size:13px;opacity:0.85;letter-spacing:0.05em;">SiM-GURU</div>' +
          '<div style="font-size:20px;font-weight:800;margin-top:4px;">' +
          subject +
          "</div>" +
          "</div>" +
          '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:24px;background:#fff;">' +
          '<p style="font-size:14px;color:#334155;margin:0 0 16px;">Halo <strong>' +
          teacherName +
          "</strong>,</p>" +
          '<p style="font-size:14px;color:#334155;margin:0 0 16px;">' +
          actionText +
          "</p>" +
          '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin:16px 0;">' +
          '<p style="margin:0 0 8px;font-size:13px;"><span style="color:#64748B;display:inline-block;width:100px;">Acara</span>: <strong>' +
          eventName +
          "</strong></p>" +
          '<p style="margin:0 0 8px;font-size:13px;"><span style="color:#64748B;display:inline-block;width:100px;">Tanggal</span>: <strong>' +
          _escHtml_(dateStr) +
          "</strong></p>" +
          (!isCancelled
            ? '<p style="margin:0;font-size:13px;"><span style="color:#64748B;display:inline-block;width:100px;">Waktu Hadir</span>: <strong>' +
              _escHtml_(timeIn) +
              "</strong></p>"
            : "") +
          "</div>" +
          '<p style="font-size:13px;color:#64748b;margin:16px 0 16px;">' +
          (!isCancelled
            ? "Jangan lupa untuk mengisi jurnal acara terkait pada sistem SiM-Guru setelah kegiatan selesai."
            : "Jika Anda merasa ini adalah kesalahan, silakan hubungi admin atau guru piket.") +
          "</p>" +
          '<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;">' +
          '<p style="font-size:11px;color:#94a3b8;margin:0;">Email otomatis dari SiM-Guru. Jangan balas email ini.</p>' +
          "</div>" +
          "</div>";
        var textBody =
          "Halo " +
          (targetUser.full_name || "Guru") +
          ",\n\n" +
          (isCancelled
            ? "Kehadiran Anda pada acara " +
              (eventDef.name || "") +
              " telah dibatalkan."
            : "Kehadiran Anda pada acara " +
              (eventDef.name || "") +
              " telah berhasil dicatat pada jam " +
              timeIn +
              ".") +
          "\n\nTanggal: " +
          dateStr;
        MailApp.sendEmail({
          to: email,
          subject: subject,
          body: textBody,
          htmlBody: htmlBody,
          name: "SiM-Guru",
        });
      }
    } catch (emailErr) {
    }
    return { status: "success" };
  } catch (e) {
    console.error("saveEventAttendance error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
