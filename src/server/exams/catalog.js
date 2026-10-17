function _examNow_() {
  return Utilities.formatDate(
    new Date(),
    "Asia/Jakarta",
    "yyyy-MM-dd'T'HH:mm:ss",
  );
}
function _examToday_() {
  return Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
}
function _examGetSession_(session_id) {
  return (
    getData(EXAM_SHEET.SESSIONS).find(
      (s) => String(s.id) === String(session_id),
    ) || null
  );
}
function _examGetRoom_(room_id) {
  return (
    getData(EXAM_SHEET.ROOMS).find((r) => String(r.id) === String(room_id)) ||
    null
  );
}
function _examGetRoomsBySession_(session_id) {
  return getData(EXAM_SHEET.ROOMS).filter(
    (r) => String(r.session_id) === String(session_id),
  );
}
function _examGetSessionsByPeriod_(period_id) {
  return getData(EXAM_SHEET.SESSIONS).filter(
    (s) => String(s.period_id) === String(period_id),
  );
}
function _examDeleteBySet_(sheetName, colIndex, valueSet) {
  if (!valueSet || valueSet.size === 0) return;
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (valueSet.has(String(data[i][colIndex]))) {
      sheet.deleteRow(i + 1);
    }
  }
}
function _examDeleteById_(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
function _examFormatTime_(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Jakarta", "HH:mm");
  }
  return String(val || "").substring(0, 5);
}
function _examCheckSupervisorConflict_(user_id, session_id, exclude_sup_id) {
  const session = _examGetSession_(session_id);
  if (!session) return "Sesi ujian tidak ditemukan.";
  const targetDate = String(session.date);
  const sessionRoomIds = new Set(
    _examGetRoomsBySession_(session_id).map((r) => String(r.id)),
  );
  const conflictSameSesi = getData(EXAM_SHEET.SUPERVISORS).some(
    (sup) =>
      String(sup.user_id) === String(user_id) &&
      String(sup.status) === "active" &&
      sessionRoomIds.has(String(sup.room_id)) &&
      (!exclude_sup_id || String(sup.id) !== String(exclude_sup_id)),
  );
  if (conflictSameSesi) {
    return "Guru ini sudah menjadi pengawas di ruang lain pada sesi yang sama.";
  }
  return null;
}
function _examCheckCommitteeConflict_(user_id, date, exclude_com_id) {
  const targetDate = String(date);
  const alreadyCommittee = getData(EXAM_SHEET.COMMITTEE).some(
    (c) =>
      String(c.user_id) === String(user_id) &&
      String(c.date) === targetDate &&
      String(c.status) === "active" &&
      (!exclude_com_id || String(c.id) !== String(exclude_com_id)),
  );
  if (alreadyCommittee) {
    return "Guru ini sudah terdaftar sebagai Panitia pada tanggal tersebut.";
  }
  return null;
}
function getExamPeriods(token) {
  try {
    const user = verifySession(token);
    if (!user)
      return {
        status: "error",
        message: "Sesi tidak valid, silakan login kembali.",
      };
    const today = _examToday_();
    const data = getData(EXAM_SHEET.PERIODS)
      .map((p) => {
        const ds = String(p.date_start);
        const de = String(p.date_end);
        let periodStatus;
        if (today < ds) periodStatus = "Akan Datang";
        else if (today > de) periodStatus = "Selesai";
        else periodStatus = "Berlangsung";
        return {
          id: String(p.id),
          name: String(p.name || ""),
          date_start: ds,
          date_end: de,
          jtm_committee_per_day: Number(p.jtm_committee_per_day) || 0,
          description: String(p.description || ""),
          created_by: String(p.created_by || ""),
          created_at: String(p.created_at || ""),
          status: periodStatus,
        };
      })
      .sort((a, b) => b.date_start.localeCompare(a.date_start));
    return { status: "success", data };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function addExamPeriod(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat membuat periode ujian.",
      };
    }
    if (!data.name || !String(data.name).trim()) {
      return { status: "error", message: "Nama periode ujian wajib diisi." };
    }
    if (!data.date_start) {
      return { status: "error", message: "Tanggal mulai wajib diisi." };
    }
    if (!data.date_end) {
      return { status: "error", message: "Tanggal selesai wajib diisi." };
    }
    if (String(data.date_start) > String(data.date_end)) {
      return {
        status: "error",
        message: "Tanggal mulai tidak boleh setelah tanggal selesai.",
      };
    }
    const jtm = Number(data.jtm_committee_per_day);
    if (isNaN(jtm) || jtm < 0) {
      return {
        status: "error",
        message: "Nilai JTM Panitia per hari harus berupa angka (minimal 0).",
      };
    }
    const newId = "EXP-" + new Date().getTime();
    getSheet(EXAM_SHEET.PERIODS).appendRow([
      newId,
      String(data.name).trim(),
      String(data.date_start),
      String(data.date_end),
      jtm,
      String(data.description || "").trim(),
      String(user.id),
      _examNow_(),
    ]);
    SpreadsheetApp.flush();
    return {
      status: "success",
      message: "Periode ujian berhasil dibuat.",
      id: newId,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function editExamPeriod(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message:
          "Akses ditolak. Hanya Admin yang dapat mengedit periode ujian.",
      };
    }
    if (!data.id)
      return { status: "error", message: "ID periode tidak ditemukan." };
    if (!data.name || !String(data.name).trim()) {
      return { status: "error", message: "Nama periode wajib diisi." };
    }
    if (!data.date_start || !data.date_end) {
      return {
        status: "error",
        message: "Tanggal mulai dan selesai wajib diisi.",
      };
    }
    if (String(data.date_start) > String(data.date_end)) {
      return {
        status: "error",
        message: "Tanggal mulai tidak boleh setelah tanggal selesai.",
      };
    }
    const jtm = Number(data.jtm_committee_per_day);
    if (isNaN(jtm) || jtm < 0) {
      return {
        status: "error",
        message: "Nilai JTM Panitia per hari harus berupa angka (minimal 0).",
      };
    }
    const existing = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(data.id),
    );
    if (!existing)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    if (_examToday_() >= String(existing.date_start)) {
      return {
        status: "error",
        message: "Periode yang sudah dimulai atau selesai tidak dapat diedit.",
      };
    }
    const sheet = getSheet(EXAM_SHEET.PERIODS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 2).setValue(String(data.name).trim());
        sheet.getRange(i + 1, 3).setValue(String(data.date_start));
        sheet.getRange(i + 1, 4).setValue(String(data.date_end));
        sheet.getRange(i + 1, 5).setValue(jtm);
        sheet
          .getRange(i + 1, 6)
          .setValue(String(data.description || "").trim());
        return {
          status: "success",
          message: "Periode ujian berhasil diperbarui.",
        };
      }
    }
    return { status: "error", message: "Periode ujian tidak ditemukan." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function deleteExamPeriod(token, id, force) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message:
          "Akses ditolak. Hanya Admin yang dapat menghapus periode ujian.",
      };
    }
    if (!id) return { status: "error", message: "ID periode tidak ditemukan." };
    const existing = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(id),
    );
    if (!existing)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    const sessions = _examGetSessionsByPeriod_(id);
    const sessionIds = new Set(sessions.map((s) => String(s.id)));
    const allRooms = getData(EXAM_SHEET.ROOMS);
    const rooms = allRooms.filter((r) => sessionIds.has(String(r.session_id)));
    const roomIds = new Set(rooms.map((r) => String(r.id)));
    const allSups = getData(EXAM_SHEET.SUPERVISORS);
    const supervisors = allSups.filter((sup) =>
      roomIds.has(String(sup.room_id)),
    );
    const supIds = new Set(supervisors.map((s) => String(s.id)));
    const allCom = getData(EXAM_SHEET.COMMITTEE);
    const committee = allCom.filter((c) => String(c.period_id) === String(id));
    if (!force) {
      const hasConfirmedSup = supervisors.some(
        (sup) => sup.confirmed_by && String(sup.confirmed_by).trim() !== "",
      );
      const hasConfirmedCom = committee.some(
        (c) => c.confirmed_by && String(c.confirmed_by).trim() !== "",
      );
      if (hasConfirmedSup || hasConfirmedCom) {
        return {
          status: "confirm_required",
          message:
            "Periode ini sudah memiliki data konfirmasi dan JTM terhitung. " +
            "Penghapusan akan menghapus semua data terkait secara permanen. Lanjutkan?",
        };
      }
    } else {
      supIds.forEach(function (supId) {
        _examDeleteLogByRef_(supId);
      });
      committee.forEach(function (c) {
        _examDeleteLogByRef_(String(c.id));
      });
    }
    _examDeleteBySet_(EXAM_SHEET.BAP, 1, supIds);
    _examDeleteBySet_(EXAM_SHEET.SUPERVISORS, 1, roomIds);
    _examDeleteBySet_(EXAM_SHEET.ROOMS, 1, sessionIds);
    const sesSheet = getSheet(EXAM_SHEET.SESSIONS);
    const sesData = sesSheet.getDataRange().getValues();
    for (let i = sesData.length - 1; i >= 1; i--) {
      if (String(sesData[i][1]) === String(id)) sesSheet.deleteRow(i + 1);
    }
    const comSheet = getSheet(EXAM_SHEET.COMMITTEE);
    const comData = comSheet.getDataRange().getValues();
    for (let i = comData.length - 1; i >= 1; i--) {
      if (String(comData[i][1]) === String(id)) comSheet.deleteRow(i + 1);
    }
    _examDeleteById_(EXAM_SHEET.PERIODS, id);
    return {
      status: "success",
      message: "Periode ujian dan semua data terkait berhasil dihapus.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function addExamSession(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menambah sesi ujian.",
      };
    }
    if (!data.period_id)
      return { status: "error", message: "ID periode wajib diisi." };
    if (!data.date)
      return { status: "error", message: "Tanggal sesi wajib diisi." };
    if (!data.session_name || !String(data.session_name).trim()) {
      return { status: "error", message: "Nama sesi wajib diisi." };
    }
    if (!data.time_start)
      return { status: "error", message: "Jam mulai sesi wajib diisi." };
    if (!data.time_end)
      return { status: "error", message: "Jam selesai sesi wajib diisi." };
    const ts = String(data.time_start).substring(0, 5);
    const te = String(data.time_end).substring(0, 5);
    if (ts >= te) {
      return {
        status: "error",
        message: "Jam mulai harus sebelum jam selesai.",
      };
    }
    const jtm = Number(data.jtm_val);
    if (isNaN(jtm) || jtm < 0) {
      return {
        status: "error",
        message: "Nilai JTM per sesi harus berupa angka (minimal 0).",
      };
    }
    const period = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(data.period_id),
    );
    if (!period)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    const sesDate = String(data.date);
    if (
      sesDate < String(period.date_start) ||
      sesDate > String(period.date_end)
    ) {
      return {
        status: "error",
        message:
          "Tanggal sesi harus berada dalam rentang periode ujian (" +
          period.date_start +
          " s.d. " +
          period.date_end +
          ").",
      };
    }
    const newId = "EXS-" + new Date().getTime();
    getSheet(EXAM_SHEET.SESSIONS).appendRow([
      newId,
      String(data.period_id),
      sesDate,
      String(data.session_name).trim(),
      ts,
      te,
      jtm,
    ]);
    SpreadsheetApp.flush();
    return {
      status: "success",
      message: "Sesi ujian berhasil ditambahkan.",
      id: newId,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function editExamSession(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat mengedit sesi ujian.",
      };
    }
    if (!data.id)
      return { status: "error", message: "ID sesi tidak ditemukan." };
    if (!data.session_name || !String(data.session_name).trim()) {
      return { status: "error", message: "Nama sesi wajib diisi." };
    }
    if (!data.time_start || !data.time_end) {
      return {
        status: "error",
        message: "Jam mulai dan jam selesai wajib diisi.",
      };
    }
    const ts = String(data.time_start).substring(0, 5);
    const te = String(data.time_end).substring(0, 5);
    if (ts >= te) {
      return {
        status: "error",
        message: "Jam mulai harus sebelum jam selesai.",
      };
    }
    const jtm = Number(data.jtm_val);
    if (isNaN(jtm) || jtm < 0) {
      return {
        status: "error",
        message: "Nilai JTM per sesi harus berupa angka (minimal 0).",
      };
    }
    const roomIds = new Set(
      _examGetRoomsBySession_(data.id).map((r) => String(r.id)),
    );
    const hasConfirmed = getData(EXAM_SHEET.SUPERVISORS).some(
      (sup) =>
        roomIds.has(String(sup.room_id)) &&
        sup.confirmed_by &&
        String(sup.confirmed_by).trim() !== "",
    );
    if (hasConfirmed) {
      return {
        status: "error",
        message:
          "Sesi ini sudah memiliki pengawas yang dikonfirmasi kehadirannya dan tidak dapat diedit.",
      };
    }
    const sheet = getSheet(EXAM_SHEET.SESSIONS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 4).setValue(String(data.session_name).trim());
        sheet.getRange(i + 1, 5).setValue(ts);
        sheet.getRange(i + 1, 6).setValue(te);
        sheet.getRange(i + 1, 7).setValue(jtm);
        return {
          status: "success",
          message: "Sesi ujian berhasil diperbarui.",
        };
      }
    }
    return { status: "error", message: "Sesi ujian tidak ditemukan." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function deleteExamSession(token, id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menghapus sesi ujian.",
      };
    }
    if (!id) return { status: "error", message: "ID sesi tidak ditemukan." };
    const rooms = _examGetRoomsBySession_(id);
    const roomIds = new Set(rooms.map((r) => String(r.id)));
    const allSups = getData(EXAM_SHEET.SUPERVISORS);
    const supervisors = allSups.filter((sup) =>
      roomIds.has(String(sup.room_id)),
    );
    const supIds = new Set(supervisors.map((s) => String(s.id)));
    const hasConfirmed = supervisors.some(
      (sup) => sup.confirmed_by && String(sup.confirmed_by).trim() !== "",
    );
    if (hasConfirmed) {
      return {
        status: "error",
        message:
          "Sesi ini sudah memiliki pengawas yang dikonfirmasi kehadirannya dan tidak dapat dihapus.",
      };
    }
    _examDeleteBySet_(EXAM_SHEET.BAP, 1, supIds);
    _examDeleteBySet_(EXAM_SHEET.SUPERVISORS, 1, roomIds);
    _examDeleteBySet_(EXAM_SHEET.ROOMS, 1, new Set([String(id)]));
    _examDeleteById_(EXAM_SHEET.SESSIONS, id);
    return { status: "success", message: "Sesi ujian berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function addExamRoom(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menambah ruang ujian.",
      };
    }
    if (!data.session_id)
      return { status: "error", message: "ID sesi wajib diisi." };
    if (!data.room_name || !String(data.room_name).trim())
      return { status: "error", message: "Nama/nomor ruang wajib diisi." };
    if (!data.subject || !String(data.subject).trim())
      return { status: "error", message: "Mata ujian wajib diisi." };
    if (!data.class_name || !String(data.class_name).trim())
      return { status: "error", message: "Nama kelas wajib diisi." };
    const totalSiswa = Number(data.total_siswa) || 0;
    if (totalSiswa < 0) {
      return { status: "error", message: "Total siswa tidak boleh negatif." };
    }
    if (!_examGetSession_(data.session_id)) {
      return { status: "error", message: "Sesi ujian tidak ditemukan." };
    }
    const newId = "EXR-" + new Date().getTime();
    getSheet(EXAM_SHEET.ROOMS).appendRow([
      newId,
      String(data.session_id),
      String(data.room_name).trim(),
      String(data.subject).trim(),
      String(data.class_name).trim(),
      totalSiswa,
    ]);
    SpreadsheetApp.flush();
    return {
      status: "success",
      message: "Ruang ujian berhasil ditambahkan.",
      id: newId,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function editExamRoom(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat mengedit ruang ujian.",
      };
    }
    if (!data.id)
      return { status: "error", message: "ID ruang tidak ditemukan." };
    if (!data.room_name || !String(data.room_name).trim())
      return { status: "error", message: "Nama/nomor ruang wajib diisi." };
    if (!data.subject || !String(data.subject).trim())
      return { status: "error", message: "Mata ujian wajib diisi." };
    if (!data.class_name || !String(data.class_name).trim())
      return { status: "error", message: "Nama kelas wajib diisi." };
    const totalSiswa = Number(data.total_siswa) || 0;
    if (totalSiswa < 0) {
      return { status: "error", message: "Total siswa tidak boleh negatif." };
    }
    const hasConfirmed = getData(EXAM_SHEET.SUPERVISORS).some(
      (sup) =>
        String(sup.room_id) === String(data.id) &&
        sup.confirmed_by &&
        String(sup.confirmed_by).trim() !== "",
    );
    if (hasConfirmed) {
      return {
        status: "error",
        message:
          "Ruang ini sudah memiliki pengawas yang dikonfirmasi dan tidak dapat diedit.",
      };
    }
    const sheet = getSheet(EXAM_SHEET.ROOMS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 3).setValue(String(data.room_name).trim());
        sheet.getRange(i + 1, 4).setValue(String(data.subject).trim());
        sheet.getRange(i + 1, 5).setValue(String(data.class_name).trim());
        sheet.getRange(i + 1, 6).setValue(totalSiswa);
        return {
          status: "success",
          message: "Ruang ujian berhasil diperbarui.",
        };
      }
    }
    return { status: "error", message: "Ruang ujian tidak ditemukan." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function deleteExamRoom(token, id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menghapus ruang ujian.",
      };
    }
    if (!id) return { status: "error", message: "ID ruang tidak ditemukan." };
    const allSups = getData(EXAM_SHEET.SUPERVISORS);
    const supsInRoom = allSups.filter(
      (sup) => String(sup.room_id) === String(id),
    );
    const supIds = new Set(supsInRoom.map((s) => String(s.id)));
    const hasConfirmed = supsInRoom.some(
      (sup) => sup.confirmed_by && String(sup.confirmed_by).trim() !== "",
    );
    if (hasConfirmed) {
      return {
        status: "error",
        message:
          "Ruang ini sudah memiliki pengawas yang dikonfirmasi dan tidak dapat dihapus.",
      };
    }
    _examDeleteBySet_(EXAM_SHEET.BAP, 1, supIds);
    _examDeleteBySet_(EXAM_SHEET.SUPERVISORS, 1, new Set([String(id)]));
    _examDeleteById_(EXAM_SHEET.ROOMS, id);
    return { status: "success", message: "Ruang ujian berhasil dihapus." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function assignExamSupervisor(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menetapkan pengawas.",
      };
    }
    if (!data.room_id)
      return { status: "error", message: "ID ruang wajib diisi." };
    if (!data.user_id)
      return { status: "error", message: "ID guru wajib diisi." };
    const room = _examGetRoom_(data.room_id);
    if (!room)
      return { status: "error", message: "Ruang ujian tidak ditemukan." };
    const targetGuru = getData("Users").find(
      (u) => String(u.id) === String(data.user_id),
    );
    if (!targetGuru)
      return { status: "error", message: "Guru tidak ditemukan." };
    const conflict = _examCheckSupervisorConflict_(
      data.user_id,
      room.session_id,
    );
    if (conflict) return { status: "error", message: conflict };
    const session = _examGetSession_(room.session_id);
    let jtmVal = Number(data.jtm_val);
    if (isNaN(jtmVal) || jtmVal < 0) {
      jtmVal = session ? Number(session.jtm_val) || 0 : 0;
    }
    const newId = "EXSUP-" + new Date().getTime();
    getSheet(EXAM_SHEET.SUPERVISORS).appendRow([
      newId,
      String(data.room_id),
      String(data.user_id),
      "active",
      false,
      "",
      "",
      "",
      "",
      "",
      jtmVal,
    ]);
    SpreadsheetApp.flush();
    return {
      status: "success",
      message: "Pengawas berhasil ditetapkan.",
      id: newId,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function editExamSupervisor(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat mengedit pengawas.",
      };
    }
    if (!data || !data.id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    if (!data.user_id)
      return { status: "error", message: "ID guru wajib diisi." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(data.id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    if (target.confirmed_by && String(target.confirmed_by).trim() !== "") {
      return {
        status: "error",
        message:
          "Pengawas yang sudah dikonfirmasi kehadirannya tidak dapat diedit. " +
          "Cabut konfirmasi kehadiran terlebih dahulu.",
      };
    }
    var isSub =
      target.is_substitute === true ||
      String(target.is_substitute).toLowerCase() === "true";
    if (isSub) {
      return {
        status: "error",
        message:
          "Pengawas pengganti tidak dapat diedit langsung. Gunakan tombol Batal Ganti terlebih dahulu.",
      };
    }
    const room = _examGetRoom_(target.room_id);
    if (!room)
      return {
        status: "error",
        message: "Ruang ujian tidak ditemukan untuk pengawas ini.",
      };
    const targetGuru = getData("Users").find(
      (u) => String(u.id) === String(data.user_id),
    );
    if (!targetGuru)
      return { status: "error", message: "Guru tidak ditemukan." };
    var userChanged = String(target.user_id) !== String(data.user_id);
    if (userChanged) {
      const conflict = _examCheckSupervisorConflict_(
        data.user_id,
        room.session_id,
        data.id,
      );
      if (conflict) return { status: "error", message: conflict };
    }
    const session = _examGetSession_(room.session_id);
    let jtmVal = Number(data.jtm_val);
    if (isNaN(jtmVal) || jtmVal < 0) {
      jtmVal = session
        ? Number(session.jtm_val) || 0
        : Number(target.jtm_val) || 0;
    }
    const sheet = getSheet(EXAM_SHEET.SUPERVISORS);
    const rows = sheet.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 1, 3).setValue(String(data.user_id));
        sheet.getRange(i + 1, 11).setValue(jtmVal);
        updated = true;
        break;
      }
    }
    if (!updated)
      return {
        status: "error",
        message: "Gagal memperbarui data pengawas (baris tidak ditemukan).",
      };
    SpreadsheetApp.flush();
    return { status: "success", message: "Data pengawas berhasil diperbarui." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function removeExamSupervisor(token, supervisor_id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menghapus pengawas.",
      };
    }
    if (!supervisor_id)
      return { status: "error", message: "ID pengawas tidak ditemukan." };
    const target = getData(EXAM_SHEET.SUPERVISORS).find(
      (s) => String(s.id) === String(supervisor_id),
    );
    if (!target)
      return { status: "error", message: "Data pengawas tidak ditemukan." };
    if (target.confirmed_by && String(target.confirmed_by).trim() !== "") {
      return {
        status: "error",
        message:
          "Pengawas yang sudah dikonfirmasi kehadirannya tidak dapat dihapus langsung. " +
          "Cabut konfirmasi kehadiran terlebih dahulu.",
      };
    }
    _examDeleteBySet_(EXAM_SHEET.BAP, 1, new Set([String(supervisor_id)]));
    _examDeleteById_(EXAM_SHEET.SUPERVISORS, supervisor_id);
    return {
      status: "success",
      message: "Pengawas berhasil dihapus dari jadwal.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function assignExamCommittee(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menetapkan panitia.",
      };
    }
    if (!data.period_id)
      return { status: "error", message: "ID periode wajib diisi." };
    if (!data.date) return { status: "error", message: "Tanggal wajib diisi." };
    if (!data.user_id)
      return { status: "error", message: "ID guru wajib diisi." };
    const period = getData(EXAM_SHEET.PERIODS).find(
      (p) => String(p.id) === String(data.period_id),
    );
    if (!period)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    const comDate = String(data.date);
    if (
      comDate < String(period.date_start) ||
      comDate > String(period.date_end)
    ) {
      return {
        status: "error",
        message:
          "Tanggal panitia harus berada dalam rentang periode ujian (" +
          period.date_start +
          " s.d. " +
          period.date_end +
          ").",
      };
    }
    const targetGuru = getData("Users").find(
      (u) => String(u.id) === String(data.user_id),
    );
    if (!targetGuru)
      return { status: "error", message: "Guru tidak ditemukan." };
    const conflict = _examCheckCommitteeConflict_(data.user_id, comDate);
    if (conflict) return { status: "error", message: conflict };
    const jtmVal = Number(period.jtm_committee_per_day) || 0;
    const newId = "EXCOM-" + new Date().getTime();
    getSheet(EXAM_SHEET.COMMITTEE).appendRow([
      newId,
      String(data.period_id),
      comDate,
      String(data.user_id),
      jtmVal,
      "active",
      false,
      "",
      "",
      "",
      "",
      "",
    ]);
    SpreadsheetApp.flush();
    return {
      status: "success",
      message: "Panitia berhasil ditetapkan.",
      id: newId,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function removeExamCommittee(token, committee_id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return {
        status: "error",
        message: "Akses ditolak. Hanya Admin yang dapat menghapus panitia.",
      };
    }
    if (!committee_id)
      return { status: "error", message: "ID panitia tidak ditemukan." };
    const target = getData(EXAM_SHEET.COMMITTEE).find(
      (c) => String(c.id) === String(committee_id),
    );
    if (!target)
      return { status: "error", message: "Data panitia tidak ditemukan." };
    if (target.confirmed_by && String(target.confirmed_by).trim() !== "") {
      return {
        status: "error",
        message:
          "Panitia yang sudah dikonfirmasi kehadirannya tidak dapat dihapus langsung. " +
          "Cabut konfirmasi kehadiran terlebih dahulu.",
      };
    }
    _examDeleteById_(EXAM_SHEET.COMMITTEE, committee_id);
    return {
      status: "success",
      message: "Panitia berhasil dihapus dari jadwal.",
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function getExamAdminMasterData(token) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses ditolak." };
    }
    const periodsResult = getExamPeriods(token);
    const periods =
      periodsResult.status === "success" ? periodsResult.data : [];
    const teachers = getData("Users")
      .filter((u) => String(u.role).toLowerCase() !== "admin")
      .map((u) => ({
        id: String(u.id),
        name: String(u.full_name || ""),
        nip: String(u.nip || ""),
        username: String(u.username || ""),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { status: "success", periods, teachers };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
function getExamPeriodDetail(token, period_id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses ditolak." };
    }
    if (!period_id)
      return { status: "error", message: "ID periode wajib diisi." };
    const periods = getData(EXAM_SHEET.PERIODS);
    const period = periods.find((p) => String(p.id) === String(period_id));
    if (!period)
      return { status: "error", message: "Periode ujian tidak ditemukan." };
    const today = _examToday_();
    const ds = String(period.date_start);
    const de = String(period.date_end);
    const periodStatus =
      today < ds ? "Akan Datang" : today > de ? "Selesai" : "Berlangsung";
    const periodObj = {
      id: String(period.id),
      name: String(period.name || ""),
      date_start: ds,
      date_end: de,
      jtm_committee_per_day: Number(period.jtm_committee_per_day) || 0,
      description: String(period.description || ""),
      status: periodStatus,
    };
    const allUsers = getData("Users");
    const allSessions = getData(EXAM_SHEET.SESSIONS).filter(
      (s) => String(s.period_id) === String(period_id),
    );
    const allRooms = getData(EXAM_SHEET.ROOMS);
    const allSups = getData(EXAM_SHEET.SUPERVISORS);
    const allBaps = getData(EXAM_SHEET.BAP);
    const sessions = allSessions
      .sort((a, b) => {
        const da = String(a.date),
          db = String(b.date);
        if (da !== db) return da.localeCompare(db);
        return _examFormatTime_(a.time_start).localeCompare(
          _examFormatTime_(b.time_start),
        );
      })
      .map((s) => {
        const rooms = allRooms
          .filter((r) => String(r.session_id) === String(s.id))
          .map((r) => {
            const supervisors = allSups
              .filter((sup) => String(sup.room_id) === String(r.id))
              .map((sup) => {
                const g = allUsers.find(
                  (u) => String(u.id) === String(sup.user_id),
                );
                const bapEntry = allBaps.find(
                  (b) =>
                    String(b.supervisor_id) === String(sup.id) &&
                    b.submitted_at &&
                    String(b.submitted_at).trim() !== "",
                );
                return {
                  id: String(sup.id),
                  user_id: String(sup.user_id),
                  guru_name: g ? String(g.full_name) : "Tidak Dikenal",
                  status: String(sup.status || "active"),
                  is_substitute:
                    sup.is_substitute === true ||
                    String(sup.is_substitute) === "true",
                  original_user_id: String(sup.original_user_id || ""),
                  confirmed_by: String(sup.confirmed_by || ""),
                  confirmed_at: String(sup.confirmed_at || ""),
                  substitution_cancelled_by: String(
                    sup.substitution_cancelled_by || "",
                  ),
                  substitution_cancelled_at: String(
                    sup.substitution_cancelled_at || "",
                  ),
                  jtm_val: Number(sup.jtm_val) || 0,
                  has_bap: !!bapEntry,
                };
              });
            return {
              id: String(r.id),
              room_name: String(r.room_name || ""),
              subject: String(r.subject || ""),
              class_name: String(r.class_name || ""),
              total_siswa: Number(r.total_siswa) || 0,
              supervisors,
            };
          })
          .sort((a, b) => a.room_name.localeCompare(b.room_name));
        return {
          id: String(s.id),
          date: String(s.date),
          session_name: String(s.session_name || ""),
          time_start: _examFormatTime_(s.time_start),
          time_end: _examFormatTime_(s.time_end),
          jtm_val: Number(s.jtm_val) || 0,
          rooms,
        };
      });
    const committee = getData(EXAM_SHEET.COMMITTEE)
      .filter((c) => String(c.period_id) === String(period_id))
      .map((c) => {
        const g = allUsers.find((u) => String(u.id) === String(c.user_id));
        return {
          id: String(c.id),
          date: String(c.date),
          user_id: String(c.user_id),
          guru_name: g ? String(g.full_name) : "Tidak Dikenal",
          jtm_val: Number(c.jtm_val) || 0,
          status: String(c.status || "active"),
          is_substitute:
            c.is_substitute === true || String(c.is_substitute) === "true",
          original_user_id: String(c.original_user_id || ""),
          confirmed_by: String(c.confirmed_by || ""),
          confirmed_at: String(c.confirmed_at || ""),
          substitution_cancelled_by: String(c.substitution_cancelled_by || ""),
          substitution_cancelled_at: String(c.substitution_cancelled_at || ""),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    return { status: "success", period: periodObj, sessions, committee };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
