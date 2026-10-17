function _authorizeAttendanceWriter(user, isPicketConfirmed) {
  if (!user) return false;
  if (typeof user.role === "string" && user.role === "admin") return true;
  return isPicketConfirmed === true;
}
