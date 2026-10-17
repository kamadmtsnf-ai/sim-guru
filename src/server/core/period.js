function formatPeriode(periodeValue) {
  if (!periodeValue) return "Unknown";
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const parts = String(periodeValue).split(" ");
  if (
    parts.length === 2 &&
    monthNames.includes(parts[0]) &&
    !isNaN(parseInt(parts[1]))
  ) {
    return periodeValue;
  }
  let date;
  if (periodeValue instanceof Date) {
    date = periodeValue;
  } else {
    date = new Date(periodeValue);
  }
  if (!isNaN(date.getTime())) {
    try {
      const monthIndex =
        parseInt(Utilities.formatDate(date, Session.getScriptTimeZone(), "M")) -
        1;
      const year = Utilities.formatDate(
        date,
        Session.getScriptTimeZone(),
        "yyyy",
      );
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]} ${year}`;
      }
    } catch (e) {
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${month} ${year}`;
    }
  }
  return String(periodeValue);
}
function getPeriodeSortKey(periodeValue) {
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  let date;
  if (periodeValue instanceof Date) {
    date = periodeValue;
  } else {
    date = new Date(periodeValue);
  }
  if (!isNaN(date.getTime())) {
    return date.getFullYear() * 12 + date.getMonth();
  }
  const parts = String(periodeValue).split(" ");
  if (parts.length === 2) {
    const monthIndex = monthNames.indexOf(parts[0]);
    const year = parseInt(parts[1]);
    if (monthIndex !== -1 && !isNaN(year)) {
      return year * 12 + monthIndex;
    }
  }
  return 0;
}
