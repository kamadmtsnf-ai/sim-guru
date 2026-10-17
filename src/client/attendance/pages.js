function initAttendanceList() {
      // Page_AttendanceList is the admin Daftar Kehadiran page
      // _initAttendancePage() already calls switchAttendanceTab('kehadiran') which calls _loadAttendanceList()
      _initAttendancePage();
    }
    function initAttendanceSchedule() {
      // Page_AttendanceSchedule is the admin Atur Jam Jadwal page — same initialization as the aturjadwal tab
      const dateInput = document.getElementById('inpAttendanceDate');
      if (dateInput && !dateInput.value) {
        const today = new Date();
        dateInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      }
      initSchedTemplates();
    }
    