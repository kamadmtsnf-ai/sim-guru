function validateDocument(trxId) {
  if (!trxId || String(trxId).trim() === "") {
    return { status: "invalid", message: "ID Transaksi tidak boleh kosong." };
  }
  const cleanId = String(trxId).trim().toUpperCase();
  const allHistory = getData("Honor_History");
  const history = allHistory.find(
    (h) =>
      String(h.trx_id || "")
        .trim()
        .toUpperCase() === cleanId,
  );
  if (history) {
    const user = findData("Users", "id", history.user_id);
    const config = getData("Config");
    const schoolNameCfg = config.find((c) => String(c.key) === "school_name");
    const kepalaSekolahCfg = config.find(
      (c) => String(c.key) === "kepala_sekolah",
    );
    const totalJtm = Number(history.total_jtm) || 0;
    const totalHonor = Number(history.total_honor) || 0;
    const baseSalary =
      Number(
        (config.find((c) => String(c.key) === "base_salary") || {}).value,
      ) || 0;
    let periodeStr = String(history.periode || "").trim();
    if (history.periode instanceof Date) {
      periodeStr = Utilities.formatDate(
        history.periode,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd",
      );
    }
    let tglSimpan = history.tanggal_simpan;
    if (tglSimpan instanceof Date) {
      tglSimpan = formatDateIndo(tglSimpan);
    } else if (tglSimpan) {
      tglSimpan = formatDateIndo(new Date(tglSimpan));
    } else {
      tglSimpan = "-";
    }
    return {
      status: "valid",
      data: {
        trx_id: String(history.trx_id),
        nama_guru: user ? String(user.full_name) : "Unknown",
        nip: user ? String(user.nip || "-") : "-",
        periode: formatPeriode(periodeStr),
        total_jtm: totalJtm,
        total_honor: formatRupiah(totalHonor),
        tgl_simpan: tglSimpan,
        tgl_verifikasi: formatDateIndo(new Date()),
        school_name: schoolNameCfg
          ? String(schoolNameCfg.value)
          : "MTs Nurul Falah",
        kepala_sekolah: kepalaSekolahCfg ? String(kepalaSekolahCfg.value) : "-",
      },
    };
  }
  return {
    status: "invalid",
    message:
      "Dokumen tidak ditemukan. Pastikan ID Transaksi yang Anda masukkan benar dan sesuai dengan slip yang diterima.",
  };
}
