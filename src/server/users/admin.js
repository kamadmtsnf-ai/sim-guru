function getAllUsers(token) {
  const user = verifySession(token);
  if (!user) return [];
  return getData("Users").map((u) => ({
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    role: u.role,
    nip: u.nip,
    km_distance:
      u.km_distance !== undefined && u.km_distance !== null
        ? u.km_distance
        : "",
  }));
}
function _validateKmDistance_(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: 0 };
  }
  var s = String(raw).trim();
  if (s === "") return { ok: true, value: 0 };
  var num = Number(s);
  if (isNaN(num) || !isFinite(num)) {
    return {
      ok: false,
      message:
        "Jarak harus berupa angka antara 0,01 dan 999,99 dengan maksimal 2 angka di belakang koma.",
    };
  }
  if (num === 0) return { ok: true, value: 0 };
  if (num < 0.01 || num > 999.99) {
    return {
      ok: false,
      message:
        "Jarak harus berupa angka antara 0,01 dan 999,99 dengan maksimal 2 angka di belakang koma.",
    };
  }
  var decimalMatch = s.match(/\.(\d+)$/);
  if (decimalMatch && decimalMatch[1].length > 2) {
    return {
      ok: false,
      message:
        "Jarak harus berupa angka antara 0,01 dan 999,99 dengan maksimal 2 angka di belakang koma.",
    };
  }
  return { ok: true, value: num };
}
function _validateAdditionalRole_(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: "" };
  }
  var s = String(raw).trim().toUpperCase();
  if (s === "") return { ok: true, value: "" };
  if (s === "KEPALA_SEKOLAH") return { ok: true, value: "KEPALA_SEKOLAH" };
  return {
    ok: false,
    message:
      "Nilai additional_role tidak valid. Gunakan KEPALA_SEKOLAH atau kosongkan.",
  };
}
function saveUser(token, data) {
  const admin = verifySession(token);
  if (!admin || admin.role !== "admin")
    return { status: "error", message: "Akses ditolak" };
  var kmValidation = _validateKmDistance_(
    Object.prototype.hasOwnProperty.call(data, "km_distance")
      ? data.km_distance
      : null,
  );
  if (!kmValidation.ok)
    return { status: "error", message: kmValidation.message };
  var roleValidation = _validateAdditionalRole_(
    Object.prototype.hasOwnProperty.call(data, "additional_role")
      ? data.additional_role
      : null,
  );
  if (!roleValidation.ok)
    return { status: "error", message: roleValidation.message };
  const sheet = getSheet("Users");
  if (data.id) {
    const rows = sheet.getDataRange().getValues();
    for (let j = 1; j < rows.length; j++) {
      if (
        String(rows[j][0]) !== String(data.id) &&
        String(rows[j][1]).toLowerCase() === String(data.username).toLowerCase()
      ) {
        return {
          status: "error",
          message: "Username sudah digunakan oleh pengguna lain",
        };
      }
    }
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        const oldUsername = String(rows[i][1]);
        sheet.getRange(i + 1, 2).setValue(data.username);
        sheet.getRange(i + 1, 4).setValue(data.role);
        sheet.getRange(i + 1, 5).setValue(data.full_name);
        if (Object.prototype.hasOwnProperty.call(data, "nip")) {
          sheet
            .getRange(i + 1, 6)
            .setValue(String(data.nip || "").trim() || "-");
        }
        if (oldUsername !== String(data.username)) {
          _extUpdateUsername_(oldUsername, data.username);
        }
        if (Object.prototype.hasOwnProperty.call(data, "km_distance")) {
          const kmCol = _ensureUserColumn_(sheet, "km_distance", 13);
          sheet
            .getRange(i + 1, kmCol)
            .setValue(kmValidation.value === 0 ? "" : kmValidation.value);
        }
        if (Object.prototype.hasOwnProperty.call(data, "additional_role")) {
          const arCol = _ensureUserColumn_(sheet, "additional_role", 14);
          sheet.getRange(i + 1, arCol).setValue(roleValidation.value);
        }
        try {
          _invalidateDataSnapshot();
        } catch (_) {}
        return { status: "success" };
      }
    }
    return { status: "error", message: "User tidak ditemukan" };
  } else {
    const rows = sheet.getDataRange().getValues();
    for (let j = 1; j < rows.length; j++) {
      if (
        String(rows[j][1]).toLowerCase() === String(data.username).toLowerCase()
      ) {
        return { status: "error", message: "Username sudah digunakan" };
      }
    }
    const newId = generateId("USR");
    const defaultPass = data.password || "123456";
    const kmValue = Object.prototype.hasOwnProperty.call(data, "km_distance")
      ? kmValidation.value === 0
        ? ""
        : kmValidation.value
      : "";
    const arValue = Object.prototype.hasOwnProperty.call(
      data,
      "additional_role",
    )
      ? roleValidation.value
      : "";
    const nipValue = String(data.nip || "").trim() || "-";
    sheet.appendRow([
      newId,
      data.username,
      defaultPass,
      data.role,
      data.full_name,
      nipValue,
      0,
      "",
      "",
      "",
      "",
      "",
      kmValue,
      arValue,
    ]);
    const extOk = _extAddUser_(data.username, defaultPass);
    if (!extOk) {
      const rows = sheet.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === newId) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return {
        status: "error",
        message: "Gagal menambah user ke sumber credential. Coba lagi.",
      };
    }
    return { status: "success" };
  }
}
function deleteUser(token, id) {
  const admin = verifySession(token);
  if (!admin || admin.role !== "admin")
    return { status: "error", message: "Akses ditolak" };
  const users = getData("Users");
  const target = users.find((u) => String(u.id) === String(id));
  const result = deleteRowById(token, "Users", id);
  if (target && target.username) {
    _extDeleteUser_(target.username);
  }
  return result;
}
function resetUserPassword(token, id) {
  const admin = verifySession(token);
  if (!admin || admin.role !== "admin")
    return { status: "error", message: "Akses ditolak" };
  const sheet = getSheet("Users");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const username = String(rows[i][1]);
      const extOk = _extSetPassword_(username, "123456");
      if (!extOk) {
        return {
          status: "error",
          message:
            "Gagal reset password di sumber credential. Hubungi Administrator.",
        };
      }
      sheet.getRange(i + 1, 3).setValue("123456");
      return {
        status: "success",
        message: "Password berhasil direset ke 123456",
      };
    }
  }
  return { status: "error", message: "User tidak ditemukan" };
}
