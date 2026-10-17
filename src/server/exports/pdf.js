function savePdfToDrive(base64, filename) {
  try {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      "application/pdf",
      filename,
    );
    const folder = DriveApp.getRootFolder();
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error: " + e.toString();
  }
}
