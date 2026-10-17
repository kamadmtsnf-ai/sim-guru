function getHonorariumSlipByHistory(token, periode, userId) {
  const user = verifySession(token);
  if (!user || String(user.role).toLowerCase() !== "admin") {
    return { status: "error", message: "Unauthorized" };
  }
  const allHistory = getData("Honor_History");
  const normalizedPeriode = formatPeriode(String(periode || "").trim());
  const normalizedUserId = String(userId || "").trim();
  const history = allHistory.find((h) => {
    if (!h || !h.periode || !h.user_id) return false;
    const hPeriode = formatPeriode(String(h.periode).trim());
    const hUserId = String(h.user_id).trim();
    return hPeriode === normalizedPeriode && hUserId === normalizedUserId;
  });
  if (!history) {
    const sample = allHistory.slice(0, 3).map((h) => ({
      p: String(h.periode),
      u: String(h.user_id),
    }));
    console.error(
      "[getHonorariumSlipByHistory] Tidak ditemukan. " +
        "normalizedPeriode=" +
        normalizedPeriode +
        ", normalizedUserId=" +
        normalizedUserId +
        ", sampel allHistory=" +
        JSON.stringify(sample),
    );
    return {
      status: "error",
      message:
        "Data honorarium tidak ditemukan untuk periode: " + normalizedPeriode,
    };
  }
  const teacher = findData("Users", "id", userId);
  const config = _getConfigMap();
  const baseSalary = Number(config["base_salary"] || 0);
  const schoolName = config["app_school_name"] || "MTs Nurul Falah";
  const kepalaSekolah = config["kepala_sekolah"] || "[Nama Kepala Sekolah]";
  let allowanceItems = [];
  try {
    const parsed = JSON.parse(history.details_json || "{}");
    if (
      parsed.allowances &&
      Array.isArray(parsed.allowances) &&
      parsed.allowances.length > 0
    ) {
      const firstItem = parsed.allowances[0];
      if (
        typeof firstItem === "object" &&
        firstItem !== null &&
        "duty_name" in firstItem
      ) {
        allowanceItems = parsed.allowances.map((item) => ({
          desc: String(item.duty_name),
          qty: 1,
          rate: formatRupiah(Number(item.amount || 0)),
          amount: formatRupiah(Number(item.amount || 0)),
        }));
      } else {
        const allAllowances = getData("Allowances");
        allowanceItems = parsed.allowances.map((dutyName) => {
          const found = allAllowances.find(
            (a) =>
              String(a.user_id).trim() === normalizedUserId &&
              String(a.duty_name).trim().toLowerCase() ===
                String(dutyName).trim().toLowerCase(),
          );
          return {
            desc: String(dutyName),
            qty: 1,
            rate: found ? formatRupiah(Number(found.amount)) : "-",
            amount: found
              ? formatRupiah(Number(found.amount))
              : formatRupiah(0),
          };
        });
      }
    } else if (parsed.allow && Number(parsed.allow) > 0) {
      allowanceItems = [
        {
          desc: "Tunjangan Tambahan",
          qty: 1,
          rate: formatRupiah(Number(parsed.allow)),
          amount: formatRupiah(Number(parsed.allow)),
        },
      ];
    }
  } catch (e) {
    console.error(
      "[getHonorariumSlipByHistory] Gagal parse details_json: " + e.toString(),
    );
  }
  if (allowanceItems.length === 0) {
    const currentAllowances = getData("Allowances").filter(
      (a) => String(a.user_id).trim() === normalizedUserId,
    );
    allowanceItems = currentAllowances.map((a) => ({
      desc: String(a.duty_name),
      qty: 1,
      rate: formatRupiah(Number(a.amount)),
      amount: formatRupiah(Number(a.amount)),
    }));
  }
  const trxIdStr = String(history.trx_id || "-");
  const isFinal =
    trxIdStr && trxIdStr.indexOf("ESTIMASI") === -1 && trxIdStr !== "-";
  const transportEnabled =
    String(config["transport_allowance_enabled"] || "false")
      .toLowerCase()
      .trim() === "true";
  let transportTotal = 0;
  let transportStr = "";
  if (isFinal) {
    try {
      const parsedForTransport = JSON.parse(history.details_json || "{}");
      if (
        parsedForTransport.transport_total &&
        Number(parsedForTransport.transport_total) > 0
      ) {
        transportTotal = Math.round(Number(parsedForTransport.transport_total));
        transportStr = formatRupiah(transportTotal);
      }
    } catch (e) {}
  } else {
    if (transportEnabled) {
      transportTotal = _getMonthlyTransportSum(
        normalizedUserId,
        normalizedPeriode,
      );
      if (transportTotal > 0) {
        transportStr = formatRupiah(transportTotal);
      }
    }
  }
  if (transportTotal > 0) {
    allowanceItems.push({
      desc: "Tunjangan Transportasi",
      qty: 1,
      rate: transportStr,
      amount: transportStr,
    });
  }
  var eventJtm = 0;
  try {
    var _monthNames = [
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
    var _pParts = String(normalizedPeriode || "")
      .trim()
      .split(" ");
    var _targetMonthIdx = _monthNames.indexOf(_pParts[0]);
    var _targetYear = parseInt(_pParts[1], 10);
    if (_targetMonthIdx !== -1 && !isNaN(_targetYear)) {
      var _mm =
        _targetMonthIdx + 1 < 10
          ? "0" + (_targetMonthIdx + 1)
          : String(_targetMonthIdx + 1);
      var _firstDay = _targetYear + "-" + _mm + "-01";
      var _lastDd = new Date(_targetYear, _targetMonthIdx + 1, 0).getDate();
      var _lastDay =
        _targetYear +
        "-" +
        _mm +
        "-" +
        (_lastDd < 10 ? "0" + _lastDd : String(_lastDd));
      var _evtAtt = getData(EVENT_SHEET.ATTENDANCE).filter(function (r) {
        return (
          String(r.user_id || "") === normalizedUserId &&
          String(r.date || "") >= _firstDay &&
          String(r.date || "") <= _lastDay
        );
      });
      eventJtm = _computeEventJtm(_evtAtt);
    }
  } catch (_evtErr) {
    console.error("getHonorariumSlipByHistory eventJtm error: " + _evtErr);
  }
  const totalJtm = Number(history.total_jtm) || 0;
  let totalHonor = Number(history.total_honor) || 0;
  // Ambil event_jtm dari details_json jika final, agar baris tabel tidak dobel
  let savedEventJtm = 0;
  if (isFinal) {
    try {
      const parsedDetails = JSON.parse(history.details_json || "{}");
      savedEventJtm = Number(parsedDetails.event_jtm || 0);
    } catch (e) {}
  }
  const kbmJtm = isFinal ? (totalJtm - savedEventJtm) : totalJtm;
  const displayEventJtm = isFinal ? savedEventJtm : eventJtm;
  const honorFromJtm = kbmJtm * baseSalary;
  if (!isFinal) {
    if (transportTotal > 0) totalHonor += transportTotal;
    if (eventJtm > 0) totalHonor += eventJtm * baseSalary;
  }
  return {
    status: "success",
    periode: formatPeriode(String(history.periode).trim()),
    guru_nama: teacher ? String(teacher.full_name) : "Unknown",
    guru_nip: teacher ? String(teacher.nip || "-") : "-",
    tgl_cetak: formatDateIndo(new Date()),
    total_real: formatRupiah(honorFromJtm),
    qty_real: kbmJtm,
    jtm_event: displayEventJtm,
    jtm_event_amount: formatRupiah(displayEventJtm * baseSalary),
    tarif: formatRupiah(baseSalary),
    grand_total: formatRupiah(totalHonor),
    allowance_list: allowanceItems,
    trx_id: trxIdStr,
    kepala_sekolah: kepalaSekolah,
    school_name: schoolName,
    printed_by: String(user.full_name),
  };
}
