function loginUser(username, password) {
  const extPassword = _extGetPassword_(username);
  if (extPassword === null || String(extPassword) !== String(password)) {
    return { status: "error", message: "Username atau Password salah!" };
  }
  const users = getData("Users");
  const user = users.find(
    (u) => String(u.username).trim() === String(username).trim(),
  );
  if (!user) {
    return {
      status: "error",
      message: "Profil pengguna tidak ditemukan. Hubungi Administrator.",
    };
  }
  // --- Maintenance Mode Check ---
  const configData = getData("Config");
  const _cfgVal = (key) => { const item = configData.find((c) => c.key === key); return item ? item.value : ""; };
  let isMaintenance = String(_cfgVal("maintenance_mode")).toLowerCase() === "true";
  
  if (!isMaintenance && String(_cfgVal("maintenance_scheduled")).toLowerCase() === "true") {
    const startStr = _cfgVal("maintenance_start");
    const endStr = _cfgVal("maintenance_end");
    if (startStr && endStr) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const now = new Date();
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && now >= start && now <= end) {
        isMaintenance = true;
      }
    }
  }

  if (isMaintenance) {
    if (String(user.role).toLowerCase() !== "admin") {
      const maintenanceMsg = _cfgVal("maintenance_message") || "";
      return {
        status: "maintenance",
        message: maintenanceMsg,
      };
    }
  }
  // --- End Maintenance Mode Check ---
  const token = "TKN-" + Utilities.getUuid();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  try {
    const sessionsSheet = getSheet("Sessions");
    const lastRow = sessionsSheet.getLastRow();
    if (lastRow > 1) {
      const range = sessionsSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      const now = new Date();
      for (let i = range.length - 1; i >= 0; i--) {
        const row = range[i];
        const expiryRaw = row[2];
        let expDate = null;
        if (expiryRaw instanceof Date) expDate = expiryRaw;
        else if (expiryRaw) {
          const tryD = new Date(expiryRaw);
          if (!isNaN(tryD.getTime())) expDate = tryD;
        }
        const isExpired = !expDate || expDate <= now;
        if (isExpired) {
          sessionsSheet.deleteRow(i + 2);
        }
      }
    }
  } catch (e) {}
  getSheet("Sessions").appendRow([token, user.id, expiry, new Date()]);
  const isDefaultPass = String(password) === "123456";
  const hasSecurityQuestion = !!(
    user.security_question && String(user.security_question).trim()
  );
  const hasEmailVerified = !!(
    user.email &&
    String(user.email).trim() &&
    _isValidEmail_(String(user.email))
  );
  return {
    status: "success",
    token,
    user: {
      id: user.id,
      name: user.full_name,
      role: user.role,
      is_default_pass: isDefaultPass,
      has_security_question: hasSecurityQuestion,
      has_email_verified: hasEmailVerified,
      email: String(user.email || ""),
    },
  };
}
function logoutUser(token) {
  const sheet = getSheet("Sessions");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { status: "success" };
}
function verifySession(token) {
  const sheet = getSheet("Sessions");
  const data = sheet.getDataRange().getValues();
  const session = data.find((row) => row[0] === token);
  if (!session) return null;
  const expiry = new Date(session[2]);
  if (new Date() > expiry) return null;
  const userId = session[1];
  const user = findData("Users", "id", userId);
  return user;
}
function checkSessionStatus(token) {
  try {
    if (!token) return { status: "expired" };
    const user = verifySession(token);
    return user ? { status: "ok" } : { status: "expired" };
  } catch (e) {
    console.error("checkSessionStatus error: " + e);
    return { status: "expired" };
  }
}
