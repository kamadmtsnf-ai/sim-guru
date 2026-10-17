let _cachedData = null;
let _cacheTime = 0;
const CACHE_TTL = 300000;
function _invalidateDataSnapshot() {
  _cachedData = null;
  _cacheTime = 0;
}
function _getDataSnapshot(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cachedData && now - _cacheTime < CACHE_TTL) {
    return _cachedData;
  }
  const snapshot = {
    _cache: {},
    get users() { if (!this._cache.users) this._cache.users = getData("Users"); return this._cache.users; },
    get schedules() { if (!this._cache.schedules) this._cache.schedules = getData("Schedules"); return this._cache.schedules; },
    get logs() { if (!this._cache.logs) this._cache.logs = getData("Teaching_Logs"); return this._cache.logs; },
    get allowances() { if (!this._cache.allowances) this._cache.allowances = getData("Allowances"); return this._cache.allowances; },
    get config() { if (!this._cache.config) this._cache.config = _getConfigMap(); return this._cache.config; },
    get holidays() { if (!this._cache.holidays) this._cache.holidays = getData("Academic_Calendar"); return this._cache.holidays; },
    get honorHistory() { if (!this._cache.honorHistory) this._cache.honorHistory = getData("Honor_History"); return this._cache.honorHistory; },
    get pickets() { if (!this._cache.pickets) this._cache.pickets = getData("Picket_Schedules"); return this._cache.pickets; },
    get ceremonies() { if (!this._cache.ceremonies) this._cache.ceremonies = getData("Ceremony_Schedules"); return this._cache.ceremonies; },
    get eventAttendance() { if (!this._cache.eventAttendance) this._cache.eventAttendance = getData("Event_Attendance"); return this._cache.eventAttendance; },
    get attendance() { if (!this._cache.attendance) this._cache.attendance = getData("Daily_Attendance"); return this._cache.attendance; },
    get substitutes() { if (!this._cache.substitutes) this._cache.substitutes = getData("Substitutes"); return this._cache.substitutes; },
    get attendanceLeaves() { if (!this._cache.attendanceLeaves) this._cache.attendanceLeaves = getData("Attendance_Leaves"); return this._cache.attendanceLeaves; },

    get usersById() {
      if (!this._cache.usersById) {
        this._cache.usersById = {};
        this.users.forEach((u) => { this._cache.usersById[u.id] = u; });
      }
      return this._cache.usersById;
    },
    get schedulesById() {
      if (!this._cache.schedulesById) {
        this._cache.schedulesById = {};
        this.schedules.forEach((s) => { this._cache.schedulesById[s.id] = s; });
      }
      return this._cache.schedulesById;
    },
    get logsByUserId() {
      if (!this._cache.logsByUserId) {
        this._cache.logsByUserId = {};
        this.logs.forEach((l) => {
          if (!this._cache.logsByUserId[l.user_id]) this._cache.logsByUserId[l.user_id] = [];
          this._cache.logsByUserId[l.user_id].push(l);
        });
      }
      return this._cache.logsByUserId;
    },
    get allowancesByUserId() {
      if (!this._cache.allowancesByUserId) {
        this._cache.allowancesByUserId = {};
        this.allowances.forEach((a) => {
          if (!this._cache.allowancesByUserId[a.user_id]) this._cache.allowancesByUserId[a.user_id] = [];
          this._cache.allowancesByUserId[a.user_id].push(a);
        });
      }
      return this._cache.allowancesByUserId;
    },
    get eventAttendanceByUserId() {
      if (!this._cache.eventAttendanceByUserId) {
        this._cache.eventAttendanceByUserId = {};
        this.eventAttendance.forEach((a) => {
          if (!this._cache.eventAttendanceByUserId[a.user_id]) this._cache.eventAttendanceByUserId[a.user_id] = [];
          this._cache.eventAttendanceByUserId[a.user_id].push(a);
        });
      }
      return this._cache.eventAttendanceByUserId;
    },
    get attendanceByUserId() {
      if (!this._cache.attendanceByUserId) {
        this._cache.attendanceByUserId = {};
        this.attendance.forEach((a) => {
          if (!this._cache.attendanceByUserId[a.user_id]) this._cache.attendanceByUserId[a.user_id] = [];
          this._cache.attendanceByUserId[a.user_id].push(a);
        });
      }
      return this._cache.attendanceByUserId;
    },
    get attendanceLeavesByUserId() {
      if (!this._cache.attendanceLeavesByUserId) {
        this._cache.attendanceLeavesByUserId = {};
        this.attendanceLeaves.forEach((lv) => {
          if (!this._cache.attendanceLeavesByUserId[lv.user_id]) this._cache.attendanceLeavesByUserId[lv.user_id] = [];
          this._cache.attendanceLeavesByUserId[lv.user_id].push(lv);
        });
      }
      return this._cache.attendanceLeavesByUserId;
    },
    get substitutesByUserId() {
      if (!this._cache.substitutesByUserId) {
        this._cache.substitutesByUserId = {};
        this._cache.substitutesByScheduleId = {};
        this.substitutes.forEach((sub) => {
          if (!this._cache.substitutesByUserId[sub.substitute_user_id]) this._cache.substitutesByUserId[sub.substitute_user_id] = [];
          this._cache.substitutesByUserId[sub.substitute_user_id].push(sub);
          
          if (!this._cache.substitutesByScheduleId[sub.schedule_id]) this._cache.substitutesByScheduleId[sub.schedule_id] = [];
          this._cache.substitutesByScheduleId[sub.schedule_id].push(sub);
        });
      }
      return this._cache.substitutesByUserId;
    },
    get substitutesByScheduleId() {
      if (!this._cache.substitutesByScheduleId) {
        let dummy = this.substitutesByUserId; 
      }
      return this._cache.substitutesByScheduleId;
    }
  };
  _cachedData = snapshot;
  _cacheTime = now;
  return snapshot;
}
