function getAttendanceSchedTemplates(token, dateStr) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var sheet = getSheet(SHEET_NAME.ATTENDANCE_SCHED_TEMPLATES);
    var rows = sheet.getDataRange().getValues();
    var result = [];
    if (rows.length >= 2) {
      var headers = rows[0].map(function (h) {
        return String(h).toLowerCase().trim().replace(/\s+/g, "_");
      });
      for (var i = 1; i < rows.length; i++) {
        var obj = {};
        headers.forEach(function (h, idx) {
          obj[h] = rows[i][idx];
        });
        result.push({
          id: String(obj.id || ""),
          day_index: Number(obj.day_index),
          sched_type: String(obj.sched_type || "KBM")
            .toUpperCase()
            .trim(),
          sched_time_in: String(obj.sched_time_in || ""),
          sched_time_out: String(obj.sched_time_out || ""),
        });
      }
    }
    result.sort(function (a, b) {
      if (a.sched_type !== b.sched_type)
        return a.sched_type < b.sched_type ? -1 : 1;
      return a.day_index - b.day_index;
    });
    var targetDate =
      dateStr && /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))
        ? String(dateStr)
        : Utilities.formatDate(
            new Date(),
            Session.getScriptTimeZone(),
            "yyyy-MM-dd",
          );
    var isExamPeriod = getData(EXAM_SHEET.PERIODS).some(function (p) {
      var ps = String(p.date_start || ""),
        pe = String(p.date_end || "");
      return ps && pe && targetDate >= ps && targetDate <= pe;
    });
    return {
      status: "success",
      data: result,
      is_exam_period: isExamPeriod,
      active_type: isExamPeriod ? "UJIAN" : "KBM",
    };
  } catch (e) {
    console.error("getAttendanceSchedTemplates error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function saveAttendanceSchedTemplate(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role).toLowerCase() !== "admin")
      return {
        status: "error",
        message: "Hanya Admin yang dapat mengatur jam jadwal.",
      };
    var dayIndex = parseInt(String((payload && payload.day_index) || ""), 10);
    var schedType = String((payload && payload.sched_type) || "")
      .toUpperCase()
      .trim();
    var schedTimeIn = String((payload && payload.sched_time_in) || "").trim();
    var schedTimeOut = String((payload && payload.sched_time_out) || "").trim();
    var applyDate = String((payload && payload.apply_date) || "").trim();
    if (isNaN(dayIndex) || dayIndex < 1 || dayIndex > 6)
      return { status: "error", message: "Hari tidak valid." };
    if (schedType !== "KBM" && schedType !== "UJIAN")
      return { status: "error", message: "Tipe jadwal tidak valid." };
    var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!rTime.test(schedTimeIn) || !rTime.test(schedTimeOut))
      return {
        status: "error",
        message: "Format jam tidak valid. Gunakan HH:mm.",
      };
    var inMins =
      parseInt(schedTimeIn.split(":")[0], 10) * 60 +
      parseInt(schedTimeIn.split(":")[1], 10);
    var outMins =
      parseInt(schedTimeOut.split(":")[0], 10) * 60 +
      parseInt(schedTimeOut.split(":")[1], 10);
    if (outMins <= inMins)
      return {
        status: "error",
        message: "Jam pulang harus lebih akhir dari jam masuk.",
      };
    var sheet = getSheet(SHEET_NAME.ATTENDANCE_SCHED_TEMPLATES);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var colIdx = {};
    headers.forEach(function (h, i) {
      colIdx[h] = i;
    });
    if (colIdx["sched_type"] === undefined) {
      var nc = sheet.getLastColumn() + 1;
      sheet.getRange(1, nc).setValue("sched_type");
      colIdx["sched_type"] = nc - 1;
    }
    var foundRow = -1;
    for (var i = 1; i < rows.length; i++) {
      var rDay = Number(
        rows[i][colIdx["day_index"] !== undefined ? colIdx["day_index"] : 1],
      );
      var rType = String(
        rows[i][
          colIdx["sched_type"] !== undefined ? colIdx["sched_type"] : 2
        ] || "",
      )
        .toUpperCase()
        .trim();
      if (rDay === dayIndex && rType === schedType) {
        foundRow = i + 1;
        break;
      }
    }
    if (foundRow > 0) {
      sheet
        .getRange(foundRow, colIdx["sched_time_in"] + 1)
        .setValue(schedTimeIn);
      sheet
        .getRange(foundRow, colIdx["sched_time_out"] + 1)
        .setValue(schedTimeOut);
    } else {
      var newRow = headers.map(function () {
        return "";
      });
      if (colIdx["id"] !== undefined)
        newRow[colIdx["id"]] = generateId("ASCHT");
      if (colIdx["day_index"] !== undefined)
        newRow[colIdx["day_index"]] = dayIndex;
      if (colIdx["sched_type"] !== undefined)
        newRow[colIdx["sched_type"]] = schedType;
      if (colIdx["sched_time_in"] !== undefined)
        newRow[colIdx["sched_time_in"]] = schedTimeIn;
      if (colIdx["sched_time_out"] !== undefined)
        newRow[colIdx["sched_time_out"]] = schedTimeOut;
      sheet.appendRow(newRow);
    }
    var applyResult = null;
    if (applyDate && /^\d{4}-\d{2}-\d{2}$/.test(applyDate)) {
      applyResult = _applyTemplateToDateInternal(
        schedTimeIn,
        schedTimeOut,
        applyDate,
      );
    }
    var msg =
      foundRow > 0
        ? "Jam jadwal berhasil diperbarui."
        : "Jam jadwal berhasil disimpan.";
    if (applyResult)
      msg +=
        " Diterapkan ke " +
        applyResult.applied +
        " guru" +
        (applyResult.skipped > 0
          ? ", " + applyResult.skipped + " dilewati."
          : ".");
    try { _invalidateDataSnapshot(); } catch(_) {}
    return { status: "success", message: msg };
  } catch (e) {
    console.error("saveAttendanceSchedTemplate error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function deleteAttendanceSchedTemplate(token, id) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role).toLowerCase() !== "admin")
      return {
        status: "error",
        message: "Hanya Admin yang dapat menghapus jam jadwal.",
      };
    var sheet = getSheet(SHEET_NAME.ATTENDANCE_SCHED_TEMPLATES);
    var rows = sheet.getDataRange().getValues();
    var colId = rows[0]
      .map(function (h) {
        return String(h).toLowerCase().trim();
      })
      .indexOf("id");
    if (colId < 0) colId = 0;
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][colId]) === String(id)) {
        sheet.deleteRow(i + 1);
        try { _invalidateDataSnapshot(); } catch(_) {}
        return { status: "success", message: "Jam jadwal berhasil dihapus." };
      }
    }
    return { status: "error", message: "Data tidak ditemukan." };
  } catch (e) {
    console.error("deleteAttendanceSchedTemplate error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function _applyTemplateToDateInternal(schedTimeIn, schedTimeOut, dateStr) {
  var tz = Session.getScriptTimeZone();
  var allUsers = getData(SHEET_NAME.USERS);
  var pickets = getData(SHEET_NAME.PICKET_SCHEDULES);
  var subs = getData(SHEET_NAME.SUBSTITUTES);
  var schedules = getData(SHEET_NAME.SCHEDULES);
  var cfg = _getConfigMap();
  var activeTP = cfg["tahun_pelajaran"] || "",
    activeSem = cfg["semester"] || "";
  var dateObj = new Date(dateStr + "T00:00:00");
  var utcMs = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
  var dayIndex = new Date(utcMs + 7 * 3600000).getDay();
  var userIds = {};
  
  var isExamPeriod = false;
  var activePeriodName = "";
  var examPeriods = getData(EXAM_SHEET.PERIODS);
  for (var i=0; i<examPeriods.length; i++) {
    var p = examPeriods[i];
    var ps = String(p.date_start||"");
    var pe = String(p.date_end||"");
    if (ps && pe && dateStr >= ps && dateStr <= pe) {
      isExamPeriod = true;
      activePeriodName = String(p.name||"").trim();
      break;
    }
  }

  if (isExamPeriod) {
    var proctors = getData(EXAM_SHEET.PROCTORS);
    proctors.forEach(function(p) {
      var pp = String(p.periode_ujian||"").trim();
      var pDate = p.date instanceof Date ? Utilities.formatDate(p.date, tz, "yyyy-MM-dd") : String(p.date||"");
      if ((!pp || pp === activePeriodName) && pDate === dateStr) {
        userIds[String(p.user_id)] = true;
      }
    });
    var committees = getData(EXAM_SHEET.COMMITTEES);
    committees.forEach(function(c) {
      var cp = String(c.periode_ujian||"").trim();
      if (!cp || cp === activePeriodName) {
        userIds[String(c.user_id)] = true;
      }
    });
  }
  pickets.forEach(function (p) {
    if (String(p.day_index).trim() === String(dayIndex))
      userIds[String(p.user_id)] = true;
  });
  subs.forEach(function (s) {
    if (
      String(s.schedule_id) === "PICKET-DUTY" &&
      String(s.date) === dateStr &&
      s.substitute_user_id
    )
      userIds[String(s.substitute_user_id)] = true;
  });
  schedules.forEach(function (s) {
    var sTP = s.tahun_pelajaran || activeTP,
      sSem = s.semester || activeSem;
    if (
      String(s.day_index).trim() === String(dayIndex) &&
      sTP === activeTP &&
      sSem === activeSem
    )
      userIds[String(s.user_id)] = true;
  });
  subs.forEach(function (s) {
    if (
      String(s.schedule_id) !== "PICKET-DUTY" &&
      String(s.date) === dateStr &&
      s.substitute_user_id
    )
      userIds[String(s.substitute_user_id)] = true;
  });
  allUsers.forEach(function (u) {
    if (
      String(u.additional_role || "")
        .trim()
        .toUpperCase() === "KEPALA_SEKOLAH"
    )
      userIds[String(u.id)] = true;
  });
  var attSheet = getSheet(SHEET_NAME.ATTENDANCE);
  var attRows = attSheet.getDataRange().getValues();
  var attHdrs = attRows[0].map(function (h) {
    return String(h).toLowerCase().trim().replace(/\s+/g, "_");
  });
  var attColIdx = {};
  attHdrs.forEach(function (h, i) {
    attColIdx[h] = i;
  });
  var ensureCol = function (c) {
    if (attColIdx[c] !== undefined) return;
    var nc = attSheet.getLastColumn() + 1;
    attSheet.getRange(1, nc).setValue(c);
    attColIdx[c] = nc - 1;
  };
  ensureCol("sched_time_in");
  ensureCol("sched_time_out");
  var applied = 0,
    skipped = 0;
  Object.keys(userIds).forEach(function (uid) {
    var foundRow = -1,
      hasSched = false;
    for (var i = 1; i < attRows.length; i++) {
      var rowUid = String(
        attRows[i][
          attColIdx["user_id"] !== undefined ? attColIdx["user_id"] : 2
        ] || "",
      );
      var rawDate =
        attRows[i][attColIdx["date"] !== undefined ? attColIdx["date"] : 1];
      var rowDate =
        rawDate instanceof Date
          ? Utilities.formatDate(rawDate, tz, "yyyy-MM-dd")
          : String(rawDate || "");
      if (rowUid === uid && rowDate === dateStr) {
        foundRow = i + 1;
        hasSched =
          String(attRows[i][attColIdx["sched_time_in"]] || "").trim() !== "";
        break;
      }
    }
    if (hasSched) {
      skipped++;
      return;
    }
    if (foundRow > 0) {
      attSheet
        .getRange(foundRow, attColIdx["sched_time_in"] + 1)
        .setValue(schedTimeIn);
      attSheet
        .getRange(foundRow, attColIdx["sched_time_out"] + 1)
        .setValue(schedTimeOut);
    } else {
      var nr = attHdrs.map(function () {
        return "";
      });
      if (attColIdx["id"] !== undefined)
        nr[attColIdx["id"]] = generateId("ATT");
      if (attColIdx["date"] !== undefined) nr[attColIdx["date"]] = dateStr;
      if (attColIdx["user_id"] !== undefined) nr[attColIdx["user_id"]] = uid;
      if (attColIdx["sched_time_in"] !== undefined)
        nr[attColIdx["sched_time_in"]] = schedTimeIn;
      if (attColIdx["sched_time_out"] !== undefined)
        nr[attColIdx["sched_time_out"]] = schedTimeOut;
      attSheet.appendRow(nr);
    }
    applied++;
  });
  return { applied: applied, skipped: skipped };
}
function applySchedTemplatesToDate(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role).toLowerCase() !== "admin")
      return {
        status: "error",
        message: "Hanya Admin yang dapat menerapkan jam jadwal.",
      };
    var dateStr = String((payload && payload.date) || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
      return { status: "error", message: "Format tanggal tidak valid." };
    var dateObj = new Date(dateStr + "T00:00:00");
    var utcMs = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
    var dayIndex = new Date(utcMs + 7 * 3600000).getDay();
    var isExamPeriod = getData(EXAM_SHEET.PERIODS).some(function (p) {
      var ps = String(p.date_start || ""),
        pe = String(p.date_end || "");
      return ps && pe && dateStr >= ps && dateStr <= pe;
    });
    var activeType = isExamPeriod ? "UJIAN" : "KBM";
    var templateId = String((payload && payload.template_id) || "").trim();
    var allTemplates = getData(SHEET_NAME.ATTENDANCE_SCHED_TEMPLATES);
    var tpl = templateId
      ? allTemplates.find(function (t) {
          return String(t.id) === templateId;
        })
      : allTemplates.find(function (t) {
          return (
            Number(t.day_index) === dayIndex &&
            String(t.sched_type || "KBM")
              .toUpperCase()
              .trim() === activeType
          );
        });
    if (!tpl) {
      var dayNames = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      return {
        status: "error",
        message:
          "Belum ada jam jadwal " +
          activeType +
          " untuk hari " +
          (dayNames[dayIndex] || dayIndex) +
          ". Atur dulu di tab Atur Jam Jadwal.",
      };
    }
    var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (
      !rTime.test(String(tpl.sched_time_in || "")) ||
      !rTime.test(String(tpl.sched_time_out || ""))
    )
      return { status: "error", message: "Format jam di data tidak valid." };
    var res = _applyTemplateToDateInternal(
      tpl.sched_time_in,
      tpl.sched_time_out,
      dateStr,
    );
    try { _invalidateDataSnapshot(); } catch(_) {}
    return {
      status: "success",
      message:
        "Jam jadwal " +
        activeType +
        " diterapkan: " +
        res.applied +
        " guru diperbarui" +
        (res.skipped > 0
          ? ", " + res.skipped + " dilewati (sudah ada jadwal)."
          : "."),
      applied: res.applied,
      skipped: res.skipped,
    };
  } catch (e) {
    console.error("applySchedTemplatesToDate error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
