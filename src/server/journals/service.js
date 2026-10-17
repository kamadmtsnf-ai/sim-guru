function saveTeachingJournal(token, data) {
  const user = verifySession(token);
  if (!user) return { status: "error", message: "Unauthorized" };
  const scheduleId = data.schedule_id;
  const schedules = getData("Schedules");
  const targetSchedule = schedules.find(
    (s) => String(s.id) === String(scheduleId),
  );
  let expectedStd = null;
  if (targetSchedule) {
    const className = targetSchedule.class_name;
    const configData = getData("Config");
    let configMap = {};
    configData.forEach((c) => (configMap[c.key] = c.value));
    const configKey = "std_kelas_" + className;
    const dbTotal = parseInt(configMap[configKey]);
    const inputHadir = parseInt(data.siswa_hadir) || 0;
    const inputAbsen = parseInt(data.siswa_absen) || 0;
    const inputTotal = inputHadir + inputAbsen;
    if (!isNaN(dbTotal)) {
      expectedStd = dbTotal;
      if (inputTotal !== dbTotal) {
        return {
          status: "error",
          code: "STUDENT_COUNT_MISMATCH",
          expected: dbTotal,
          actual: inputTotal,
          message:
            "Validasi Gagal: Total siswa (" +
            inputTotal +
            ") tidak sesuai dengan standar kelas " +
            className +
            " (" +
            dbTotal +
            " siswa). Harap sesuaikan jumlah hadir dan absen.",
        };
      }
    }
  }
  // H-MINUS-1: Tentukan tz, targetDate, inputType, dan jtmMultiplier (dilakukan SEBELUM validasi piket)
  const tz = Session.getScriptTimeZone();
  const todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  const _h1Yesterday = new Date();
  _h1Yesterday.setDate(_h1Yesterday.getDate() - 1);
  const yesterdayStr = Utilities.formatDate(_h1Yesterday, tz, "yyyy-MM-dd");
  let targetDateStr = todayStr;
  if (data.date && /^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) {
    targetDateStr = String(data.date);
  }
  let inputType = "SAME_DAY";
  let jtmMultiplier = 1.0;
  if (targetDateStr === todayStr) {
    inputType = "SAME_DAY";
    jtmMultiplier = 1.0;
  } else if (targetDateStr === yesterdayStr) {
    const _h1CfgMap = _getConfigMap();
    if (String(_h1CfgMap["allow_h_minus_1_journal"] || "").toLowerCase() === "true") {
      inputType = "H_MINUS_1";
      jtmMultiplier = 0.8;
    } else {
      return {
        status: "error",
        code: "H1_DISABLED",
        message: "Fitur input jurnal H-1 tidak aktif. Hubungi Admin untuk mengaktifkannya.",
      };
    }
  } else if (targetDateStr < todayStr) {
    return {
      status: "error",
      code: "DATE_EXPIRED",
      message: "Batas waktu input jurnal telah berakhir. Anda hanya dapat mengisi jurnal pada hari yang sama atau H-1 (jika fitur aktif).",
    };
  } else {
    return {
      status: "error",
      code: "FUTURE_DATE",
      message: "Tidak dapat mengisi jurnal untuk tanggal yang belum terjadi.",
    };
  }
  // H-MINUS-1: Verifikasi jadwal milik guru yang login, ATAU guru ini adalah pengganti kemarin
  if (targetSchedule && String(targetSchedule.user_id).trim() !== String(user.id).trim()) {
    // Izinkan jika guru ini adalah pengganti untuk jadwal ini pada tanggal yang relevan:
    // - SAME_DAY → cek tanggal hari ini (todayStr)
    // - H_MINUS_1 → cek tanggal kemarin (yesterdayStr)
    const _ownSubs = getData("Substitutes");
    const _subRefDate = inputType === "H_MINUS_1" ? yesterdayStr : todayStr;
    const _isSubForSchedule = _ownSubs.some(function(sub) {
      return (
        safeDate(sub.date) === _subRefDate &&
        String(sub.schedule_id) === String(scheduleId) &&
        String(sub.substitute_user_id).trim() === String(user.id).trim()
      );
    });
    if (!_isSubForSchedule) {
      return {
        status: "error",
        code: "UNAUTHORIZED_SCHEDULE",
        message: "Jadwal ini bukan milik Anda.",
      };
    }
  }
  // H-MINUS-1: Untuk jurnal H-1, validasi kehadiran kemarin dan status substitusi
  if (inputType === "H_MINUS_1" && targetSchedule) {
    // 1. Kehadiran kemarin harus sudah dikonfirmasi di Daily_Attendance
    const _h1Att = getData("Daily_Attendance");
    const _h1AttConfirmed = _h1Att.some(function(a) {
      return (
        String(a.user_id).trim() === String(user.id).trim() &&
        safeDate(a.date) === yesterdayStr &&
        // Terima: schedule_id cocok, ATAU konfirmasi umum (schedule_id kosong)
        (String(a.schedule_id || "") === String(scheduleId) ||
         String(a.schedule_id || "").trim() === "")
      );
    });
    if (!_h1AttConfirmed) {
      return {
        status: "error",
        code: "H1_NOT_CONFIRMED",
        message: "Kehadiran Anda pada jadwal tersebut (kemarin, " + yesterdayStr + ") belum dikonfirmasi oleh Admin atau Guru Piket. Hubungi Admin untuk konfirmasi terlebih dahulu.",
      };
    }
    // 2. Jadwal kemarin tidak boleh sudah digantikan guru lain
    //    (tidak berlaku jika guru ini adalah pengganti untuk jadwal ini)
    const _h1Subs = getData("Substitutes");
    const _isUserSubForThisSchedule = _h1Subs.some(function(sub) {
      return (
        safeDate(sub.date) === yesterdayStr &&
        String(sub.schedule_id) === String(scheduleId) &&
        String(sub.substitute_user_id).trim() === String(user.id).trim()
      );
    });
    if (!_isUserSubForThisSchedule) {
      const _h1IsReplaced = _h1Subs.some(function(sub) {
        return (
          safeDate(sub.date) === yesterdayStr &&
          String(sub.schedule_id) === String(scheduleId) &&
          String(sub.original_user_id).trim() === String(user.id).trim()
        );
      });
      if (_h1IsReplaced) {
        return {
          status: "error",
          code: "H1_REPLACED",
          message: "Jadwal Anda pada kemarin (" + yesterdayStr + ") telah digantikan oleh guru lain. Jurnal H-1 tidak dapat diisi.",
        };
      }
    }
  }
  // Validasi rekap absensi siswa dari guru piket.
  // SAME_DAY  → cari rekap tanggal hari ini (todayStr).
  // H_MINUS_1 → cari rekap tanggal kemarin (yesterdayStr); jika tidak ada, lewati validasi ini.
  if (targetSchedule) {
    const _saClassName = String(targetSchedule.class_name || "").trim();
    const _saRefDate   = inputType === "H_MINUS_1" ? yesterdayStr : todayStr;
    const _saAllData = getData("Student_Attendance");
    const _saRekap = _saAllData.find(function(r) {
      return String(r.class_name || "").trim() === _saClassName && safeDate(r.date) === _saRefDate;
    });
    if (_saRekap) {
      const _saExpHadir = parseInt(_saRekap.hadir) || 0;
      const _saExpAbsen = (parseInt(_saRekap.sakit) || 0) + (parseInt(_saRekap.izin) || 0) + (parseInt(_saRekap.alpa) || 0);
      const _saActHadir = parseInt(data.siswa_hadir) || 0;
      const _saActAbsen = parseInt(data.siswa_absen) || 0;
      if (_saActHadir !== _saExpHadir || _saActAbsen !== _saExpAbsen) {
        const _saDateLabel = inputType === "H_MINUS_1" ? "kemarin (" + yesterdayStr + ")" : "hari ini";
        return {
          status: "error",
          code: "STUDENT_ATTENDANCE_MISMATCH",
          class_name: _saClassName,
          expected_hadir: _saExpHadir,
          expected_absen: _saExpAbsen,
          actual_hadir: _saActHadir,
          actual_absen: _saActAbsen,
          rekap_detail: {
            sakit: parseInt(_saRekap.sakit) || 0,
            izin:  parseInt(_saRekap.izin)  || 0,
            alpa:  parseInt(_saRekap.alpa)  || 0
          },
          message: "Data absensi tidak sesuai rekap guru piket " + _saDateLabel + " untuk kelas " + _saClassName +
            ". Rekap piket — Hadir: " + _saExpHadir + ", Sakit+Izin+Alpa: " + _saExpAbsen +
            ". Anda mengisi — Hadir: " + _saActHadir + ", Absen: " + _saActAbsen + "."
        };
      }
    }
  }
  const existingLogs = getData("Teaching_Logs");
  const isDuplicate = existingLogs.some((log) => {
    const logDate = Utilities.formatDate(new Date(log.date), tz, "yyyy-MM-dd");
    return (
      String(log.schedule_id) === String(scheduleId) &&
      String(log.user_id) === String(user.id) &&
      logDate === targetDateStr
    );
  });
  if (isDuplicate) {
    return {
      status: "error",
      code: "DUPLICATE",
      message:
        "Jurnal untuk jadwal ini sudah pernah diisi pada tanggal yang sama. Anda tidak dapat mengisi jurnal yang sama dua kali.",
    };
  }
  const sheet = getSheet("Teaching_Logs");
  const newId = generateId("LOG");
  const now = new Date();
  const timeStr = Utilities.formatDate(now, tz, "HH:mm:ss");
  let jtmVal = targetSchedule ? Number(targetSchedule.jtm_val) : 0;
  const jtmAdjustment = _jtmReadAdjustment_("KBM", scheduleId);
  if (jtmAdjustment) {
    const adjDateStr =
      jtmAdjustment.date instanceof Date
        ? Utilities.formatDate(jtmAdjustment.date, tz, "yyyy-MM-dd")
        : String(jtmAdjustment.date);
    const storedAdjusted = jtmAdjustment.adjusted_jtm;
    if (
      adjDateStr === targetDateStr &&
      storedAdjusted !== null &&
      storedAdjusted !== undefined &&
      storedAdjusted !== "" &&
      !isNaN(Number(storedAdjusted))
    ) {
      jtmVal = Number(storedAdjusted);
    }
  }
  // H-MINUS-1: Terapkan multiplier JTM (0.8 untuk H-1, 1.0 untuk hari yang sama)
  jtmVal = Math.round(jtmVal * jtmMultiplier * 10) / 10;
  sheet.appendRow([
    newId,
    data.schedule_id,
    user.id,
    targetDateStr,
    data.material,
    data.siswa_hadir,
    data.siswa_absen,
    data.notes,
    jtmVal,
    timeStr,
    inputType,
  ]);
  _invalidateDataSnapshot();
  return {
    status: "success",
    log_id: newId,
    expected_std: expectedStd,
  };
}
function getClassExpectedStudents(token, scheduleId) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    const schedules = getData("Schedules");
    const sched = schedules.find((s) => String(s.id) === String(scheduleId));
    if (!sched) return { status: "success", expected: null, class_name: null };
    const configData = getData("Config");
    let configMap = {};
    configData.forEach((c) => (configMap[c.key] = c.value));
    const dbTotal = parseInt(configMap["std_kelas_" + sched.class_name]);
    return {
      status: "success",
      expected: isNaN(dbTotal) ? null : dbTotal,
      class_name: sched.class_name,
    };
  } catch (e) {
    return { status: "error", message: "Server Error: " + e.toString() };
  }
}
// H-MINUS-1: Mengembalikan rekap absensi piket untuk kelas tertentu pada tanggal tertentu.
// Digunakan oleh frontend saat membuka modal jurnal H-1 agar Guru dapat melihat
// dan menyesuaikan data hadir/absen sesuai rekap piket kemarin.
function getPicketRekapForDate(token, scheduleId, dateStr) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    if (!scheduleId || !dateStr) return { status: "success", rekap: null };
    const schedules = getData("Schedules");
    const sched = schedules.find(function(s) { return String(s.id) === String(scheduleId); });
    if (!sched) return { status: "success", rekap: null };
    const className = String(sched.class_name || "").trim();
    // Normalkan dateStr — hanya terima format yyyy-MM-dd
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return { status: "success", rekap: null };
    const saData = getData("Student_Attendance");
    const rekap = saData.find(function(r) {
      return String(r.class_name || "").trim() === className && safeDate(r.date) === String(dateStr);
    });
    if (!rekap) return { status: "success", rekap: null, class_name: className };
    const hadir  = parseInt(rekap.hadir)  || 0;
    const sakit  = parseInt(rekap.sakit)  || 0;
    const izin   = parseInt(rekap.izin)   || 0;
    const alpa   = parseInt(rekap.alpa)   || 0;
    const absen  = sakit + izin + alpa;
    return {
      status: "success",
      rekap: {
        class_name: className,
        date: String(dateStr),
        hadir:  hadir,
        absen:  absen,
        sakit:  sakit,
        izin:   izin,
        alpa:   alpa,
        total:  hadir + absen
      }
    };
  } catch (e) {
    return { status: "error", message: "Server Error: " + e.toString() };
  }
}
function updateTeachingLog(token, payload) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    const logId = payload && payload.log_id;
    if (!logId) return { status: "error", message: "Log ID wajib diisi." };
    const sheet = getSheet("Teaching_Logs");
    const range = sheet.getDataRange();
    const values = range.getValues();
    const header = values[0].map((h) => String(h).trim());
    const idCol = header.indexOf("log_id");
    const schedCol = header.indexOf("schedule_id");
    const userCol = header.indexOf("user_id");
    const dateCol = header.indexOf("date");
    const matCol = header.indexOf("materi");
    const hadirCol = header.indexOf("siswa_hadir");
    const absenCol = header.indexOf("siswa_absen");
    const notesCol = header.indexOf("notes");
    if (
      [idCol, schedCol, userCol, matCol, hadirCol, absenCol, notesCol].some(
        (c) => c < 0,
      )
    ) {
      return {
        status: "error",
        message: "Struktur sheet Teaching_Logs tidak sesuai.",
      };
    }
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(logId).trim()) {
        rowIndex = i;
        break;
      }
    }
    if (rowIndex === -1)
      return { status: "error", message: "Jurnal tidak ditemukan." };
    const row = values[rowIndex];
    const isOwner = String(row[userCol]).trim() === String(user.id).trim();
    const isAdmin = String(user.role).toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return {
        status: "error",
        message: "Anda tidak memiliki akses untuk mengubah jurnal ini.",
      };
    }
    const schedId = row[schedCol];
    const schedules = getData("Schedules");
    const sched = schedules.find((s) => String(s.id) === String(schedId));
    const inputHadir = parseInt(payload.siswa_hadir) || 0;
    const inputAbsen = parseInt(payload.siswa_absen) || 0;
    const inputTotal = inputHadir + inputAbsen;
    if (sched) {
      const configData = getData("Config");
      let configMap = {};
      configData.forEach((c) => (configMap[c.key] = c.value));
      const dbTotal = parseInt(configMap["std_kelas_" + sched.class_name]);
      if (!isNaN(dbTotal) && inputTotal !== dbTotal) {
        return {
          status: "error",
          code: "STUDENT_COUNT_MISMATCH",
          expected: dbTotal,
          actual: inputTotal,
          message:
            "Validasi Gagal: Total siswa (" +
            inputTotal +
            ") tidak sesuai dengan standar kelas " +
            sched.class_name +
            " (" +
            dbTotal +
            " siswa). Harap sesuaikan jumlah hadir dan absen.",
        };
      }
    }
    // Validasi rekap absensi siswa dari guru piket
    if (sched) {
      const _saClassName2 = String(sched.class_name || "").trim();
      const _saTz2 = Session.getScriptTimeZone();
      const _saLogDate = safeDate(values[rowIndex][dateCol]);
      const _saAllData2 = getData("Student_Attendance");
      const _saRekap2 = _saAllData2.find(function(r) {
        return String(r.class_name || "").trim() === _saClassName2 && safeDate(r.date) === _saLogDate;
      });
      if (_saRekap2) {
        const _saExpHadir2 = parseInt(_saRekap2.hadir) || 0;
        const _saExpAbsen2 = (parseInt(_saRekap2.sakit) || 0) + (parseInt(_saRekap2.izin) || 0) + (parseInt(_saRekap2.alpa) || 0);
        const _saActHadir2 = parseInt(payload.siswa_hadir) || 0;
        const _saActAbsen2 = parseInt(payload.siswa_absen) || 0;
        if (_saActHadir2 !== _saExpHadir2 || _saActAbsen2 !== _saExpAbsen2) {
          return {
            status: "error",
            code: "STUDENT_ATTENDANCE_MISMATCH",
            class_name: _saClassName2,
            expected_hadir: _saExpHadir2,
            expected_absen: _saExpAbsen2,
            actual_hadir: _saActHadir2,
            actual_absen: _saActAbsen2,
            rekap_detail: {
              sakit: parseInt(_saRekap2.sakit) || 0,
              izin:  parseInt(_saRekap2.izin)  || 0,
              alpa:  parseInt(_saRekap2.alpa)  || 0
            },
            message: "Data absensi tidak sesuai rekap guru piket untuk kelas " + _saClassName2 +
              ". Rekap piket — Hadir: " + _saExpHadir2 + ", Sakit+Izin+Alpa: " + _saExpAbsen2 +
              ". Anda mengisi — Hadir: " + _saActHadir2 + ", Absen: " + _saActAbsen2 + "."
          };
        }
      }
    }
    const materi = String(payload.material || "").trim();
    if (!materi)
      return { status: "error", message: "Materi pembelajaran wajib diisi." };
    const rowNumber = rowIndex + 1;
    sheet.getRange(rowNumber, matCol + 1).setValue(materi);
    sheet.getRange(rowNumber, hadirCol + 1).setValue(inputHadir);
    sheet.getRange(rowNumber, absenCol + 1).setValue(inputAbsen);
    sheet
      .getRange(rowNumber, notesCol + 1)
      .setValue(String(payload.notes || ""));
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return { status: "success", log_id: logId };
  } catch (e) {
    return { status: "error", message: "Server Error: " + e.toString() };
  }
}
