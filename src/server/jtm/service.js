function adjustOccurrenceJtm(token, payload) {
  var user = verifySession(token);
  if (!user) {
    return {
      status: "error",
      message: "Sesi tidak valid, silakan login kembali.",
    };
  }
  payload = payload || {};
  var occurrenceType = String(payload.occurrence_type || "").toUpperCase();
  var todayDate = _examToday_(); 
  var occurrenceRef = "";
  var occurrenceDate = "";
  var originalUserId = "";
  var scheduledJtm = 0;
  var authResult;
  if (occurrenceType === "KBM") {
    occurrenceRef = String(payload.schedule_id || "");
    if (!occurrenceRef) {
      return {
        status: "error",
        message: "ID jadwal (schedule_id) tidak ditemukan.",
      };
    }
    var schedule = getData("Schedules").find(function (s) {
      return String(s.id) === occurrenceRef;
    });
    if (!schedule) {
      return { status: "error", message: "Jadwal KBM tidak ditemukan." };
    }
    scheduledJtm = Number(schedule.jtm_val) || 0;
    originalUserId = String(payload.target_user_id || schedule.user_id || "");
    occurrenceDate = String(payload.date || todayDate);
    authResult = _jtmAuthorizeKbm(
      user,
      _isPicketOfficer(user),
      todayDate,
      occurrenceDate,
    );
  } else if (occurrenceType === "PIKET") {
    var picketTargetUid = String(payload.target_user_id || "");
    occurrenceDate = String(payload.date || todayDate);
    if (!picketTargetUid) {
      return {
        status: "error",
        message: "target_user_id tidak ditemukan untuk penyesuaian piket.",
      };
    }
    var picketLog = getData("Teaching_Logs").find(function (l) {
      return (
        String(l.user_id) === picketTargetUid &&
        String(l.schedule_id) === "PICKET-DUTY" &&
        String(l.date) === occurrenceDate
      );
    });
    if (!picketLog) {
      return {
        status: "error",
        message:
          "Kehadiran piket belum dikonfirmasi. Konfirmasi kehadiran terlebih dahulu sebelum menyesuaikan JTM.",
      };
    }
    scheduledJtm = Number(picketLog.jtm_val) || 4;
    originalUserId = picketTargetUid;
    occurrenceRef = picketTargetUid + "|" + occurrenceDate;
    authResult = _jtmAuthorizeKbm(
      user,
      _isPicketOfficer(user),
      todayDate,
      occurrenceDate,
    );
  } else if (occurrenceType === "EXAM") {
    occurrenceRef = String(payload.supervisor_id || "");
    if (!occurrenceRef) {
      return {
        status: "error",
        message: "ID pengawas (supervisor_id) tidak ditemukan.",
      };
    }
    var supervisor = getData(EXAM_SHEET.SUPERVISORS).find(function (s) {
      return String(s.id) === occurrenceRef;
    });
    if (!supervisor) {
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    }
    var room = _examGetRoom_(supervisor.room_id);
    if (!room) {
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    }
    var session = _examGetSession_(room.session_id);
    if (!session) {
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    }
    scheduledJtm =
      Number(supervisor.jtm_val) > 0
        ? Number(supervisor.jtm_val)
        : Number(session.jtm_val) || 0;
    originalUserId = String(supervisor.user_id || "");
    occurrenceDate = String(session.date || "");
    var examAuth = _examCheckAdminOrConfirmedPanitia_(user, occurrenceDate);
    authResult = _jtmAuthorizeExam(examAuth, todayDate, occurrenceDate);
  } else {
    return {
      status: "error",
      message: "Jenis kegiatan (occurrence_type) tidak valid.",
    };
  }
  if (!authResult.ok) {
    return {
      status: "error",
      code: authResult.code,
      message: authResult.message,
    };
  }
  var adjRes = _jtmValidateAdjusted(scheduledJtm, payload.adjusted_jtm);
  if (!adjRes.ok) {
    return { status: "error", code: adjRes.code, message: adjRes.message };
  }
  var adjustedJtm = adjRes.value;
  var reasonRes = _jtmValidateReason(adjustedJtm, scheduledJtm, payload.reason);
  if (!reasonRes.ok) {
    return {
      status: "error",
      code: reasonRes.code,
      message: reasonRes.message,
    };
  }
  var reason = reasonRes.reason;
  var existingAllocations = _jtmReadReallocations_(
    occurrenceType,
    occurrenceRef,
  ).map(function (r) {
    return Number(r.allocated_jtm) || 0;
  });
  var consRes = _jtmCheckConservation(
    scheduledJtm,
    adjustedJtm,
    existingAllocations,
    0,
  );
  if (!consRes.ok) {
    return { status: "error", code: consRes.code, message: consRes.message };
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return {
      status: "error",
      code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
      message:
        "Sistem sedang sibuk memproses penyesuaian lain. Silakan coba lagi.",
    };
  }
  try {
    var record = _jtmBuildAdjustmentRecord_({
      occurrenceType: occurrenceType,
      occurrenceRef: occurrenceRef,
      date: occurrenceDate,
      originalUserId: originalUserId,
      scheduledJtm: scheduledJtm,
      adjustedJtm: adjustedJtm,
      reason: reason,
      adjustedBy: user.id,
    });
    _jtmUpsertAdjustment_(record);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message: "Penyesuaian JTM berhasil disimpan.",
      scheduled_jtm: scheduledJtm,
      adjusted_jtm: adjustedJtm,
      jtm_difference: record.jtm_difference,
    };
  } catch (writeErr) {
    return {
      status: "error",
      code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
      message: "Penyesuaian JTM tidak dapat disimpan. Silakan coba lagi.",
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}
function getOccurrenceJtmState(token, occurrence_type, occurrence_ref) {
  try {
    return _getOccurrenceJtmState_(token, occurrence_type, occurrence_ref);
  } catch (e) {
    return {
      status: "error",
      message: "Gagal membaca status JTM: " + e.message,
    };
  }
}
function _getOccurrenceJtmState_(token, occurrence_type, occurrence_ref) {
  var user = verifySession(token);
  if (!user) {
    return {
      status: "error",
      message: "Sesi tidak valid, silakan login kembali.",
    };
  }
  var occurrenceType = String(occurrence_type || "").toUpperCase();
  var occurrenceRef = String(occurrence_ref || "");
  var scheduledJtm = 0;
  if (occurrenceType === "KBM") {
    if (!occurrenceRef) {
      return {
        status: "error",
        message: "ID jadwal (schedule_id) tidak ditemukan.",
      };
    }
    var schedule = getData("Schedules").find(function (s) {
      return String(s.id) === occurrenceRef;
    });
    if (!schedule) {
      return { status: "error", message: "Jadwal KBM tidak ditemukan." };
    }
    scheduledJtm = Number(schedule.jtm_val) || 0;
  } else if (occurrenceType === "EXAM") {
    if (!occurrenceRef) {
      return {
        status: "error",
        message: "ID pengawas (supervisor_id) tidak ditemukan.",
      };
    }
    var supervisor = getData(EXAM_SHEET.SUPERVISORS).find(function (s) {
      return String(s.id) === occurrenceRef;
    });
    if (!supervisor) {
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    }
    var room = _examGetRoom_(supervisor.room_id);
    if (!room) {
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    }
    var session = _examGetSession_(room.session_id);
    if (!session) {
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    }
    scheduledJtm =
      Number(supervisor.jtm_val) > 0
        ? Number(supervisor.jtm_val)
        : Number(session.jtm_val) || 0;
  } else if (occurrenceType === "PIKET") {
    if (!occurrenceRef) {
      return {
        status: "error",
        message: "occurrence_ref (target_user_id|date) tidak ditemukan.",
      };
    }
    var parts = occurrenceRef.split("|");
    var picketTargetUid = parts[0];
    var occurrenceDate = parts[1] || _examToday_();
    var picketLog = getData("Teaching_Logs").find(function (l) {
      return (
        String(l.user_id) === picketTargetUid &&
        String(l.schedule_id) === "PICKET-DUTY" &&
        String(l.date) === occurrenceDate
      );
    });
    scheduledJtm = picketLog ? Number(picketLog.jtm_val) || 4 : 4;
  } else {
    return {
      status: "error",
      message: "Jenis kegiatan (occurrence_type) tidak valid.",
    };
  }
  var adjustment = _jtmReadAdjustment_(occurrenceType, occurrenceRef);
  var adjustedJtm;
  var jtmDifference;
  var reason;
  if (adjustment) {
    adjustedJtm = Number(adjustment.adjusted_jtm) || 0;
    reason = adjustment.reason == null ? "" : String(adjustment.reason);
    jtmDifference = _jtmComputeDifference(scheduledJtm, adjustedJtm);
  } else {
    adjustedJtm = scheduledJtm;
    jtmDifference = 0;
    reason = "";
  }
  var allocations = _jtmReadReallocations_(occurrenceType, occurrenceRef) || [];
  return {
    status: "success",
    scheduled_jtm: scheduledJtm,
    adjusted_jtm: adjustedJtm,
    jtm_difference: jtmDifference,
    reason: reason,
    allocations: allocations,
  };
}
function reallocateJtmDifference(token, payload) {
  var user = verifySession(token);
  if (!user) {
    return {
      status: "error",
      message: "Sesi tidak valid, silakan login kembali.",
    };
  }
  payload = payload || {};
  var occurrenceType = String(payload.occurrence_type || "").toUpperCase();
  var occurrenceRef = String(payload.occurrence_ref || "");
  var todayDate = _examToday_(); 
  var occurrenceDate = "";
  var originalUserId = "";
  var scheduledJtm = 0;
  var partialSubScheduleId = "";
  var authResult;
  if (occurrenceType === "KBM") {
    if (!occurrenceRef) {
      return {
        status: "error",
        message: "ID jadwal (schedule_id) tidak ditemukan.",
      };
    }
    var schedule = getData("Schedules").find(function (s) {
      return String(s.id) === occurrenceRef;
    });
    if (!schedule) {
      return { status: "error", message: "Jadwal KBM tidak ditemukan." };
    }
    scheduledJtm = Number(schedule.jtm_val) || 0;
    originalUserId = String(schedule.user_id || "");
    occurrenceDate = String(payload.date || todayDate);
    partialSubScheduleId = "PARTIAL-SUB-KBM";
    authResult = _jtmAuthorizeKbm(
      user,
      _isPicketOfficer(user),
      todayDate,
      occurrenceDate,
    );
  } else if (occurrenceType === "PIKET") {
    var parts = occurrenceRef.split("|");
    var picketUid = parts[0] || "";
    occurrenceDate = parts[1] || todayDate;
    if (!picketUid) {
      return {
        status: "error",
        message: "occurrence_ref tidak valid untuk tipe PIKET.",
      };
    }
    var pLog = getData("Teaching_Logs").find(function (l) {
      return (
        String(l.user_id) === picketUid &&
        String(l.schedule_id) === "PICKET-DUTY" &&
        String(l.date) === occurrenceDate
      );
    });
    if (!pLog) {
      return {
        status: "error",
        message:
          "Kehadiran piket belum dikonfirmasi. Konfirmasi kehadiran terlebih dahulu.",
      };
    }
    scheduledJtm = Number(pLog.jtm_val) || 4;
    originalUserId = picketUid;
    partialSubScheduleId = "PARTIAL-SUB-PIKET";
    authResult = _jtmAuthorizeKbm(
      user,
      _isPicketOfficer(user),
      todayDate,
      occurrenceDate,
    );
  } else if (occurrenceType === "EXAM") {
    if (!occurrenceRef) {
      return {
        status: "error",
        message: "ID pengawas (supervisor_id) tidak ditemukan.",
      };
    }
    var supervisor = getData(EXAM_SHEET.SUPERVISORS).find(function (s) {
      return String(s.id) === occurrenceRef;
    });
    if (!supervisor) {
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    }
    var room = _examGetRoom_(supervisor.room_id);
    if (!room) {
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    }
    var session = _examGetSession_(room.session_id);
    if (!session) {
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    }
    scheduledJtm =
      Number(supervisor.jtm_val) > 0
        ? Number(supervisor.jtm_val)
        : Number(session.jtm_val) || 0;
    originalUserId = String(supervisor.user_id || "");
    occurrenceDate = String(session.date || "");
    partialSubScheduleId = "PARTIAL-SUB-EXAM";
    var examAuth = _examCheckAdminOrConfirmedPanitia_(user, occurrenceDate);
    authResult = _jtmAuthorizeExam(examAuth, todayDate, occurrenceDate);
  } else {
    return {
      status: "error",
      message: "Jenis kegiatan (occurrence_type) tidak valid.",
    };
  }
  if (!authResult.ok) {
    return {
      status: "error",
      code: authResult.code,
      message: authResult.message,
    };
  }
  var adjustment = _jtmReadAdjustment_(occurrenceType, occurrenceRef);
  var adjustedJtm = adjustment
    ? Number(adjustment.adjusted_jtm) || 0
    : scheduledJtm;
  var adjustmentId = adjustment ? String(adjustment.id || "") : "";
  var rawAllocations = payload.allocations;
  if (
    !rawAllocations ||
    typeof rawAllocations.length !== "number" ||
    rawAllocations.length === 0
  ) {
    return { status: "error", message: "Tidak ada alokasi JTM yang dikirim." };
  }
  var usersById = {};
  getData("Users").forEach(function (u) {
    usersById[String(u.id)] = u;
  });
  var existingRecords =
    _jtmReadReallocations_(occurrenceType, occurrenceRef) || [];
  var conservationBase = existingRecords.map(function (r) {
    return Number(r.allocated_jtm) || 0;
  });
  var validated = []; 
  var runningAllocations = conservationBase.slice();
  for (var i = 0; i < rawAllocations.length; i++) {
    var alloc = rawAllocations[i] || {};
    var substituteUserId = String(alloc.substitute_user_id || "");
    if (!substituteUserId) {
      return {
        status: "error",
        code: JTM_ERROR_CODES.ALLOCATION_INVALID,
        message: "ID guru pengganti (substitute_user_id) tidak ditemukan.",
      };
    }
    var subUser = usersById[substituteUserId];
    var isSubstituteAdmin = !!(
      subUser && String(subUser.role).toLowerCase() === "admin"
    );
    var allocRes = _jtmValidateAllocation(
      alloc.allocated_jtm,
      originalUserId,
      substituteUserId,
      isSubstituteAdmin,
    );
    if (!allocRes.ok) {
      return {
        status: "error",
        code: allocRes.code,
        message: allocRes.message,
      };
    }
    var consRes = _jtmCheckConservation(
      scheduledJtm,
      adjustedJtm,
      runningAllocations,
      allocRes.value,
    );
    if (!consRes.ok) {
      return { status: "error", code: consRes.code, message: consRes.message };
    }
    runningAllocations.push(allocRes.value);
    validated.push({
      substituteUserId: substituteUserId,
      value: allocRes.value,
    });
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return {
      status: "error",
      code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
      message:
        "Sistem sedang sibuk memproses penyesuaian lain. Silakan coba lagi.",
    };
  }
  var written = []; 
  try {
    var savedAllocations = [];
    for (var j = 0; j < validated.length; j++) {
      var v = validated[j];
      var record = _jtmCreateReallocation_({
        adjustmentId: adjustmentId,
        occurrenceType: occurrenceType,
        occurrenceRef: occurrenceRef,
        date: occurrenceDate,
        substituteUserId: v.substituteUserId,
        allocatedJtm: v.value,
        createdBy: user.id,
      });
      var creditLogId;
      try {
        creditLogId = _jtmAddReallocationCreditLog_(
          partialSubScheduleId,
          v.substituteUserId,
          occurrenceDate,
          v.value,
          record.id,
        );
      } catch (creditErr) {
        try {
          _jtmDeleteReallocation_(record.id);
        } catch (_) {}
        throw creditErr;
      }
      try {
        _jtmSetReallocationLogId_(record.id, creditLogId);
        record.log_id = creditLogId;
      } catch (_) {}
      written.push({ reallocationId: record.id, logId: creditLogId });
      savedAllocations.push({
        id: record.id,
        substitute_user_id: record.substitute_user_id,
        allocated_jtm: record.allocated_jtm,
        log_id: creditLogId,
      });
    }
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    var totalAllocated = runningAllocations.reduce(function (acc, n) {
      return acc + (Number(n) || 0);
    }, 0);
    var remainingDifference = scheduledJtm - adjustedJtm - totalAllocated;
    if (remainingDifference < 0) remainingDifference = 0;
    return {
      status: "success",
      message: "Alokasi JTM pengganti sebagian berhasil disimpan.",
      allocations: savedAllocations,
      remaining_difference: remainingDifference,
    };
  } catch (writeErr) {
    for (var k = written.length - 1; k >= 0; k--) {
      try {
        _jtmDeleteReallocation_(written[k].reallocationId);
      } catch (_) {}
      if (written[k].logId) {
        try {
          _examDeleteLogByRef_(written[k].reallocationId);
        } catch (_) {}
      }
    }
    return {
      status: "error",
      code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
      message: "Alokasi JTM tidak dapat disimpan. Silakan coba lagi.",
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}
function _jtmAddReallocationCreditLog_(
  scheduleId,
  userId,
  date,
  jtmVal,
  reallocationId,
) {
  var logId = "LOG-PSUB-" + new Date().getTime();
  getSheet(SHEET_NAME.LOGS).appendRow([
    logId,
    String(scheduleId),
    String(userId),
    String(date),
    "Alokasi JTM pengganti sebagian",
    0,
    0,
    "REF:" + String(reallocationId),
    Number(jtmVal) || 0,
    _jtmNowIso_(),
  ]);
  return logId;
}
function _jtmSetReallocationLogId_(reallocationId, logId) {
  var sheet = _jtmGetReallocationsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  var col = _jtmColMap_(sheet);
  var idIdx = col["id"];
  var logIdx = col["log_id"];
  if (idIdx === undefined || logIdx === undefined) return false;
  var id = String(reallocationId);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === id) {
      sheet.getRange(i + 1, logIdx + 1).setValue(String(logId));
      return true;
    }
  }
  return false;
}
function removeReallocation(token, reallocation_id) {
  var user = verifySession(token);
  if (!user) {
    return {
      status: "error",
      message: "Sesi tidak valid, silakan login kembali.",
    };
  }
  var reallocationId = String(reallocation_id || "");
  if (!reallocationId) {
    return {
      status: "error",
      message: "ID alokasi (reallocation_id) tidak ditemukan.",
    };
  }
  var record = _jtmReadReallocationById_(reallocationId);
  if (!record) {
    return {
      status: "error",
      message: "Alokasi JTM tidak ditemukan atau sudah dihapus.",
    };
  }
  var occurrenceType = String(record.occurrence_type || "").toUpperCase();
  var occurrenceDate = String(record.date || "");
  var todayDate = _examToday_(); 
  var authResult;
  if (occurrenceType === "KBM" || occurrenceType === "PIKET") {
    authResult = _jtmAuthorizeKbm(
      user,
      _isPicketOfficer(user),
      todayDate,
      occurrenceDate,
    );
  } else if (occurrenceType === "EXAM") {
    var examAuth = _examCheckAdminOrConfirmedPanitia_(user, occurrenceDate);
    authResult = _jtmAuthorizeExam(examAuth, todayDate, occurrenceDate);
  } else {
    return {
      status: "error",
      message: "Jenis kegiatan (occurrence_type) tidak valid.",
    };
  }
  if (!authResult.ok) {
    return {
      status: "error",
      code: authResult.code,
      message: authResult.message,
    };
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return {
      status: "error",
      code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
      message:
        "Sistem sedang sibuk memproses penyesuaian lain. Silakan coba lagi.",
    };
  }
  try {
    _examDeleteLogByRef_(reallocationId);
    _jtmDeleteReallocation_(reallocationId);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message: "Alokasi JTM pengganti sebagian berhasil dihapus.",
    };
  } catch (writeErr) {
    return {
      status: "error",
      code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
      message: "Alokasi JTM tidak dapat dihapus. Silakan coba lagi.",
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}
function resetOccurrenceJtm(token, payload) {
  try {
    var user = verifySession(token);
    if (!user) {
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    }
    payload = payload || {};
    var occurrenceType = String(payload.occurrence_type || "").toUpperCase();
    var occurrenceRef = String(payload.occurrence_ref || "");
    var todayDate = _examToday_();
    var occurrenceDate = "";
    var authResult;
    if (occurrenceType === "KBM") {
      if (!occurrenceRef) {
        return {
          status: "error",
          message: "ID jadwal (schedule_id) tidak ditemukan.",
        };
      }
      var schedule = getData("Schedules").find(function (s) {
        return String(s.id) === occurrenceRef;
      });
      if (!schedule) {
        return { status: "error", message: "Jadwal KBM tidak ditemukan." };
      }
      occurrenceDate = String(payload.date || todayDate);
      authResult = _jtmAuthorizeKbm(
        user,
        _isPicketOfficer(user),
        todayDate,
        occurrenceDate,
      );
    } else if (occurrenceType === "EXAM") {
      if (!occurrenceRef) {
        return {
          status: "error",
          message: "ID pengawas (supervisor_id) tidak ditemukan.",
        };
      }
      var supervisor = getData(EXAM_SHEET.SUPERVISORS).find(function (s) {
        return String(s.id) === occurrenceRef;
      });
      if (!supervisor) {
        return { status: "error", message: "Data pengawas tidak ditemukan." };
      }
      var room = _examGetRoom_(supervisor.room_id);
      if (!room)
        return { status: "error", message: "Ruang ujian tidak ditemukan." };
      var session = _examGetSession_(room.session_id);
      if (!session)
        return { status: "error", message: "Sesi ujian tidak ditemukan." };
      occurrenceDate = String(session.date || todayDate);
      var examAuth = _examCheckAdminOrConfirmedPanitia_(user, occurrenceDate);
      authResult = _jtmAuthorizeExam(examAuth, todayDate, occurrenceDate);
    } else if (occurrenceType === "PIKET") {
      if (!occurrenceRef) {
        return {
          status: "error",
          message: "occurrence_ref tidak ditemukan untuk tipe PIKET.",
        };
      }
      var piketParts = occurrenceRef.split("|");
      occurrenceDate = piketParts[1] || todayDate;
      authResult = _jtmAuthorizeKbm(
        user,
        _isPicketOfficer(user),
        todayDate,
        occurrenceDate,
      );
    } else {
      return {
        status: "error",
        message: "Jenis kegiatan (occurrence_type) tidak valid.",
      };
    }
    if (!authResult.ok) {
      return {
        status: "error",
        code: authResult.code,
        message: authResult.message,
      };
    }
    var existing = _jtmFindAdjustmentRow_(occurrenceType, occurrenceRef);
    if (!existing) {
      return {
        status: "error",
        code: "NOT_FOUND",
        message: "Tidak ada penyesuaian JTM aktif untuk kegiatan ini.",
      };
    }
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (lockErr) {
      return {
        status: "error",
        code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
        message: "Sistem sedang sibuk. Silakan coba lagi.",
      };
    }
    try {
      var reallocations = _jtmReadReallocations_(occurrenceType, occurrenceRef);
      for (var i = 0; i < reallocations.length; i++) {
        var realloc = reallocations[i];
        if (realloc.id) {
          try {
            _examDeleteLogByRef_(realloc.id);
          } catch (_) {}
        }
      }
      _jtmDeleteAllReallocationsForOccurrence_(occurrenceType, occurrenceRef);
      _jtmDeleteAdjustment_(occurrenceType, occurrenceRef);
      try {
        _invalidateDataSnapshot();
      } catch (_) {}
      return {
        status: "success",
        message:
          "Penyesuaian JTM berhasil dibatalkan. JTM kembali ke nilai terjadwal.",
      };
    } catch (writeErr) {
      return {
        status: "error",
        code: JTM_ERROR_CODES.PERSISTENCE_FAILED,
        message: "Gagal membatalkan penyesuaian JTM: " + writeErr.message,
      };
    } finally {
      try {
        lock.releaseLock();
      } catch (_) {}
    }
  } catch (e) {
    return { status: "error", message: "Terjadi kesalahan: " + e.message };
  }
}
function _jtmDeleteAllReallocationsForOccurrence_(
  occurrenceType,
  occurrenceRef,
) {
  var sheet = _jtmGetReallocationsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  var col = _jtmColMap_(sheet);
  var typeIdx = col["occurrence_type"];
  var refIdx = col["occurrence_ref"];
  var type = String(occurrenceType);
  var ref = String(occurrenceRef);
  var deleted = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][typeIdx]) === type && String(data[i][refIdx]) === ref) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }
  return deleted;
}
function _jtmDeleteKbmOriginalLog_(scheduleId, occurrenceDate, userId) {
  var schedId = String(scheduleId || "");
  if (!schedId) return 0;
  var sheet = getSheet(SHEET_NAME.LOGS);
  if (!sheet) return 0;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  var col = _jtmColMap_(sheet);
  var schedIdx = col["schedule_id"];
  var dateIdx = col["date"];
  var userIdx = col["user_id"];
  if (schedIdx === undefined || dateIdx === undefined) return 0;
  var tz = Session.getScriptTimeZone();
  var dateStr =
    occurrenceDate instanceof Date
      ? Utilities.formatDate(occurrenceDate, tz, "yyyy-MM-dd")
      : String(occurrenceDate || "");
  var filterUserId =
    userId !== undefined && userId !== null && String(userId).trim() !== ""
      ? String(userId).trim()
      : null;
  var deleted = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][schedIdx]) !== schedId) continue;
    if (dateStr) {
      var logDateVal = data[i][dateIdx];
      var logDateStr =
        logDateVal instanceof Date
          ? Utilities.formatDate(logDateVal, tz, "yyyy-MM-dd")
          : String(logDateVal);
      if (logDateStr !== dateStr) continue;
    }
    if (filterUserId !== null && userIdx !== undefined) {
      if (String(data[i][userIdx]) !== filterUserId) continue;
    }
    sheet.deleteRow(i + 1);
    deleted++;
  }
  return deleted;
}
function _jtmReverseOccurrence_(type, ref, date, originalUserId) {
  var occurrenceType = String(type || "").toUpperCase();
  var occurrenceRef = String(ref || "");
  if (!occurrenceRef) return;
  var reallocations = [];
  try {
    reallocations = _jtmReadReallocations_(occurrenceType, occurrenceRef) || [];
  } catch (e) {
    reallocations = [];
  }
  for (var i = 0; i < reallocations.length; i++) {
    var reallocationId = String(
      (reallocations[i] && reallocations[i].id) || "",
    );
    if (!reallocationId) continue;
    try {
      _examDeleteLogByRef_(reallocationId);
    } catch (e) {}
  }
  try {
    _jtmDeleteReallocationsForOccurrence_(occurrenceType, occurrenceRef);
  } catch (e) {}
  try {
    _jtmDeleteAdjustment_(occurrenceType, occurrenceRef);
  } catch (e) {}
  if (occurrenceType === "EXAM") {
    try {
      _examDeleteLogByRef_(occurrenceRef);
    } catch (e) {}
  } else if (occurrenceType === "KBM") {
    try {
      _jtmDeleteKbmOriginalLog_(occurrenceRef, date, originalUserId);
    } catch (e) {}
  }
  try {
    _invalidateDataSnapshot();
  } catch (e) {}
}
