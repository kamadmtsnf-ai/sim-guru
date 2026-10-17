function runReminderScheduler() {
  try {
    var now = new Date();
    var dateStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    var hour = Number(Utilities.formatDate(now, "Asia/Jakarta", "HH"));
    console.log("[runReminderScheduler] Berjalan: " + dateStr + " jam " + hour);
    var stats = {
      missing_journal: 0,
      missing_bap: 0,
      pending_kbm: 0,
      pending_supervisor: 0,
    };
    try {
      stats.missing_journal = _reminderMissingJournal_(dateStr);
    } catch (e) {
      console.warn("reminder journal: " + e);
    }
    try {
      stats.missing_bap = _reminderMissingBap_(dateStr);
    } catch (e) {
      console.warn("reminder bap: " + e);
    }
    try {
      stats.pending_kbm = _reminderPendingKbm_(dateStr);
    } catch (e) {
      console.warn("reminder pending kbm: " + e);
    }
    try {
      stats.pending_supervisor = _reminderPendingSupervisor_(dateStr);
    } catch (e) {
      console.warn("reminder pending supervisor: " + e);
    }
    console.log(
      "[runReminderScheduler] Selesai. Stats: " + JSON.stringify(stats),
    );
    return { status: "success", date: dateStr, stats: stats };
  } catch (e) {
    console.error("[runReminderScheduler] Error: " + e);
    return { status: "error", message: e && e.message ? e.message : String(e) };
  }
}
function _reminderMissingJournal_(dateStr) {
  // isTeachingDay menentukan apakah ada jadwal KBM reguler hari ini
  var isTeachingDay = _notifIsTeachingDay_(dateStr);
  // Jurnal acara tetap diperiksa meski bukan hari KBM biasa (misal: hari ujian)
  // kecuali hari libur (hari libur berarti tidak ada kegiatan apapun)
  var isHoliday = _notifIsHoliday_(dateStr);
  if (!isTeachingDay && isHoliday) return 0;

  var d = new Date(dateStr + "T00:00:00");
  var dayIdx = d.getDay();
  var cfg = _getConfigMap();
  var activeTP = cfg["tahun_pelajaran"] || "";
  var activeSem = cfg["semester"] || "";

  // --- Ambil jadwal KBM aktif hari ini (hanya jika hari KBM reguler) ---
  var schedules = [];
  if (isTeachingDay) {
    schedules = getData("Schedules").filter(function (s) {
      if (String(s.day_index).trim() !== String(dayIdx)) return false;
      var sTP = s.tahun_pelajaran || activeTP;
      var sSem = s.semester || activeSem;
      return sTP === activeTP && sSem === activeSem;
    });
  }

  // --- Ambil substitusi hari ini ---
  var subs = isTeachingDay ? getData("Substitutes").filter(function (s) {
    try {
      var sd = Utilities.formatDate(
        new Date(s.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return sd === dateStr;
    } catch (_) {
      return false;
    }
  }) : [];

  // Kumpulkan schedule_id yang sudah punya pengganti hari ini
  // agar guru asli tidak diingatkan untuk jadwal yang sudah digantikan
  var substitutedScheduleIds = new Set();
  subs.forEach(function (sub) {
    substitutedScheduleIds.add(String(sub.schedule_id));
  });

  // --- Bangun set log yang sudah masuk hari ini ---
  var logs = (isTeachingDay && schedules.length > 0) ? getData("Teaching_Logs") : [];
  var loggedSet = {};
  logs.forEach(function (l) {
    try {
      var ld = Utilities.formatDate(
        new Date(l.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      if (ld !== dateStr) return;
      loggedSet[String(l.user_id) + "|" + String(l.schedule_id)] = true;
    } catch (_) {}
  });

  // --- byUser: map userId → daftar item jurnal KBM yang belum diisi ---
  var byUser = {};

  // 1) Jadwal reguler (guru asli, tidak ada pengganti)
  schedules.forEach(function (s) {
    var schedId = String(s.id);
    if (substitutedScheduleIds.has(schedId)) {
      // Jadwal ini sudah digantikan — tangani via blok guru pengganti di bawah
      return;
    }
    var originalUid = String(s.user_id);
    var key = originalUid + "|" + schedId;
    if (loggedSet[key]) return;
    if (!byUser[originalUid]) byUser[originalUid] = { kbm: [], events: [] };
    byUser[originalUid].kbm.push({
      subject: String(s.subject || "-"),
      class_name: String(s.class_name || "-"),
      time: _notifFmtTime_(s.time_start) + "–" + _notifFmtTime_(s.time_end),
    });
  });

  // 2) Guru pengganti — untuk setiap substitusi hari ini,
  //    cek apakah guru pengganti sudah mengisi jurnal
  subs.forEach(function (sub) {
    var schedId = String(sub.schedule_id);
    var substituteUid = String(sub.substitute_user_id);
    // Cari data jadwal yang bersangkutan
    var s = schedules.find(function (sc) {
      return String(sc.id) === schedId;
    });
    if (!s) return; // Jadwal tidak ada di semester aktif — abaikan
    var key = substituteUid + "|" + schedId;
    if (loggedSet[key]) return;
    if (!byUser[substituteUid]) byUser[substituteUid] = { kbm: [], events: [] };
    byUser[substituteUid].kbm.push({
      subject: String(s.subject || "-"),
      class_name: String(s.class_name || "-"),
      time: _notifFmtTime_(s.time_start) + "–" + _notifFmtTime_(s.time_end),
      is_substitute: true,
    });
  });

  // --- Jurnal Acara/Kegiatan yang belum diisi ---
  // Guru perlu mengisi jurnal acara jika:
  //   - sudah dikonfirmasi hadir (confirmed_by terisi)
  //   - belum mengisi jurnal (journal_submitted != true)
  //   - tanggal kehadiran = hari ini
  var eventAttendances = getData(EVENT_SHEET.ATTENDANCE).filter(function (a) {
    try {
      var ad = Utilities.formatDate(
        new Date(a.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      if (ad !== dateStr) return false;
      // Hanya yang sudah dikonfirmasi hadir
      if (!a.confirmed_by || String(a.confirmed_by).trim() === "") return false;
      // Belum isi jurnal
      var js = a.journal_submitted;
      if (js === true || String(js).toLowerCase() === "true") return false;
      return true;
    } catch (_) {
      return false;
    }
  });

  // Ambil definisi event untuk mendapat nama acara
  var eventDefs = {};
  if (eventAttendances.length > 0) {
    getData(EVENT_SHEET.DEFINITIONS).forEach(function (ev) {
      eventDefs[String(ev.id)] = ev;
    });
  }

  eventAttendances.forEach(function (a) {
    var uid = String(a.user_id || "").trim();
    if (!uid) return;
    var evDef = eventDefs[String(a.event_id)] || {};
    var evName = String(evDef.name || "Acara/Kegiatan");
    var evTime = evDef.time_start
      ? _notifFmtTime_(evDef.time_start) + "–" + _notifFmtTime_(evDef.time_end)
      : "-";
    if (!byUser[uid]) byUser[uid] = { kbm: [], events: [] };
    byUser[uid].events.push({
      event_name: evName,
      time: evTime,
    });
  });

  // --- Kirim notifikasi per guru ---
  var sent = 0;
  Object.keys(byUser).forEach(function (uid) {
    var data = byUser[uid];
    var kbmItems = data.kbm || [];
    var eventItems = data.events || [];
    if (!kbmItems.length && !eventItems.length) return;

    var paragraphs = [];

    // Bagian jurnal KBM
    if (kbmItems.length > 0) {
      paragraphs.push(
        "📚 <strong>Jurnal Mengajar (" + kbmItems.length + " jadwal):</strong>",
      );
      kbmItems.forEach(function (it) {
        var label = "• <strong>" + _escHtml_(it.subject) + "</strong>" +
          " — Kelas " + _escHtml_(it.class_name) +
          " (" + _escHtml_(it.time) + ")";
        if (it.is_substitute) {
          label += ' <span style="color:#8B5CF6;font-size:11px;">(Guru Pengganti)</span>';
        }
        paragraphs.push(label);
      });
    }

    // Bagian jurnal acara/kegiatan
    if (eventItems.length > 0) {
      paragraphs.push(
        "🎌 <strong>Jurnal Acara/Kegiatan (" + eventItems.length + " kegiatan):</strong>",
      );
      eventItems.forEach(function (it) {
        paragraphs.push(
          "• <strong>" + _escHtml_(it.event_name) + "</strong>" +
          " (" + _escHtml_(it.time) + ")",
        );
      });
    }

    paragraphs.push(
      '<span style="color:#94a3b8;font-size:12px;">Mohon segera lengkapi jurnal melalui menu ' +
      '<strong>Jurnal Mengajar</strong>' +
      (eventItems.length > 0 ? " dan <strong>Jurnal Acara</strong>" : "") +
      ".</span>",
    );

    var name = _notifGetName_(uid);
    var totalMissing = kbmItems.length + eventItems.length;
    var html = _notifBuildHtml_({
      title: "⏰ Pengingat: Jurnal Belum Diisi",
      accent: "#F59E0B",
      accent2: "#B45309",
      name: name,
      intro:
        "Kami mendeteksi <strong>" + totalMissing + " jurnal</strong> yang belum Anda lengkapi untuk hari <strong>" +
        _escHtml_(_notifFmtDateLong_(dateStr)) +
        "</strong>:",
      badges: [
        "Tanggal: " + _notifFmtDateLong_(dateStr),
        "Total Belum Diisi: " + totalMissing,
      ],
      paragraphs: paragraphs,
    });
    if (
      _notifToUser_(
        uid,
        "[SiM-Guru] Pengingat Jurnal · " + _notifFmtDate_(dateStr),
        html,
      )
    )
      sent++;
  });
  return sent;
}
function _reminderMissingBap_(dateStr) {
  if (!_notifIsExamEnabled_(dateStr)) return 0;
  var period = getData(EXAM_SHEET.PERIODS).find(function (p) {
    return dateStr >= String(p.date_start) && dateStr <= String(p.date_end);
  });
  if (!period) return 0;
  var sessions = getData(EXAM_SHEET.SESSIONS).filter(function (s) {
    return (
      String(s.period_id) === String(period.id) && String(s.date) === dateStr
    );
  });
  if (sessions.length === 0) return 0;
  var rooms = getData(EXAM_SHEET.ROOMS);
  var supervisors = getData(EXAM_SHEET.SUPERVISORS);
  var baps = getData(EXAM_SHEET.BAP);
  var nowTime = Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm");
  var byUser = {};
  sessions.forEach(function (session) {
    var te = String(session.time_end || "");
    if (!te) return;
    var teH = Number(te.substring(0, 2));
    var teM = Number(te.substring(3, 5));
    var bapMin = teH * 60 + teM + 5;
    var nowMin =
      Number(nowTime.substring(0, 2)) * 60 + Number(nowTime.substring(3, 5));
    if (nowMin < bapMin) return;
    var roomsInSession = rooms.filter(function (r) {
      return String(r.session_id) === String(session.id);
    });
    roomsInSession.forEach(function (room) {
      var sups = supervisors.filter(function (sup) {
        return (
          String(sup.room_id) === String(room.id) &&
          String(sup.status) === "active"
        );
      });
      sups.forEach(function (sup) {
        var isConf = !!(
          sup.confirmed_by && String(sup.confirmed_by).trim() !== ""
        );
        if (!isConf) return;
        var bap = baps.find(function (b) {
          return String(b.supervisor_id) === String(sup.id);
        });
        var hasBap = !!(
          bap &&
          bap.submitted_at &&
          String(bap.submitted_at).trim() !== ""
        );
        if (hasBap) return;
        var uid = String(sup.user_id);
        if (!byUser[uid]) byUser[uid] = [];
        byUser[uid].push({
          session: String(session.session_name || ""),
          room: String(room.room_name || ""),
          subject: String(room.subject || ""),
          time:
            _notifFmtTime_(session.time_start) +
            "–" +
            _notifFmtTime_(session.time_end),
        });
      });
    });
  });
  var sent = 0;
  Object.keys(byUser).forEach(function (uid) {
    var items = byUser[uid];
    if (!items.length) return;
    var paragraphs = items.map(function (it) {
      return (
        "• <strong>" +
        _escHtml_(it.session) +
        "</strong> di Ruang " +
        _escHtml_(it.room) +
        " — " +
        _escHtml_(it.subject) +
        " (" +
        _escHtml_(it.time) +
        ")"
      );
    });
    var name = _notifGetName_(uid);
    var html = _notifBuildHtml_({
      title: "⏰ Pengingat: BAP Pengawas Ujian Belum Diisi",
      accent: "#F59E0B",
      accent2: "#B45309",
      name: name,
      intro:
        "Sesi ujian yang Anda awasi pada <strong>" +
        _escHtml_(_notifFmtDateLong_(dateStr)) +
        "</strong> sudah berakhir, namun BAP-nya belum disubmit:",
      badges: ["Tanggal: " + _notifFmtDateLong_(dateStr)],
      paragraphs: paragraphs.concat([
        '<span style="color:#94a3b8;font-size:12px;">Mohon segera lengkapi BAP melalui halaman <strong>Jadwal Ujian</strong> atau panel <strong>Panitia Ujian</strong>.</span>',
      ]),
    });
    if (
      _notifToUser_(
        uid,
        "[SiM-Guru] Pengingat BAP Pengawas · " + _notifFmtDate_(dateStr),
        html,
      )
    )
      sent++;
  });
  return sent;
}
function _reminderPendingKbm_(dateStr) {
  if (!_notifIsTeachingDay_(dateStr)) return 0;
  var d = new Date(dateStr + "T00:00:00");
  var dayIdx = d.getDay();
  var cfg = _getConfigMap();
  var activeTP = cfg["tahun_pelajaran"] || "";
  var activeSem = cfg["semester"] || "";
  var picketSchedules = getData("Picket_Schedules").filter(function (p) {
    return String(p.day_index).trim() === String(dayIdx);
  });
  if (picketSchedules.length === 0) return 0;
  var logs = getData("Teaching_Logs");
  var picketIds = picketSchedules.map(function (p) {
    return String(p.user_id);
  });
  var picketLogsToday = logs.filter(function (l) {
    try {
      var ld = Utilities.formatDate(
        new Date(l.date),
        "Asia/Jakarta",
        "yyyy-MM-dd",
      );
      return ld === dateStr && String(l.schedule_id) === "PICKET-DUTY";
    } catch (_) {
      return false;
    }
  });
  picketLogsToday.forEach(function (l) {
    var uid = String(l.user_id);
    if (picketIds.indexOf(uid) < 0) picketIds.push(uid);
  });
  var schedules = getData("Schedules").filter(function (s) {
    if (String(s.day_index).trim() !== String(dayIdx)) return false;
    var sTP = s.tahun_pelajaran || activeTP;
    var sSem = s.semester || activeSem;
    return sTP === activeTP && sSem === activeSem;
  });
  var subs = getData("Substitutes").filter(function (s) {
    var sd = Utilities.formatDate(
      new Date(s.date),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    return sd === dateStr;
  });
  var attendance = getData("Daily_Attendance").filter(function (a) {
    var ad = Utilities.formatDate(
      new Date(a.date),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    return ad === dateStr;
  });
  var pendingUserIds = {};
  schedules.forEach(function (s) {
    var sub = subs.find(function (x) {
      return String(x.schedule_id) === String(s.id);
    });
    var effectiveUid = sub ? String(sub.substitute_user_id) : String(s.user_id);
    var confirmed = attendance.some(function (a) {
      return (
        String(a.user_id) === effectiveUid &&
        String(a.schedule_id || "") === String(s.id)
      );
    });
    if (!confirmed) pendingUserIds[effectiveUid] = true;
  });
  var pendingCount = Object.keys(pendingUserIds).length;
  if (pendingCount === 0) return 0;
  var users = getData("Users");
  var pendingNames = Object.keys(pendingUserIds)
    .slice(0, 8)
    .map(function (uid) {
      var u = users.find(function (x) {
        return String(x.id) === uid;
      });
      return u ? String(u.full_name || u.username) : "Guru";
    });
  var sent = 0;
  picketIds.forEach(function (picketUid) {
    var name = _notifGetName_(picketUid);
    var paragraphs = [
      "<strong>" +
        pendingCount +
        "</strong> guru mata pelajaran masih menunggu konfirmasi kehadiran Anda hari ini.",
      "Daftar singkat: " +
        pendingNames
          .map(function (n) {
            return _escHtml_(n);
          })
          .join(", ") +
        (pendingCount > pendingNames.length
          ? ", dan " + (pendingCount - pendingNames.length) + " lainnya"
          : ""),
      '<span style="color:#94a3b8;font-size:12px;">Buka halaman <strong>Piket &amp; Upacara</strong> untuk segera memprosesnya.</span>',
    ];
    var html = _notifBuildHtml_({
      title: "⏰ Pengingat: Konfirmasi Kehadiran Guru",
      accent: "#3B82F6",
      accent2: "#1D4ED8",
      name: name,
      intro:
        "Sebagai Guru Piket pada <strong>" +
        _escHtml_(_notifFmtDateLong_(dateStr)) +
        "</strong>, Anda perlu mengonfirmasi kehadiran rekan-rekan guru.",
      badges: ["Tanggal: " + _notifFmtDateLong_(dateStr)],
      paragraphs: paragraphs,
    });
    if (
      _notifToUser_(
        picketUid,
        "[SiM-Guru] Pengingat Konfirmasi Kehadiran Guru · " +
          _notifFmtDate_(dateStr),
        html,
      )
    )
      sent++;
  });
  return sent;
}
function _reminderPendingSupervisor_(dateStr) {
  if (!_notifIsExamEnabled_(dateStr)) return 0;
  var period = getData(EXAM_SHEET.PERIODS).find(function (p) {
    return dateStr >= String(p.date_start) && dateStr <= String(p.date_end);
  });
  if (!period) return 0;
  var committee = getData(EXAM_SHEET.COMMITTEE).filter(function (c) {
    return (
      String(c.date) === dateStr &&
      String(c.status) === "active" &&
      c.confirmed_by &&
      String(c.confirmed_by).trim() !== ""
    );
  });
  if (committee.length === 0) return 0;
  var sessions = getData(EXAM_SHEET.SESSIONS).filter(function (s) {
    return (
      String(s.period_id) === String(period.id) && String(s.date) === dateStr
    );
  });
  if (sessions.length === 0) return 0;
  var rooms = getData(EXAM_SHEET.ROOMS);
  var supervisors = getData(EXAM_SHEET.SUPERVISORS);
  var users = getData("Users");
  var pendingNames = [];
  sessions.forEach(function (session) {
    var roomsInSession = rooms.filter(function (r) {
      return String(r.session_id) === String(session.id);
    });
    roomsInSession.forEach(function (room) {
      supervisors
        .filter(function (sup) {
          return (
            String(sup.room_id) === String(room.id) &&
            String(sup.status) === "active"
          );
        })
        .forEach(function (sup) {
          var isConf = !!(
            sup.confirmed_by && String(sup.confirmed_by).trim() !== ""
          );
          if (isConf) return;
          var u = users.find(function (x) {
            return String(x.id) === String(sup.user_id);
          });
          var name = u ? String(u.full_name || u.username) : "Pengawas";
          pendingNames.push(
            name +
              " — " +
              (session.session_name || "") +
              " / " +
              (room.room_name || ""),
          );
        });
    });
  });
  if (pendingNames.length === 0) return 0;
  var sent = 0;
  committee.forEach(function (c) {
    var picketUid = String(c.user_id);
    var name = _notifGetName_(picketUid);
    var paragraphs = [
      "<strong>" +
        pendingNames.length +
        "</strong> pengawas ruang ujian masih menunggu konfirmasi kehadiran.",
      pendingNames
        .slice(0, 8)
        .map(function (n) {
          return "• " + _escHtml_(n);
        })
        .join("<br>") +
        (pendingNames.length > 8
          ? '<br><span style="color:#94a3b8">… dan ' +
            (pendingNames.length - 8) +
            " lainnya</span>"
          : ""),
      '<span style="color:#94a3b8;font-size:12px;">Buka halaman <strong>Panitia Ujian</strong> untuk segera memprosesnya.</span>',
    ];
    var html = _notifBuildHtml_({
      title: "⏰ Pengingat: Konfirmasi Pengawas Ruang Ujian",
      accent: "#0891B2",
      accent2: "#0369A1",
      name: name,
      intro:
        "Sebagai Panitia Ujian pada <strong>" +
        _escHtml_(_notifFmtDateLong_(dateStr)) +
        "</strong>, Anda perlu mengonfirmasi kehadiran para pengawas ruang ujian.",
      badges: ["Tanggal: " + _notifFmtDateLong_(dateStr)],
      paragraphs: paragraphs,
    });
    if (
      _notifToUser_(
        picketUid,
        "[SiM-Guru] Pengingat Konfirmasi Pengawas Ujian · " +
          _notifFmtDate_(dateStr),
        html,
      )
    )
      sent++;
  });
  return sent;
}
