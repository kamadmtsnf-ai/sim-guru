function requestEmailOTP(token, newEmail) {
  try {
    const user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali" };
    const email = String(newEmail || "")
      .trim()
      .toLowerCase();
    if (!email) return { status: "error", message: "Email wajib diisi." };
    if (!_isValidEmail_(email)) {
      return { status: "error", message: "Format email tidak valid." };
    }
    const sheetData = getData("Users");
    const otherWithEmail = sheetData.find(
      (u) =>
        String(u.email || "").toLowerCase() === email &&
        String(u.id) !== String(user.id),
    );
    if (otherWithEmail) {
      return {
        status: "error",
        message: "Email ini sudah digunakan oleh akun lain.",
      };
    }
    const props = PropertiesService.getScriptProperties();
    const rateKey = "otp_rate_" + user.id;
    const lastReq = Number(props.getProperty(rateKey) || 0);
    const now = Date.now();
    const SECS = 60;
    if (lastReq && now - lastReq < SECS * 1000) {
      const wait = Math.ceil((SECS * 1000 - (now - lastReq)) / 1000);
      return {
        status: "error",
        message: "Mohon tunggu " + wait + " detik sebelum meminta kode lagi.",
      };
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const dataKey = "otp_data_" + user.id;
    const payload = {
      code: code,
      email: email,
      expires: now + 10 * 60 * 1000,
      attempts: 0,
    };
    props.setProperty(dataKey, JSON.stringify(payload));
    props.setProperty(rateKey, String(now));
    try {
      const subject = "Kode Verifikasi Email — SiM-Guru";
      const htmlBody =
        '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">' +
        '<div style="background:linear-gradient(135deg,#4338CA,#4F46E5);color:white;padding:20px 24px;border-radius:14px 14px 0 0;">' +
        '<div style="font-size:13px;opacity:0.85;letter-spacing:0.05em;">SiM-GURU</div>' +
        '<div style="font-size:20px;font-weight:800;margin-top:4px;">Verifikasi Alamat Email</div>' +
        "</div>" +
        '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:24px;background:#fff;">' +
        '<p style="font-size:14px;color:#334155;margin:0 0 16px;">Halo <strong>' +
        _escHtml_(user.full_name || "Pengguna") +
        "</strong>,</p>" +
        '<p style="font-size:14px;color:#334155;margin:0 0 16px;">Anda telah meminta untuk mengubah alamat email akun SiM-Guru. Gunakan kode verifikasi berikut:</p>' +
        '<div style="background:#EEF2FF;border:1px dashed #6366F1;border-radius:12px;padding:18px;text-align:center;margin:16px 0;">' +
        "<div style=\"font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:800;letter-spacing:0.4em;color:#4338CA;\">" +
        code +
        "</div>" +
        "</div>" +
        '<p style="font-size:13px;color:#64748b;margin:16px 0 8px;">⏱️ Kode berlaku <strong>10 menit</strong>.</p>' +
        '<p style="font-size:13px;color:#64748b;margin:0 0 16px;">Jika Anda tidak meminta perubahan ini, abaikan email ini.</p>' +
        '<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;">' +
        '<p style="font-size:11px;color:#94a3b8;margin:0;">Email otomatis dari SiM-Guru. Jangan balas email ini.</p>' +
        "</div>" +
        "</div>";
      const textBody =
        "Kode verifikasi email SiM-Guru Anda: " +
        code +
        "\n\nKode berlaku 10 menit. Jika Anda tidak meminta perubahan ini, abaikan email ini.";
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: textBody,
        htmlBody: htmlBody,
        name: "SiM-Guru",
      });
    } catch (mailErr) {
      props.deleteProperty(dataKey);
      props.deleteProperty(rateKey);
      return {
        status: "error",
        message:
          "Gagal mengirim email verifikasi: " +
          (mailErr && mailErr.message ? mailErr.message : mailErr),
      };
    }
    return {
      status: "success",
      message:
        "Kode OTP telah dikirim ke " + email + ". Kode berlaku 10 menit.",
      expires_in: 600,
      cooldown: SECS,
    };
  } catch (e) {
    return {
      status: "error",
      message: "Server error: " + (e && e.message ? e.message : e),
    };
  }
}
function verifyEmailOTP(token, newEmail, otpCode) {
  try {
    const user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali" };
    const email = String(newEmail || "")
      .trim()
      .toLowerCase();
    const code = String(otpCode || "").trim();
    if (!_isValidEmail_(email))
      return { status: "error", message: "Format email tidak valid." };
    if (!/^\d{6}$/.test(code))
      return { status: "error", message: "Kode OTP harus 6 digit angka." };
    const props = PropertiesService.getScriptProperties();
    const dataKey = "otp_data_" + user.id;
    const raw = props.getProperty(dataKey);
    if (!raw)
      return {
        status: "error",
        message: "Tidak ada permintaan OTP aktif. Minta kode baru.",
      };
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      props.deleteProperty(dataKey);
      return { status: "error", message: "Data OTP rusak. Minta kode baru." };
    }
    if (Date.now() > Number(data.expires || 0)) {
      props.deleteProperty(dataKey);
      return {
        status: "error",
        message: "Kode OTP sudah kedaluwarsa. Minta kode baru.",
      };
    }
    if (String(data.email).toLowerCase() !== email) {
      return {
        status: "error",
        message:
          "Email yang Anda masukkan berbeda dengan permintaan OTP terakhir. Minta kode baru.",
      };
    }
    if (Number(data.attempts || 0) >= 5) {
      props.deleteProperty(dataKey);
      return {
        status: "error",
        message: "Terlalu banyak percobaan salah. Minta kode baru.",
      };
    }
    if (String(data.code) !== code) {
      data.attempts = Number(data.attempts || 0) + 1;
      props.setProperty(dataKey, JSON.stringify(data));
      const remain = 5 - data.attempts;
      return {
        status: "error",
        message:
          "Kode OTP salah. " +
          (remain > 0 ? "Sisa percobaan: " + remain : "Percobaan habis."),
      };
    }
    const sheetData = getData("Users");
    const userRowIndex = sheetData.findIndex(
      (u) => String(u.id) === String(user.id),
    );
    if (userRowIndex === -1)
      return { status: "error", message: "User tidak ditemukan" };
    const otherWithEmail = sheetData.find(
      (u) =>
        String(u.email || "").toLowerCase() === email &&
        String(u.id) !== String(user.id),
    );
    if (otherWithEmail) {
      props.deleteProperty(dataKey);
      return {
        status: "error",
        message: "Email ini sudah digunakan oleh akun lain.",
      };
    }
    const sheetObj = getSheet("Users");
    const emailCol = _ensureUserColumn_(sheetObj, "email", 12);
    sheetObj.getRange(userRowIndex + 2, emailCol).setValue(email);
    props.deleteProperty(dataKey);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message: "Email berhasil diverifikasi & disimpan.",
      email: email,
    };
  } catch (e) {
    return {
      status: "error",
      message: "Server error: " + (e && e.message ? e.message : e),
    };
  }
}
