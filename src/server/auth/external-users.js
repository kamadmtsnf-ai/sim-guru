function _extUsersSheet_() {
  return SpreadsheetApp.openById(EXT_USERS_SS_ID).getSheetByName(
    EXT_USERS_SHEET,
  );
}
function _extFindUserRow_(username) {
  const sheet = _extUsersSheet_();
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(username).trim()) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}
function _extGetPassword_(username) {
  const found = _extFindUserRow_(username);
  return found ? String(found.row[2]) : null;
}
function _extSetPassword_(username, newPassword) {
  const sheet = _extUsersSheet_();
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(username).trim()) {
      sheet.getRange(i + 1, 3).setValue(newPassword);
      SpreadsheetApp.flush();
      return true;
    }
  }
  return false;
}
function _extAddUser_(username, password) {
  const sheet = _extUsersSheet_();
  if (!sheet) return false;
  sheet.appendRow(["", String(username), String(password)]);
  SpreadsheetApp.flush();
  return true;
}
function _extUpdateUsername_(oldUsername, newUsername) {
  const sheet = _extUsersSheet_();
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(oldUsername).trim()) {
      sheet.getRange(i + 1, 2).setValue(String(newUsername));
      SpreadsheetApp.flush();
      return true;
    }
  }
  return false;
}
function _extDeleteUser_(username) {
  const sheet = _extUsersSheet_();
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim() === String(username).trim()) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return true;
    }
  }
  return false;
}
