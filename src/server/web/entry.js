function doGet(e) {
  var template = HtmlService.createTemplateFromFile("Index");
  
  try {
    var configRaw = getData("Config");
    var config = {};
    if (configRaw && configRaw.length) {
      configRaw.forEach(function(c) {
        config[c.key] = c.value;
      });
    }
    template.serverConfig = JSON.stringify(config);
  } catch(err) {
    template.serverConfig = "{}";
  }

  return template
    .evaluate()
    .setTitle("SiM-Guru")
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
