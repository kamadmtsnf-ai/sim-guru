function updateSidebarVisibility() {
      const role = localStorage.getItem('user_role');
      const adminSection = document.getElementById('admin-section');
      const guruSection  = document.getElementById('guru-section');
      const navExamPanitia = document.getElementById('nav-Page_ExamPanitia');
      if (String(role).toLowerCase() === 'admin') {
        if (adminSection) adminSection.classList.remove('hidden');
        if (guruSection)  guruSection.classList.add('hidden');
        if (navExamPanitia) navExamPanitia.classList.add('hidden');
      } else {
        if (adminSection) adminSection.classList.add('hidden');
        if (guruSection)  guruSection.classList.remove('hidden');
        if (navExamPanitia) {
          if (typeof checkExamPanitiaAccess === 'function') checkExamPanitiaAccess();
        }
      }
      if (typeof _wireEventNavItems === 'function') _wireEventNavItems();
    }
    function checkExamPanitiaAccess() {
      var navItem = document.getElementById('nav-Page_ExamPanitia');
      if (!navItem) return;
      var token = localStorage.getItem('auth_token');
      if (!token) { navItem.classList.add('hidden'); return; }
      try {
        var cached = sessionStorage.getItem('_examPanitiaAccess');
        if (cached) {
          var obj = JSON.parse(cached);
          if (obj && obj._ts && (Date.now() - obj._ts) < 60000) {
            _applyExamPanitiaNavVisibility(!!obj.show, !!obj.hasUnconfirmed);
            _applyPicketNavVisibility(!!obj.is_exam_period);
            return;
          }
        }
      } catch (_) { }
      google.script.run
        .withSuccessHandler(function (res) {
          var isExamPeriod = !!(res && res.is_exam_period);
          var show = !!(res && res.is_exam_period && res.is_confirmed_panitia);
          var hasUnconfirmed = false;
          if (show && Array.isArray(res.supervisors_to_confirm)) {
            res.supervisors_to_confirm.forEach(function (entry) {
              if (!entry) return;
              (entry.supervisors || []).forEach(function (sup) {
                if (!sup || !sup.status) return;
                if (sup.status === 'cancelled') return;
                if (!sup.confirmed_by || !String(sup.confirmed_by).trim()) hasUnconfirmed = true;
              });
            });
          }
          try {
            sessionStorage.setItem('_examPanitiaAccess', JSON.stringify({
              _ts: Date.now(), show: show, hasUnconfirmed: hasUnconfirmed,
              is_exam_period: isExamPeriod
            }));
          } catch (_) { }
          _applyExamPanitiaNavVisibility(show, hasUnconfirmed);
          _applyPicketNavVisibility(isExamPeriod);
        })
        .withFailureHandler(function () {
          navItem.classList.add('hidden');
        })
        .getExamPageData(token);
    }
    function _applyExamPanitiaNavVisibility(show, hasUnconfirmed) {
      var navItem = document.getElementById('nav-Page_ExamPanitia');
      var dot = document.getElementById('badgeExamPanitiaNotification');
      if (!navItem) return;
      if (show) navItem.classList.remove('hidden');
      else navItem.classList.add('hidden');
      if (dot) {
        if (show && hasUnconfirmed) dot.classList.remove('hidden');
        else dot.classList.add('hidden');
      }
    }
    /**
     * Sembunyikan menu Piket & Upacara untuk role guru saat periode ujian aktif.
     * Admin tidak terpengaruh (mereka punya nav-Page_Picket_Admin di admin-section).
     * Jika user sedang berada di halaman Piket saat dipanggil, redirect ke dashboard.
     */
    function _applyPicketNavVisibility(isExamPeriod) {
      var role = String(localStorage.getItem('user_role') || '').toLowerCase();
      if (role === 'admin') return; // admin tidak terpengaruh
      var navPicket = document.getElementById('nav-Page_Picket');
      var quickBtn  = document.getElementById('quickBtnPiket');    // tombol dashboard guru, jika ada id
      if (!navPicket) return;
      if (isExamPeriod) {
        navPicket.classList.add('hidden');
        if (quickBtn) quickBtn.classList.add('hidden');
        // Jika user sedang di halaman Piket, redirect ke dashboard
        if (window.currentPageState === 'picket') {
          handleNav('Page_Dashboard');
        }
      } else {
        navPicket.classList.remove('hidden');
        if (quickBtn) quickBtn.classList.remove('hidden');
      }
    }
    function updateNavbarUser() {
      const name = String(localStorage.getItem('user_name') || '').trim() || 'Pengguna';
      const role = String(localStorage.getItem('user_role') || '').trim() || 'User';
      const initial = (name.charAt(0) || 'U').toUpperCase();
      const elName = document.getElementById('navUserName');
      const elRole = document.getElementById('navUserRole');
      const elInit = document.getElementById('navUserInitial');
      if (elName) elName.innerText = name;
      if (elRole) elRole.innerText = role;
      if (elInit) elInit.innerText = initial;
      const elSbName = document.getElementById('sidebarUserName');
      const elSbRole = document.getElementById('sidebarUserRole');
      const elSbInit = document.getElementById('sidebarUserInitial');
      if (elSbName) elSbName.innerText = name;
      if (elSbRole) elSbRole.innerText = role;
      if (elSbInit) elSbInit.innerText = initial;
    }
    function filterSidebarMenu(query) {
      const q = String(query || '').toLowerCase().trim();
      const items = document.querySelectorAll('#sidebarMenuContainer .nav-item');
      let visibleCount = 0;
      items.forEach(function (it) {
        if (it.classList.contains('hidden')) return;
        const tooltip = (it.getAttribute('data-tooltip') || '').toLowerCase();
        const search = (it.getAttribute('data-search') || '').toLowerCase();
        const match = !q || tooltip.indexOf(q) >= 0 || search.indexOf(q) >= 0;
        if (match) {
          it.classList.remove('is-search-hidden');
          visibleCount++;
        } else {
          it.classList.add('is-search-hidden');
        }
      });
      var allBodies = document.querySelectorAll('#sidebarMenuContainer .nav-accordion-body');
      if (q) {
        allBodies.forEach(function(b) { b.classList.add('is-open'); });
        var nestedBodiesQ = document.querySelectorAll('#sidebarMenuContainer .nav-nested-body');
        nestedBodiesQ.forEach(function(b) { b.classList.add('is-open'); });
        var nestedHeadersQ = document.querySelectorAll('#sidebarMenuContainer .nav-nested-header');
        nestedHeadersQ.forEach(function(h) { h.classList.add('is-open'); h.setAttribute('aria-expanded','true'); });
      } else {
        allBodies.forEach(function(b) { b.classList.remove('is-open'); });
        var nestedBodies = document.querySelectorAll('#sidebarMenuContainer .nav-nested-body');
        nestedBodies.forEach(function(b) { b.classList.remove('is-open'); });
        var nestedHeaders = document.querySelectorAll('#sidebarMenuContainer .nav-nested-header');
        nestedHeaders.forEach(function(h) { h.classList.remove('is-open'); h.setAttribute('aria-expanded','false'); });
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
            'admin-daily-attendance':'Page_AdminDailyAttendance', 'event-attendance':'Page_EventAttendance',
            'event-journal':'Page_EventJournal', 'event-journal-history':'Page_EventJournalHistory',
            'event-management':'Page_EventManagement',
            'student-attendance':'Page_StudentAttendance',
            'student-attendance-input':'Page_StudentAttendanceInput',
            'student-attendance-history':'Page_StudentAttendanceHistory',
            'settings-blokjurnal':'Page_Settings_BlokJurnal',
            'settings-blokacara':'Page_Settings_BlokAcara',
            'settings-bloktransport':'Page_Settings_BlokTransport' };
          for (var k in statePageMap) { if (k === curPage) { openAccordionForPage(statePageMap[k]); break; } }
        }
      }
      const labels = document.querySelectorAll('#sidebarMenuContainer .nav-section-label');
      labels.forEach(function (lbl) {
        let next = lbl.nextElementSibling;
        let anyVisible = false;
        while (next && !next.classList.contains('nav-section-label')) {
          if (next.classList && next.classList.contains('nav-item')) {
            if (!next.classList.contains('hidden') && !next.classList.contains('is-search-hidden')) {
              anyVisible = true; break;
            }
          }
          if (next.id === 'admin-section') {
            const inner = next.querySelectorAll('.nav-item');
            inner.forEach(function (b) {
              if (!b.classList.contains('hidden') && !b.classList.contains('is-search-hidden')) anyVisible = true;
            });
          }
          next = next.nextElementSibling;
        }
        if (q) {
          if (anyVisible) lbl.classList.remove('is-search-hidden');
          else lbl.classList.add('is-search-hidden');
        } else {
          lbl.classList.remove('is-search-hidden');
        }
      });
      const emptyEl = document.getElementById('sidebarSearchEmpty');
      if (emptyEl) {
        if (q && visibleCount === 0) emptyEl.classList.add('is-visible');
        else emptyEl.classList.remove('is-visible');
      }
    }
    function footerScrollToTop() {
      function _isScrollable(el) {
        if (!el || el.nodeType !== 1) return false;
        var cs = window.getComputedStyle(el);
        var oy = cs.overflowY;
        var canScroll = (oy === 'auto' || oy === 'scroll' || oy === 'overlay');
        return canScroll && el.scrollHeight - el.clientHeight > 1;
      }
      var btn = document.getElementById('btnFooterTop');
      var start = btn || document.getElementById('app-footer') || document.body;
      var scroller = null;
      var node = start;
      while (node && node !== document.body && node !== document.documentElement) {
        if (_isScrollable(node)) { scroller = node; break; }
        node = node.parentElement;
      }
      if (!scroller) {
        var docEl = document.scrollingElement || document.documentElement;
        if (_isScrollable(docEl)) scroller = docEl;
        else if (_isScrollable(document.body)) scroller = document.body;
      }
      try {
        if (scroller && typeof scroller.scrollTo === 'function') {
          scroller.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (scroller) {
          scroller.scrollTop = 0;
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (_) {
        try {
          if (scroller) scroller.scrollTop = 0;
          else window.scrollTo(0, 0);
        } catch (__) { }
      }
    }
    (function _setupFloatingScrollTopBtn() {
      var SHOW_THRESHOLD = 220;
      var bound = null;
      var ticking = false;
      var modalObserver = null;
      function _findPageScroller() {
        var candidates = document.querySelectorAll('.flex-1.overflow-y-auto');
        for (var i = 0; i < candidates.length; i++) {
          var el = candidates[i];
          if (el.id === 'sidebarMenuContainer') continue;
          if (el.scrollHeight - el.clientHeight > 1) return el;
          if (!candidates._fallback) candidates._fallback = el;
        }
        return candidates._fallback || null;
      }
      function _updateBtnVisibility() {
        ticking = false;
        var btn = document.getElementById('btnFooterTop');
        if (!btn) return;
        if (document.body.classList.contains('has-active-modal')) {
          btn.classList.remove('is-visible');
          return;
        }
        var scroller = bound || _findPageScroller();
        var top = 0;
        if (scroller) top = scroller.scrollTop;
        else top = (document.scrollingElement || document.documentElement).scrollTop || window.pageYOffset || 0;
        if (top > SHOW_THRESHOLD) btn.classList.add('is-visible');
        else btn.classList.remove('is-visible');
      }
      function _onScroll() {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(_updateBtnVisibility);
        }
      }
      function _attachScrollListener() {
        var scroller = _findPageScroller();
        if (bound && bound !== scroller) {
          try { bound.removeEventListener('scroll', _onScroll); } catch (_) { }
        }
        if (scroller) {
          bound = scroller;
          scroller.addEventListener('scroll', _onScroll, { passive: true });
        } else {
          bound = null;
          window.addEventListener('scroll', _onScroll, { passive: true });
        }
        _updateBtnVisibility();
      }
      function _elIsActuallyVisible(el) {
        if (!el || !el.isConnected) return false;
        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        if (cs.position !== 'fixed' && el.offsetParent === null) return false;
        var p = el.parentElement;
        while (p) {
          if (p.classList && p.classList.contains('hidden')) {
            var pcs = window.getComputedStyle(p);
            if (pcs.display === 'none') return false;
          }
          p = p.parentElement;
        }
        return true;
      }
      function _isAnyModalOpen() {
        var candidates = [];
        var dialogs = document.querySelectorAll('[role="dialog"]');
        for (var i = 0; i < dialogs.length; i++) candidates.push(dialogs[i]);
        var byId = document.querySelectorAll('div[id$="Modal"].fixed.inset-0, div[id$="modal"].fixed.inset-0');
        for (var j = 0; j < byId.length; j++) {
          if (candidates.indexOf(byId[j]) === -1) candidates.push(byId[j]);
        }
        for (var k = 0; k < candidates.length; k++) {
          var m = candidates[k];
          if (!m) continue;
          if (m.id === 'btnFooterTop' || m.id === 'sidebarOverlay') continue;
          if (m.classList && m.classList.contains('hidden')) continue;
          if (_elIsActuallyVisible(m)) return true;
        }
        return false;
      }
      function _refreshModalState() {
        var open = _isAnyModalOpen();
        document.body.classList.toggle('has-active-modal', open);
        _updateBtnVisibility();
      }
      var modalRefreshTimer = null;
      function _refreshModalStateThrottled() {
        if (modalRefreshTimer) return;
        modalRefreshTimer = setTimeout(function () {
          modalRefreshTimer = null;
          _refreshModalState();
        }, 60);
      }
      function _setupModalObserver() {
        if (modalObserver) return;
        try {
          modalObserver = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
              var t = mutations[i].target;
              if (!t || !t.id) continue;
              if (t.id === 'btnFooterTop') continue;
              if (/[Mm]odal$/.test(t.id) ||
                t.getAttribute && t.getAttribute('role') === 'dialog' ||
                t.id === 'simLoginModal' || t.id === 'forgotModal') {
                _refreshModalStateThrottled();
                return;
              }
            }
          });
          modalObserver.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
          });
        } catch (_) { }
      }
      window.refreshFloatingScrollTop = function () {
        _attachScrollListener();
        _refreshModalState();
      };
      document.addEventListener('DOMContentLoaded', function () {
        _setupModalObserver();
        _attachScrollListener();
        _refreshModalState();
      });
      if (document.readyState !== 'loading') {
        _setupModalObserver();
        setTimeout(function () {
          _attachScrollListener();
          _refreshModalState();
        }, 0);
      }
    })();
    function navLoadingBarStart() {
      var bar = document.getElementById('navLoadingBar');
      if (!bar) return;
      bar.style.width = '0%';
      bar.classList.add('is-loading');
      requestAnimationFrame(function () {
        bar.style.width = '70%';
      });
    }
    function navLoadingBarFinish() {
      var bar = document.getElementById('navLoadingBar');
      if (!bar) return;
      bar.style.width = '100%';
      setTimeout(function () {
        bar.classList.remove('is-loading');
        bar.style.opacity = '0';
        setTimeout(function () {
          bar.style.width = '0%';
          bar.style.opacity = '';
        }, 320);
      }, 180);
    }
    function updateSidebarActive(activePageName) {
      const allItems = document.querySelectorAll('.nav-item');
      allItems.forEach(el => {
        el.classList.remove('bg-blue-50', 'text-blue-700');
        el.classList.add('text-slate-600');
        const icon = el.querySelector('svg');
        if (icon) icon.classList.replace('text-blue-500', 'text-slate-400');
        el.removeAttribute('aria-current');
      });
      const activeBtn = document.getElementById('nav-' + activePageName);
      if (activeBtn) {
        activeBtn.classList.remove('text-slate-600');
        activeBtn.classList.add('bg-blue-50', 'text-blue-700');
        activeBtn.setAttribute('aria-current', 'page');
        const icon = activeBtn.querySelector('svg');
        if (icon) icon.classList.replace('text-slate-400', 'text-blue-500');
      }
      const adminVariantBtn = document.getElementById('nav-' + activePageName + '_Admin');
      if (adminVariantBtn) {
        adminVariantBtn.classList.remove('text-slate-600');
        adminVariantBtn.classList.add('bg-blue-50', 'text-blue-700');
        adminVariantBtn.setAttribute('aria-current', 'page');
        const icon = adminVariantBtn.querySelector('svg');
        if (icon) icon.classList.replace('text-slate-400', 'text-blue-500');
      }
      const pageTitles = {
        'Page_Dashboard': 'Dashboard',
        'Page_Journal': 'Jurnal Mengajar',
        'Page_MySchedule': 'Jadwal Saya',
        'Page_Picket': 'Piket & Upacara',
        'Page_ExamPanitia': 'Panitia Ujian',
        'Page_Honorarium': 'Honorarium',
        'Page_HonorariumHistory': 'Arsip Honor',
        'Page_MyAttendance': 'Riwayat Kehadiran',
        'Page_Users': 'Data Pengguna',
        'Page_ManageSchedule': 'Manajemen Jadwal',
        'Page_ExamSchedule': 'Jadwal Ujian',
        'Page_Settings_Config': 'Konfigurasi Umum',
        'Page_Settings_Kalender': 'Kalender Libur',
        'Page_Settings_Mapel': 'Mata Pelajaran',
        'Page_Settings_Tunjangan': 'Tunjangan',
        'Page_Settings_Transportasi': 'Transportasi Harian',
        'Page_Settings_Maintenance': 'Mode Maintenance',
        'Page_Settings_Pengumuman': 'Pengumuman',
        'Page_Settings_BlokJurnal': 'Blokir Jurnal',
        'Page_Settings_BlokAcara': 'Blokir Acara',
        'Page_Settings_BlokTransport': 'Blokir Transport',
        'Page_Profile': 'Profil Saya',
        'Page_Attendance': 'Kehadiran Harian',
        'Page_AttendanceList': 'Daftar Kehadiran',
        'Page_AttendanceSchedule': 'Atur Jam Jadwal',
        'Page_AdminDailyAttendance': 'Riwayat Kehadiran Harian',
        'Page_StudentAttendance': 'Absensi Siswa',
        'Page_StudentAttendanceInput': 'Input Absensi Siswa',
        'Page_StudentAttendanceHistory': 'Riwayat Absensi Siswa',
      };
      const title = pageTitles[activePageName] || activePageName.replace('Page_', '');
      const navTitleEl = document.getElementById('navPageTitle');
      if (navTitleEl) navTitleEl.innerText = title;
      const crumbCurrent = document.getElementById('navBreadcrumbCurrent');
      if (crumbCurrent) crumbCurrent.innerText = title;
      try {
        document.title = title + ' · SiM-Guru';
      } catch (_) { }
      if (typeof openAccordionForPage === 'function') openAccordionForPage(activePageName);
    }
    // =============================================
    // STUDENT ATTENDANCE PAGE (Absensi Siswa)
    // =============================================
    