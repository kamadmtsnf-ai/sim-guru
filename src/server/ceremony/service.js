function saveCeremonySchedule(token, date, userId) {
  const user = verifySession(token);
  if (!user || user.role !== "admin") return { status: "error" };
  const d = new Date(date + "T00:00:00");
  if (d.getDay() !== 1)
    return {
      status: "error",
      message: "Jadwal upacara hanya boleh pada hari Senin!",
    };
  const existing = getData(SHEET_NAME.CEREMONY_SCHEDULES);
  const duplicate = existing.find((c) => safeDate(c.date) === date);
  if (duplicate)
    return {
      status: "error",
      message: "Tanggal ini sudah memiliki jadwal pembina upacara!",
    };

  const config = {};
  (getData("Config") || []).forEach((c) => { config[c.key] = c.value; });
  const activeTP = String(config.tahun_pelajaran || "").toLowerCase();
  const activeSem = String(config.semester || "");

  const sheet = getSheet("Ceremony_Schedules");
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0] || [];
  if (!headers.some((h) => String(h).toLowerCase().trim() === "tahun_pelajaran")) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue("tahun_pelajaran");
  }
  if (!headers.some((h) => String(h).toLowerCase().trim() === "semester")) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue("semester");
  }

  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newId = generateId("CER");
  const newRow = new Array(updatedHeaders.length).fill("");
  updatedHeaders.forEach((h, i) => {
    const key = String(h).toLowerCase().trim();
    if (key === "id") newRow[i] = newId;
    else if (key === "date") newRow[i] = date;
    else if (key === "user_id") newRow[i] = userId;
    else if (key === "tahun_pelajaran") newRow[i] = activeTP;
    else if (key === "semester") newRow[i] = activeSem;
  });
  
  sheet.appendRow(newRow);
  return { status: "success" };
}
function deleteCeremonySchedule(token, id) {
  return deleteRowById(token, "Ceremony_Schedules", id);
}
function confirmCeremonyLeader(token, userId) {
  const user = verifySession(token);
  if (!user) return { status: "error", message: "Unauthorized" };
  const isAdmin = String(user.role).toLowerCase() === "admin";
  const isSelf = String(user.id) === String(userId);
  if (!isAdmin && !isSelf) {
    return {
      status: "error",
      message: "Hanya admin atau pembina upacara yang berwenang.",
    };
  }
  const attRes = confirmTeacherPresence(token, userId, "");
  if (attRes.status === "error" && attRes.message !== "Sudah dikonfirmasi" && attRes.message !== "Anda tidak berwenang mengonfirmasi kehadiran guru lain.") {
    return attRes;
  }
  const sheet = getSheet("Teaching_Logs");
  const newId = generateId("LOG-CER");
  const todayStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd",
  );
  const existing = getData("Teaching_Logs").find(
    (l) =>
      l.date === todayStr &&
      String(l.user_id) === String(userId) &&
      l.schedule_id === "CEREMONY-DUTY",
  );
  if (existing) return { status: "success", message: "Sudah ada" };
  sheet.appendRow([
    newId,
    "CEREMONY-DUTY",
    userId,
    todayStr,
    "Melaksanakan Tugas Pembina Upacara",
    0,
    0,
    "Dikonfirmasi",
    5,
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm"),
  ]);
  return { status: "success" };
}
function revokeCeremonyLeader(token, userId) {
  const user = verifySession(token);
  if (!user) return { status: "error" };
  const todayStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd",
  );
  const sheet = getSheet("Teaching_Logs");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowDate = Utilities.formatDate(
      new Date(rows[i][3]),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
    if (
      String(rows[i][2]) === String(userId) &&
      rowDate === todayStr &&
      rows[i][1] === "CEREMONY-DUTY"
    ) {
      sheet.deleteRow(i + 1);
      return { status: "success" };
    }
  }
  return { status: "error" };
}
function substituteCeremonyLeader(token, subId) {
  const user = verifySession(token);
  if (!user) return { status: "error", message: "Unauthorized" };
  const isAdmin = String(user.role).toLowerCase() === "admin";
  const isPicketToday = _isPicketOfficer(user);
  if (!isAdmin && !isPicketToday) {
    return {
      status: "error",
      message: "Hanya admin atau guru piket hari ini yang berwenang.",
    };
  }
  const tz = Session.getScriptTimeZone();
  const todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  const sheet = getSheet("Ceremony_Schedules");
  const rows = sheet.getDataRange().getValues();
  let targetRow = -1;
  let originalUserId = null;
  for (let i = 1; i < rows.length; i++) {
    const rowDate = Utilities.formatDate(
      new Date(rows[i][1]),
      tz,
      "yyyy-MM-dd",
    );
    if (rowDate === todayStr) {
      targetRow = i + 1;
      originalUserId = rows[i][2];
      break;
    }
  }
  if (targetRow === -1) {
    return {
      status: "error",
      message: "Jadwal upacara hari ini tidak ditemukan.",
    };
  }
  if (String(subId) === String(originalUserId)) {
    return {
      status: "error",
      message: "Guru tidak dapat menggantikan dirinya sendiri.",
    };
  }
  const subUser = findData("Users", "id", subId);
  if (!subUser)
    return { status: "error", message: "Guru pengganti tidak ditemukan." };
  if (String(subUser.role).toLowerCase() === "admin") {
    return {
      status: "error",
      message: "Admin tidak dapat ditugaskan sebagai pembina upacara.",
    };
  }
  const logSheet = getSheet("Teaching_Logs");
  const logRows = logSheet.getDataRange().getValues();
  for (let i = logRows.length - 1; i >= 1; i--) {
    try {
      const logDate = Utilities.formatDate(
        new Date(logRows[i][3]),
        tz,
        "yyyy-MM-dd",
      );
      if (
        logDate === todayStr &&
        String(logRows[i][1]) === "CEREMONY-DUTY" &&
        String(logRows[i][2]) === String(originalUserId)
      ) {
        logSheet.deleteRow(i + 1);
        break;
      }
    } catch (e) {}
  }
  sheet.getRange(targetRow, 3).setValue(subId);
  return {
    status: "success",
    message:
      "Pembina upacara hari ini diganti menjadi " +
      subUser.full_name +
      ". Pembina baru perlu konfirmasi kehadiran.",
  };
}
