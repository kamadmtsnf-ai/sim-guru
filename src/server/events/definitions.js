function getEventDefinitions(token) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (!_authorizeEventWriter(user)) {
      return {
        status: "error",
        message: "Akses Ditolak: Halaman ini hanya untuk Admin.",
      };
    }
    var rows = getData(EVENT_SHEET.DEFINITIONS);
    return { status: "success", events: rows };
  } catch (e) {
    console.error("getEventDefinitions error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function saveEventDefinition(token, payload) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (!_authorizeEventWriter(user)) {
      return {
        status: "error",
        message: "Akses Ditolak: Halaman ini hanya untuk Admin.",
      };
    }
    var validation = _validateEventDefinition(payload);
    if (!validation.ok) {
      return { status: "error", message: validation.message };
    }
    var payloadId = payload && payload.id ? String(payload.id).trim() : "";
    var allDefs = getData(EVENT_SHEET.DEFINITIONS);
    var nameNorm = String(payload.name).trim().toLowerCase();
    var duplicate = allDefs.find(function (r) {
      return (
        String(r.name || "")
          .trim()
          .toLowerCase() === nameNorm && String(r.id || "") !== payloadId
      );
    });
    if (duplicate) {
      return {
        status: "error",
        message: "Nama acara sudah digunakan oleh acara lain.",
      };
    }
    var sheet = getSheet(EVENT_SHEET.DEFINITIONS);
    var savedId;
    if (payloadId) {
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function (h) {
        return String(h).toLowerCase().trim().replace(/\s+/g, "_");
      });
      var colIdx = {};
      headers.forEach(function (h, i) {
        colIdx[h] = i;
      });
      var foundRowNum = -1;
      for (var i = 1; i < rows.length; i++) {
        if (
          String(rows[i][colIdx["id"] !== undefined ? colIdx["id"] : 0]) ===
          payloadId
        ) {
          foundRowNum = i + 1; 
          break;
        }
      }
      if (foundRowNum === -1) {
        return { status: "error", message: "Definisi acara tidak ditemukan." };
      }
      sheet
        .getRange(
          foundRowNum,
          (colIdx["name"] !== undefined ? colIdx["name"] : 1) + 1,
        )
        .setValue(String(payload.name || "").trim());
      sheet
        .getRange(
          foundRowNum,
          (colIdx["type"] !== undefined ? colIdx["type"] : 2) + 1,
        )
        .setValue(String(payload.type || "").trim());
      sheet
        .getRange(
          foundRowNum,
          (colIdx["recurrence_day_index"] !== undefined
            ? colIdx["recurrence_day_index"]
            : 3) + 1,
        )
        .setValue(
          payload.recurrence_day_index !== null &&
            payload.recurrence_day_index !== undefined
            ? payload.recurrence_day_index
            : "",
        );
      sheet
        .getRange(
          foundRowNum,
          (colIdx["dates_json"] !== undefined ? colIdx["dates_json"] : 4) + 1,
        )
        .setValue(
          payload.dates_json !== null && payload.dates_json !== undefined
            ? payload.dates_json
            : "",
        );
      sheet
        .getRange(
          foundRowNum,
          (colIdx["time_start"] !== undefined ? colIdx["time_start"] : 5) + 1,
        )
        .setValue(
          String(payload.time_start || "")
            .trim()
            .slice(0, 5),
        );
      sheet
        .getRange(
          foundRowNum,
          (colIdx["time_end"] !== undefined ? colIdx["time_end"] : 6) + 1,
        )
        .setValue(
          String(payload.time_end || "")
            .trim()
            .slice(0, 5),
        );
      sheet
        .getRange(
          foundRowNum,
          (colIdx["jtm_val"] !== undefined ? colIdx["jtm_val"] : 7) + 1,
        )
        .setValue(Number(payload.jtm_val));
      sheet
        .getRange(
          foundRowNum,
          (colIdx["description"] !== undefined ? colIdx["description"] : 8) + 1,
        )
        .setValue(String(payload.description || ""));
      savedId = payloadId;
    } else {
      savedId = generateId("EVD");
      var now = new Date().toISOString();
      sheet.appendRow([
        savedId,
        String(payload.name || "").trim(),
        String(payload.type || "").trim(),
        payload.recurrence_day_index !== null &&
        payload.recurrence_day_index !== undefined
          ? payload.recurrence_day_index
          : "",
        payload.dates_json !== null && payload.dates_json !== undefined
          ? payload.dates_json
          : "",
        String(payload.time_start || "").trim(),
        String(payload.time_end || "").trim(),
        Number(payload.jtm_val),
        String(payload.description || ""),
        String(user.id),
        now,
      ]);
    }
    return { status: "success", id: savedId };
  } catch (e) {
    console.error("saveEventDefinition error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
function deleteEventDefinition(token, eventId, force) {
  try {
    var user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali." };
    if (!_authorizeEventWriter(user)) {
      return {
        status: "error",
        message: "Akses Ditolak: Halaman ini hanya untuk Admin.",
      };
    }
    var eId = String(eventId || "").trim();
    if (!eId) return { status: "error", message: "ID acara tidak valid." };
    var allAttendance = getData(EVENT_SHEET.ATTENDANCE);
    var allJournals = getData(EVENT_SHEET.JOURNALS);
    var relatedAttendance = allAttendance.filter(function (r) {
      return String(r.event_id || "") === eId;
    });
    var relatedJournals = allJournals.filter(function (r) {
      return String(r.event_id || "") === eId;
    });
    var relatedCount = {
      attendance: relatedAttendance.length,
      journals: relatedJournals.length,
    };
    if (force !== true) {
      return { status: "success", deleted: false, relatedCount: relatedCount };
    }
    var journalSheet = getSheet(EVENT_SHEET.JOURNALS);
    var journalRows = journalSheet.getDataRange().getValues();
    var journalHeaders = journalRows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var jEventIdCol = journalHeaders.indexOf("event_id");
    if (jEventIdCol === -1) jEventIdCol = 1; 
    for (var j = journalRows.length - 1; j >= 1; j--) {
      if (String(journalRows[j][jEventIdCol]) === eId) {
        journalSheet.deleteRow(j + 1);
      }
    }
    var attendanceSheet = getSheet(EVENT_SHEET.ATTENDANCE);
    var attRows = attendanceSheet.getDataRange().getValues();
    var attHeaders = attRows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var aEventIdCol = attHeaders.indexOf("event_id");
    if (aEventIdCol === -1) aEventIdCol = 1;
    for (var a = attRows.length - 1; a >= 1; a--) {
      if (String(attRows[a][aEventIdCol]) === eId) {
        attendanceSheet.deleteRow(a + 1);
      }
    }
    var defSheet = getSheet(EVENT_SHEET.DEFINITIONS);
    var defRows = defSheet.getDataRange().getValues();
    var defHeaders = defRows[0].map(function (h) {
      return String(h).toLowerCase().trim().replace(/\s+/g, "_");
    });
    var dIdCol = defHeaders.indexOf("id");
    if (dIdCol === -1) dIdCol = 0;
    for (var d = defRows.length - 1; d >= 1; d--) {
      if (String(defRows[d][dIdCol]) === eId) {
        defSheet.deleteRow(d + 1);
        break; 
      }
    }
    return { status: "success", deleted: true, relatedCount: relatedCount };
  } catch (e) {
    console.error("deleteEventDefinition error: " + e);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}
