function toggleNavAccordion(groupId) {
      var container = document.getElementById('sidebarMenuContainer');
      if (!container) return;
      var allBodies   = container.querySelectorAll('.nav-accordion-body');
      var allHeaders  = container.querySelectorAll('.nav-accordion-header');
      var targetBody   = document.getElementById('acc-body-' + groupId);
      var targetHeader = container.querySelector('[data-group="' + groupId + '"] .nav-accordion-header');
      var isOpen = targetBody && targetBody.classList.contains('is-open');
      allBodies.forEach(function(b) { b.classList.remove('is-open'); });
      allHeaders.forEach(function(h) { h.classList.remove('is-open'); h.setAttribute('aria-expanded','false'); });
      if (!isOpen && targetBody) {
        targetBody.classList.add('is-open');
        if (targetHeader) { targetHeader.classList.add('is-open'); targetHeader.setAttribute('aria-expanded','true'); }
      }
    }
    function toggleNestedNavAccordion(nestedGroupId) {
      var container = document.getElementById('sidebarMenuContainer');
      if (!container) return;
      var targetBody   = document.getElementById('nested-body-' + nestedGroupId);
      var targetHeader = document.getElementById('nested-header-' + nestedGroupId);
      var isOpen = targetBody && targetBody.classList.contains('is-open');
      if (isOpen) {
        if (targetBody) targetBody.classList.remove('is-open');
        if (targetHeader) { targetHeader.classList.remove('is-open'); targetHeader.setAttribute('aria-expanded','false'); }
      } else {
        if (targetBody) targetBody.classList.add('is-open');
        if (targetHeader) { targetHeader.classList.add('is-open'); targetHeader.setAttribute('aria-expanded','true'); }
      }
    }
    function openAccordionForPage(pageName) {
      var role = String(localStorage.getItem('user_role') || '').toLowerCase();
      var pageGroupMap = {
        'Page_MySchedule':       'guru-kbm',
        'Page_Journal':          'guru-kbm',
        'Page_Attendance':       'guru-kehadiran',
        'Page_Picket':           'guru-kehadiran',
        'Page_EventAttendance':  'guru-kehadiran',
        'Page_ExamPanitia':      'guru-kehadiran',
        'Page_StudentAttendance':'guru-kehadiran',
        'Page_StudentAttendanceInput': 'guru-kehadiran',
        'Page_StudentAttendanceHistory': 'guru-kehadiran',
        'Page_EventJournal':     'guru-jurnal-acara',
        'Page_EventJournalHistory':'guru-jurnal-acara',
        'Page_Honorarium':       'guru-honorarium',
        'Page_HonorariumHistory':'guru-honorarium',
        'Page_MyAttendance':     'guru-kehadiran',
        'Page_Picket_Admin':         'admin-kehadiran',
        'Page_EventAttendance_Admin':'admin-kehadiran',
        'Page_Honorarium_Admin':     'admin-honorarium',
        'Page_HonorariumHistory_Admin':'admin-honorarium',
        'Page_Users':            'admin-manajemen',
        'Page_ManageSchedule':   'admin-manajemen',
        'Page_ExamSchedule':     'admin-manajemen',
        'Page_EventManagement':  'admin-manajemen',
        'Page_Settings_Config':  'admin-konfigurasi',
        'Page_Settings_Kalender':'admin-konfigurasi',
        'Page_Settings_Mapel':   'admin-konfigurasi',
        'Page_Settings_Tunjangan':'admin-konfigurasi',
        'Page_Settings_Transportasi':'admin-konfigurasi',
        'Page_Settings_Maintenance':'admin-konfigurasi',
        'Page_Settings_Pengumuman':'admin-konfigurasi',
        'Page_Settings_BlokJurnal': 'admin-konfigurasi',
        'Page_Settings_BlokAcara': 'admin-konfigurasi',
        'Page_Settings_BlokTransport': 'admin-konfigurasi',
      };
      var adminPageMap = {
        'Page_Attendance':           'admin-kehadiran',
        'Page_AdminDailyAttendance': 'admin-manajemen',
        'Page_Picket':               'admin-kehadiran',
        'Page_EventAttendance':      'admin-kehadiran',
        'Page_StudentAttendance':    'admin-kehadiran',
        'Page_StudentAttendanceInput':   'admin-kehadiran',
        'Page_StudentAttendanceHistory': 'admin-kehadiran',
        'Page_Honorarium':           'admin-honorarium',
        'Page_HonorariumHistory':    'admin-honorarium',
        'Page_Journal':              'admin-manajemen',
        'Page_AttendanceList':       'admin-kehadiran',
        'Page_AttendanceSchedule':   'admin-kehadiran'
      };
      // Nested accordion map: pages that live inside a nested accordion
      var nestedAccordionMap = {
        'Page_AttendanceList':   'admin-kehadiran-harian',
        'Page_AttendanceSchedule':'admin-kehadiran-harian',
        'Page_StudentAttendanceInput':   role === 'admin' ? 'admin-absensi-siswa' : 'guru-absensi-siswa',
        'Page_StudentAttendanceHistory': role === 'admin' ? 'admin-absensi-siswa' : 'guru-absensi-siswa'
      };
      var groupId;
      if (role === 'admin') {
        groupId = adminPageMap[pageName] || pageGroupMap[pageName];
      } else {
        groupId = pageGroupMap[pageName];
      }
      if (groupId) {
        var container = document.getElementById('sidebarMenuContainer');
        if (!container) return;
        
        container.querySelectorAll('.nav-accordion-body').forEach(function(b) { b.classList.remove('is-open'); });
        container.querySelectorAll('.nav-accordion-header').forEach(function(h) { h.classList.remove('is-open'); h.setAttribute('aria-expanded','false'); });
        
        // Also close all nested accordions
        container.querySelectorAll('.nav-nested-body').forEach(function(b) { b.classList.remove('is-open'); });
        container.querySelectorAll('.nav-nested-header').forEach(function(h) { h.classList.remove('is-open'); h.setAttribute('aria-expanded','false'); });
        var body = document.getElementById('acc-body-' + groupId);
        if (body) body.classList.add('is-open');
        var acc = container.querySelector('[data-group="' + groupId + '"] .nav-accordion-header');
        if (acc) { acc.classList.add('is-open'); acc.setAttribute('aria-expanded','true'); }
        // Also open nested accordion if applicable
        var nestedGroupId = nestedAccordionMap[pageName];
        if (nestedGroupId) {
          var nestedBody = document.getElementById('nested-body-' + nestedGroupId);
          var nestedHeader = document.getElementById('nested-header-' + nestedGroupId);
          if (nestedBody) nestedBody.classList.add('is-open');
          if (nestedHeader) { nestedHeader.classList.add('is-open'); nestedHeader.setAttribute('aria-expanded','true'); }
        }
      }
    }
    