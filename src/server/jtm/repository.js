var JTM_SHEET = {
  ADJUSTMENTS: "JTM_Adjustments",
  REALLOCATIONS: "JTM_Reallocations",
};
var JTM_ADJUSTMENTS_HEADERS = [
  "id",
  "occurrence_type",
  "occurrence_ref",
  "date",
  "original_user_id",
  "scheduled_jtm",
  "adjusted_jtm",
  "jtm_difference",
  "reason",
  "adjusted_by",
  "adjusted_at",
];
var JTM_REALLOCATIONS_HEADERS = [
  "id",
  "adjustment_id",
  "occurrence_type",
  "occurrence_ref",
  "date",
  "substitute_user_id",
  "allocated_jtm",
  "created_by",
  "created_at",
  "log_id",
];
function _jtmNowIso_() {
  return Utilities.formatDate(
    new Date(),
    "Asia/Jakarta",
    "yyyy-MM-dd'T'HH:mm:ss",
  );
}
function _jtmGetAdjustmentsSheet_() {
  var ss = SpreadsheetApp.openById(getDbId());
  createSheetIfNeeded_(ss, JTM_SHEET.ADJUSTMENTS, JTM_ADJUSTMENTS_HEADERS);
  var sheet = ss.getSheetByName(JTM_SHEET.ADJUSTMENTS);
  if (!sheet)
    throw new Error(
      "Sheet JTM_Adjustments tidak ditemukan setelah createSheetIfNeeded_.",
    );
  return sheet;
}
function _jtmGetReallocationsSheet_() {
  var ss = SpreadsheetApp.openById(getDbId());
  createSheetIfNeeded_(ss, JTM_SHEET.REALLOCATIONS, JTM_REALLOCATIONS_HEADERS);
  var sheet = ss.getSheetByName(JTM_SHEET.REALLOCATIONS);
  if (!sheet)
    throw new Error(
      "Sheet JTM_Reallocations tidak ditemukan setelah createSheetIfNeeded_.",
    );
  return sheet;
}
function _jtmColMap_(sheet) {
  var lastCol = sheet.getLastColumn() || 1;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[String(headers[i]).trim().toLowerCase()] = i;
  }
  return map;
}
function _jtmRowToObject_(row, headers) {
  var tz = Session.getScriptTimeZone();
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    var val = row[i];
    if (val instanceof Date) {
      try {
        var formatted = Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss");
        if (formatted.slice(11) === "00:00:00") {
          formatted = formatted.slice(0, 10);
        }
        val = formatted;
      } catch (_) {
        val = val.toISOString ? val.toISOString() : String(val);
      }
    }
    obj[headers[i]] = val;
  }
  return obj;
}
function _jtmBuildAdjustmentRecord_(params) {
  var scheduledJtm = Number(params.scheduledJtm) || 0;
  var adjustedJtm = Number(params.adjustedJtm) || 0;
  var difference = _jtmComputeDifference(scheduledJtm, adjustedJtm);
  var reasonRes = _jtmValidateReason(adjustedJtm, scheduledJtm, params.reason);
  var reason = reasonRes.ok
    ? reasonRes.reason
    : String(params.reason == null ? "" : params.reason).trim();
  return {
    id: params.id || generateId("JADJ"),
    occurrence_type: String(params.occurrenceType || ""),
    occurrence_ref: String(params.occurrenceRef || ""),
    date: String(params.date || ""),
    original_user_id: String(params.originalUserId || ""),
    scheduled_jtm: scheduledJtm,
    adjusted_jtm: adjustedJtm,
    jtm_difference: difference,
    reason: reason,
    adjusted_by: String(params.adjustedBy || ""),
    adjusted_at: params.adjustedAt || _jtmNowIso_(),
  };
}
function _jtmAdjustmentRecordToRow_(record) {
  return JTM_ADJUSTMENTS_HEADERS.map(function (h) {
    var v = record[h];
    return v === undefined || v === null ? "" : v;
  });
}
function _jtmFindAdjustmentRow_(occurrenceType, occurrenceRef) {
  var sheet = _jtmGetAdjustmentsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var col = _jtmColMap_(sheet);
  var typeIdx = col["occurrence_type"];
  var refIdx = col["occurrence_ref"];
  var type = String(occurrenceType);
  var ref = String(occurrenceRef);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][typeIdx]) === type && String(data[i][refIdx]) === ref) {
      return {
        rowNumber: i + 1,
        record: _jtmRowToObject_(data[i], JTM_ADJUSTMENTS_HEADERS),
      };
    }
  }
  return null;
}
function _jtmReadAdjustment_(occurrenceType, occurrenceRef) {
  var found = _jtmFindAdjustmentRow_(occurrenceType, occurrenceRef);
  return found ? found.record : null;
}
function _jtmBuildPiketAdjustmentMap_() {
  var map = {};
  try {
    var sheet = _jtmGetAdjustmentsSheet_();
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return map;
    var col = _jtmColMap_(sheet);
    var typeIdx = col["occurrence_type"];
    var refIdx  = col["occurrence_ref"];   // format: "userId|yyyy-MM-dd"
    var adjIdx  = col["adjusted_jtm"];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][typeIdx]) !== "PIKET") continue;
      var adj = data[i][adjIdx];
      if (adj === null || adj === undefined || adj === "" || isNaN(Number(adj))) continue;
      // key sudah berupa "userId|date" — simpan langsung
      map[String(data[i][refIdx])] = Number(adj);
    }
  } catch (e) {}
  return map;
}
function _jtmResolvePiketLogJtm_(map, logUserId, logDate, fallback) {
  if (!map) return fallback;
  var tz = Session.getScriptTimeZone();
  var dStr = logDate instanceof Date
    ? Utilities.formatDate(logDate, tz, "yyyy-MM-dd")
    : String(logDate);
  var key = String(logUserId) + "|" + dStr;
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key];
  }
  return fallback;
}
function _jtmBuildKbmAdjustmentMap_() {
  var map = {};
  try {
    var sheet = _jtmGetAdjustmentsSheet_();
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return map;
    var col = _jtmColMap_(sheet);
    var typeIdx = col["occurrence_type"];
    var refIdx = col["occurrence_ref"];
    var dateIdx = col["date"];
    var adjIdx = col["adjusted_jtm"];
    var tz = Session.getScriptTimeZone();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][typeIdx]) !== "KBM") continue;
      var adj = data[i][adjIdx];
      if (adj === null || adj === undefined || adj === "" || isNaN(Number(adj)))
        continue;
      var dVal = data[i][dateIdx];
      var dStr =
        dVal instanceof Date
          ? Utilities.formatDate(dVal, tz, "yyyy-MM-dd")
          : String(dVal);
      map[String(data[i][refIdx]) + "|" + dStr] = Number(adj);
    }
  } catch (e) {}
  return map;
}
function _jtmResolveKbmLogJtm_(map, scheduleId, logDate, fallback) {
  if (!map) return fallback;
  var tz = Session.getScriptTimeZone();
  var dStr =
    logDate instanceof Date
      ? Utilities.formatDate(logDate, tz, "yyyy-MM-dd")
      : String(logDate);
  var key = String(scheduleId) + "|" + dStr;
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key];
  }
  return fallback;
}
function _jtmUpsertAdjustment_(record) {
  var sheet = _jtmGetAdjustmentsSheet_();
  var existing = _jtmFindAdjustmentRow_(
    record.occurrence_type,
    record.occurrence_ref,
  );
  if (existing) {
    record.id = existing.record.id;
    var row = _jtmAdjustmentRecordToRow_(record);
    sheet.getRange(existing.rowNumber, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(_jtmAdjustmentRecordToRow_(record));
  }
  return record;
}
function _jtmDeleteAdjustment_(occurrenceType, occurrenceRef) {
  var sheet = _jtmGetAdjustmentsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  var col = _jtmColMap_(sheet);
  var typeIdx = col["occurrence_type"];
  var refIdx = col["occurrence_ref"];
  var type = String(occurrenceType);
  var ref = String(occurrenceRef);
  var deleted = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][typeIdx]) === type && String(data[i][refIdx]) === ref) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }
  return deleted;
}
function _jtmReallocationRecordToRow_(record) {
  return JTM_REALLOCATIONS_HEADERS.map(function (h) {
    var v = record[h];
    return v === undefined || v === null ? "" : v;
  });
}
function _jtmCreateReallocation_(params) {
  var record = {
    id: params.id || generateId("JRA"),
    adjustment_id: String(params.adjustmentId || ""),
    occurrence_type: String(params.occurrenceType || ""),
    occurrence_ref: String(params.occurrenceRef || ""),
    date: String(params.date || ""),
    substitute_user_id: String(params.substituteUserId || ""),
    allocated_jtm: Number(params.allocatedJtm) || 0,
    created_by: String(params.createdBy || ""),
    created_at: params.createdAt || _jtmNowIso_(),
    log_id: params.logId == null ? "" : String(params.logId),
  };
  _jtmGetReallocationsSheet_().appendRow(_jtmReallocationRecordToRow_(record));
  return record;
}
function _jtmReadReallocations_(occurrenceType, occurrenceRef) {
  var sheet = _jtmGetReallocationsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var col = _jtmColMap_(sheet);
  var typeIdx = col["occurrence_type"];
  var refIdx = col["occurrence_ref"];
  var type = String(occurrenceType);
  var ref = String(occurrenceRef);
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][typeIdx]) === type && String(data[i][refIdx]) === ref) {
      out.push(_jtmRowToObject_(data[i], JTM_REALLOCATIONS_HEADERS));
    }
  }
  return out;
}
function _jtmReadReallocationById_(reallocationId) {
  var sheet = _jtmGetReallocationsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var col = _jtmColMap_(sheet);
  var idIdx = col["id"];
  var id = String(reallocationId);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === id) {
      return _jtmRowToObject_(data[i], JTM_REALLOCATIONS_HEADERS);
    }
  }
  return null;
}
function _jtmDeleteReallocation_(reallocationId) {
  var sheet = _jtmGetReallocationsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  var col = _jtmColMap_(sheet);
  var idIdx = col["id"];
  var id = String(reallocationId);
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idIdx]) === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
function _jtmDeleteReallocationsForOccurrence_(occurrenceType, occurrenceRef) {
  var sheet = _jtmGetReallocationsSheet_();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var col = _jtmColMap_(sheet);
  var typeIdx = col["occurrence_type"];
  var refIdx = col["occurrence_ref"];
  var idIdx = col["id"];
  var type = String(occurrenceType);
  var ref = String(occurrenceRef);
  var deletedIds = [];
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][typeIdx]) === type && String(data[i][refIdx]) === ref) {
      deletedIds.push(String(data[i][idIdx]));
      sheet.deleteRow(i + 1);
    }
  }
  return deletedIds;
}
