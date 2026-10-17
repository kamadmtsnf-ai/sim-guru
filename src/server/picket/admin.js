function getAdminDashboardPicketStatus(token) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin")
      return { status: "error", message: "Akses Ditolak." };

    const tz = Session.getScriptTimeZone();
    const now = new Date();
    const todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const dayIndex = _getIndoDayIndex();

    const snap = _getDataSnapshot();
    const picketSchedules = getData("Picket_Schedules");
    const substitutes = snap.substitutes;
    const users = snap.users;
    const logs = snap.logs;
    const attendance = snap.attendance;

    // Jadwal piket rutin hari ini
    const todayPicketSchedules = picketSchedules.filter(
      p => String(p.day_index).trim() === String(dayIndex)
    );

    // Cari guru piket pengganti hari ini (dari sheet Substitutes yang terkait Picket_Schedules)
    const todayPicketSubs = substitutes.filter(s => {
      if (safeDate(s.date) !== todayStr) return false;
      return picketSchedules.some(p => String(p.id) === String(s.schedule_id));
    });

    // Bangun daftar piket hari ini (asli + pengganti)
    const picketItems = [];

    todayPicketSchedules.forEach(ps => {
      const guru = users.find(u => String(u.id) === String(ps.user_id));
      const name = guru ? guru.full_name : "Unknown";

      // Cek apakah sudah ada pengganti
      const subRecord = todayPicketSubs.find(s => String(s.schedule_id) === String(ps.id));

      // Cek konfirmasi kehadiran piket (dari Teaching_Logs PICKET-DUTY)
      const isConfirmed = logs.some(
        l => String(l.user_id) === String(ps.user_id) &&
             String(l.schedule_id) === "PICKET-DUTY" &&
             safeDate(l.date) === todayStr
      );

      // Ambil record Daily_Attendance untuk jam masuk/pulang
      const attRecord = attendance.find(
        a => String(a.user_id) === String(ps.user_id) &&
             safeDate(a.date) === todayStr &&
             (!a.schedule_id || a.schedule_id === "" || a.schedule_id === "PICKET-DUTY")
      );
      const timeIn  = attRecord ? safeTime(attRecord.time_in  || "").substring(0, 5) : null;
      const timeOut = attRecord ? safeTime(attRecord.time_out || "").substring(0, 5) : null;
      const attId   = attRecord ? String(attRecord.id) : null;

      // Jika ada pengganti yang sudah dikonfirmasi, guru asli tidak perlu dikonfirmasi lagi
      let subGuruName = null;
      let subUserId = null;
      let subConfirmed = false;
      let subTimeIn = null;
      let subTimeOut = null;
      let subAttId = null;
      let subId = null;

      if (subRecord) {
        const subGuru = users.find(u => String(u.id) === String(subRecord.substitute_user_id));
        subGuruName = subGuru ? subGuru.full_name : "Unknown";
        subUserId = String(subRecord.substitute_user_id);
        subId = String(subRecord.id);

        subConfirmed = logs.some(
          l => String(l.user_id) === subUserId &&
               String(l.schedule_id) === "PICKET-DUTY" &&
               safeDate(l.date) === todayStr
        );

        const subAttRecord = attendance.find(
          a => String(a.user_id) === subUserId &&
               safeDate(a.date) === todayStr &&
               (!a.schedule_id || a.schedule_id === "" || a.schedule_id === "PICKET-DUTY")
        );
        subTimeIn  = subAttRecord ? safeTime(subAttRecord.time_in  || "").substring(0, 5) : null;
        subTimeOut = subAttRecord ? safeTime(subAttRecord.time_out || "").substring(0, 5) : null;
        subAttId   = subAttRecord ? String(subAttRecord.id) : null;
      }

      picketItems.push({
        picket_schedule_id: String(ps.id),
        user_id:            String(ps.user_id),
        name:               name,
        is_confirmed:       isConfirmed,
        time_in:            timeIn,
        time_out:           timeOut,
        att_id:             attId,
        has_substitute:     !!subRecord,
        substitute: subRecord ? {
          sub_record_id: subId,
          user_id:       subUserId,
          name:          subGuruName,
          is_confirmed:  subConfirmed,
          time_in:       subTimeIn,
          time_out:      subTimeOut,
          att_id:        subAttId,
        } : null,
      });
    });

    // Ambil daftar semua guru (bukan admin) untuk dropdown penunjukan pengganti
    const teacherList = users
      .filter(u => String(u.role).toLowerCase() === "guru")
      .map(u => ({ id: String(u.id), name: u.full_name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      status:       "success",
      today_str:    todayStr,
      day_index:    dayIndex,
      picket_items: picketItems,
      teacher_list: teacherList,
    };
  } catch (e) {
    return { status: "error", message: "Server Error (PicketDash): " + e.toString() };
  }
}

/**
 * Input atau update jam masuk / jam pulang guru piket / pengganti
 * langsung dari Dashboard Admin (hanya admin yang boleh).
 *
 * payload: { user_id, time_in?, time_out?, att_id? }
 * - Jika att_id ada, update baris yang sudah ada.
 * - Jika tidak ada, buat baris baru di Daily_Attendance.
 */
function adminInputPicketTime(token, payload) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin")
      return { status: "error", message: "Akses Ditolak. Hanya admin yang dapat melakukan ini." };

    const tz = Session.getScriptTimeZone();
    const todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

    const targetUserId = String((payload && payload.user_id) || "").trim();
    if (!targetUserId) return { status: "error", message: "user_id wajib diisi." };

    const timeIn  = String((payload && payload.time_in)  || "").trim();
    const timeOut = String((payload && payload.time_out) || "").trim();
    const attId   = String((payload && payload.att_id)   || "").trim();

    // Validasi format jam
    const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (timeIn  && !HH_MM.test(timeIn))  return { status: "error", message: "Format Jam Masuk tidak valid (HH:mm)." };
    if (timeOut && !HH_MM.test(timeOut)) return { status: "error", message: "Format Jam Pulang tidak valid (HH:mm)." };

    // Validasi jam masuk < jam pulang jika keduanya diisi
    if (timeIn && timeOut) {
      const [ih, im] = timeIn.split(":").map(Number);
      const [oh, om] = timeOut.split(":").map(Number);
      if (ih * 60 + im >= oh * 60 + om)
        return { status: "error", message: "Jam Masuk harus lebih awal dari Jam Pulang." };
    }

    const sheet = getSheet(SHEET_NAME.ATTENDANCE);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0].map(h => String(h).toLowerCase().trim().replace(/\s+/g, "_"));
    const col = {};
    headers.forEach((h, i) => { col[h] = i; });

    // Pastikan kolom time_in dan time_out ada
    const ensureCol = (colName) => {
      if (col[colName] !== undefined) return;
      const newColNum = sheet.getLastColumn() + 1;
      sheet.getRange(1, newColNum).setValue(colName);
      col[colName] = newColNum - 1;
    };
    ensureCol("time_in");
    ensureCol("time_out");

    // Cari baris existing: dahulukan attId jika ada
    let targetRowNum = -1;
    if (attId) {
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][col["id"] !== undefined ? col["id"] : 0]) === attId) {
          targetRowNum = i + 1;
          break;
        }
      }
    }
    // Fallback: cari berdasarkan user_id + date + schedule kosong/PICKET
    if (targetRowNum === -1) {
      for (let i = 1; i < rows.length; i++) {
        const rowUserId = String(rows[i][col["user_id"]] || "");
        const rowDate   = safeDate(rows[i][col["date"]]);
        const rowSched  = col["schedule_id"] !== undefined ? String(rows[i][col["schedule_id"]] || "") : "";
        if (rowUserId === targetUserId && rowDate === todayStr &&
            (rowSched === "" || rowSched === "PICKET-DUTY" || rowSched === "PIKET")) {
          targetRowNum = i + 1;
          break;
        }
      }
    }

    if (targetRowNum !== -1) {
      // Update baris yang ada
      if (timeIn  !== "") sheet.getRange(targetRowNum, col["time_in"]  + 1).setValue(timeIn);
      if (timeOut !== "") sheet.getRange(targetRowNum, col["time_out"] + 1).setValue(timeOut);
      try { _invalidateDataSnapshot(); } catch (_) {}
      return { status: "success", message: "Jam berhasil diperbarui.", att_id: String(rows[targetRowNum - 1][col["id"] !== undefined ? col["id"] : 0]) };
    } else {
      // Buat baris baru.
      // Hitung panjang baris SETELAH ensureCol menambah kolom baru, agar
      // indeks col["time_in"] / col["time_out"] tidak melebihi panjang array.
      const newId  = generateId("ATT");
      const maxIdx = Object.values(col).reduce(function(a, b) { return Math.max(a, b); }, 0);
      const rowLen = maxIdx + 1;
      const newRow = new Array(rowLen).fill("");
      if (col["id"]          !== undefined) newRow[col["id"]]          = newId;
      if (col["date"]        !== undefined) newRow[col["date"]]        = todayStr;
      if (col["user_id"]     !== undefined) newRow[col["user_id"]]     = targetUserId;
      if (col["status"]      !== undefined) newRow[col["status"]]      = "Present";
      if (col["confirmed_at"]!== undefined) newRow[col["confirmed_at"]]= new Date();
      if (col["schedule_id"] !== undefined) newRow[col["schedule_id"]] = "";
      if (col["time_in"]     !== undefined) newRow[col["time_in"]]     = timeIn;
      if (col["time_out"]    !== undefined) newRow[col["time_out"]]    = timeOut;
      sheet.appendRow(newRow);
      try { _invalidateDataSnapshot(); } catch (_) {}
      return { status: "success", message: "Data jam berhasil disimpan.", att_id: newId };
    }
  } catch (e) {
    return { status: "error", message: "Server Error (PicketTime): " + e.toString() };
  }
}

