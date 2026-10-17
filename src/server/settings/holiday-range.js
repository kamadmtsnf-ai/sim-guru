function addHolidayRange(token, dateFrom, dateTo, desc, isHoliday) {
  const user = verifySession(token);
  if (!user || user.role !== "admin")
    return { status: "error", message: "Unauthorized" };
  if (!dateFrom || !dateTo || !desc)
    return { status: "error", message: "Data tidak lengkap" };
  const dFrom = new Date(dateFrom);
  const dTo = new Date(dateTo);
  if (dTo < dFrom)
    return {
      status: "error",
      message: "Tanggal selesai tidak boleh kurang dari tanggal mulai",
    };
  const sheet = getSheet("Academic_Calendar");
  const isHolStr = isHoliday ? "True" : "False";
  let count = 0;
  const current = new Date(dFrom);
  while (current <= dTo) {
    const dateStr = Utilities.formatDate(
      current,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
    const newId = generateId("HOL");
    sheet.appendRow([newId, dateStr, desc, isHolStr]);
    count++;
    current.setDate(current.getDate() + 1);
  }
  try {
    _invalidateDataSnapshot();
  } catch (_) {}
  return {
    status: "success",
    message: `Berhasil menambahkan ${count} hari libur`,
    count: count,
  };
}
