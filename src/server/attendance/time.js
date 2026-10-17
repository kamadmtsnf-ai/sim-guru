function saveAttendanceTimeIn(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var targetUserId = String((payload && payload.user_id) || "").trim();
    var dateStr = String((payload && payload.date) || "").trim();
    var timeIn = String((payload && payload.time_in) || "").trim();
    if (!targetUserId || !dateStr) {
      return { status: "error", message: "user_id dan date wajib diisi." };
    }
    var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!rTime.test(timeIn)) {
      return {
        status: "error",
        message:
          "Format jam tidak valid. Gunakan format HH:mm (contoh: 07:30).",
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
      var callerIsPicketOriginal = picketSchedules.some(function (p) {
        return (
          String(p.user_id) === String(user.id) &&
          String(p.day_index).trim() === String(targetDayIndex)
        );
      });
      var callerIsPicketSubstitute = allSubstitutes.some(function (s) {
        if (
          String(s.substitute_user_id) !== String(user.id) ||
          String(s.date) !== dateStr
        )
          return false;
        var sid = String(s.schedule_id);
        if (sid === "PICKET-DUTY" || sid === "PIKET") return true;
        return picketSchedules.some(function (p) {
          return String(p.id) === sid;
        });
      });
      var callerIsPicket = callerIsPicketOriginal || callerIsPicketSubstitute;
      if (callerIsPicket) {
        var allAttendance = getData(SHEET_NAME.ATTENDANCE);
        var callerRecord = allAttendance.find(function (a) {
          return (
            String(a.user_id) === String(user.id) && String(a.date) === dateStr
          );
        });
        var callerHasTimeIn =
          callerRecord && String(callerRecord.time_in || "").trim() !== "";
        if (!callerHasTimeIn) {
          return {
            status: "error",
            message:
              "Kehadiran piket Anda belum dikonfirmasi admin. Hubungi admin untuk konfirmasi terlebih dahulu.",
          };
        }
        var targetIsPicketOriginal = picketSchedules.some(function (p) {
          return (
            String(p.user_id) === String(targetUserId) &&
            String(p.day_index).trim() === String(targetDayIndex)
          );
        });
        var targetIsPicketSubstitute = allSubstitutes.some(function (s) {
          if (
            String(s.substitute_user_id) !== String(targetUserId) ||
            String(s.date) !== dateStr
          )
            return false;
          var sid = String(s.schedule_id);
          if (sid === "PICKET-DUTY" || sid === "PIKET") return true;
          return picketSchedules.some(function (p) {
            return String(p.id) === sid;
          });
        });
        var targetIsPicket = targetIsPicketOriginal || targetIsPicketSubstitute;
        if (targetIsPicket) {
          var isSelf = String(targetUserId) === String(user.id);
          if (isSelf) {
            var cfg = _getConfigMap();
            var activeTP = cfg["tahun_pelajaran"] || "";
            var activeSem = cfg["semester"] || "";
            var allSchedules = getData(SHEET_NAME.SCHEDULES);
            var hasTeachingToday = allSchedules.some(function (s) {
              var sTP = s.tahun_pelajaran || activeTP;
              var sSem = s.semester || activeSem;
              return (
                String(s.user_id).trim() === String(user.id) &&
                String(s.day_index).trim() === String(targetDayIndex) &&
                sTP === activeTP &&
                sSem === activeSem
              );
            });
            if (!hasTeachingToday) {
              return {
                status: "error",
                message:
                  "Pencatatan jam kehadiran guru piket hanya dapat dilakukan oleh admin.",
              };
            }
          } else {
            return {
              status: "error",
              message:
                "Pencatatan jam kehadiran guru piket hanya dapat dilakukan oleh admin.",
            };
          }
        }
      } else {
        var isSelfRecord = String(targetUserId) === String(user.id);
        var callerIsPanitia = _examIsConfirmedPanitia_(user.id, dateStr);
        if (callerIsPanitia) {
          // Panitia terkonfirmasi hanya boleh input jam untuk pengawas ujian
          var targetIsExamSupervisor = _isExamSupervisorForDate_(targetUserId, dateStr);
          if (!targetIsExamSupervisor) {
            return {
              status: "error",
              message:
                "Panitia ujian hanya dapat mencatat jam kehadiran pengawas ujian.",
            };
          }
          // Pastikan jam masuk panitia sudah diinput admin (defence-in-depth)
          var callerAttRec = getData(SHEET_NAME.ATTENDANCE).find(function(a) {
            return String(a.user_id) === String(user.id) && String(a.date) === dateStr;
          });
          var callerHasTimeIn = callerAttRec && String(callerAttRec.time_in || "").trim() !== "";
          if (!callerHasTimeIn) {
            return {
              status: "error",
              message:
                "Jam masuk aktual Anda belum diinput admin. Hubungi admin terlebih dahulu.",
            };
          }
        } else if (!isSelfRecord) {
          return {
            status: "error",
            message:
              "Anda tidak memiliki wewenang untuk mencatat kehadiran guru lain.",
          };
        }
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
    ensureCol("sched_time_in");
    ensureCol("time_in");
    var foundRowNum = -1;
    var foundSchedTimeIn = "";
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
      if (rowUserId === targetUserId && rowDateStr === dateStr) {
        foundRowNum = i + 1; 
        var rawSched = rows[i][colIdx["sched_time_in"]];
        foundSchedTimeIn =
          rawSched instanceof Date
            ? Utilities.formatDate(rawSched, tz, "HH:mm")
            : String(rawSched || "")
                .trim()
                .substring(0, 5);
        break;
      }
    }
    if (!foundSchedTimeIn || !rTime.test(foundSchedTimeIn)) {
      return {
        status: "error",
        message: "Jam jadwal masuk belum diatur oleh admin.",
      };
    }
    var schedParts = foundSchedTimeIn.split(":");
    var inParts = timeIn.split(":");
    var schedMinutes =
      parseInt(schedParts[0], 10) * 60 + parseInt(schedParts[1], 10);
    var inMinutes = parseInt(inParts[0], 10) * 60 + parseInt(inParts[1], 10);
    if (inMinutes < schedMinutes) {
      return {
        status: "error",
        message:
          "Jam datang tidak boleh lebih awal dari jadwal masuk (" +
          foundSchedTimeIn +
          ").",
      };
    }
    if (foundRowNum > 0) {
      sheet.getRange(foundRowNum, colIdx["time_in"] + 1).setValue(timeIn);
    } else {
      return {
        status: "error",
        message:
          "Record kehadiran tidak ditemukan. Muat ulang halaman dan coba lagi.",
      };
    }
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return { status: "success", message: "Jam datang berhasil dicatat." };
  } catch (e) {
    console.error("saveAttendanceTimeIn error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
function saveAttendanceTimeOut(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var targetUserId = String((payload && payload.user_id) || "").trim();
    var dateStr = String((payload && payload.date) || "").trim();
    var timeOut = String((payload && payload.time_out) || "").trim();
    if (!targetUserId || !dateStr) {
      return { status: "error", message: "user_id dan date wajib diisi." };
    }
    var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!rTime.test(timeOut)) {
      return {
        status: "error",
        message:
          "Format jam tidak valid. Gunakan format HH:mm (contoh: 14:30).",
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
      var callerIsPicketOriginal = picketSchedules.some(function (p) {
        return (
          String(p.user_id) === String(user.id) &&
          String(p.day_index).trim() === String(targetDayIndex)
        );
      });
      var callerIsPicketSubstitute = allSubstitutes.some(function (s) {
        if (
          String(s.substitute_user_id) !== String(user.id) ||
          String(s.date) !== dateStr
        )
          return false;
        var sid = String(s.schedule_id);
        if (sid === "PICKET-DUTY" || sid === "PIKET") return true;
        return picketSchedules.some(function (p) {
          return String(p.id) === sid;
        });
      });
      var callerIsPicket = callerIsPicketOriginal || callerIsPicketSubstitute;
      if (callerIsPicket) {
        var allAttendanceCheck = getData(SHEET_NAME.ATTENDANCE);
        var callerRecord = allAttendanceCheck.find(function (a) {
          return (
            String(a.user_id) === String(user.id) && String(a.date) === dateStr
          );
        });
        var callerHasTimeIn =
          callerRecord && String(callerRecord.time_in || "").trim() !== "";
        if (!callerHasTimeIn) {
          return {
            status: "error",
            message:
              "Kehadiran piket Anda belum dikonfirmasi admin. Hubungi admin untuk konfirmasi terlebih dahulu.",
          };
        }
        var targetIsPicketOriginal = picketSchedules.some(function (p) {
          return (
            String(p.user_id) === String(targetUserId) &&
            String(p.day_index).trim() === String(targetDayIndex)
          );
        });
        var targetIsPicketSubstitute = allSubstitutes.some(function (s) {
          if (
            String(s.substitute_user_id) !== String(targetUserId) ||
            String(s.date) !== dateStr
          )
            return false;
          var sid = String(s.schedule_id);
          if (sid === "PICKET-DUTY" || sid === "PIKET") return true;
          return picketSchedules.some(function (p) {
            return String(p.id) === sid;
          });
        });
        var targetIsPicket = targetIsPicketOriginal || targetIsPicketSubstitute;
        if (targetIsPicket) {
          var isSelf = String(targetUserId) === String(user.id);
          if (isSelf) {
            var cfg = _getConfigMap();
            var activeTP = cfg["tahun_pelajaran"] || "";
            var activeSem = cfg["semester"] || "";
            var allSchedulesCheck = getData(SHEET_NAME.SCHEDULES);
            var hasTeachingToday = allSchedulesCheck.some(function (s) {
              var sTP = s.tahun_pelajaran || activeTP;
              var sSem = s.semester || activeSem;
              return (
                String(s.user_id).trim() === String(user.id) &&
                String(s.day_index).trim() === String(targetDayIndex) &&
                sTP === activeTP &&
                sSem === activeSem
              );
            });
            if (!hasTeachingToday) {
              return {
                status: "error",
                message:
                  "Pencatatan jam kehadiran guru piket hanya dapat dilakukan oleh admin.",
              };
            }
          } else {
            return {
              status: "error",
              message:
                "Pencatatan jam kehadiran guru piket hanya dapat dilakukan oleh admin.",
            };
          }
        }
      } else {
        var isSelfRecord = String(targetUserId) === String(user.id);
        var callerIsPanitia = _examIsConfirmedPanitia_(user.id, dateStr);
        if (callerIsPanitia) {
          // Panitia terkonfirmasi hanya boleh input jam untuk pengawas ujian
          var targetIsExamSupervisor = _isExamSupervisorForDate_(targetUserId, dateStr);
          if (!targetIsExamSupervisor) {
            return {
              status: "error",
              message:
                "Panitia ujian hanya dapat mencatat jam kehadiran pengawas ujian.",
            };
          }
          // Pastikan jam masuk panitia sudah diinput admin (defence-in-depth)
          var callerAttRec = getData(SHEET_NAME.ATTENDANCE).find(function(a) {
            return String(a.user_id) === String(user.id) && String(a.date) === dateStr;
          });
          var callerHasTimeIn = callerAttRec && String(callerAttRec.time_in || "").trim() !== "";
          if (!callerHasTimeIn) {
            return {
              status: "error",
              message:
                "Jam masuk aktual Anda belum diinput admin. Hubungi admin terlebih dahulu.",
            };
          }
        } else if (!isSelfRecord) {
          return {
            status: "error",
            message:
              "Anda tidak memiliki wewenang untuk mencatat kehadiran guru lain.",
          };
        }
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
    ensureCol("sched_time_out");
    ensureCol("time_in");
    ensureCol("time_out");
    var foundRowNum = -1;
    var foundTimeIn = "";
    var foundSchedTimeOut = "";
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
      if (rowUserId === targetUserId && rowDateStr === dateStr) {
        foundRowNum = i + 1; 
        var rawTimeIn2 = rows[i][colIdx["time_in"]];
        var rawSchedOut = rows[i][colIdx["sched_time_out"]];
        foundTimeIn =
          rawTimeIn2 instanceof Date
            ? Utilities.formatDate(rawTimeIn2, tz, "HH:mm")
            : String(rawTimeIn2 || "")
                .trim()
                .substring(0, 5);
        foundSchedTimeOut =
          rawSchedOut instanceof Date
            ? Utilities.formatDate(rawSchedOut, tz, "HH:mm")
            : String(rawSchedOut || "")
                .trim()
                .substring(0, 5);
        break;
      }
    }
    if (!foundTimeIn || !rTime.test(foundTimeIn)) {
      return {
        status: "error",
        message: "Jam datang belum dicatat. Catat jam datang terlebih dahulu.",
      };
    }
    if (!foundSchedTimeOut || !rTime.test(foundSchedTimeOut)) {
      return {
        status: "error",
        message: "Jam jadwal pulang belum diatur oleh admin.",
      };
    }
    var schedOutParts = foundSchedTimeOut.split(":");
    var schedOutMinutes =
      parseInt(schedOutParts[0], 10) * 60 + parseInt(schedOutParts[1], 10);
    var availableFromMinutes = schedOutMinutes + 5;
    var nowJkt = (function () {
      var now = new Date();
      var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      var jkt = new Date(utcMs + 7 * 3600000);
      return jkt.getHours() * 60 + jkt.getMinutes();
    })();
    if (!isAdmin && nowJkt < availableFromMinutes) {
      var availHour = Math.floor(availableFromMinutes / 60);
      var availMin = availableFromMinutes % 60;
      var availStr =
        String(availHour).padStart(2, "0") +
        ":" +
        String(availMin).padStart(2, "0");
      return {
        status: "error",
        message: "Input jam pulang tersedia pada pukul " + availStr + ".",
      };
    }
    var outParts = timeOut.split(":");
    var outMinutes = parseInt(outParts[0], 10) * 60 + parseInt(outParts[1], 10);
    if (outMinutes > schedOutMinutes) {
      return {
        status: "error",
        message:
          "Jam pulang tidak boleh melebihi jadwal pulang (" +
          foundSchedTimeOut +
          ").",
      };
    }
    if (foundRowNum > 0) {
      sheet.getRange(foundRowNum, colIdx["time_out"] + 1).setValue(timeOut);
    } else {
      var newRowLength = headers.length;
      var newRow = [];
      for (var j = 0; j < newRowLength; j++) newRow.push("");
      if (colIdx["id"] !== undefined) newRow[colIdx["id"]] = generateId("ATT");
      if (colIdx["date"] !== undefined) newRow[colIdx["date"]] = dateStr;
      if (colIdx["user_id"] !== undefined)
        newRow[colIdx["user_id"]] = targetUserId;
      if (colIdx["status"] !== undefined) newRow[colIdx["status"]] = "";
      if (colIdx["time_out"] !== undefined)
        newRow[colIdx["time_out"]] = timeOut;
      sheet.appendRow(newRow);
    }
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return { status: "success", message: "Jam pulang berhasil dicatat." };
  } catch (e) {
    console.error("saveAttendanceTimeOut error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
