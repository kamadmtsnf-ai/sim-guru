function saveAttendanceSched(token, payload) {
  try {
    var caller = verifySession(token);
    if (!caller) {
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    }
    if (String(caller.role || "").toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Hanya Admin yang dapat mengatur jam jadwal.",
      };
    }
    var userId = String(payload.user_id || "").trim();
    var dateStr = String(payload.date || "").trim();
    var schedTimeIn = String(payload.sched_time_in || "").trim();
    var schedTimeOut = String(payload.sched_time_out || "").trim();
    if (!userId || !dateStr) {
      return {
        status: "error",
        message: "Data tidak lengkap (user_id dan date wajib diisi).",
      };
    }
    var TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!TIME_RE.test(schedTimeIn) || !TIME_RE.test(schedTimeOut)) {
      return {
        status: "error",
        message:
          "Format jam jadwal tidak valid. Gunakan format HH:mm (contoh: 07:20).",
      };
    }
    function toMins(t) {
      var m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : -1;
    }
    var inMins = toMins(schedTimeIn);
    var outMins = toMins(schedTimeOut);
    if (outMins <= inMins) {
      return {
        status: "error",
        message: "Jam pulang jadwal harus lebih akhir dari jam masuk jadwal.",
      };
    }
    var sheet = getSheet(SHEET_NAME.ATTENDANCE);
    var rawData = sheet.getDataRange().getValues();
    var headers = rawData[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var colIdx = {};
    headers.forEach(function (h, i) {
      colIdx[h] = i;
    });
    var requiredCols = ["user_id", "date", "sched_time_in", "sched_time_out"];
    var missingCol = requiredCols.find(function (c) {
      return colIdx[c] === undefined;
    });
    if (missingCol) {
      return {
        status: "error",
        message:
          'Struktur sheet Daily_Attendance tidak sesuai (kolom "' +
          missingCol +
          '" tidak ditemukan).',
      };
    }
    var targetRowIndex = -1;
    for (var r = 1; r < rawData.length; r++) {
      var rowUserId = String(rawData[r][colIdx["user_id"]] || "").trim();
      var rowDate = rawData[r][colIdx["date"]];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(
          rowDate,
          Session.getScriptTimeZone(),
          "yyyy-MM-dd",
        );
      } else {
        rowDate = String(rowDate || "").trim();
      }
      if (rowUserId === userId && rowDate === dateStr) {
        targetRowIndex = r;
        break;
      }
    }
    if (targetRowIndex >= 0) {
      var sheetRow = targetRowIndex + 1; 
      sheet
        .getRange(sheetRow, colIdx["sched_time_in"] + 1)
        .setValue(schedTimeIn);
      sheet
        .getRange(sheetRow, colIdx["sched_time_out"] + 1)
        .setValue(schedTimeOut);
    } else {
      var newRow = headers.map(function () {
        return "";
      });
      if (colIdx["id"] !== undefined) {
        newRow[colIdx["id"]] = generateId("ATT");
      }
      newRow[colIdx["user_id"]] = userId;
      newRow[colIdx["date"]] = dateStr;
      newRow[colIdx["sched_time_in"]] = schedTimeIn;
      newRow[colIdx["sched_time_out"]] = schedTimeOut;
      sheet.appendRow(newRow);
    }
    try {
      _invalidateDataSnapshot();
    } catch (_) {
    }
    return { status: "success", message: "Jam jadwal berhasil disimpan." };
  } catch (e) {
    console.error("saveAttendanceSched error: " + e.toString());
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
function saveAttendanceLeave(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var targetUserId = String((payload && payload.user_id) || "").trim();
    var dateStr = String((payload && payload.date) || "").trim();
    var leaveTime = String((payload && payload.leave_time) || "")
      .trim()
      .substring(0, 5);
    var returnTime = String((payload && payload.return_time) || "")
      .trim()
      .substring(0, 5);
    var reason = String((payload && payload.reason) || "")
      .trim()
      .substring(0, 200);
    if (!targetUserId || !dateStr) {
      return { status: "error", message: "user_id dan date wajib diisi." };
    }
    if (!reason) {
      return { status: "error", message: "Keterangan wajib diisi." };
    }
    var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!rTime.test(leaveTime)) {
      return {
        status: "error",
        message: "Format jam keluar tidak valid. Gunakan HH:mm.",
      };
    }
    if (!rTime.test(returnTime)) {
      return {
        status: "error",
        message: "Format jam kembali tidak valid. Gunakan HH:mm.",
      };
    }
    var leaveMins =
      parseInt(leaveTime.split(":")[0], 10) * 60 +
      parseInt(leaveTime.split(":")[1], 10);
    var returnMins =
      parseInt(returnTime.split(":")[0], 10) * 60 +
      parseInt(returnTime.split(":")[1], 10);
    if (returnMins <= leaveMins) {
      return {
        status: "error",
        message: "Jam kembali harus lebih besar dari jam keluar.",
      };
    }
    if (!isAdmin) {
      var targetDayIndex = (function () {
        try {
          var d = new Date(dateStr + "T00:00:00");
          var utc = d.getTime() + d.getTimezoneOffset() * 60000;
          return new Date(utc + 7 * 3600000).getDay();
        } catch (_) {
          return -1;
        }
      })();
      var picketSchedules = getData(SHEET_NAME.PICKET_SCHEDULES);
      var allSubstitutes = getData(SHEET_NAME.SUBSTITUTES);
      var callerIsPicket =
        picketSchedules.some(function (p) {
          return (
            String(p.user_id) === String(user.id) &&
            String(p.day_index).trim() === String(targetDayIndex)
          );
        }) ||
        allSubstitutes.some(function (s) {
          return (
            String(s.substitute_user_id) === String(user.id) &&
            String(s.schedule_id) === "PICKET-DUTY" &&
            String(s.date) === dateStr
          );
        });
      if (callerIsPicket) {
        var callerRec = getData(SHEET_NAME.ATTENDANCE).find(function (a) {
          return (
            String(a.user_id) === String(user.id) && String(a.date) === dateStr
          );
        });
        if (!callerRec || !String(callerRec.time_in || "").trim()) {
          return {
            status: "error",
            message: "Kehadiran piket Anda belum dikonfirmasi admin.",
          };
        }
        var targetIsPicket =
          picketSchedules.some(function (p) {
            return (
              String(p.user_id) === String(targetUserId) &&
              String(p.day_index).trim() === String(targetDayIndex)
            );
          }) ||
          allSubstitutes.some(function (s) {
            return (
              String(s.substitute_user_id) === String(targetUserId) &&
              String(s.schedule_id) === "PICKET-DUTY" &&
              String(s.date) === dateStr
            );
          });
        if (targetIsPicket) {
          return {
            status: "error",
            message:
              "Pencatatan izin keluar guru piket hanya dapat dilakukan oleh admin.",
          };
        }
      } else {
        if (String(targetUserId) !== String(user.id)) {
          return {
            status: "error",
            message:
              "Anda tidak memiliki wewenang untuk mencatat kehadiran guru lain.",
          };
        }
      }
    }
    var attRec = getData(SHEET_NAME.ATTENDANCE).find(function (a) {
      return (
        String(a.user_id) === String(targetUserId) && String(a.date) === dateStr
      );
    });
    if (!attRec || !String(attRec.time_in || "").trim()) {
      return {
        status: "error",
        message:
          "Jam datang guru belum dicatat. Catat jam datang terlebih dahulu.",
      };
    }
    var existingLeaves = getData(SHEET_NAME.ATTENDANCE_LEAVES).filter(
      function (lv) {
        return (
          String(lv.user_id) === String(targetUserId) &&
          String(lv.date) === dateStr
        );
      },
    );
    for (var i = 0; i < existingLeaves.length; i++) {
      var exLv = existingLeaves[i];
      var exLeave = String(exLv.leave_time || "")
        .trim()
        .substring(0, 5);
      var exReturn = String(exLv.return_time || "")
        .trim()
        .substring(0, 5);
      if (!rTime.test(exLeave) || !rTime.test(exReturn)) continue;
      var exLeaveMins =
        parseInt(exLeave.split(":")[0], 10) * 60 +
        parseInt(exLeave.split(":")[1], 10);
      var exReturnMins =
        parseInt(exReturn.split(":")[0], 10) * 60 +
        parseInt(exReturn.split(":")[1], 10);
      if (leaveMins < exReturnMins && returnMins > exLeaveMins) {
        return {
          status: "error",
          message:
            "Rentang waktu tumpang tindih dengan izin keluar yang sudah ada (" +
            exLeave +
            "–" +
            exReturn +
            ").",
        };
      }
    }
    var newId = generateId("LV");
    getSheet(SHEET_NAME.ATTENDANCE_LEAVES).appendRow([
      newId,
      dateStr,
      targetUserId,
      leaveTime,
      returnTime,
      reason,
    ]);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message: "Izin keluar sementara berhasil dicatat.",
      id: newId,
    };
  } catch (e) {
    console.error("saveAttendanceLeave error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
function deleteAttendanceLeave(token, leaveId) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var sheet = getSheet(SHEET_NAME.ATTENDANCE_LEAVES);
    var rows = sheet.getDataRange().getValues();
    var tz = Session.getScriptTimeZone();
    var headers = rows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var colIdx = {};
    headers.forEach(function (h, i) {
      colIdx[h] = i;
    });
    var foundRow = -1;
    var entryUserId = "";
    var entryDate = "";
    for (var i = 1; i < rows.length; i++) {
      var rowId = String(
        rows[i][colIdx["id"] !== undefined ? colIdx["id"] : 0] || "",
      );
      if (rowId === String(leaveId)) {
        foundRow = i + 1; 
        entryUserId = String(
          rows[i][colIdx["user_id"] !== undefined ? colIdx["user_id"] : 2] ||
            "",
        );
        var rawDate =
          rows[i][colIdx["date"] !== undefined ? colIdx["date"] : 1];
        entryDate =
          rawDate instanceof Date
            ? Utilities.formatDate(rawDate, tz, "yyyy-MM-dd")
            : String(rawDate || "");
        break;
      }
    }
    if (foundRow < 0) {
      return { status: "error", message: "Entri izin keluar tidak ditemukan." };
    }
    if (!isAdmin) {
      var targetDayIndex = (function () {
        try {
          var d = new Date(entryDate + "T00:00:00");
          var utc = d.getTime() + d.getTimezoneOffset() * 60000;
          return new Date(utc + 7 * 3600000).getDay();
        } catch (_) {
          return -1;
        }
      })();
      var picketSchedules = getData(SHEET_NAME.PICKET_SCHEDULES);
      var allSubstitutes = getData(SHEET_NAME.SUBSTITUTES);
      var callerIsPicket =
        picketSchedules.some(function (p) {
          return (
            String(p.user_id) === String(user.id) &&
            String(p.day_index).trim() === String(targetDayIndex)
          );
        }) ||
        allSubstitutes.some(function (s) {
          return (
            String(s.substitute_user_id) === String(user.id) &&
            String(s.schedule_id) === "PICKET-DUTY" &&
            String(s.date) === entryDate
          );
        });
      if (!callerIsPicket && String(entryUserId) !== String(user.id)) {
        return {
          status: "error",
          message: "Anda tidak berwenang menghapus entri ini.",
        };
      }
    }
    sheet.deleteRow(foundRow);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message: "Entri izin keluar berhasil dihapus.",
    };
  } catch (e) {
    console.error("deleteAttendanceLeave error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
