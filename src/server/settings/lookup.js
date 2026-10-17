function getConfigValue(key) {
  const conf = getData("Config");
  const item = conf.find((c) => c.key === key);
  return item ? item.value : "";
}
