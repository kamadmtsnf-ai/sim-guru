function _examAddJtmLog_(
  scheduleId,
  userId,
  date,
  materi,
  hadir,
  absen,
  jtmVal,
  refId,
) {
  const logId = "LOG-EXAM-" + new Date().getTime();
  getSheet(SHEET_NAME.LOGS).appendRow([
    logId,
    String(scheduleId),
    String(userId),
    String(date),
    String(materi),
    Number(hadir) || 0,
    Number(absen) || 0,
    "REF:" + String(refId),
    Number(jtmVal) || 0,
    _examNow_(),
  ]);
  return logId;
}
function _examDeleteLogByRef_(refId) {
  const sheet = getSheet(SHEET_NAME.LOGS);
  const rows = sheet.getDataRange().getValues();
  const REF = "REF:" + String(refId);
  let deleted = false;
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][7]).indexOf(REF) !== -1) {
      sheet.deleteRow(i + 1);
      deleted = true;
    }
  }
  return deleted;
}
function _examUpdateLogByRef_(refId, hadir, absen) {
  const sheet = getSheet(SHEET_NAME.LOGS);
  const rows = sheet.getDataRange().getValues();
  const REF = "REF:" + String(refId);
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][7]).indexOf(REF) !== -1) {
      sheet.getRange(i + 1, 6).setValue(Number(hadir) || 0);
      sheet.getRange(i + 1, 7).setValue(Number(absen) || 0);
      return true;
    }
  }
  return false;
}
function _examGetBap_(supervisor_id) {
  return (
    getData(EXAM_SHEET.BAP).find(
      (b) => String(b.supervisor_id) === String(supervisor_id),
    ) || null
  );
}
function _examIsConfirmedPanitia_(user_id, date) {
  return getData(EXAM_SHEET.COMMITTEE).some(
    (c) =>
      String(c.user_id) === String(user_id) &&
      String(c.date) === String(date) &&
      String(c.status) === "active" &&
      c.confirmed_by &&
      String(c.confirmed_by).trim() !== "",
  );
}
/**
 * Mengecek apakah semua kelas hari ini sudah diisi rekap absensi siswanya.
 * Digunakan sebagai gate sebelum Panitia Ujian bisa konfirmasi/ganti pengawas.
 */
function _isPanitiaStudentAttendanceComplete_(dateStr) {
  try {
    var tz = Session.getScriptTimeZone();
    var targetDate = dateStr || Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    var cfg = _getConfigMap();
    var activeTP  = cfg["tahun_pelajaran"] || "";
    var activeSem = cfg["semester"] || "";
    var allSchedules = getData("Schedules");
    var classSet = new Set();
    allSchedules.forEach(function(s) {
      var sTP  = String(s.tahun_pelajaran || activeTP);
      var sSem = String(s.semester || activeSem);
      if (sTP === activeTP && sSem === activeSem) {
        var cn = String(s.class_name || "").trim();
        if (cn) classSet.add(cn);
      }
    });
    if (classSet.size === 0) return true; // tidak ada kelas = dianggap selesai
    var saData = getData("Student_Attendance");
    var submittedToday = new Set(
      saData
        .filter(function(r) { return safeDate(r.date) === targetDate; })
        .map(function(r) { return String(r.class_name || "").trim(); })
    );
    // Semua kelas harus sudah ada rekapnya
    var allDone = true;
    classSet.forEach(function(cn) {
      if (!submittedToday.has(cn)) allDone = false;
    });
    return allDone;
  } catch (e) {
    return false; // safe default: anggap belum selesai jika error
  }
}
function _isExamSupervisorForDate_(userId, dateStr) {
  var activePeriod = getData(EXAM_SHEET.PERIODS).find(function(p) {
    var ps = String(p.date_start || ''), pe = String(p.date_end || '');
    return ps && pe && dateStr >= ps && dateStr <= pe;
  });
  if (!activePeriod) return false;
  var todaySessions = getData(EXAM_SHEET.SESSIONS).filter(function(s) {
    return String(s.period_id) === String(activePeriod.id) &&
           String(s.date || '').substring(0, 10) === dateStr;
  });
  var sessionIds = {};
  todaySessions.forEach(function(s) { sessionIds[String(s.id)] = true; });
  var todayRooms = getData(EXAM_SHEET.ROOMS).filter(function(r) {
    return !!sessionIds[String(r.session_id)];
  });
  var roomIds = {};
  todayRooms.forEach(function(r) { roomIds[String(r.id)] = true; });
  return getData(EXAM_SHEET.SUPERVISORS).some(function(sup) {
    return String(sup.user_id) === String(userId) &&
           !!roomIds[String(sup.room_id)] &&
           String(sup.status) === 'active';
  });
}
function _examCheckAdminOrConfirmedPanitia_(user, date) {
  if (String(user.role).toLowerCase() === "admin") {
    return { ok: true, isAdmin: true };
  }
  if (_examIsConfirmedPanitia_(user.id, date)) {
    return { ok: true, isAdmin: false };
  }
  return {
    ok: false,
    isAdmin: false,
    error:
      "Akses ditolak. Hanya Admin atau Panitia yang sudah dikonfirmasi yang dapat melakukan aksi ini pada hari H.",
  };
}
function _examCheckBapTiming_(sessionDate, timeEnd) {
  const today = _examToday_();
  if (today < sessionDate) {
    return "Sesi ujian belum berlangsung.";
  }
  if (today > sessionDate) {
    return null;
  }
  const [teH, teM] = String(timeEnd).split(":").map(Number);
  const activeTotal = teH * 60 + teM + 5;
  const activeTime =
    String(Math.floor(activeTotal / 60)).padStart(2, "0") +
    ":" +
    String(activeTotal % 60).padStart(2, "0");
  const nowTime = Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm");
  if (nowTime < activeTime) {
    return (
      "BAP belum bisa diisi. Sesi berakhir pukul " +
      timeEnd +
      ", tombol aktif mulai pukul " +
      activeTime +
      "."
    );
  }
  return null;
}
function confirmCommitteeAttendance(token, committee_id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message:
          "Akses ditolak. Hanya Admin yang dapat mengonfirmasi kehadiran Panitia.",
      };
    }
    if (!committee_id)
      return { status: "error", message: "ID panitia tidak ditemukan." };
    const target = getData(EXAM_SHEET.COMMITTEE).find(
      (c) => String(c.id) === String(committee_id),
    );
    if (!target)
      return { status: "error", message: "Data panitia tidak ditemukan." };
    if (_examToday_() !== String(target.date)) {
      return {
        status: "error",
        message:
          "Konfirmasi hanya dapat dilakukan pada hari pelaksanaan (hari H).",
      };
    }
    if (String(target.status) !== "active") {
      return { status: "error", message: "Rekord panitia ini tidak aktif." };
    }
    if (target.confirmed_by && String(target.confirmed_by).trim() !== "") {
      return {
        status: "error",
        message: "Panitia ini sudah dikonfirmasi kehadirannya.",
      };
    }
    const period = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(target.period_id),
    );
    const periodName = period ? String(period.name) : "Ujian";
    const now = _examNow_();
    const sheet = getSheet(EXAM_SHEET.COMMITTEE);
    const rows = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(committee_id)) {
        sheet.getRange(i + 1, 9).setValue(String(user.id));
        sheet.getRange(i + 1, 10).setValue(now);
        found = true;
        break;
      }
    }
    if (!found)
      return { status: "error", message: "Gagal memperbarui data konfirmasi." };
    _examAddJtmLog_(
      "EXAM-COMMITTEE",
      target.user_id,
      String(target.date),
      "Panitia Ujian: " + periodName,
      0,
      0,
      Number(target.jtm_val) || 0,
      committee_id,
    );
    try {
      _notifCommitteeConfirmed_(target.user_id, target.date);
    } catch (_) {}
    return {
      status: "success",
      message: "Kehadiran Panitia berhasil dikonfirmasi. JTM telah dicatat.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function revokeCommitteeAttendance(token, committee_id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message:
          "Akses ditolak. Hanya Admin yang dapat mencabut konfirmasi Panitia.",
      };
    }
    if (!committee_id)
      return { status: "error", message: "ID panitia tidak ditemukan." };
    const target = getData(EXAM_SHEET.COMMITTEE).find(
      (c) => String(c.id) === String(committee_id),
    );
    if (!target)
      return { status: "error", message: "Data panitia tidak ditemukan." };
    if (_examToday_() !== String(target.date)) {
      return {
        status: "error",
        message:
          "Konfirmasi hanya dapat dicabut pada hari pelaksanaan (hari H).",
      };
    }
    if (!target.confirmed_by || String(target.confirmed_by).trim() === "") {
      return {
        status: "error",
        message: "Panitia ini belum dikonfirmasi kehadirannya.",
      };
    }
    _examDeleteLogByRef_(committee_id);
    const sheet = getSheet(EXAM_SHEET.COMMITTEE);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(committee_id)) {
        sheet.getRange(i + 1, 9).setValue("");
        sheet.getRange(i + 1, 10).setValue("");
        break;
      }
    }
    try {
      _notifCommitteeRevoked_(target.user_id, target.date);
    } catch (_) {}
    return {
      status: "success",
      message:
        "Konfirmasi kehadiran Panitia berhasil dicabut. JTM telah dihapus dari honorarium.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function confirmSupervisorAttendance(token, supervisor_id) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    if (!supervisor_id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(supervisor_id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    const room = _examGetRoom_(target.room_id);
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const session = _examGetSession_(room.session_id);
    if (!session)
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    const sessionDate = String(session.date);
    if (_examToday_() !== sessionDate) {
      return {
        status: "error",
        message:
          "Konfirmasi hanya dapat dilakukan pada hari pelaksanaan (hari H).",
      };
    }
    const auth = _examCheckAdminOrConfirmedPanitia_(user, sessionDate);
    if (!auth.ok) return { status: "error", message: auth.error };
    if (String(target.status) !== "active") {
      return { status: "error", message: "Rekord pengawas ini tidak aktif." };
    }
    if (target.confirmed_by && String(target.confirmed_by).trim() !== "") {
      return {
        status: "error",
        message: "Pengawas ini sudah dikonfirmasi kehadirannya.",
      };
    }
    const sheet = getSheet(EXAM_SHEET.SUPERVISORS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(supervisor_id)) {
        sheet.getRange(i + 1, 7).setValue(String(user.id));
        sheet.getRange(i + 1, 8).setValue(_examNow_());
        try {
          var byName = String(
            user.full_name ||
              user.name ||
              user.username ||
              (auth.isAdmin ? "Admin" : "Panitia Ujian"),
          );
          var sessionInfo =
            String(session.session_name || "") +
            " · " +
            String(room.room_name || "") +
            " (" +
            String(room.subject || "") +
            ")";
          _notifSupervisorConfirmed_(
            target.user_id,
            sessionDate,
            byName,
            sessionInfo,
          );
        } catch (_) {}
        return {
          status: "success",
          message:
            "Kehadiran Pengawas berhasil dikonfirmasi. Pengawas dapat mengisi BAP setelah sesi berakhir + 5 menit.",
        };
      }
    }
    return { status: "error", message: "Gagal memperbarui data konfirmasi." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function revokeSupervisorAttendance(token, supervisor_id, force) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    if (!supervisor_id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(supervisor_id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    const room = _examGetRoom_(target.room_id);
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const session = _examGetSession_(room.session_id);
    if (!session)
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    const sessionDate = String(session.date);
    if (_examToday_() !== sessionDate) {
      return {
        status: "error",
        message:
          "Konfirmasi hanya dapat dicabut pada hari pelaksanaan (hari H).",
      };
    }
    const auth = _examCheckAdminOrConfirmedPanitia_(user, sessionDate);
    if (!auth.ok) return { status: "error", message: auth.error };
    if (!target.confirmed_by || String(target.confirmed_by).trim() === "") {
      return {
        status: "error",
        code: JTM_ERROR_CODES.NO_ACTIVE_CONFIRMATION,
        message: "Pengawas ini belum dikonfirmasi kehadirannya.",
      };
    }
    const bap = _examGetBap_(supervisor_id);
    const hasBap = !!(
      bap &&
      bap.submitted_at &&
      String(bap.submitted_at).trim() !== ""
    );
    if (hasBap && !force) {
      return {
        status: "confirm_required",
        message:
          "Pencabutan konfirmasi akan mengunci BAP Pengawas dan menghapus JTM-nya dari honorarium. Lanjutkan?",
      };
    }
    if (hasBap) {
      _examDeleteLogByRef_(supervisor_id);
    }
    const sheet = getSheet(EXAM_SHEET.SUPERVISORS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(supervisor_id)) {
        sheet.getRange(i + 1, 7).setValue("");
        sheet.getRange(i + 1, 8).setValue("");
        break;
      }
    }
    try {
      _jtmReverseOccurrence_("EXAM", supervisor_id, sessionDate);
    } catch (_) {}
    try {
      var byName = String(
        user.full_name ||
          user.name ||
          user.username ||
          (auth.isAdmin ? "Admin" : "Panitia Ujian"),
      );
      var sessionInfo =
        String(session.session_name || "") +
        " · " +
        String(room.room_name || "") +
        " (" +
        String(room.subject || "") +
        ")";
      _notifSupervisorRevoked_(
        target.user_id,
        sessionDate,
        byName,
        sessionInfo,
      );
    } catch (_) {}
    return {
      status: "success",
      message: hasBap
        ? "Konfirmasi dicabut. BAP terkunci dan JTM telah dihapus dari honorarium."
        : "Konfirmasi kehadiran Pengawas berhasil dicabut.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function submitExamBAP(token, supervisor_id, bapData) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    if (!supervisor_id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(supervisor_id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    if (String(target.user_id) !== String(user.id)) {
      return {
        status: "error",
        message: "Anda tidak terdaftar sebagai pengawas pada jadwal ini.",
      };
    }
    if (String(target.status) === "cancelled") {
      return {
        status: "error",
        message: "Substitusi Anda pada jadwal ini telah dibatalkan.",
      };
    }
    if (String(target.status) !== "active") {
      return { status: "error", message: "Rekord pengawas ini tidak aktif." };
    }
    if (!target.confirmed_by || String(target.confirmed_by).trim() === "") {
      return {
        status: "error",
        message:
          "Kehadiran Anda belum dikonfirmasi Panitia. BAP belum dapat diisi.",
      };
    }
    const room = _examGetRoom_(target.room_id);
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const session = _examGetSession_(room.session_id);
    if (!session)
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    const period = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(session.period_id),
    );
    if (!period)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    if (_examToday_() > String(period.date_end)) {
      return {
        status: "error",
        message: "Periode ujian sudah selesai. BAP tidak dapat diubah.",
      };
    }
    const timingError = _examCheckBapTiming_(
      String(session.date),
      _examFormatTime_(session.time_end),
    );
    if (timingError) return { status: "error", message: timingError };
    const existing = _examGetBap_(supervisor_id);
    if (
      existing &&
      existing.submitted_at &&
      String(existing.submitted_at).trim() !== ""
    ) {
      return {
        status: "error",
        message:
          "BAP sudah pernah disubmit. Gunakan fitur Edit BAP untuk mengubah isian.",
      };
    }
    const hadir = Number(bapData.peserta_hadir);
    const absen = Number(bapData.peserta_absen);
    if (isNaN(hadir) || hadir < 0 || isNaN(absen) || absen < 0) {
      return {
        status: "error",
        message:
          "Jumlah peserta hadir dan tidak hadir wajib diisi dan tidak boleh negatif.",
      };
    }
    const totalSiswaAdmin = Number(room.total_siswa) || 0;
    const totalSiswaBAP = hadir + absen;
    if (totalSiswaAdmin > 0 && totalSiswaBAP !== totalSiswaAdmin) {
      return {
        status: "error",
        message: `Jumlah total siswa tidak sesuai. Total siswa di ruang ini: ${totalSiswaAdmin} (Hadir: ${hadir} + Alpa: ${absen} = ${totalSiswaBAP}). Silakan periksa kembali data kehadiran.`,
      };
    }
    const now = _examNow_();
    const catatan = String(bapData.catatan || "").trim();
    const bapId = "BAP-" + new Date().getTime();
    getSheet(EXAM_SHEET.BAP).appendRow([
      bapId,
      String(supervisor_id),
      hadir,
      absen,
      catatan,
      now,
      now,
    ]);
    let jtmToLog =
      Number(target.jtm_val) > 0
        ? Number(target.jtm_val)
        : Number(session.jtm_val) || 0;
    const jtmAdjustment = _jtmReadAdjustment_("EXAM", supervisor_id);
    if (jtmAdjustment) {
      const tz = Session.getScriptTimeZone();
      const sessionDateStr =
        session.date instanceof Date
          ? Utilities.formatDate(session.date, tz, "yyyy-MM-dd")
          : String(session.date);
      const adjDateStr =
        jtmAdjustment.date instanceof Date
          ? Utilities.formatDate(jtmAdjustment.date, tz, "yyyy-MM-dd")
          : String(jtmAdjustment.date);
      const storedAdjusted = jtmAdjustment.adjusted_jtm;
      const dateMatches = !adjDateStr || adjDateStr === sessionDateStr;
      if (
        dateMatches &&
        storedAdjusted !== null &&
        storedAdjusted !== undefined &&
        storedAdjusted !== "" &&
        !isNaN(Number(storedAdjusted))
      ) {
        jtmToLog = Number(storedAdjusted);
      }
    }
    _examAddJtmLog_(
      "EXAM-SUPERVISOR",
      target.user_id,
      String(session.date),
      "Pengawas Ujian: " +
        String(session.session_name || "") +
        " — " +
        String(room.room_name || ""),
      hadir,
      absen,
      jtmToLog,
      supervisor_id,
    );
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message:
        "BAP berhasil dikirim. JTM Pengawas telah dicatat ke sistem honorarium.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function editExamBAP(token, supervisor_id, bapData) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    if (!supervisor_id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(supervisor_id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    if (String(target.user_id) !== String(user.id)) {
      return {
        status: "error",
        message: "Anda tidak terdaftar sebagai pengawas pada jadwal ini.",
      };
    }
    if (String(target.status) === "cancelled") {
      return {
        status: "error",
        message:
          "Substitusi Anda pada jadwal ini telah dibatalkan. BAP bersifat read-only.",
      };
    }
    if (String(target.status) !== "active") {
      return { status: "error", message: "Rekord pengawas ini tidak aktif." };
    }
    if (!target.confirmed_by || String(target.confirmed_by).trim() === "") {
      return {
        status: "error",
        message: "Kehadiran Anda belum dikonfirmasi. BAP tidak dapat diedit.",
      };
    }
    const room = _examGetRoom_(target.room_id);
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const session = _examGetSession_(room.session_id);
    if (!session)
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    const period = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(session.period_id),
    );
    if (!period)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    if (_examToday_() > String(period.date_end)) {
      return {
        status: "error",
        message: "Periode ujian sudah selesai. BAP tidak dapat diubah.",
      };
    }
    const timingError = _examCheckBapTiming_(
      String(session.date),
      _examFormatTime_(session.time_end),
    );
    if (timingError) return { status: "error", message: timingError };
    const existing = _examGetBap_(supervisor_id);
    if (
      !existing ||
      !existing.submitted_at ||
      String(existing.submitted_at).trim() === ""
    ) {
      return {
        status: "error",
        message:
          "BAP belum pernah disubmit. Gunakan Submit BAP terlebih dahulu.",
      };
    }
    const hadir = Number(bapData.peserta_hadir);
    const absen = Number(bapData.peserta_absen);
    if (isNaN(hadir) || hadir < 0 || isNaN(absen) || absen < 0) {
      return {
        status: "error",
        message:
          "Jumlah peserta hadir dan tidak hadir wajib diisi dan tidak boleh negatif.",
      };
    }
    const totalSiswaAdmin = Number(room.total_siswa) || 0;
    const totalSiswaBAP = hadir + absen;
    if (totalSiswaAdmin > 0 && totalSiswaBAP !== totalSiswaAdmin) {
      return {
        status: "error",
        message: `Jumlah total siswa tidak sesuai. Total siswa di ruang ini: ${totalSiswaAdmin} (Hadir: ${hadir} + Alpa: ${absen} = ${totalSiswaBAP}). Silakan periksa kembali data kehadiran.`,
      };
    }
    const now = _examNow_();
    const catatan = String(bapData.catatan || "").trim();
    const bapSheet = getSheet(EXAM_SHEET.BAP);
    const bapRows = bapSheet.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < bapRows.length; i++) {
      if (String(bapRows[i][1]) === String(supervisor_id)) {
        bapSheet.getRange(i + 1, 3).setValue(hadir);
        bapSheet.getRange(i + 1, 4).setValue(absen);
        bapSheet.getRange(i + 1, 5).setValue(catatan);
        bapSheet.getRange(i + 1, 7).setValue(now);
        updated = true;
        break;
      }
    }
    if (!updated)
      return { status: "error", message: "Gagal memperbarui data BAP." };
    _examUpdateLogByRef_(supervisor_id, hadir, absen);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return { status: "success", message: "BAP berhasil diperbarui." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function substituteExamSupervisor(token, supervisor_id, new_user_id) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    if (!supervisor_id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    if (!new_user_id)
      return { status: "error", message: "ID guru pengganti tidak ditemukan." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(supervisor_id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    const room = _examGetRoom_(target.room_id);
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const session = _examGetSession_(room.session_id);
    if (!session)
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    const sessionDate = String(session.date);
    if (_examToday_() !== sessionDate) {
      return {
        status: "error",
        message:
          "Batas waktu substitusi sudah terlewat. Substitusi hanya dapat dilakukan pada hari H.",
      };
    }
    const auth = _examCheckAdminOrConfirmedPanitia_(user, sessionDate);
    if (!auth.ok) return { status: "error", message: auth.error };
    if (String(target.status) !== "active") {
      return {
        status: "error",
        message: "Rekord pengawas ini tidak aktif dan tidak dapat digantikan.",
      };
    }
    const newGuru = getData("Users").find(
      (u) => String(u.id) === String(new_user_id),
    );
    if (!newGuru)
      return { status: "error", message: "Guru pengganti tidak ditemukan." };
    if (String(new_user_id) === String(target.user_id)) {
      return {
        status: "error",
        message: "Guru pengganti tidak boleh sama dengan guru yang diganti.",
      };
    }
    const conflict = _examCheckSupervisorConflict_(
      new_user_id,
      room.session_id,
      supervisor_id,
    );
    if (conflict)
      return { status: "error", message: "Guru pengganti: " + conflict };
    const supSheet = getSheet(EXAM_SHEET.SUPERVISORS);
    const supRows = supSheet.getDataRange().getValues();
    for (let i = 1; i < supRows.length; i++) {
      if (String(supRows[i][0]) === String(supervisor_id)) {
        supSheet.getRange(i + 1, 4).setValue("substituted");
        break;
      }
    }
    const newId = "EXSUP-" + new Date().getTime();
    supSheet.appendRow([
      newId,
      String(target.room_id),
      String(new_user_id),
      "active",
      true,
      String(target.user_id),
      "",
      "",
      "",
      "",
      Number(target.jtm_val) || 0,
    ]);
    try {
      var byName = String(
        user.full_name ||
          user.name ||
          user.username ||
          (auth.isAdmin ? "Admin" : "Panitia Ujian"),
      );
      var sessionInfo =
        String(session.session_name || "") +
        " · " +
        String(room.room_name || "") +
        " (" +
        String(room.subject || "") +
        ")";
      _notifSupervisorSubstituted_(
        target.user_id,
        new_user_id,
        sessionDate,
        byName,
        sessionInfo,
      );
    } catch (_) {}
    return {
      status: "success",
      message:
        String(newGuru.full_name) + " kini menggantikan posisi pengawas.",
      new_supervisor_id: newId,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function cancelExamSupervisorSubstitution(token, supervisor_id, force) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    if (!supervisor_id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(supervisor_id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    if (!(
      target.is_substitute === true || String(target.is_substitute) === "true"
    )) {
      return {
        status: "error",
        message: "Rekord ini bukan pengganti. Pembatalan tidak berlaku.",
      };
    }
    if (String(target.status) !== "active") {
      return { status: "error", message: "Substitusi ini sudah tidak aktif." };
    }
    const room = _examGetRoom_(target.room_id);
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const session = _examGetSession_(room.session_id);
    if (!session)
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    const sessionDate = String(session.date);
    if (_examToday_() !== sessionDate) {
      return {
        status: "error",
        message: "Pembatalan substitusi hanya dapat dilakukan pada hari H.",
      };
    }
    const auth = _examCheckAdminOrConfirmedPanitia_(user, sessionDate);
    if (!auth.ok) return { status: "error", message: auth.error };
    const isConfirmed = !!(
      target.confirmed_by && String(target.confirmed_by).trim() !== ""
    );
    const bap = _examGetBap_(supervisor_id);
    const hasBap = !!(
      bap &&
      bap.submitted_at &&
      String(bap.submitted_at).trim() !== ""
    );
    if (isConfirmed && hasBap && !force) {
      return {
        status: "confirm_required",
        message:
          "Guru pengganti sudah mengisi dan menyerahkan BAP. " +
          "Pembatalan akan mengunci BAP pengganti dan menghapus JTM-nya dari honorarium. " +
          "Guru asli akan dikembalikan ke jadwal. Lanjutkan?",
      };
    }
    const now = _examNow_();
    const supSheet = getSheet(EXAM_SHEET.SUPERVISORS);
    const supRows = supSheet.getDataRange().getValues();
    if (isConfirmed && hasBap) {
      for (let i = 1; i < supRows.length; i++) {
        if (String(supRows[i][0]) === String(supervisor_id)) {
          supSheet.getRange(i + 1, 4).setValue("cancelled");
          supSheet.getRange(i + 1, 9).setValue(String(user.id));
          supSheet.getRange(i + 1, 10).setValue(now);
          break;
        }
      }
      _examDeleteLogByRef_(supervisor_id);
    } else {
      for (let i = supRows.length - 1; i >= 1; i--) {
        if (String(supRows[i][0]) === String(supervisor_id)) {
          supSheet.deleteRow(i + 1);
          break;
        }
      }
    }
    const originalUserId = String(target.original_user_id);
    const freshRows = getSheet(EXAM_SHEET.SUPERVISORS)
      .getDataRange()
      .getValues();
    for (let i = 1; i < freshRows.length; i++) {
      if (
        String(freshRows[i][1]) === String(target.room_id) &&
        String(freshRows[i][2]) === originalUserId &&
        String(freshRows[i][3]) === "substituted"
      ) {
        const s = getSheet(EXAM_SHEET.SUPERVISORS);
        s.getRange(i + 1, 4).setValue("active");
        s.getRange(i + 1, 7).setValue("");
        s.getRange(i + 1, 8).setValue("");
        break;
      }
    }
    try {
      var byName = String(
        user.full_name ||
          user.name ||
          user.username ||
          (auth.isAdmin ? "Admin" : "Panitia Ujian"),
      );
      var sessionInfo =
        String(session.session_name || "") +
        " · " +
        String(room.room_name || "") +
        " (" +
        String(room.subject || "") +
        ")";
      _notifSupervisorSubCancelled_(
        target.user_id,
        sessionDate,
        byName,
        sessionInfo,
      );
    } catch (_) {}
    return {
      status: "success",
      message:
        "Substitusi pengawas berhasil dibatalkan. Guru asli telah dikembalikan ke jadwal.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function substituteExamCommittee(token, committee_id, new_user_id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat mengganti Panitia.",
      };
    }
    if (!committee_id)
      return { status: "error", message: "ID panitia tidak ditemukan." };
    if (!new_user_id)
      return { status: "error", message: "ID guru pengganti tidak ditemukan." };
    const target = getData(EXAM_SHEET.COMMITTEE).find(
      (c) => String(c.id) === String(committee_id),
    );
    if (!target)
      return { status: "error", message: "Data panitia tidak ditemukan." };
    const comDate = String(target.date);
    if (_examToday_() !== comDate) {
      return {
        status: "error",
        message: "Substitusi hanya dapat dilakukan pada hari H.",
      };
    }
    if (String(target.status) !== "active") {
      return { status: "error", message: "Rekord panitia ini tidak aktif." };
    }
    const newGuru = getData("Users").find(
      (u) => String(u.id) === String(new_user_id),
    );
    if (!newGuru)
      return { status: "error", message: "Guru pengganti tidak ditemukan." };
    if (String(new_user_id) === String(target.user_id)) {
      return {
        status: "error",
        message: "Guru pengganti tidak boleh sama dengan guru yang diganti.",
      };
    }
    const conflict = _examCheckCommitteeConflict_(
      new_user_id,
      comDate,
      committee_id,
    );
    if (conflict)
      return { status: "error", message: "Guru pengganti: " + conflict };
    const comSheet = getSheet(EXAM_SHEET.COMMITTEE);
    const comRows = comSheet.getDataRange().getValues();
    for (let i = 1; i < comRows.length; i++) {
      if (String(comRows[i][0]) === String(committee_id)) {
        comSheet.getRange(i + 1, 6).setValue("substituted");
        break;
      }
    }
    const newId = "EXCOM-" + new Date().getTime();
    const jtmVal = Number(target.jtm_val) || 0;
    comSheet.appendRow([
      newId,
      String(target.period_id),
      comDate,
      String(new_user_id),
      jtmVal,
      "active",
      true,
      String(target.user_id),
      "",
      "",
      "",
      "",
    ]);
    try {
      _notifCommitteeSubstituted_(target.user_id, new_user_id, comDate);
    } catch (_) {}
    return {
      status: "success",
      message: String(newGuru.full_name) + " kini menggantikan posisi panitia.",
      new_committee_id: newId,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function cancelExamCommitteeSubstitution(token, committee_id, force) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message:
          "Akses ditolak. Hanya Admin yang dapat membatalkan substitusi Panitia.",
      };
    }
    if (!committee_id)
      return { status: "error", message: "ID panitia tidak ditemukan." };
    const target = getData(EXAM_SHEET.COMMITTEE).find(
      (c) => String(c.id) === String(committee_id),
    );
    if (!target)
      return { status: "error", message: "Data panitia tidak ditemukan." };
    if (!(
      target.is_substitute === true || String(target.is_substitute) === "true"
    )) {
      return {
        status: "error",
        message: "Rekord ini bukan pengganti. Pembatalan tidak berlaku.",
      };
    }
    if (String(target.status) !== "active") {
      return { status: "error", message: "Substitusi ini sudah tidak aktif." };
    }
    const comDate = String(target.date);
    if (_examToday_() !== comDate) {
      return {
        status: "error",
        message: "Pembatalan substitusi hanya dapat dilakukan pada hari H.",
      };
    }
    const isConfirmed = !!(
      target.confirmed_by && String(target.confirmed_by).trim() !== ""
    );
    if (isConfirmed && !force) {
      return {
        status: "confirm_required",
        message:
          "Guru pengganti sudah dikonfirmasi kehadirannya dan JTM-nya sudah terhitung. " +
          "Pembatalan akan menghapus JTM pengganti dari honorarium. " +
          "Guru asli akan dikembalikan ke jadwal. Lanjutkan?",
      };
    }
    const now = _examNow_();
    const comSheet = getSheet(EXAM_SHEET.COMMITTEE);
    const comRows = comSheet.getDataRange().getValues();
    if (isConfirmed) {
      for (let i = 1; i < comRows.length; i++) {
        if (String(comRows[i][0]) === String(committee_id)) {
          comSheet.getRange(i + 1, 6).setValue("cancelled");
          comSheet.getRange(i + 1, 11).setValue(String(user.id));
          comSheet.getRange(i + 1, 12).setValue(now);
          break;
        }
      }
      _examDeleteLogByRef_(committee_id);
    } else {
      for (let i = comRows.length - 1; i >= 1; i--) {
        if (String(comRows[i][0]) === String(committee_id)) {
          comSheet.deleteRow(i + 1);
          break;
        }
      }
    }
    const originalUserId = String(target.original_user_id);
    const freshRows = getSheet(EXAM_SHEET.COMMITTEE).getDataRange().getValues();
    for (let i = 1; i < freshRows.length; i++) {
      if (
        String(freshRows[i][1]) === String(target.period_id) &&
        String(freshRows[i][2]) === comDate &&
        String(freshRows[i][3]) === originalUserId &&
        String(freshRows[i][5]) === "substituted"
      ) {
        const s = getSheet(EXAM_SHEET.COMMITTEE);
        s.getRange(i + 1, 6).setValue("active");
        s.getRange(i + 1, 9).setValue("");
        s.getRange(i + 1, 10).setValue("");
        break;
      }
    }
    try {
      _notifCommitteeSubCancelled_(target.user_id, comDate);
    } catch (_) {}
    return {
      status: "success",
      message:
        "Substitusi panitia berhasil dibatalkan. Guru asli telah dikembalikan ke jadwal.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
