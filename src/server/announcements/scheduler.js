function checkAndSendAnnouncementEmails() {
  const sheet = _annEnsureSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const headers = data[0];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const today = Utilities.formatDate(todayDate, "Asia/Jakarta", "yyyy-MM-dd");
  const idxId = headers.indexOf("id");
  const idxTitle = headers.indexOf("title");
  const idxBody = headers.indexOf("body");
  const idxIsActive = headers.indexOf("is_active");
  const idxStartsAt = headers.indexOf("starts_at");
  const idxEndsAt = headers.indexOf("ends_at");
  const idxTargetRole = headers.indexOf("target_role");
  const idxTargetUserIds = headers.indexOf("target_user_ids");
  const idxSendEmail = headers.indexOf("send_email_notification");
  const idxEmailSent = headers.indexOf("email_sent");
  const idxRem3 = headers.indexOf("reminder_3_sent");
  const idxRem2 = headers.indexOf("reminder_2_sent");
  const idxRem1 = headers.indexOf("reminder_1_sent");
  if (idxSendEmail === -1) return;
  const allUsers = getData("Users") || [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const isActive = _annBool_(row[idxIsActive]);
    const sendEmail = _annBool_(row[idxSendEmail]);
    if (!isActive || !sendEmail) continue;
    const emailSent =
      idxEmailSent !== -1 ? _annBool_(row[idxEmailSent]) : false;
    const startsAt = _annDateOnly_(row[idxStartsAt]);
    const endsAt = idxEndsAt !== -1 ? _annDateOnly_(row[idxEndsAt]) : "";
    const rem3Sent = idxRem3 !== -1 ? _annBool_(row[idxRem3]) : false;
    const rem2Sent = idxRem2 !== -1 ? _annBool_(row[idxRem2]) : false;
    const rem1Sent = idxRem1 !== -1 ? _annBool_(row[idxRem1]) : false;
    let emailToSend = null; 
    let colToUpdate = -1;
    if (!emailSent && (!startsAt || startsAt <= today)) {
      emailToSend = "start";
      colToUpdate = idxEmailSent;
    } else if (endsAt && (!startsAt || startsAt <= today)) {
      const endDate = new Date(endsAt);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 3 && !rem3Sent) {
        emailToSend = "rem3";
        colToUpdate = idxRem3;
      } else if (diffDays === 2 && !rem2Sent) {
        emailToSend = "rem2";
        colToUpdate = idxRem2;
      } else if (diffDays === 1 && !rem1Sent) {
        emailToSend = "rem1";
        colToUpdate = idxRem1;
      }
    }
    if (emailToSend) {
      const title = String(row[idxTitle] || "");
      const body = String(row[idxBody] || "");
      const targetRole = String(row[idxTargetRole] || "all").toLowerCase();
      const targetUserIdsStr = String(row[idxTargetUserIds] || "");
      let targetUserIds = [];
      try {
        if (targetUserIdsStr) targetUserIds = JSON.parse(targetUserIdsStr);
      } catch (e) {}
      const targetEmails = [];
      allUsers.forEach((u) => {
        if (!u.email || !_isValidEmail_(u.email)) return;
        let include = false;
        if (targetUserIds.length > 0) {
          if (targetUserIds.indexOf(String(u.id)) >= 0) include = true;
        } else {
          if (targetRole === "all") {
            include = true;
          } else {
            const uRole = String(u.role || "").toLowerCase();
            if (targetRole === uRole) include = true;
          }
        }
        if (include && targetEmails.indexOf(u.email) === -1) {
          targetEmails.push(u.email);
        }
      });
      if (targetEmails.length > 0) {
        // Helper escape HTML khusus untuk email server-side (escapeHtml hanya ada di frontend)
        function _annEscapeHtml_(str) {
          return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }
        let subject = "";
        let prefix = "";
        if (emailToSend === "start") {
          subject = "Pengumuman Baru: " + title;
          const dateStr = startsAt
            ? formatDateIndo(startsAt)
            : formatDateIndo(today);
          prefix = `Berlaku mulai: ${_annEscapeHtml_(dateStr)}`;
        } else {
          const daysLeft =
            emailToSend === "rem3" ? 3 : emailToSend === "rem2" ? 2 : 1;
          subject = `Peringatan (${daysLeft} hari lagi): ${title}`;
          const dateStr = formatDateIndo(endsAt);
          prefix = `Pengingat! Pengumuman ini akan berakhir pada: ${_annEscapeHtml_(dateStr)} (${daysLeft} hari lagi)`;
        }
        // Body disanitasi: tag HTML diizinkan (admin yang menulis), tapi
        // escape karakter berbahaya di luar konteks tag agar aman dikirim via email.
        // Konversi newline ke <br/> untuk plaintext fallback.
        const safeBody = String(body).replace(/\r\n/g, "\n").replace(/\n/g, "<br/>");
        const htmlBody = `
          <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:20px; color:#334155;">
            <h2 style="color:#1e293b; margin-top:0;">${_annEscapeHtml_(title)}</h2>
            <p style="font-size:13px; color:#e11d48; margin-bottom:20px; font-weight:bold;">${prefix}</p>
            <div style="background:#f8fafc; padding:15px; border-radius:8px; line-height:1.6; color:#334155;">
              ${safeBody}
            </div>
            <p style="font-size:12px; color:#94a3b8; margin-top:30px; border-top:1px solid #e2e8f0; padding-top:15px;">
              Email otomatis dari SiM-Guru. Harap periksa aplikasi untuk detail lebih lanjut. Jangan membalas email ini.
            </p>
          </div>
        `;
        const chunk = 50;
        for (let j = 0; j < targetEmails.length; j += chunk) {
          const bccChunk = targetEmails.slice(j, j + chunk).join(",");
          try {
            MailApp.sendEmail({
              to: Session.getActiveUser().getEmail() || "noreply@simguru.local",
              bcc: bccChunk,
              subject: subject,
              htmlBody: htmlBody,
              body: "Silakan aktifkan tampilan HTML untuk melihat pengumuman ini.",
            });
          } catch (e) {
            console.error("Gagal mengirim email pengumuman: " + e.message);
          }
        }
      }
      if (colToUpdate !== -1) {
        sheet.getRange(i + 1, colToUpdate + 1).setValue(true);
      }
    }
  }
}
function installAnnouncementTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkAndSendAnnouncementEmails") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("checkAndSendAnnouncementEmails")
    .timeBased()
    .atHour(8)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone("Asia/Jakarta")
    .create();
  return {
    status: "success",
    message: "Trigger berhasil diinstall pada jam 08:00 pagi.",
  };
}
