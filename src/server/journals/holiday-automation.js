function generateAutoJurnalForHoliday(token, targetDate) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    return _runAutoJurnalForHoliday_(user.id, user.full_name, targetDate);
  } catch (error) {
    return { status: "error", message: error.toString() };
  }
}
function _runAutoJurnalForHoliday_(actorUserId, actorName, targetDate) {
  try {
    const checkDate = targetDate ? new Date(targetDate) : new Date();
    const dateStr = Utilities.formatDate(
      checkDate,
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    const dayIndex = checkDate.getDay();
    const lockId = `AUTO_JURNAL_${dateStr}`;
    const lockSheet = getSheet("System_Locks");
    const lockData = lockSheet.getDataRange().getValues();
    const existingLock = lockData.find(
      (row) => row[0] === lockId && row[1] === "COMPLETED",
    );
    if (existingLock) {
      return {
        status: "info",
        message: "Auto-jurnal untuk hari ini sudah pernah berhasil dibuat",
        date: dateStr,
        locked: true,
        locked_at: existingLock[2],
      };
    }
    const holidays = getData("Academic_Calendar");
    const holiday = holidays.find((h) => {
      const hDate = new Date(h.date);
      const hDateStr = Utilities.formatDate(
        hDate,
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return (
        hDateStr === dateStr && String(h.is_holiday).toLowerCase() === "true"
      );
    });
    if (!holiday) {
      return {
        status: "error",
        message: "Hari ini bukan hari libur",
        date: dateStr,
      };
    }
    const holidayDesc = holiday.description || "Hari Libur";
    const lockTimestamp = Utilities.formatDate(
      new Date(),
      "Asia/Jakarta",
      "yyyy-MM-dd HH:mm:ss",
    );
    lockSheet.appendRow([
      lockId,
      "RUNNING",
      lockTimestamp,
      actorUserId || "SYSTEM",
      "",
    ]);
    const sheet = getSheet("Teaching_Logs");
    const sheetCols = Math.max(sheet.getLastColumn(), 10);
    // Ambil konfigurasi aktif (tahun pelajaran & semester)
    const configRaw = getData("Config");
    const cfg = {};
    (configRaw || []).forEach((c) => { cfg[c.key] = c.value; });
    const activeTP = cfg["tahun_pelajaran"] || "";
    const activeSem = cfg["semester"] || "";
    // Filter jadwal: hanya hari yang sama DAN semester/tahun pelajaran yang aktif
    const allSchedules = getData("Schedules").filter((s) => {
      if (String(s.day_index).trim() !== String(dayIndex)) return false;
      const sTP = s.tahun_pelajaran || activeTP;
      const sSem = s.semester || activeSem;
      return sTP === activeTP && sSem === activeSem;
    });
    const allLogsToday = getData("Teaching_Logs").filter((l) => {
      try {
        return (
          Utilities.formatDate(
            new Date(l.date),
            "Asia/Jakarta",
            "yyyy-MM-dd",
          ) === dateStr
        );
      } catch (_) {
        return false;
      }
    });
    const autoLogKeys = new Set();
    const manualLogKeys = new Set();
    allLogsToday.forEach((l) => {
      const k = String(l.user_id) + "|" + String(l.schedule_id);
      const notes = String(l.notes || "");
      if (notes.includes("Auto-generated: Libur Bonus")) {
        autoLogKeys.add(k);
      } else if (!notes.includes("Auto-generated")) {
        manualLogKeys.add(k);
      }
    });
    const generatedLogs = [];
    const skippedEntries = [];
    const newRowsToWrite = [];
    function _bufferLog(row, summary) {
      newRowsToWrite.push(row);
      autoLogKeys.add(String(row[2]) + "|" + String(row[1]));
      generatedLogs.push(summary);
    }
    allSchedules.forEach((schedule) => {
      try {
        if (
          schedule.status &&
          String(schedule.status).toLowerCase() !== "active"
        ) {
          skippedEntries.push({
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            reason: "SCHEDULE_NOT_ACTIVE",
          });
          return;
        }
        const key = String(schedule.user_id) + "|" + String(schedule.id);
        if (autoLogKeys.has(key)) {
          skippedEntries.push({
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            reason: "EXACT_DUPLICATE",
          });
          return;
        }
        if (manualLogKeys.has(key)) {
          skippedEntries.push({
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            reason: "HAS_MANUAL_LOG",
          });
          return;
        }
        const newLogId = generateId("LOG-AUTO");
        const timeStr = Utilities.formatDate(
          new Date(),
          "Asia/Jakarta",
          "HH:mm:ss",
        );
        const materiOtomatis =
          `[LIBUR: ${holidayDesc}] - Bonus JTM Otomatis | ` +
          `Jadwal: ${schedule.subject} Kelas ${schedule.class_name} | ` +
          `JTM: ${schedule.jtm_val}`;
        _bufferLog(
          [
            newLogId,
            schedule.id,
            schedule.user_id,
            dateStr,
            materiOtomatis,
            0,
            0,
            "Auto-generated: Libur Bonus | Idempotent: " + lockId,
            Number(schedule.jtm_val) || 0,
            timeStr,
          ],
          {
            log_id: newLogId,
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            subject: schedule.subject,
            class_name: schedule.class_name,
            jtm_val: Number(schedule.jtm_val) || 0,
          },
        );
      } catch (errSchedule) {
        skippedEntries.push({
          user_id: schedule && schedule.user_id,
          schedule_id: schedule && schedule.id,
          reason: "ERROR: " + errSchedule.toString(),
        });
      }
    });
    const todayPickets = getData("Picket_Schedules").filter(
      (p) => Number(p.day_index) === dayIndex,
    );
    todayPickets.forEach((picket) => {
      try {
        const picketUserId = String(picket.user_id || "").trim();
        if (!picketUserId) return;
        const key = picketUserId + "|PICKET-DUTY";
        if (autoLogKeys.has(key) || manualLogKeys.has(key)) {
          skippedEntries.push({
            user_id: picketUserId,
            schedule_id: "PICKET-DUTY",
            reason: "ALREADY_CONFIRMED",
          });
          return;
        }
        const newLogId = generateId("LOG-PCK-AUTO");
        const timeStr = Utilities.formatDate(
          new Date(),
          "Asia/Jakarta",
          "HH:mm:ss",
        );
        _bufferLog(
          [
            newLogId,
            "PICKET-DUTY",
            picketUserId,
            dateStr,
            "Melaksanakan Tugas Piket — Auto-confirmed (" + holidayDesc + ")",
            0,
            0,
            "Auto-generated: Libur Bonus | Idempotent: " + lockId,
            4,
            timeStr,
          ],
          {
            log_id: newLogId,
            user_id: picketUserId,
            schedule_id: "PICKET-DUTY",
            subject: "Tugas Piket",
            class_name: "-",
            jtm_val: 4,
          },
        );
      } catch (errPicket) {
        skippedEntries.push({
          user_id: picket && picket.user_id,
          schedule_id: "PICKET-DUTY",
          reason: "ERROR: " + errPicket.toString(),
        });
      }
    });
    if (dayIndex === 1) {
      const todayCeremonies = getData("Ceremony_Schedules").filter((c) => {
        try {
          return (
            Utilities.formatDate(
              new Date(c.date),
              "Asia/Jakarta",
              "yyyy-MM-dd",
            ) === dateStr
          );
        } catch (_) {
          return false;
        }
      });
      todayCeremonies.forEach((cer) => {
        try {
          const cerUserId = String(cer.user_id || "").trim();
          if (!cerUserId) return;
          const key = cerUserId + "|CEREMONY-DUTY";
          if (autoLogKeys.has(key) || manualLogKeys.has(key)) {
            skippedEntries.push({
              user_id: cerUserId,
              schedule_id: "CEREMONY-DUTY",
              reason: "ALREADY_CONFIRMED",
            });
            return;
          }
          const newLogId = generateId("LOG-CER-AUTO");
          const timeStr = Utilities.formatDate(
            new Date(),
            "Asia/Jakarta",
            "HH:mm:ss",
          );
          _bufferLog(
            [
              newLogId,
              "CEREMONY-DUTY",
              cerUserId,
              dateStr,
              "Melaksanakan Tugas Pembina Upacara — Auto-confirmed (" +
                holidayDesc +
                ")",
              0,
              0,
              "Auto-generated: Libur Bonus | Idempotent: " + lockId,
              5,
              timeStr,
            ],
            {
              log_id: newLogId,
              user_id: cerUserId,
              schedule_id: "CEREMONY-DUTY",
              subject: "Pembina Upacara",
              class_name: "-",
              jtm_val: 5,
            },
          );
        } catch (errCer) {
          skippedEntries.push({
            user_id: cer && cer.user_id,
            schedule_id: "CEREMONY-DUTY",
            reason: "ERROR: " + errCer.toString(),
          });
        }
      });
    }
    if (newRowsToWrite.length > 0) {
      const normalized = newRowsToWrite.map((r) => {
        const out = r.slice(0, sheetCols);
        while (out.length < sheetCols) out.push("");
        return out;
      });
      const startRow = sheet.getLastRow() + 1;
      sheet
        .getRange(startRow, 1, normalized.length, sheetCols)
        .setValues(normalized);
      SpreadsheetApp.flush();
    }
    const lockMetadata = {
      generated_by: actorName || "SYSTEM",
      generated_count: generatedLogs.length,
      total_jtm: generatedLogs.reduce((sum, l) => sum + l.jtm_val, 0),
      holiday_desc: holidayDesc,
    };
    const lockRowIndex = lockData.findIndex((row) => row[0] === lockId);
    if (lockRowIndex > 0) {
      lockSheet.getRange(lockRowIndex + 1, 2).setValue("COMPLETED");
      lockSheet.getRange(lockRowIndex + 1, 4).setValue(actorUserId || "SYSTEM");
      lockSheet
        .getRange(lockRowIndex + 1, 5)
        .setValue(JSON.stringify(lockMetadata));
    } else {
      const newLockData = lockSheet.getDataRange().getValues();
      const runningRowIndex = newLockData.findIndex(
        (row) => row[0] === lockId && row[1] === "RUNNING",
      );
      if (runningRowIndex > 0) {
        lockSheet.getRange(runningRowIndex + 1, 2).setValue("COMPLETED");
        lockSheet
          .getRange(runningRowIndex + 1, 5)
          .setValue(JSON.stringify(lockMetadata));
      }
    }
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    var notifSummary = { sent: 0, failed: 0, recipients: 0 };
    try {
      notifSummary =
        _notifAutoJurnalLiburGenerated_(
          generatedLogs,
          dateStr,
          holidayDesc,
          actorName || "Sistem (Otomatis)",
        ) || notifSummary;
    } catch (errNotif) {
      try {
        console.warn("[autoJurnal] gagal kirim notifikasi: " + errNotif);
      } catch (_) {}
    }
    return {
      status: "success",
      message: `Berhasil membuat ${generatedLogs.length} jurnal otomatis`,
      date: dateStr,
      lock_id: lockId,
      generated: generatedLogs.length,
      skipped: skippedEntries.length,
      details: generatedLogs,
      holiday_description: holidayDesc,
      notification: notifSummary,
    };
  } catch (error) {
    try {
      const lockSheet = getSheet("System_Locks");
      const lockId = `AUTO_JURNAL_${Utilities.formatDate(targetDate ? new Date(targetDate) : new Date(), "Asia/Jakarta", "yyyy-MM-dd")}`;
      const lockData = lockSheet.getDataRange().getValues();
      const lockRowIndex = lockData.findIndex((row) => row[0] === lockId);
      if (lockRowIndex > 0) {
        lockSheet.getRange(lockRowIndex + 1, 2).setValue("FAILED");
        lockSheet.getRange(lockRowIndex + 1, 5).setValue(error.toString());
      }
    } catch (e) {}
    return { status: "error", message: error.toString() };
  }
}
function checkAutoJurnalStatus(token, targetDate) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error" };
    const checkDate = targetDate ? new Date(targetDate) : new Date();
    const dateStr = Utilities.formatDate(
      checkDate,
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    const dayIndex = checkDate.getDay();
    const lockId = `AUTO_JURNAL_${dateStr}`;
    const holidays = getData("Academic_Calendar");
    const holiday = holidays.find((h) => {
      const hDate = new Date(h.date);
      const hDateStr = Utilities.formatDate(
        hDate,
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return (
        hDateStr === dateStr && String(h.is_holiday).toLowerCase() === "true"
      );
    });
    if (!holiday) {
      return { status: "info", is_holiday: false, date: dateStr };
    }
    const lockSheet = getSheet("System_Locks");
    const lockData = lockSheet.getDataRange().getValues();
    const lockRecord = lockData.find((row) => String(row[0]) === lockId);
    let hasAutoJurnal = false;
    let generatedBy = null;
    let generatedAt = null;
    let existingCount = 0;
    const autoLogs = getData("Teaching_Logs").filter((l) => {
      const logDate = Utilities.formatDate(
        new Date(l.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return (
        logDate === dateStr &&
        String(l.notes).includes("Auto-generated: Libur Bonus")
      );
    });
    if (autoLogs.length > 0) {
      hasAutoJurnal = true;
      existingCount = autoLogs.length;
      if (lockRecord) {
        const metadata = lockRecord[4] ? JSON.parse(String(lockRecord[4])) : {};
        generatedBy = metadata.generated_by || "Unknown";
        generatedAt = lockRecord[2]
          ? Utilities.formatDate(
              new Date(lockRecord[2]),
              "Asia/Jakarta",
              "yyyy-MM-dd HH:mm",
            )
          : "Unknown";
      }
    }
    if (String(user.role).toLowerCase() !== "admin") {
      const configRaw2 = getData("Config");
      const cfg2 = {};
      (configRaw2 || []).forEach((c) => { cfg2[c.key] = c.value; });
      const activeTP2 = cfg2["tahun_pelajaran"] || "";
      const activeSem2 = cfg2["semester"] || "";
      const mySchedules = getData("Schedules").filter((s) => {
        if (String(s.user_id) !== String(user.id)) return false;
        if (String(s.day_index) !== String(dayIndex)) return false;
        const sTP = s.tahun_pelajaran || activeTP2;
        const sSem = s.semester || activeSem2;
        return sTP === activeTP2 && sSem === activeSem2;
      });
      const myAutoLogs = autoLogs.filter(
        (l) => String(l.user_id) === String(user.id),
      );
      return {
        status: "success",
        is_holiday: true,
        date: dateStr,
        holiday_description: holiday.description,
        has_auto_jurnal: hasAutoJurnal,
        my_schedule_count: mySchedules.length,
        my_bonus_jtm: mySchedules.reduce(
          (sum, s) => sum + Number(s.jtm_val),
          0,
        ),
        my_auto_logs: myAutoLogs.map((l) => ({
          log_id: l.log_id,
          materi: l.materi,
          jtm_val: l.jtm_val,
        })),
      };
    }
    return {
      status: "success",
      is_holiday: true,
      date: dateStr,
      holiday_description: holiday.description,
      has_auto_jurnal: hasAutoJurnal,
      can_generate: !hasAutoJurnal,
      can_cancel: hasAutoJurnal,
      existing_count: existingCount,
      lock_id: lockId,
      generated_by: generatedBy,
      generated_at: generatedAt,
    };
  } catch (error) {
    return { status: "error", message: error.toString() };
  }
}
function cancelAutoJurnalForHoliday(token, targetDate) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Unauthorized: Hanya admin yang dapat membatalkan",
      };
    }
    const checkDate = targetDate ? new Date(targetDate) : new Date();
    const dateStr = Utilities.formatDate(
      checkDate,
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    const lockId = `AUTO_JURNAL_${dateStr}`;
    const allLogs = getData("Teaching_Logs");
    const autoLogs = allLogs.filter((l) => {
      const logDate = Utilities.formatDate(
        new Date(l.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return (
        logDate === dateStr &&
        String(l.notes).includes("Auto-generated: Libur Bonus")
      );
    });
    if (autoLogs.length === 0) {
      return {
        status: "error",
        message:
          "Tidak ada jurnal otomatis yang dapat dibatalkan untuk hari ini",
        date: dateStr,
      };
    }
    const logsSheet = getSheet("Teaching_Logs");
    const logsData = logsSheet.getDataRange().getValues();
    const deletedLogs = [];
    let totalJtmRemoved = 0;
    const affectedTeacherIds = new Set();
    const users = getData("Users");
    const schedules = getData("Schedules");
    for (let i = logsData.length - 1; i >= 1; i--) {
      const row = logsData[i];
      const rowDate = Utilities.formatDate(
        new Date(row[3]),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      const notes = String(row[7] || "");
      if (
        rowDate === dateStr &&
        notes.includes("Auto-generated: Libur Bonus")
      ) {
        const userId = String(row[2]);
        const scheduleId = String(row[1]);
        const jtmVal = Number(row[8] || 0);
        const teacher = users.find((u) => String(u.id) === userId);
        const schedule = schedules.find((s) => String(s.id) === scheduleId);
        deletedLogs.push({
          log_id: row[0],
          user_id: userId,
          teacher_name: teacher ? teacher.full_name : "Unknown",
          schedule_id: scheduleId,
          subject: schedule ? schedule.subject : "Unknown",
          class_name: schedule ? schedule.class_name : "-",
          jtm_val: jtmVal,
          materi: String(row[4] || ""),
        });
        totalJtmRemoved += jtmVal;
        affectedTeacherIds.add(userId);
        logsSheet.deleteRow(i + 1);
      }
    }
    const lockSheet = getSheet("System_Locks");
    const lockData = lockSheet.getDataRange().getValues();
    for (let i = 1; i < lockData.length; i++) {
      if (String(lockData[i][0]) === lockId) {
        lockSheet.getRange(i + 1, 2).setValue("CANCELLED");
        lockSheet
          .getRange(i + 1, 5)
          .setValue(
            `Cancelled by ${user.full_name} at ${Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")}`,
          );
        break;
      }
    }
    const auditSheet = getSheet("System_Locks");
    const cancelId = `CANCEL_${dateStr}_${new Date().getTime()}`;
    auditSheet.appendRow([
      cancelId,
      "CANCELLED",
      Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"),
      user.id,
      JSON.stringify({
        deleted_count: deletedLogs.length,
        total_jtm_removed: totalJtmRemoved,
        affected_teachers: affectedTeacherIds.size,
        lock_id: lockId,
      }),
    ]);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message: `Berhasil membatalkan ${deletedLogs.length} jurnal otomatis`,
      date: dateStr,
      deleted_count: deletedLogs.length,
      total_jtm_removed: totalJtmRemoved,
      affected_teachers: affectedTeacherIds.size,
      details: deletedLogs,
      cancelled_by: user.full_name,
      cancelled_at: Utilities.formatDate(
        new Date(),
        "Asia/Jakarta",
        "yyyy-MM-dd HH:mm:ss",
      ),
    };
  } catch (error) {
    return {
      status: "error",
      message: "Server error saat pembatalan: " + error.toString(),
    };
  }
}
function runAutoJurnalScheduler() {
  try {
    const now = new Date();
    const dateStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    const holidays = getData("Academic_Calendar");
    const holiday = holidays.find((h) => {
      const hDate = new Date(h.date);
      const hDateStr = Utilities.formatDate(
        hDate,
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return (
        hDateStr === dateStr && String(h.is_holiday).toLowerCase() === "true"
      );
    });
    if (!holiday) {
      console.log(
        "[runAutoJurnalScheduler] " + dateStr + " bukan hari libur. Skip.",
      );
      return { status: "skip", reason: "NOT_HOLIDAY", date: dateStr };
    }
    console.log(
      "[runAutoJurnalScheduler] " +
        dateStr +
        ' adalah hari libur ("' +
        holiday.description +
        '"). Menjalankan auto-jurnal...',
    );
    const result = _runAutoJurnalForHoliday_(
      "SYSTEM",
      "Sistem (Otomatis)",
      dateStr,
    );
    console.log(
      "[runAutoJurnalScheduler] Hasil: " +
        JSON.stringify({
          status: result.status,
          generated: result.generated,
          skipped: result.skipped,
          message: result.message,
          notification: result.notification || null,
        }),
    );
    return result;
  } catch (e) {
    console.error("[runAutoJurnalScheduler] Error: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}
function installAutoJurnalScheduler() {
  try {
    uninstallAutoJurnalScheduler();
    const trigger = ScriptApp.newTrigger("runAutoJurnalScheduler")
      .timeBased()
      .atHour(16)
      .nearMinute(0)
      .everyDays(1)
      .inTimezone("Asia/Jakarta")
      .create();
    console.log(
      "[installAutoJurnalScheduler] Trigger terpasang. ID: " +
        trigger.getUniqueId(),
    );
    return {
      status: "success",
      message: "Trigger otomatis terpasang. Akan jalan setiap hari ~16.00 WIB.",
      trigger_id: trigger.getUniqueId(),
    };
  } catch (e) {
    console.error("[installAutoJurnalScheduler] Error: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}
function uninstallAutoJurnalScheduler() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;
    triggers.forEach((t) => {
      if (t.getHandlerFunction() === "runAutoJurnalScheduler") {
        ScriptApp.deleteTrigger(t);
        removed++;
      }
    });
    console.log(
      "[uninstallAutoJurnalScheduler] " + removed + " trigger dihapus.",
    );
    return { status: "success", removed: removed };
  } catch (e) {
    console.error("[uninstallAutoJurnalScheduler] Error: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}
function getAutoJurnalSchedulerStatus(token) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Hanya admin yang dapat melihat status trigger.",
      };
    }
    const triggers = ScriptApp.getProjectTriggers().filter(
      (t) => t.getHandlerFunction() === "runAutoJurnalScheduler",
    );
    if (triggers.length === 0) {
      return { status: "success", installed: false, count: 0 };
    }
    return {
      status: "success",
      installed: true,
      count: triggers.length,
      trigger_ids: triggers.map((t) => t.getUniqueId()),
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}
function installAutoJurnalSchedulerByAdmin(token) {
  const user = verifySession(token);
  if (!user || String(user.role).toLowerCase() !== "admin") {
    return {
      status: "error",
      message: "Hanya admin yang dapat memasang trigger.",
    };
  }
  return installAutoJurnalScheduler();
}
function uninstallAutoJurnalSchedulerByAdmin(token) {
  const user = verifySession(token);
  if (!user || String(user.role).toLowerCase() !== "admin") {
    return {
      status: "error",
      message: "Hanya admin yang dapat menghapus trigger.",
    };
  }
  return uninstallAutoJurnalScheduler();
}
