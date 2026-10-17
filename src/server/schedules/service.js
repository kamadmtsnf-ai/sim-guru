function getAllSchedulesAdmin(token) {
  const user = verifySession(token);
  if (!user || String(user.role).toLowerCase() !== "admin") return [];
  const rawSchedules = getData("Schedules");
  const teachers = getData("Users");
  return rawSchedules.map((s) => {
    const teacher = teachers.find(
      (t) => String(t.id).trim() === String(s.user_id).trim(),
    );
    let tStart = s.time_start;
    let tEnd = s.time_end;
    if (tStart instanceof Date)
      tStart = Utilities.formatDate(tStart, "Asia/Jakarta", "HH:mm");
    if (tEnd instanceof Date)
      tEnd = Utilities.formatDate(tEnd, "Asia/Jakarta", "HH:mm");
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    return {
      id: s.id,
      user_id: s.user_id,
      guru_name: teacher ? teacher.full_name : "Unknown",
      day_name: days[Number(s.day_index)] || "-",
      day_index: s.day_index,
      time_start: String(tStart).substring(0, 5),
      time_end: String(tEnd).substring(0, 5),
      subject: s.subject,
      class_name: s.class_name,
      jtm_val: s.jtm_val,
      tahun_pelajaran: s.tahun_pelajaran || "",
      semester: s.semester || "",
    };
  });
}
function saveScheduleAdmin(token, data) {
  const user = verifySession(token);
  if (!user || user.role !== "admin")
    return { status: "error", message: "Akses ditolak" };
  const sheet = getSheet("Schedules");
  if (data.id) {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 2).setValue(data.user_id);
        sheet.getRange(i + 1, 3).setValue(getDayName(data.day_index));
        sheet.getRange(i + 1, 4).setValue(data.day_index);
        sheet.getRange(i + 1, 5).setValue(data.time_start);
        sheet.getRange(i + 1, 6).setValue(data.time_end);
        sheet.getRange(i + 1, 7).setValue(data.subject);
        sheet.getRange(i + 1, 8).setValue(data.class_name);
        sheet.getRange(i + 1, 9).setValue(data.jtm_val);
        sheet.getRange(i + 1, 10).setValue(data.tahun_pelajaran || "");
        sheet.getRange(i + 1, 11).setValue(data.semester || "");
        return { status: "success" };
      }
    }
  } else {
    const newId = generateId("SCH");
    sheet.appendRow([
      newId,
      data.user_id,
      getDayName(data.day_index),
      data.day_index,
      data.time_start,
      data.time_end,
      data.subject,
      data.class_name,
      data.jtm_val,
      data.tahun_pelajaran || "",
      data.semester || "",
    ]);
  }
  return { status: "success" };
}
function deleteScheduleAdmin(token, id) {
  return deleteRowById(token, "Schedules", id);
}
function deleteMultipleSchedulesAdmin(token, ids) {
  const user = verifySession(token);
  if (!user || user.role !== "admin") {
    return { status: "error", message: "Akses ditolak." };
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return { status: "error", message: "Tidak ada data yang dipilih." };
  }
  let successCount = 0;
  for (const id of ids) {
    const res = deleteRowById(token, "Schedules", id);
    if (res && res.status === "success") {
      successCount++;
    }
  }
  return {
    status: "success",
    message: `${successCount} dari ${ids.length} jadwal berhasil dihapus.`,
  };
}
function getMyWeeklyData(token) {
  const user = verifySession(token);
  if (!user) return { status: "error" };
  const allSchedules = getData("Schedules");
  const config = {};
  (getData("Config") || []).forEach((c) => {
    config[c.key] = c.value;
  });
  const activeTP = config.tahun_pelajaran || "";
  const activeSem = config.semester || "";
  const mySchedules = allSchedules.filter((s) => {
    const isMe = String(s.user_id).trim() === String(user.id).trim();
    const sTP = s.tahun_pelajaran || activeTP;
    const sSem = s.semester || activeSem;
    return isMe && sTP === activeTP && sSem === activeSem;
  });
  const formattedSchedules = mySchedules.map((s) => {
    let tStart = s.time_start;
    let tEnd = s.time_end;
    if (tStart instanceof Date)
      tStart = Utilities.formatDate(tStart, "Asia/Jakarta", "HH:mm");
    if (tEnd instanceof Date)
      tEnd = Utilities.formatDate(tEnd, "Asia/Jakarta", "HH:mm");
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    return {
      ...s,
      day_name: days[Number(s.day_index)] || "-",
      time_start: String(tStart).substring(0, 5),
      time_end: String(tEnd).substring(0, 5),
    };
  });
  formattedSchedules.sort((a, b) => {
    if (Number(a.day_index) !== Number(b.day_index))
      return Number(a.day_index) - Number(b.day_index);
    return a.time_start.localeCompare(b.time_start);
  });
  const pickets = getData("Picket_Schedules").filter(
    (p) => String(p.user_id).trim() === String(user.id).trim(),
  );
  const picketDays = pickets.map((p) => {
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    return days[Number(p.day_index)];
  });
  const allowances = getData("Allowances").filter(
    (a) => String(a.user_id).trim() === String(user.id).trim(),
  );
  const cleanAllowances = allowances.map((a) => ({
    duty_name: a.duty_name,
    amount: formatRupiah(a.amount),
    raw_amount: Number(a.amount) || 0
  }));
  const allCeremonies = getData("Ceremony_Schedules");
  const todayDate = new Date();
  const todayStr = Utilities.formatDate(
    todayDate,
    "Asia/Jakarta",
    "yyyy-MM-dd",
  );
  const allLogs = getData("Teaching_Logs");
  const myCeremonies = allCeremonies
    .filter((c) => {
      const isMe = String(c.user_id).trim() === String(user.id).trim();
      const cTP = c.tahun_pelajaran || activeTP;
      const cSem = c.semester || activeSem;
      return isMe && cTP === activeTP && cSem === activeSem;
    })
    .map((c) => {
      const dateStr = safeDate(c.date);
      const cDate = new Date(dateStr + "T00:00:00");
      const tDate = new Date(todayStr + "T00:00:00");
      const isPast = cDate < tDate;
      const isToday = dateStr === todayStr;
      const isConfirmed = allLogs.some(
        (l) =>
          String(l.schedule_id) === "CEREMONY-DUTY" &&
          safeDate(l.date) === dateStr &&
          String(l.user_id) === String(user.id),
      );
      return {
        id: String(c.id),
        date: dateStr,
        date_formatted: formatDateIndo(dateStr),
        is_past: isPast,
        is_today: isToday,
        is_confirmed: isConfirmed,
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return {
    status: "success",
    schedules: formattedSchedules,
    picket_days: picketDays,
    allowances: cleanAllowances,
    ceremony_assignments: myCeremonies,
  };
}
function getDayName(index) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[index] || "";
}
