function getAttendanceRecord(token, targetUserId, dateStr) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    if (!isAdmin) {
      return {
        status: "error",
        message: "Hanya admin yang dapat memuat detail.",
      };
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
    var result = { time_in: "", time_out: "", status: "" };
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
        var rawTimeIn = rows[i][colIdx["time_in"]];
        var rawTimeOut = rows[i][colIdx["time_out"]];
        result.time_in =
          rawTimeIn instanceof Date
            ? Utilities.formatDate(rawTimeIn, tz, "HH:mm")
            : String(rawTimeIn || "")
                .trim()
                .substring(0, 5);
        result.time_out =
          rawTimeOut instanceof Date
            ? Utilities.formatDate(rawTimeOut, tz, "HH:mm")
            : String(rawTimeOut || "")
                .trim()
                .substring(0, 5);
        result.status = String(rows[i][colIdx["status"]] || "").trim();
        break;
      }
    }
    // Fetch leave entries for this user+date from Attendance_Leaves sheet
    var allLeaves = getData(SHEET_NAME.ATTENDANCE_LEAVES);
    result.leaves = allLeaves
      .filter(function(lv) {
        return String(lv.user_id || "") === String(targetUserId) && String(lv.date || "") === dateStr;
      })
      .map(function(lv) {
        return {
          id:          String(lv.id          || ""),
          leave_time:  String(lv.leave_time  || ""),
          return_time: String(lv.return_time || ""),
          reason:      String(lv.reason      || "")
        };
      });
    return { status: "success", data: result };
  } catch (e) {
    console.error("getAttendanceRecord error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function getMyAttendanceHistory(token, month, year) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var tz = Session.getScriptTimeZone();
    var m = parseInt(month, 10);
    var y = parseInt(year, 10);
    if (isNaN(m) || m < 1 || m > 12 || isNaN(y)) {
      return { status: "error", message: "Parameter bulan/tahun tidak valid." };
    }
    var firstDay = new Date(y, m - 1, 1);
    var lastDay = new Date(y, m, 0); 
    var today = new Date();
    today.setHours(23, 59, 59, 999);
    var upperBound = lastDay < today ? lastDay : today;
    var allAttendance = getData(SHEET_NAME.ATTENDANCE);
    var allLeaves = getData(SHEET_NAME.ATTENDANCE_LEAVES);
    var allSchedules = getData(SHEET_NAME.SCHEDULES);
    var picketSchedules = getData(SHEET_NAME.PICKET_SCHEDULES);
    var allSubstitutes = getData(SHEET_NAME.SUBSTITUTES);
    var allUsers = getData(SHEET_NAME.USERS);
    var allCalendar = getData(SHEET_NAME.CALENDAR);
    var allCeremonies = getData(SHEET_NAME.CEREMONY_SCHEDULES) || [];
    var examCommittee = getData(EXAM_SHEET.COMMITTEE) || [];
    var examSupervisors = getData(EXAM_SHEET.SUPERVISORS) || [];
    var examRooms = getData(EXAM_SHEET.ROOMS) || [];
    var examSessions = getData(EXAM_SHEET.SESSIONS) || [];
    var holidayMap = {};
    var calendarMap = {};
    allCalendar.forEach(function (h) {
      var hDateStr;
      try {
        hDateStr =
          h.date instanceof Date
            ? Utilities.formatDate(h.date, tz, "yyyy-MM-dd")
            : String(h.date || "").substring(0, 10);
      } catch (_) {
        return;
      }
      if (!hDateStr) return;
      var desc = String(h.description || "Event Kalender").trim();
      calendarMap[hDateStr] = desc; 
      if (String(h.is_holiday || "").toLowerCase() === "true") {
        holidayMap[hDateStr] = desc; 
      }
    });
    var cfg = _getConfigMap();
    var activeTP = cfg["tahun_pelajaran"] || "";
    var activeSem = cfg["semester"] || "";
    var userRow = allUsers.find(function (u) {
      return String(u.id) === String(user.id);
    });
    var isKepsek =
      userRow &&
      String(userRow.additional_role || "")
        .trim()
        .toUpperCase() === "KEPALA_SEKOLAH";
    var role = String(userRow ? userRow.role : user.role || "").toLowerCase();
    var transportEnabled = String(cfg["transport_allowance_enabled"] || "false").toLowerCase().trim() === "true";
    var tarifPerKm = Number(cfg["tarif_per_km"] || 0);
    var kmDistance = Number(userRow ? userRow.km_distance : user.km_distance) || 0;
    var myAttendance = allAttendance.filter(function (a) {
      return String(a.user_id) === String(user.id);
    });
    var myCeremonyDates = {};
    allCeremonies.forEach(function (c) {
      if (String(c.user_id) === String(user.id)) {
        myCeremonyDates[safeDate(c.date)] = true;
      }
    });
    var myExamCommDates = {};
    examCommittee.forEach(function (c) {
      if (String(c.user_id) === String(user.id) && String(c.status) !== "CANCELLED") {
        myExamCommDates[safeDate(c.date)] = true;
      }
    });
    var myExamSupvDates = {};
    examSupervisors.forEach(function (sup) {
      if (String(sup.user_id) === String(user.id) && String(sup.status) !== "CANCELLED") {
        var room = examRooms.find(function(r) { return String(r.id) === String(sup.room_id); });
        if (room) {
          var sess = examSessions.find(function(se) { return String(se.id) === String(room.session_id); });
          if (sess) {
            myExamSupvDates[safeDate(sess.date)] = true;
          }
        }
      }
    });
    var myLeaves = allLeaves.filter(function (lv) {
      return String(lv.user_id) === String(user.id);
    });
    function _hasScheduleOnDate(dateStr, dayIndex) {
      if (isKepsek) return true;
      var hasPiket = picketSchedules.some(function (p) {
        return (
          String(p.user_id) === String(user.id) &&
          String(p.day_index).trim() === String(dayIndex)
        );
      });
      if (hasPiket) return true;
      var hasPiketSub = allSubstitutes.some(function (s) {
        return (
          String(s.substitute_user_id) === String(user.id) &&
          String(s.schedule_id) === "PICKET-DUTY" &&
          safeDate(s.date) === dateStr
        );
      });
      if (hasPiketSub) return true;
      var hasMengajar = allSchedules.some(function (s) {
        if (String(s.user_id) !== String(user.id)) return false;
        if (String(s.day_index).trim() !== String(dayIndex)) return false;
        var sTP = s.tahun_pelajaran || activeTP;
        var sSem = s.semester || activeSem;
        return sTP === activeTP && sSem === activeSem;
      });
      if (hasMengajar) return true;
      var hasSub = allSubstitutes.some(function (s) {
        return (
          String(s.substitute_user_id) === String(user.id) &&
          String(s.schedule_id) !== "PICKET-DUTY" &&
          safeDate(s.date) === dateStr
        );
      });
      if (hasSub) return true;
      if (myCeremonyDates[dateStr]) return true;
      if (myExamCommDates[dateStr]) return true;
      if (myExamSupvDates[dateStr]) return true;
      return false;
    }
    var days = [];
    var totalHadir = 0,
      totalTidakHadir = 0,
      totalTerlambat = 0;
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
    for (var day = 1; day <= lastDay.getDate(); day++) {
      var iterDate = new Date(y, m - 1, day);
      if (iterDate > upperBound) break;
      var dateStr = Utilities.formatDate(iterDate, tz, "yyyy-MM-dd");
      var dayIndex = (function () {
        var utc = iterDate.getTime() + iterDate.getTimezoneOffset() * 60000;
        return new Date(utc + 7 * 3600000).getDay();
      })();
      var dowNames = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      var dow = dowNames[iterDate.getDay()];
      var dateFormatted = day + " " + monthNames[iterDate.getMonth()] + " " + y;
      var rec = myAttendance.find(function (a) {
        return safeDate(a.date) === dateStr;
      });
      var hasTimeIn = rec && String(rec.time_in || "").trim() !== "";
      var hasTimeOut = rec && String(rec.time_out || "").trim() !== "";
      if (!hasTimeIn && !hasTimeOut) {
        var holidayDesc = holidayMap[dateStr] || null; 
        var calendarDesc = calendarMap[dateStr] || ""; 
        var isHoliday = !!holidayDesc;
        var hasCalendar = !!calendarDesc;
        if (hasCalendar) {
          days.push({
            date: dateStr,
            date_formatted: dateFormatted,
            dow: dow,
            no_record: true,
            has_schedule: false,
            is_holiday: isHoliday,
            holiday_desc: holidayDesc || "",
            calendar_desc: calendarDesc,
            time_in: "",
            time_out: "",
            sched_time_in: "",
            sched_time_out: "",
            status: "",
            leaves: [],
          });
          continue;
        }
        var hasSchedule = _hasScheduleOnDate(dateStr, dayIndex);
        if (hasSchedule) totalTidakHadir++;
        days.push({
          date: dateStr,
          date_formatted: dateFormatted,
          dow: dow,
          no_record: true,
          has_schedule: hasSchedule,
          is_holiday: false,
          holiday_desc: "",
          calendar_desc: "",
          time_in: "",
          time_out: "",
          sched_time_in: "",
          sched_time_out: "",
          status: "",
          leaves: [],
        });
        continue;
      }
      var timeIn = safeTime(rec.time_in).substring(0, 5);
      var timeOut = safeTime(rec.time_out).substring(0, 5);
      var schedTimeIn = safeTime(rec.sched_time_in).substring(0, 5);
      var status = String(rec.status || "").trim();
      totalHadir++;
      if (timeIn && schedTimeIn && timeIn > schedTimeIn) totalTerlambat++;
      var dayLeaves = myLeaves
        .filter(function (lv) {
          return safeDate(lv.date) === dateStr;
        })
        .map(function (lv) {
          return {
            leave_time: safeTime(lv.leave_time).substring(0, 5),
            return_time: safeTime(lv.return_time).substring(0, 5),
            reason: String(lv.reason || "").trim(),
          };
        });

      var schedTimeOut = safeTime(rec.sched_time_out).substring(0, 5);
      var transportNominal = 0;
      var transportPercentage = 0;
      if (role === "guru" && transportEnabled && timeIn && timeOut) {
        var dAktual = _minutesBetween(timeIn, timeOut);
        var isExtra = String(rec.extra_attendee || "").toLowerCase() === "true";
        var dJadwal = (isExtra && !schedTimeIn) ? dAktual : _minutesBetween(schedTimeIn, schedTimeOut);
        
        var totalLeaveMinutes = 0;
        dayLeaves.forEach(function(lv) {
           totalLeaveMinutes += _minutesBetween(lv.leave_time, lv.return_time);
        });
        
        var dAktualEfektif = Math.max(0, dAktual - totalLeaveMinutes);
        transportPercentage = dJadwal > 0 ? (dAktualEfektif / dJadwal * 100) : 0;
        if (transportPercentage > 100) transportPercentage = 100;
        
        transportNominal = kmDistance * tarifPerKm * (transportPercentage / 100);
      }

      days.push({
        date: dateStr,
        date_formatted: dateFormatted,
        dow: dow,
        no_record: false,
        has_schedule: true,
        is_holiday: !!holidayMap[dateStr],
        holiday_desc: holidayMap[dateStr] || "",
        calendar_desc: calendarMap[dateStr] || "",
        time_in: timeIn,
        time_out: timeOut,
        sched_time_in: schedTimeIn,
        sched_time_out: schedTimeOut,
        status: status,
        leaves: dayLeaves,
        transport_nominal: transportNominal,
        transport_percentage: transportPercentage
      });
    }
    return {
      status: "success",
      days: days,
      summary: {
        total_days: days.length,
        hadir: totalHadir,
        tidak_hadir: totalTidakHadir,
        terlambat: totalTerlambat,
        libur: days.filter(function (d) {
          return !!d.calendar_desc && d.no_record;
        }).length,
      },
    };
  } catch (e) {
    console.error("getMyAttendanceHistory error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
