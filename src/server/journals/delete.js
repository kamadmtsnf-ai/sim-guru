function deleteTeachingLog(token, id) {
  try {
    const user = verifySession(token);
    if (!user) return { status: "error", message: "Unauthorized" };
    const isAdmin = String(user.role).toLowerCase() === "admin";
    // Guru hanya boleh hapus jurnal miliknya sendiri; admin boleh hapus milik siapapun
    if (!isAdmin) {
      const logs = getData("Teaching_Logs");
      const log = logs.find((l) => String(l.log_id) === String(id));
      if (!log) return { status: "error", message: "Jurnal tidak ditemukan." };
      if (String(log.user_id).trim() !== String(user.id).trim()) {
        return { status: "error", message: "Anda tidak memiliki akses untuk menghapus jurnal ini." };
      }
      // Guru tidak boleh hapus jurnal auto-generated libur bonus
      if (String(log.notes || "").includes("Auto-generated: Libur Bonus")) {
        return { status: "error", message: "Jurnal yang dibuat otomatis oleh sistem tidak dapat dihapus." };
      }
    }
    const sheet = getSheet("Teaching_Logs");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        try { _invalidateDataSnapshot(); } catch (_) {}
        return { status: "success" };
      }
    }
    return { status: "error", message: "Data tidak ditemukan." };
  } catch (e) {
    return { status: "error", message: "Server Error: " + e.toString() };
  }
}
