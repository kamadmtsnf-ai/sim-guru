function _cleanup(token, periodId) {
  if (!periodId) return;
  try {
    deleteExamPeriod(token, periodId, true);
    Logger.log("🧹 Cleanup: Data uji [" + periodId + "] berhasil dihapus.");
  } catch (e) {
    Logger.log(
      "⚠️  Cleanup gagal: " +
        e.message +
        " — Hapus manual via Admin > Jadwal Ujian.",
    );
  }
}
