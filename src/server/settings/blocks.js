function getBlokJurnal(token) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses ditolak." };
    }
    const rows = getData(SHEET_NAME.BLOK_JURNAL);
    const result = rows.map(function(r) {
      return {
        id: String(r.id || ""),
        mataPelajaran: String(r.matapelajaran || r.mataPelajaran || ""),
        tanggalMulai: String(r.tanggalmulai || r.tanggalMulai || ""),
        tanggalSelesai: String(r.tanggalselesai || r.tanggalSelesai || ""),
        pesan: String(r.pesan || ""),
        aktif: String(r.aktif || "").toLowerCase() === "true",
        createdAt: String(r.createdat || r.createdAt || ""),
      };
    });
    result.sort(function(a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return { status: "success", data: result };
  } catch (e) {
    return { status: "error", message: "Server Error (getBlokJurnal): " + e.toString() };
  }
}

function simpanBlokJurnal(token, data) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses ditolak." };
    }
    const mapel = String(data.mataPelajaran || "").trim();
    const mulai = String(data.tanggalMulai || "").trim();
    const selesai = String(data.tanggalSelesai || "").trim();
    const pesan = String(data.pesan || "").trim();
    if (!mapel) return { status: "error", message: "Mata pelajaran wajib dipilih." };
    if (!mulai || !/^\d{4}-\d{2}-\d{2}$/.test(mulai)) {
      return { status: "error", message: "Tanggal mulai tidak valid (format: YYYY-MM-DD)." };
    }
    if (!selesai || !/^\d{4}-\d{2}-\d{2}$/.test(selesai)) {
      return { status: "error", message: "Tanggal selesai tidak valid (format: YYYY-MM-DD)." };
    }
    if (selesai < mulai) {
      return { status: "error", message: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
    }
    if (!pesan) return { status: "error", message: "Pesan blokir wajib diisi." };
    const aktif = data.aktif === true || String(data.aktif).toLowerCase() === "true";
    const sheet = getSheet(SHEET_NAME.BLOK_JURNAL);
    const rows = sheet.getDataRange().getValues();
    const tz = Session.getScriptTimeZone();
    const now = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");
    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.getRange(i + 1, 2).setValue(mapel);
          sheet.getRange(i + 1, 3).setValue(mulai);
          sheet.getRange(i + 1, 4).setValue(selesai);
          sheet.getRange(i + 1, 5).setValue(pesan);
          sheet.getRange(i + 1, 6).setValue(aktif);
          try { _invalidateDataSnapshot(); } catch (_) {}
          return { status: "success", id: String(data.id) };
        }
      }
      return { status: "error", message: "Data blokir tidak ditemukan." };
    } else {
      const newId = generateId("BLK");
      sheet.appendRow([newId, mapel, mulai, selesai, pesan, aktif, now]);
      try { _invalidateDataSnapshot(); } catch (_) {}
      return { status: "success", id: newId };
    }
  } catch (e) {
    return { status: "error", message: "Server Error (simpanBlokJurnal): " + e.toString() };
  }
}

function hapusBlokJurnal(token, id) {
  try {
    const user = verifySession(token);
    if (!user || String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses ditolak." };
    }
    return deleteRowById(token, SHEET_NAME.BLOK_JURNAL, id);
  } catch (e) {
    return { status: "error", message: "Server Error (hapusBlokJurnal): " + e.toString() };
  }
}

function cekBlokJurnal(token, mataPelajaran, tanggal) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    if (!mataPelajaran || !tanggal) return { diblokir: false, pesan: "" };
    const tanggalStr = String(tanggal).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) return { diblokir: false, pesan: "" };
    const mapelStr = String(mataPelajaran).trim().toLowerCase();
    const rows = getData(SHEET_NAME.BLOK_JURNAL);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isAktif = String(r.aktif || "").toLowerCase() === "true";
      if (!isAktif) continue;
      const mulai = String(r.tanggalmulai || r.tanggalMulai || "").trim();
      const selesai = String(r.tanggalselesai || r.tanggalSelesai || "").trim();
      if (!mulai || !selesai) continue;
      if (tanggalStr < mulai || tanggalStr > selesai) continue;
      const rMapel = String(r.matapelajaran || r.mataPelajaran || "").trim().toLowerCase();
      if (rMapel === "semua" || rMapel === mapelStr) {
        return {
          diblokir: true,
          pesan: String(r.pesan || "Input jurnal tidak tersedia untuk tanggal ini."),
          mataPelajaran: String(r.matapelajaran || r.mataPelajaran || ""),
          tanggalMulai: mulai,
          tanggalSelesai: selesai,
        };
      }
    }
    return { diblokir: false, pesan: "" };
  } catch (e) {
    return { diblokir: false, pesan: "" };
  }
}

// ============================================================
// BLOKIR ACARA — CRUD
// ============================================================
function getBlokAcara(token) {
  try {
    var user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    if (String(user.role).toLowerCase() !== "admin") return { status: "error", message: "Akses Ditolak" };
    var data = getData(SHEET_NAME.BLOK_ACARA);
    var result = data.map(function(r) {
      return {
        id: String(r.id || ""),
        tipeAcara: String(r.tipeacara || ""),
        tanggalMulai: String(r.tanggalmulai || ""),
        tanggalSelesai: String(r.tanggalselesai || ""),
        pesan: String(r.pesan || ""),
        aktif: r.aktif === true || String(r.aktif).toLowerCase() === "true",
        createdAt: String(r.createdat || "")
      };
    });
    return { status: "success", data: result };
  } catch(e) {
    return { status: "error", message: "Server Error: " + e.toString() };
  }
}

function simpanBlokAcara(token, data) {
  try {
    var user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    if (String(user.role).toLowerCase() !== "admin") return { status: "error", message: "Akses Ditolak" };
    var tipeAcara = String((data && data.tipeAcara) || "").trim();
    var tanggalMulai = String((data && data.tanggalMulai) || "").trim();
    var tanggalSelesai = String((data && data.tanggalSelesai) || "").trim();
    var pesan = String((data && data.pesan) || "").trim();
    var aktif = (data && data.aktif === true) || String((data && data.aktif) || "").toLowerCase() === "true";
    if (!tipeAcara) return { status: "error", message: "Tipe acara wajib dipilih." };
    if (!tanggalMulai) return { status: "error", message: "Tanggal mulai wajib diisi." };
    if (!tanggalSelesai) return { status: "error", message: "Tanggal selesai wajib diisi." };
    if (tanggalSelesai < tanggalMulai) return { status: "error", message: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
    if (!pesan) return { status: "error", message: "Pesan wajib diisi." };
    var sheet = getSheet(SHEET_NAME.BLOK_ACARA);
    var existingId = String((data && data.id) || "").trim();
    if (existingId) {
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim().replace(/\s+/g, "_"); });
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][headers.indexOf("id")]) === existingId) {
          var rowNum = i + 1;
          sheet.getRange(rowNum, headers.indexOf("tipeacara") + 1).setValue(tipeAcara);
          sheet.getRange(rowNum, headers.indexOf("tanggalmulai") + 1).setValue(tanggalMulai);
          sheet.getRange(rowNum, headers.indexOf("tanggalselesai") + 1).setValue(tanggalSelesai);
          sheet.getRange(rowNum, headers.indexOf("pesan") + 1).setValue(pesan);
          sheet.getRange(rowNum, headers.indexOf("aktif") + 1).setValue(aktif);
          try { _invalidateDataSnapshot(); } catch (_) {}
          return { status: "success" };
        }
      }
      return { status: "error", message: "Data tidak ditemukan." };
    } else {
      var newId = "BLA-" + new Date().getTime();
      var createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      sheet.appendRow([newId, tipeAcara, tanggalMulai, tanggalSelesai, pesan, aktif, createdAt]);
      try { _invalidateDataSnapshot(); } catch (_) {}
      return { status: "success", id: newId };
    }
  } catch(e) {
    return { status: "error", message: "Server Error: " + e.toString() };
  }
}

function hapusBlokAcara(token, id) {
  try {
    var user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    if (String(user.role).toLowerCase() !== "admin") return { status: "error", message: "Akses Ditolak" };
    var sheet = getSheet(SHEET_NAME.BLOK_ACARA);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim().replace(/\s+/g, "_"); });
    var idCol = headers.indexOf("id");
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idCol]) === String(id)) {
        sheet.deleteRow(i + 1);
        try { _invalidateDataSnapshot(); } catch (_) {}
        return { status: "success" };
      }
    }
    return { status: "error", message: "Data tidak ditemukan." };
  } catch(e) {
    return { status: "error", message: "Server Error: " + e.toString() };
  }
}

function cekBlokAcara(token, tipeAcara, tanggal) {
  try {
    var user = verifySession(token);
    if (!user) return { diblokir: false, pesan: "" };
    var tanggalStr = String(tanggal || "").trim();
    var tipeStr = String(tipeAcara || "").trim().toLowerCase();
    if (!tanggalStr || !tipeStr) return { diblokir: false, pesan: "" };
    var data = getData(SHEET_NAME.BLOK_ACARA);
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      var isAktif = r.aktif === true || String(r.aktif).toLowerCase() === "true";
      if (!isAktif) continue;
      var rTipe = String(r.tipeacara || "").trim().toLowerCase();
      var rMulai = String(r.tanggalmulai || "").trim();
      var rSelesai = String(r.tanggalselesai || "").trim();
      if (!rMulai || !rSelesai) continue;
      var tipeMatch = rTipe === "semua" || rTipe === tipeStr;
      var dateMatch = tanggalStr >= rMulai && tanggalStr <= rSelesai;
      if (tipeMatch && dateMatch) {
        return { diblokir: true, pesan: String(r.pesan || "") };
      }
    }
    return { diblokir: false, pesan: "" };
  } catch(e) {
    return { diblokir: false, pesan: "" };
  }
}

// ============================================================
// BLOKIR TRANSPORT — HELPER INTERNAL
// ============================================================
function isTransportBlocked(tanggal) {
  try {
    var tanggalStr = String(tanggal || "").trim();
    if (!tanggalStr || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) return false;
    var rows = _loadBlokTransportActive();
    return _isDateBlockedByList(tanggalStr, rows);
  } catch (e) {
    return false;
  }
}

/**
 * Load semua aturan blokir transport yang aktif dari sheet.
 * Gunakan sekali sebelum loop untuk menghindari baca sheet berulang.
 * @return {Array} Array objek blokir aktif dengan properti tanggalmulai & tanggalselesai
 */
function _loadBlokTransportActive() {
  try {
    var rows = getData(SHEET_NAME.BLOK_TRANSPORT);
    return rows.filter(function (r) {
      return r.aktif === true || String(r.aktif || "").toLowerCase() === "true";
    });
  } catch (e) {
    return [];
  }
}

/**
 * Cek apakah tanggal termasuk dalam daftar blokir transport.
 * Pure function — tidak baca sheet.
 * @param {string} dateStr format YYYY-MM-DD
 * @param {Array} blokList hasil _loadBlokTransportActive()
 * @return {boolean}
 */
function _isDateBlockedByList(dateStr, blokList) {
  if (!dateStr || !blokList || blokList.length === 0) return false;
  for (var i = 0; i < blokList.length; i++) {
    var r = blokList[i];
    var mulai = String(r.tanggalmulai || r.tanggalMulai || "").trim();
    var selesai = String(r.tanggalselesai || r.tanggalSelesai || "").trim();
    if (!mulai || !selesai) continue;
    if (dateStr >= mulai && dateStr <= selesai) return true;
  }
  return false;
}

// ============================================================
// BLOKIR TRANSPORT — CRUD
// ============================================================
function getBlokTransport(token) {
  try {
    var user = verifySession(token);
    if (!user) return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses hanya untuk Admin." };
    }
    var data = getData(SHEET_NAME.BLOK_TRANSPORT);
    var result = data.map(function(r) {
      return {
        id: String(r.id || ""),
        tanggalMulai: String(r.tanggalmulai || r.tanggalMulai || "").trim().substring(0, 10),
        tanggalSelesai: String(r.tanggalselesai || r.tanggalSelesai || "").trim().substring(0, 10),
        keterangan: String(r.keterangan || ""),
        aktif: r.aktif === true || String(r.aktif || "").toLowerCase() === "true",
        createdAt: String(r.createdat || r.createdAt || "")
      };
    });
    result.sort(function(a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return { status: "success", data: result };
  } catch(e) {
    console.error("getBlokTransport error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}

function simpanBlokTransport(token, data) {
  try {
    var user = verifySession(token);
    if (!user) return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses hanya untuk Admin." };
    }
    var tanggalMulai = String((data && data.tanggalMulai) || "").trim();
    var tanggalSelesai = String((data && data.tanggalSelesai) || "").trim();
    var keterangan = String((data && data.keterangan) || "").trim();
    var aktif = (data && data.aktif === true) || String((data && data.aktif) || "").toLowerCase() === "true";
    var rDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!tanggalMulai || !rDate.test(tanggalMulai)) {
      return { status: "error", message: "Tanggal mulai tidak valid (format: YYYY-MM-DD)." };
    }
    if (!tanggalSelesai || !rDate.test(tanggalSelesai)) {
      return { status: "error", message: "Tanggal selesai tidak valid (format: YYYY-MM-DD)." };
    }
    if (tanggalSelesai < tanggalMulai) {
      return { status: "error", message: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
    }
    if (!keterangan) return { status: "error", message: "Keterangan wajib diisi." };
    var sheet = getSheet(SHEET_NAME.BLOK_TRANSPORT);
    var existingId = String((data && data.id) || "").trim();
    if (existingId) {
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim().replace(/\s+/g, "_"); });
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][headers.indexOf("id")]) === existingId) {
          var rowNum = i + 1;
          sheet.getRange(rowNum, headers.indexOf("tanggalmulai") + 1).setValue(tanggalMulai);
          sheet.getRange(rowNum, headers.indexOf("tanggalselesai") + 1).setValue(tanggalSelesai);
          sheet.getRange(rowNum, headers.indexOf("keterangan") + 1).setValue(keterangan);
          sheet.getRange(rowNum, headers.indexOf("aktif") + 1).setValue(aktif);
          try { _invalidateDataSnapshot(); } catch (_) {}
          return { status: "success", message: "Blokir transport diperbarui." };
        }
      }
      return { status: "error", message: "Data tidak ditemukan." };
    } else {
      var newId = generateId("BLT");
      var createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      sheet.appendRow([newId, tanggalMulai, tanggalSelesai, keterangan, aktif, createdAt]);
      try { _invalidateDataSnapshot(); } catch (_) {}
      return { status: "success", message: "Blokir transport ditambahkan.", id: newId };
    }
  } catch(e) {
    console.error("simpanBlokTransport error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}

function hapusBlokTransport(token, id) {
  try {
    var user = verifySession(token);
    if (!user) return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses hanya untuk Admin." };
    }
    var blokId = String(id || "").trim();
    if (!blokId) return { status: "error", message: "ID tidak valid." };
    var sheet = getSheet(SHEET_NAME.BLOK_TRANSPORT);
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim().replace(/\s+/g, "_"); });
    var idCol = headers.indexOf("id");
    if (idCol === -1) idCol = 0;
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idCol]) === blokId) {
        sheet.deleteRow(i + 1);
        try { _invalidateDataSnapshot(); } catch (_) {}
        return { status: "success", message: "Blokir transport dihapus." };
      }
    }
    return { status: "error", message: "Data tidak ditemukan." };
  } catch(e) {
    console.error("hapusBlokTransport error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}

