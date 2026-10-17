function _attendanceScheduleColIndex_(sheet) {
  const lastCol = sheet.getLastColumn() || 1;
  const headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
  let idx = headers.indexOf("schedule_id");
  if (idx === -1) {
    sheet.getRange(1, lastCol + 1).setValue("schedule_id");
    idx = lastCol; 
  }
  return idx;
}
function confirmTeacherPresence(token, targetUserId, scheduleId) {
  const user = verifySession(token);
  if (!user) return { status: "error", message: "Unauthorized" };
  const isAdmin = String(user.role).toLowerCase() === "admin";
  const isSelf = String(user.id) === String(targetUserId);
  const isPicketToday = _isPicketOfficer(user);
  if (!isAdmin && !isSelf && !isPicketToday) {
    return {
      status: "error",
      message: "Anda tidak berwenang mengonfirmasi kehadiran guru lain.",
    };
  }
  const schedId =
    scheduleId === undefined || scheduleId === null ? "" : String(scheduleId);
  const todayStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd",
  );
  const sheet = getSheet("Daily_Attendance");
  const schedColIdx = _attendanceScheduleColIndex_(sheet);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowSched = String(
      rows[i][schedColIdx] === undefined ? "" : rows[i][schedColIdx],
    );
    if (
      String(rows[i][2]) === String(targetUserId) &&
      Utilities.formatDate(
        new Date(rows[i][1]),
        Session.getScriptTimeZone(),
        "yyyy-MM-dd",
      ) === todayStr &&
      rowSched === schedId
    ) {
      return { status: "success", message: "Sudah dikonfirmasi" };
    }
  }
  const newId = generateId("ATT");
  const rowData = [newId, todayStr, targetUserId, "Present", new Date()];
  while (rowData.length < schedColIdx) rowData.push("");
  rowData[schedColIdx] = schedId;
  sheet.appendRow(rowData);
  try {
    var byName = String(
      user.full_name ||
        user.name ||
        user.username ||
        (isAdmin ? "Admin" : "Guru Piket"),
    );
    _notifKbmConfirmed_(targetUserId, { byName: byName });
  } catch (_) {}
  return { status: "success" };
}
function revokeTeacherPresence(token, targetUserId, scheduleId) {
  const user = verifySession(token);
  if (!user) return { status: "error", message: "Unauthorized" };
  const isAdmin = String(user.role).toLowerCase() === "admin";
  const isSelf = String(user.id) === String(targetUserId);
  const isPicketToday = _isPicketOfficer(user);
  if (!isAdmin && !isSelf && !isPicketToday) {
    return {
      status: "error",
      message: "Anda tidak berwenang membatalkan kehadiran guru lain.",
    };
  }
  const schedId =
    scheduleId === undefined || scheduleId === null ? "" : String(scheduleId);
  const todayStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd",
  );
  const sheet = getSheet("Daily_Attendance");
  const schedColIdx = _attendanceScheduleColIndex_(sheet);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowDate = Utilities.formatDate(
      new Date(rows[i][1]),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
    const rowSched = String(
      rows[i][schedColIdx] === undefined ? "" : rows[i][schedColIdx],
    );
    if (
      String(rows[i][2]) === String(targetUserId) &&
      rowDate === todayStr &&
      rowSched === schedId
    ) {
      sheet.deleteRow(i + 1);
      try {
        _jtmReverseOccurrence_("KBM", schedId, rowDate, targetUserId);
      } catch (_) {}
      try {
        var byName = String(
          user.full_name ||
            user.name ||
            user.username ||
            (isAdmin ? "Admin" : "Guru Piket"),
        );
        _notifKbmRevoked_(targetUserId, { byName: byName });
      } catch (_) {}
      return { status: "success" };
    }
  }
  return {
    status: "error",
    code: JTM_ERROR_CODES.NO_ACTIVE_CONFIRMATION,
    message: "Data tidak ditemukan",
  };
}
