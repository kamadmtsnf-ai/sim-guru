function _minutesBetween(timeStart, timeEnd) {
  if (
    typeof timeStart !== "string" ||
    typeof timeEnd !== "string" ||
    !timeStart.trim() ||
    !timeEnd.trim()
  ) {
    return 0;
  }
  var rTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
  var startMatch = timeStart.trim().match(rTime);
  var endMatch = timeEnd.trim().match(rTime);
  if (!startMatch || !endMatch) return 0;
  var startMinutes =
    parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
  var endMinutes = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);
  var diff = endMinutes - startMinutes;
  return diff > 0 ? diff : 0;
}
function _calcAttendancePercent(durasiAktual, durasiJadwal) {
  var actual = Number(durasiAktual);
  var jadwal = Number(durasiJadwal);
  if (!isFinite(jadwal) || jadwal <= 0) return 0;
  if (!isFinite(actual) || actual < 0) actual = 0;
  var raw = (actual / jadwal) * 100;
  var capped = raw > 100 ? 100 : raw;
  return Math.round(capped * 1000) / 1000;
}
function _calcDailyTransport(
  kmDistance,
  tarifPerKm,
  durasiAktual,
  durasiJadwal,
  transportEnabled,
) {
  var enabled =
    transportEnabled === undefined || transportEnabled === null
      ? true
      : transportEnabled === true ||
        String(transportEnabled).toLowerCase() === "true";
  if (!enabled) return 0;
  var km = Number(kmDistance);
  var tarif = Number(tarifPerKm);
  var aktual = Number(durasiAktual);
  var jadwal = Number(durasiJadwal);
  if (
    !isFinite(km) ||
    !isFinite(tarif) ||
    !isFinite(aktual) ||
    !isFinite(jadwal)
  )
    return 0;
  if (km === 0 || tarif === 0) return 0;
  if (jadwal <= 0) return 0; 
  if (aktual <= 0) return 0; 
  var effectiveAktual = aktual > jadwal ? jadwal : aktual;
  return km * tarif * (effectiveAktual / jadwal);
}
function _applyThreePointRounding(totalDesimal) {
  var total = Number(totalDesimal);
  if (!isFinite(total) || isNaN(total) || total <= 0) return 0;
  var base = Math.floor(total / 1000) * 1000;
  var sisa = total - base;
  if (sisa < 333.34) {
    return base;
  } else if (sisa < 666.67) {
    return base + 500;
  } else {
    return base + 1000;
  }
}
