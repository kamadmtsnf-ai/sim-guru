function getDailyAttendanceList(token, dateStr) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    var isAdmin = String(user.role).toLowerCase() === "admin";
    var tz = Session.getScriptTimeZone();
    var targetDateStr;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
      targetDateStr = String(dateStr);
    } else {
      targetDateStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    }
    var targetDateObj = new Date(targetDateStr + "T00:00:00");
    var targetDayIndex = (function () {
      var utc =
        targetDateObj.getTime() + targetDateObj.getTimezoneOffset() * 60000;
      var jkt = new Date(utc + 7 * 3600000);
      return jkt.getDay();
    })();
    var allUsers = getData(SHEET_NAME.USERS);
    var picketSchedules = getData(SHEET_NAME.PICKET_SCHEDULES);
    var allSubstitutes = getData(SHEET_NAME.SUBSTITUTES);
    var allSchedules = getData(SHEET_NAME.SCHEDULES);
    var allAttendance = getData(SHEET_NAME.ATTENDANCE);
    var allLeaves = getData(SHEET_NAME.ATTENDANCE_LEAVES);
    var allEventAttendance = getData(EVENT_SHEET.ATTENDANCE);
    var allAllowances = getData("Allowances");
    var allCeremonies = getData(SHEET_NAME.CEREMONY_SCHEDULES) || [];
    var cfg = _getConfigMap();
    var activeTP = cfg["tahun_pelajaran"] || "";
    var activeSem = cfg["semester"] || "";
    function findUser(uid) {
      return allUsers.find(function (u) {
        return String(u.id) === String(uid);
      });
    }
    function findAttendanceRecord(uid, dateS) {
      return (
        allAttendance.find(function (a) {
          return (
            String(a.user_id) === String(uid) &&
            String(a.date) === String(dateS)
          );
        }) || null
      );
    }
    if (!isAdmin) {
      var isPicketOriginal = picketSchedules.some(function (p) {
        return (
          String(p.user_id) === String(user.id) &&
          String(p.day_index).trim() === String(targetDayIndex)
        );
      });
      var isPicketSubstitute = allSubstitutes.some(function (s) {
        if (
          String(s.substitute_user_id) !== String(user.id) ||
          String(s.date) !== targetDateStr
        )
          return false;
        var sid = String(s.schedule_id);
        if (sid === "PICKET-DUTY" || sid === "PIKET") return true;
        return picketSchedules.some(function (p) {
          return String(p.id) === sid;
        });
      });
      var isPicketToday = isPicketOriginal || isPicketSubstitute;
      var isTodayConfirmedPanitia = _examIsConfirmedPanitia_(user.id, targetDateStr);
      if (!isPicketToday && !isTodayConfirmedPanitia) {
        return {
          status: "error",
          message: "Anda tidak memiliki akses ke menu ini.",
        };
      }
      var myAttendance = findAttendanceRecord(user.id, targetDateStr);
      var myHasTimeIn =
        myAttendance &&
        myAttendance.time_in &&
        String(myAttendance.time_in).trim() !== "";
      if (!myHasTimeIn) {
        return {
          status: "error",
          message: isPicketToday
            ? "Kehadiran piket Anda belum dikonfirmasi admin. Hubungi admin untuk konfirmasi terlebih dahulu."
            : "Jam masuk aktual Anda belum diinput admin. Hubungi admin terlebih dahulu.",
        };
      }
    }
    var teacherMap = {}; 
    function addTeacher(uid, roleType) {
      if (!uid || String(uid).trim() === "") return;
      var uidStr = String(uid);
      if (!teacherMap[uidStr]) {
        teacherMap[uidStr] = { role_type: roleType };
      } else {
        var priority = {
          piket: 5,
          pengganti: 4,
          ujian_pengawas: 3,
          ujian_panitia: 2,
          biasa: 1,
        };
        var curPrio = priority[teacherMap[uidStr].role_type] || 0;
        var newPrio = priority[roleType] || 0;
        if (newPrio > curPrio) teacherMap[uidStr].role_type = roleType;
      }
    }
    var substitutedSchedulesToday = {};
    allSubstitutes.forEach(function (s) {
      if (safeDate(s.date) === targetDateStr) {
        substitutedSchedulesToday[String(s.schedule_id)] = true;
      }
    });
    picketSchedules.forEach(function (p) {
      if (String(p.day_index).trim() === String(targetDayIndex)) {
        if (
          !substitutedSchedulesToday[String(p.id)] &&
          !substitutedSchedulesToday["PICKET-DUTY"] &&
          !substitutedSchedulesToday["PIKET"]
        ) {
          addTeacher(p.user_id, "piket");
        }
      }
    });
    allSubstitutes.forEach(function (s) {
      if (safeDate(s.date) === targetDateStr) {
        var sid = String(s.schedule_id);
        var isPicketSub = sid === "PICKET-DUTY" || sid === "PIKET";
        if (!isPicketSub) {
          isPicketSub = picketSchedules.some(function (p) {
            return String(p.id) === sid;
          });
        }
        if (isPicketSub) {
          addTeacher(s.substitute_user_id, "pengganti");
        }
      }
    });
    allSchedules.forEach(function (s) {
      var isToday = String(s.day_index).trim() === String(targetDayIndex);
      var sTP = s.tahun_pelajaran || activeTP;
      var sSem = s.semester || activeSem;
      if (isToday && sTP === activeTP && sSem === activeSem) {
        if (!substitutedSchedulesToday[String(s.id)]) {
          addTeacher(s.user_id, "biasa");
        }
      }
    });
    allSubstitutes.forEach(function (s) {
      var sid = String(s.schedule_id);
      var isPicketSub =
        sid === "PICKET-DUTY" ||
        sid === "PIKET" ||
        picketSchedules.some(function (p) {
          return String(p.id) === sid;
        });
      if (!isPicketSub && safeDate(s.date) === targetDateStr) {
        if (
          s.substitute_user_id &&
          String(s.substitute_user_id).trim() !== ""
        ) {
          addTeacher(s.substitute_user_id, "biasa");
        }
      }
    });
    var examPeriods = getData(EXAM_SHEET.PERIODS);
    var activePeriod = null;
    examPeriods.forEach(function (p) {
      var ps = String(p.date_start || "");
      var pe = String(p.date_end || "");
      if (ps && pe && targetDateStr >= ps && targetDateStr <= pe) {
        activePeriod = p;
      }
    });
    if (activePeriod) {
      var examSessions = getData(EXAM_SHEET.SESSIONS).filter(function (s) {
        return (
          String(s.period_id) === String(activePeriod.id) &&
          safeDate(s.date) === targetDateStr
        );
      });
      var todaySessionIds = {};
      examSessions.forEach(function (s) {
        todaySessionIds[String(s.id)] = true;
      });
      var examRooms = getData(EXAM_SHEET.ROOMS).filter(function (r) {
        return todaySessionIds[String(r.session_id)];
      });
      var todayRoomIds = {};
      examRooms.forEach(function (r) {
        todayRoomIds[String(r.id)] = true;
      });
      var examSupervisors = getData(EXAM_SHEET.SUPERVISORS).filter(
        function (sup) {
          return (
            todayRoomIds[String(sup.room_id)] && String(sup.status) === "active"
          );
        },
      );
      examSupervisors.forEach(function (sup) {
        addTeacher(sup.user_id, "ujian_pengawas");
      });
      var examCommittee = getData(EXAM_SHEET.COMMITTEE).filter(function (c) {
        return (
          String(c.period_id) === String(activePeriod.id) &&
          safeDate(c.date) === targetDateStr &&
          String(c.status) === "active"
        );
      });
      examCommittee.forEach(function (c) {
        addTeacher(c.user_id, "ujian_panitia");
      });
    }
    allCeremonies.forEach(function (c) {
      if (safeDate(c.date) === targetDateStr) {
        addTeacher(c.user_id, "biasa");
      }
    });
    var kepalaSekolahUserIds = {};
    allAllowances.forEach(function (a) {
      var dName = String(a.duty_name || "").toLowerCase();
      if (
        dName.indexOf("kepala madrasah") !== -1 ||
        dName.indexOf("kepala sekolah") !== -1
      ) {
        if (a.user_id && String(a.user_id).trim() !== "") {
          kepalaSekolahUserIds[String(a.user_id)] = true;
          addTeacher(a.user_id, "biasa");
        }
      }
    });
    allAttendance.forEach(function (a) {
      if (
        safeDate(a.date) === targetDateStr &&
        String(a.extra_attendee || "").toLowerCase() === "true" &&
        a.user_id &&
        String(a.user_id).trim() !== ""
      ) {
        addTeacher(a.user_id, "biasa");
      }
    });
    allEventAttendance.forEach(function (ea) {
      if (
        safeDate(ea.date) === targetDateStr &&
        ea.user_id &&
        String(ea.user_id).trim() !== ""
      ) {
        addTeacher(ea.user_id, "biasa");
      }
    });
    var picketUserIds = {}; 
    picketSchedules.forEach(function (p) {
      if (String(p.day_index).trim() === String(targetDayIndex)) {
        picketUserIds[String(p.user_id)] = true;
      }
    });
    allSubstitutes.forEach(function (s) {
      var sid = String(s.schedule_id);
      var isPicketSub =
        sid === "PICKET-DUTY" ||
        sid === "PIKET" ||
        picketSchedules.some(function (p) {
          return String(p.id) === sid;
        });
      if (isPicketSub && safeDate(s.date) === targetDateStr) {
        picketUserIds[String(s.substitute_user_id)] = true;
      }
    });
    (function () {
      try {
        var needsApply = Object.keys(teacherMap).some(function (uid) {
          var rec = allAttendance.find(function (a) {
            return (
              String(a.user_id) === uid && safeDate(a.date) === targetDateStr
            );
          });
          return !rec || !String(rec.sched_time_in || "").trim();
        });
        if (!needsApply) return; 
        var examPeriods2 = getData(EXAM_SHEET.PERIODS);
        var isExam2 = examPeriods2.some(function (p) {
          var ps = String(p.date_start || ""),
            pe = String(p.date_end || "");
          return ps && pe && targetDateStr >= ps && targetDateStr <= pe;
        });
        var activeType2 = isExam2 ? "UJIAN" : "KBM";
        var allTpl = getData(SHEET_NAME.ATTENDANCE_SCHED_TEMPLATES);
        var tpl = allTpl.find(function (t) {
          return (
            Number(t.day_index) === targetDayIndex &&
            String(t.sched_type || "")
              .toUpperCase()
              .trim() === activeType2
          );
        });
        if (!tpl) return; 
        var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
        var schedIn = safeTime(tpl.sched_time_in).substring(0, 5);
        var schedOut = safeTime(tpl.sched_time_out).substring(0, 5);
        if (!rTime.test(schedIn) || !rTime.test(schedOut)) return; 
        var attSheet = getSheet(SHEET_NAME.ATTENDANCE);
        var attRows = attSheet.getDataRange().getValues();
        var attHdrs = attRows[0].map(function (h) {
          return String(h).toLowerCase().trim().replace(/\s+/g, "_");
        });
        var attCI = {};
        attHdrs.forEach(function (h, i) {
          attCI[h] = i;
        });
        var ensureCol2 = function (c) {
          if (attCI[c] !== undefined) return;
          var nc = attSheet.getLastColumn() + 1;
          attSheet.getRange(1, nc).setValue(c);
          attCI[c] = nc - 1;
        };
        ensureCol2("sched_time_in");
        ensureCol2("sched_time_out");
        var tz2 = Session.getScriptTimeZone();
        Object.keys(teacherMap).forEach(function (uid) {
          var foundRow = -1,
            hasSched = false,
            isExtra = false;
          for (var i = 1; i < attRows.length; i++) {
            var rowUid = String(
              attRows[i][
                attCI["user_id"] !== undefined ? attCI["user_id"] : 2
              ] || "",
            );
            var rawDate =
              attRows[i][attCI["date"] !== undefined ? attCI["date"] : 1];
            var rowDate =
              rawDate instanceof Date
                ? Utilities.formatDate(rawDate, tz2, "yyyy-MM-dd")
                : String(rawDate || "");
            if (rowUid === uid && rowDate === targetDateStr) {
              foundRow = i + 1;
              hasSched =
                String(attRows[i][attCI["sched_time_in"]] || "").trim() !== "";
              isExtra =
                String(
                  attRows[i][
                    attCI["extra_attendee"] !== undefined
                      ? attCI["extra_attendee"]
                      : -1
                  ] || "",
                ).toLowerCase() === "true";
              break;
            }
          }
          if (hasSched) return; 
          if (foundRow > 0) {
            attSheet
              .getRange(foundRow, attCI["sched_time_in"] + 1)
              .setValue(schedIn);
            attSheet
              .getRange(foundRow, attCI["sched_time_out"] + 1)
              .setValue(schedOut);
          } else {
            var nr = attHdrs.map(function () {
              return "";
            });
            if (attCI["id"] !== undefined) nr[attCI["id"]] = generateId("ATT");
            if (attCI["date"] !== undefined) nr[attCI["date"]] = targetDateStr;
            if (attCI["user_id"] !== undefined) nr[attCI["user_id"]] = uid;
            if (attCI["sched_time_in"] !== undefined)
              nr[attCI["sched_time_in"]] = schedIn;
            if (attCI["sched_time_out"] !== undefined)
              nr[attCI["sched_time_out"]] = schedOut;
            attSheet.appendRow(nr);
          }
        });
        allAttendance = getData(SHEET_NAME.ATTENDANCE);
        allLeaves = getData(SHEET_NAME.ATTENDANCE_LEAVES);
      } catch (autoApplyErr) {
        console.warn(
          "getDailyAttendanceList auto-apply warning: " + autoApplyErr,
        );
      }
    })();
    var now = new Date();
    var nowMinutes = (function () {
      var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      var jkt = new Date(utcMs + 7 * 3600000);
      return jkt.getHours() * 60 + jkt.getMinutes();
    })();
    var list = [];
    Object.keys(teacherMap).forEach(function (uid) {
      var roleInfo = teacherMap[uid];
      var userObj = findUser(uid);
      if (!userObj) return; 
      var isKepalaSekolah = !!kepalaSekolahUserIds[uid];
      var roleType = roleInfo.role_type;
      var rec = findAttendanceRecord(uid, targetDateStr);
      var schedTimeIn = rec ? safeTime(rec.sched_time_in).substring(0, 5) : "";
      var schedTimeOut = rec
        ? safeTime(rec.sched_time_out).substring(0, 5)
        : "";
      var timeIn = rec ? safeTime(rec.time_in).substring(0, 5) : "";
      var timeOut = rec ? safeTime(rec.time_out).substring(0, 5) : "";
      var isExtraAttendee =
        rec && String(rec.extra_attendee || "").toLowerCase() === "true";
      var canInputSched = isAdmin;
      var canInputTimeIn = false;
      var timeInBlockReason = "";
      if (timeIn && timeIn !== "") {
        canInputTimeIn = false;
        timeInBlockReason = "Jam datang sudah dicatat.";
      } else if (!schedTimeIn || schedTimeIn === "") {
        if (isExtraAttendee && isAdmin) {
          canInputTimeIn = false;
          timeInBlockReason =
            "Gunakan tombol Detail untuk catat jam datang guru tambahan.";
        } else {
          canInputTimeIn = false;
          timeInBlockReason = "Jam jadwal belum diset oleh admin.";
        }
      } else {
        var isPicketEntry = !!picketUserIds[String(uid)]; 
        if (isAdmin) {
          canInputTimeIn = true;
        } else {
          if (isPicketEntry) {
            var isSelf = String(uid) === String(user.id);
            var hasTeachingScheduleToday =
              isSelf &&
              allSchedules.some(function (s) {
                var sTP = s.tahun_pelajaran || activeTP;
                var sSem = s.semester || activeSem;
                return (
                  String(s.user_id).trim() === String(user.id) &&
                  String(s.day_index).trim() === String(targetDayIndex) &&
                  sTP === activeTP &&
                  sSem === activeSem
                );
              });
            if (hasTeachingScheduleToday) {
              canInputTimeIn = true;
            } else {
              canInputTimeIn = false;
              timeInBlockReason = "Hanya admin yang dapat mencatat.";
            }
          } else {
            // Panitia ujian terkonfirmasi hanya boleh mencatat jam pengawas ujian
            if (isTodayConfirmedPanitia && roleType === 'ujian_pengawas') {
              canInputTimeIn = true;
            } else if (!isTodayConfirmedPanitia) {
              canInputTimeIn = true;
            } else {
              canInputTimeIn = false;
              timeInBlockReason = "Panitia ujian hanya dapat mencatat jam pengawas ujian.";
            }
          }
        }
      }
      var canInputTimeOut = false;
      var timeOutBlockReason = "";
      if (!timeIn || timeIn === "") {
        canInputTimeOut = false;
        timeOutBlockReason = timeInBlockReason || "Jam datang belum dicatat.";
      } else if (timeOut && timeOut !== "") {
        canInputTimeOut = false;
        timeOutBlockReason = "Jam pulang sudah dicatat.";
      } else if (!schedTimeOut || schedTimeOut === "") {
        canInputTimeOut = false;
        timeOutBlockReason = "Jam jadwal pulang belum diset oleh admin.";
      } else {
        var schedOutMinutes = (function () {
          var m = String(schedTimeOut).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
          if (!m) return -1;
          return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        })();
        var availableFromMinutes =
          schedOutMinutes >= 0 ? schedOutMinutes + 5 : -1;
        if (availableFromMinutes < 0) {
          canInputTimeOut = false;
          timeOutBlockReason = "Format jam jadwal pulang tidak valid.";
        } else if (nowMinutes < availableFromMinutes) {
          var availHour = Math.floor(availableFromMinutes / 60);
          var availMin = availableFromMinutes % 60;
          var availStr =
            String(availHour).padStart(2, "0") +
            ":" +
            String(availMin).padStart(2, "0");
          canInputTimeOut = false;
          timeOutBlockReason = "Tersedia pada pukul " + availStr + ".";
        } else {
          var isPicketEntryOut = !!picketUserIds[String(uid)];
          if (isAdmin) {
            canInputTimeOut = true;
          } else {
            if (isPicketEntryOut) {
              var isSelfOut = String(uid) === String(user.id);
              var hasTeachingScheduleTodayOut =
                isSelfOut &&
                allSchedules.some(function (s) {
                  var sTP = s.tahun_pelajaran || activeTP;
                  var sSem = s.semester || activeSem;
                  return (
                    String(s.user_id).trim() === String(user.id) &&
                    String(s.day_index).trim() === String(targetDayIndex) &&
                    sTP === activeTP &&
                    sSem === activeSem
                  );
                });
              if (hasTeachingScheduleTodayOut) {
                canInputTimeOut = true;
              } else {
                canInputTimeOut = false;
                timeOutBlockReason = "Hanya admin yang dapat mencatat.";
              }
            } else {
              // Panitia ujian terkonfirmasi hanya boleh mencatat jam pengawas ujian
              if (isTodayConfirmedPanitia && roleType === 'ujian_pengawas') {
                canInputTimeOut = true;
              } else if (!isTodayConfirmedPanitia) {
                canInputTimeOut = true;
              } else {
                canInputTimeOut = false;
                timeOutBlockReason = "Panitia ujian hanya dapat mencatat jam pengawas ujian.";
              }
            }
          }
        }
      }
      var leavesForUser = allLeaves
        .filter(function (lv) {
          return (
            String(lv.user_id) === String(uid) &&
            String(lv.date) === targetDateStr
          );
        })
        .map(function (lv) {
          return {
            id: String(lv.id || ""),
            leave_time: String(lv.leave_time || "")
              .trim()
              .substring(0, 5),
            return_time: String(lv.return_time || "")
              .trim()
              .substring(0, 5),
            reason: String(lv.reason || ""),
          };
        });
      var canInputLeave = !!(
        timeIn &&
        timeIn !== "" &&
        (!timeOut || timeOut === "")
      );
      if (canInputLeave && !isAdmin && !!picketUserIds[String(uid)]) {
        canInputLeave = false;
      }
      list.push({
        user_id: String(uid),
        full_name: String(userObj.full_name || ""),
        role_type: roleType,
        isKepalaSekolah: isKepalaSekolah,
        is_extra_attendee: isExtraAttendee,
        extra_notes:
          isExtraAttendee && rec
            ? String(rec.notes || "")
                .replace(/^\[TAMBAH MANUAL\]\s*/, "")
                .trim()
            : "",
        sched_time_in: schedTimeIn,
        sched_time_out: schedTimeOut,
        time_in: timeIn,
        time_out: timeOut,
        canInputSched: canInputSched,
        canInputTimeIn: canInputTimeIn,
        canInputTimeOut: canInputTimeOut,
        timeInBlockReason: timeInBlockReason,
        timeOutBlockReason: timeOutBlockReason,
        canInputLeave: canInputLeave,
        leaves: leavesForUser,
      });
    });
    var rolePriority = {
      piket: 0,
      pengganti: 1,
      ujian_pengawas: 2,
      ujian_panitia: 3,
      biasa: 4,
    };
    list.sort(function (a, b) {
      var pa =
        rolePriority[a.role_type] !== undefined
          ? rolePriority[a.role_type]
          : 99;
      var pb =
        rolePriority[b.role_type] !== undefined
          ? rolePriority[b.role_type]
          : 99;
      if (pa !== pb) return pa - pb;
      return String(a.full_name).localeCompare(String(b.full_name), "id");
    });
    return {
      status: "success",
      date: targetDateStr,
      list: list,
    };
  } catch (e) {
    console.error("getDailyAttendanceList error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
