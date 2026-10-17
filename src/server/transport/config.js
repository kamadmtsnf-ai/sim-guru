function getTransportConfig(token) {
  try {
    const user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali" };
    const cfg = _getConfigMap();
    const rawTarif = cfg["tarif_per_km"];
    const tarif_per_km =
      rawTarif !== undefined && rawTarif !== "" ? Number(rawTarif) : 0;
    const rawEnabled = cfg["transport_allowance_enabled"];
    const transport_allowance_enabled =
      String(rawEnabled).toLowerCase() === "true";
    return {
      status: "success",
      tarif_per_km: isNaN(tarif_per_km) ? 0 : tarif_per_km,
      transport_allowance_enabled: transport_allowance_enabled,
    };
  } catch (e) {
    console.error("getTransportConfig error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
function saveTransportConfig(token, payload) {
  try {
    const user = verifySession(token);
    if (!user)
      return { status: "error", message: "Sesi habis, silakan login kembali" };
    if (String(user.role).toLowerCase() !== "admin") {
      return { status: "error", message: "Akses hanya untuk Admin" };
    }
    const rawTarif = payload && payload.tarif_per_km;
    const tarif = Number(rawTarif);
    if (
      rawTarif === null ||
      rawTarif === undefined ||
      rawTarif === "" ||
      isNaN(tarif) ||
      !isFinite(tarif) ||
      tarif < 1 ||
      tarif > 999999999
    ) {
      return {
        status: "error",
        message:
          "Tarif per KM harus berupa angka positif antara 1 dan 999.999.999.",
      };
    }
    const enabledRaw = payload && payload.transport_allowance_enabled;
    const enabledStr =
      enabledRaw === true || String(enabledRaw).toLowerCase() === "true"
        ? "true"
        : "false";
    const sheet = getSheet("Config");
    const existingData = sheet.getDataRange().getValues();
    const updateConfigKey = (key, val) => {
      let rowIndex = -1;
      for (let i = 1; i < existingData.length; i++) {
        if (String(existingData[i][0]) === key) {
          rowIndex = i + 1;
          break;
        }
      }
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 2).setValue(val);
      } else {
        sheet.appendRow([key, val, ""]);
      }
    };
    updateConfigKey("tarif_per_km", tarif);
    updateConfigKey("transport_allowance_enabled", enabledStr);
    try {
      _invalidateDataSnapshot();
    } catch (_) {}
    return {
      status: "success",
      message: "Konfigurasi tunjangan transportasi berhasil disimpan.",
    };
  } catch (e) {
    console.error("saveTransportConfig error: " + e);
    return { status: "error", message: "Terjadi kesalahan server. Coba lagi." };
  }
}
