function getGuruJournalHistoryPaginated(
  token,
  page,
  limit,
  filterDateFrom,
  filterDateTo,
  searchQuery,
) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    // BUG FIX: tz harus dideklarasikan SEBELUM getTimestamp agar tidak undefined saat closure dibuat
    const tz = Session.getScriptTimeZone();
    const allUserLogs = getData("Teaching_Logs").filter(
      (l) => String(l.user_id).trim() === String(user.id).trim(),
    );
    const schedules = getData("Schedules");
    const getTimestamp = (entry) => {
      let dStr = entry.date;
      if (dStr instanceof Date) {
        dStr = Utilities.formatDate(dStr, tz, "yyyy-MM-dd");
      } else if (typeof dStr === "string" && dStr.indexOf("T") !== -1) {
        let dObj = new Date(dStr);
        if (!isNaN(dObj.getTime()))
          dStr = Utilities.formatDate(dObj, tz, "yyyy-MM-dd");
      }
      let tStr = entry.waktu_submit;
      if (tStr instanceof Date) {
        tStr = Utilities.formatDate(tStr, tz, "HH:mm:ss");
      } else if (typeof tStr === "string") {
        if (tStr.indexOf("T") !== -1) {
          let tObj = new Date(tStr);
          if (!isNaN(tObj.getTime()))
            tStr = Utilities.formatDate(tObj, tz, "HH:mm:ss");
        } else if (tStr.length === 5) {
          tStr = tStr + ":00";
        }
      }
      let finalDateStr = dStr + "T" + (tStr || "00:00:00");
      let ts = new Date(finalDateStr).getTime();
      return isNaN(ts) ? 0 : ts;
    };
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let logsFiltered = allUserLogs;
    if (filterDateFrom) {
      logsFiltered = logsFiltered.filter((l) => {
        let dStr = l.date;
        if (l.date instanceof Date) {
          dStr = Utilities.formatDate(l.date, tz, "yyyy-MM-dd");
        } else if (typeof dStr === "string" && dStr.indexOf("T") !== -1) {
          let dObj = new Date(dStr);
          if (!isNaN(dObj.getTime()))
            dStr = Utilities.formatDate(dObj, tz, "yyyy-MM-dd");
        }
        return String(dStr) >= String(filterDateFrom);
      });
    }
    if (filterDateTo) {
      logsFiltered = logsFiltered.filter((l) => {
        let dStr = l.date;
        if (l.date instanceof Date) {
          dStr = Utilities.formatDate(l.date, tz, "yyyy-MM-dd");
        } else if (typeof dStr === "string" && dStr.indexOf("T") !== -1) {
          let dObj = new Date(dStr);
          if (!isNaN(dObj.getTime()))
            dStr = Utilities.formatDate(dObj, tz, "yyyy-MM-dd");
        }
        return String(dStr) <= String(filterDateTo);
      });
    }
    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      logsFiltered = logsFiltered.filter((l) => {
        let subj = "",
          cls = "";
        const sid = String(l.schedule_id).toUpperCase();
        if (sid === "PICKET-DUTY") {
          subj = "tugas piket";
        } else if (sid === "CEREMONY-DUTY") {
          subj = "pembina upacara";
        } else if (sid === "EXAM-SUPERVISOR") {
          subj = "pengawas ujian";
        } else if (sid === "EXAM-COMMITTEE") {
          subj = "panitia ujian";
        } else if (sid.indexOf("PARTIAL-SUB-") === 0) {
          subj = "substitusi parsial";
        } else {
          const s = schedules.find(
            (sc) => String(sc.id) === String(l.schedule_id),
          );
          if (s) {
            subj = String(s.subject || "").toLowerCase();
            cls = String(s.class_name || "").toLowerCase();
          }
        }
        const mat = String(l.materi || "").toLowerCase();
        return (
          subj.indexOf(q) !== -1 ||
          cls.indexOf(q) !== -1 ||
          mat.indexOf(q) !== -1
        );
      });
    }
    // BUG FIX: Stats dihitung dari logsFiltered (setelah filter aktif), bukan dari semua data
    let totalJtmAll = 0;
    let totalThisMonth = 0;
    let sumHadirAll = 0;
    let sumAbsenAll = 0;
    logsFiltered.forEach((l) => {
      const jtm = Number(l.jtm_val || 0);
      totalJtmAll += jtm;
      sumHadirAll += Number(l.siswa_hadir || 0);
      sumAbsenAll += Number(l.siswa_absen || 0);
      let dStr = l.date;
      if (l.date instanceof Date) {
        dStr = Utilities.formatDate(l.date, tz, "yyyy-MM-dd");
      } else if (typeof dStr === "string" && dStr.indexOf("T") !== -1) {
        let dObj = new Date(dStr);
        if (!isNaN(dObj.getTime()))
          dStr = Utilities.formatDate(dObj, tz, "yyyy-MM-dd");
      }
      const d = new Date(dStr);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        totalThisMonth++;
      }
    });
    const totalAllSiswa = sumHadirAll + sumAbsenAll;
    const attRateAll =
      totalAllSiswa > 0
        ? Math.round((sumHadirAll * 100) / totalAllSiswa)
        : null;
    const sortedLogs = logsFiltered.sort(
      (a, b) => getTimestamp(b) - getTimestamp(a),
    );
    const totalItems = sortedLogs.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const pagedLogs = sortedLogs.slice(startIndex, startIndex + limit);
    const history = pagedLogs.map((log) => {
      let sched = null;
      const sid = String(log.schedule_id).toUpperCase();
      if (sid !== "PICKET-DUTY" && sid !== "CEREMONY-DUTY") {
        sched = schedules.find((s) => String(s.id) === String(log.schedule_id));
      }
      let subj = "N/A",
        cls = "N/A";
      if (sid === "PICKET-DUTY") {
        subj = "Tugas Piket";
        cls = "-";
      } else if (sid === "CEREMONY-DUTY") {
        subj = "Pembina Upacara";
        cls = "-";
      } else if (sid === "EXAM-SUPERVISOR") {
        subj = "Pengawas Ujian";
        cls = "-";
      } else if (sid === "EXAM-COMMITTEE") {
        subj = "Panitia Ujian";
        cls = "-";
      } else if (sid.indexOf("PARTIAL-SUB-") === 0) {
        subj = "Substitusi Parsial";
        cls = "-";
      } else if (sched) {
        subj = sched.subject;
        cls = sched.class_name;
      }
      let safeDate = log.date;
      if (safeDate instanceof Date) {
        safeDate = Utilities.formatDate(safeDate, tz, "yyyy-MM-dd");
      } else if (typeof safeDate === "string" && safeDate.indexOf("T") !== -1) {
        let dObj = new Date(safeDate);
        if (!isNaN(dObj.getTime()))
          safeDate = Utilities.formatDate(dObj, tz, "yyyy-MM-dd");
      }
      let safeTime = log.waktu_submit;
      if (safeTime instanceof Date) {
        safeTime = Utilities.formatDate(safeTime, tz, "HH:mm");
      } else if (typeof safeTime === "string") {
        if (safeTime.indexOf("T") !== -1) {
          let tObj = new Date(safeTime);
          if (!isNaN(tObj.getTime()))
            safeTime = Utilities.formatDate(tObj, tz, "HH:mm");
        } else if (safeTime.length >= 5) {
          safeTime = safeTime.substring(0, 5);
        }
      }
      if (!safeTime) safeTime = "-";
      return {
        log_id: log.log_id,
        date: String(safeDate),
        time: String(safeTime),
        class_name: cls,
        subject: subj,
        materi: log.materi,
        students: log.siswa_hadir,
        students_absent: log.siswa_absen || 0,
        notes: log.notes || "",
        clean_notes: log.notes || "-",
        jtm_val: Number(log.jtm_val || 0),
        input_type: log.input_type || "SAME_DAY",
      };
    });
    return {
      status: "success",
      data: history,
      stats: {
        total_this_month: totalThisMonth,
        total_jtm_all: totalJtmAll,
        att_rate_all: attRateAll,
      },
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: limit,
      },
    };
  } catch (error) {
    return { status: "error", message: "Server Error: " + error.toString() };
  }
}
