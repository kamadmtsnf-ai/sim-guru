function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (!sidebar) return;
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) {
        const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0');
        const btnCollapse = document.getElementById('btnCollapseDesktop');
        if (btnCollapse) {
          btnCollapse.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        if (typeof window._hideSidebarTooltip === 'function') window._hideSidebarTooltip();
        if (!isCollapsed) {
          var curPage = window.currentPageState;
          if (curPage && typeof openAccordionForPage === 'function') {
            var statePageMap = { dashboard:'Page_Dashboard', schedule:'Page_MySchedule', journal:'Page_Journal',
              attendance:'Page_Attendance', picket:'Page_Picket', recap:'Page_Honorarium',
              'honorarium-history':'Page_HonorariumHistory', 'my-attendance':'Page_MyAttendance',
              users:'Page_Users', 'manage-schedule':'Page_ManageSchedule', exam:'Page_ExamSchedule',
              'settings-config':'Page_Settings_Config', 'settings-kalender':'Page_Settings_Kalender',
              'settings-mapel':'Page_Settings_Mapel', 'settings-tunjangan':'Page_Settings_Tunjangan',
              'settings-transportasi':'Page_Settings_Transportasi', 'settings-maintenance':'Page_Settings_Maintenance',
              'settings-pengumuman':'Page_Settings_Pengumuman', 'exam-panitia':'Page_ExamPanitia', profile:'Page_Profile',
              'attendance-list':'Page_AttendanceList', 'attendance-schedule':'Page_AttendanceSchedule',
              'admin-daily-attendance':'Page_AdminDailyAttendance',
              'student-attendance':'Page_StudentAttendance',
              'student-attendance-input':'Page_StudentAttendanceInput',
              'student-attendance-history':'Page_StudentAttendanceHistory',
              'event-attendance':'Page_EventAttendance', 'event-journal':'Page_EventJournal',
              'event-journal-history':'Page_EventJournalHistory', 'event-management':'Page_EventManagement',
              'settings-blokjurnal':'Page_Settings_BlokJurnal',
              'settings-blokacara':'Page_Settings_BlokAcara',
              'settings-bloktransport':'Page_Settings_BlokTransport' };
            var pageName = statePageMap[curPage] || ('Page_' + curPage.charAt(0).toUpperCase() + curPage.slice(1));
            setTimeout(function() { openAccordionForPage(pageName); }, 30);
          }
        }
      } else {
        sidebar.classList.toggle('-translate-x-full');
        if (overlay) overlay.classList.toggle('hidden');
      }
    }
    function initSidebarState() {
      const sidebar = document.getElementById('sidebar');
      const btnCollapse = document.getElementById('btnCollapseDesktop');
      if (!sidebar) return;
      const isDesktop = window.innerWidth >= 768;
      const wasCollapsed = localStorage.getItem('sidebar_collapsed') === '1';
      if (isDesktop && wasCollapsed) {
        sidebar.classList.add('sidebar-collapsed');
        if (btnCollapse) btnCollapse.style.transform = 'rotate(180deg)';
      } else if (isDesktop) {
        sidebar.classList.remove('sidebar-collapsed');
        if (btnCollapse) btnCollapse.style.transform = 'rotate(0deg)';
      }
    }
    