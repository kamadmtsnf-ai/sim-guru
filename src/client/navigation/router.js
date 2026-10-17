function handleNav(pageName) {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
      }
      loadPage(pageName);
    }
    var _clockInterval = null;
    function _startNavClock() {
      function _tick() {
        var clockText = document.getElementById('navClockText');
        var dateText = document.getElementById('navDateText');
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        var timeStr = hh + ':' + mm;
        if (clockText) {
          clockText.textContent = timeStr;
        } else {
          var el = document.getElementById('navClockBadge');
          if (el && !el.querySelector('span')) el.textContent = timeStr;
        }
        if (dateText) {
          var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          dateText.textContent = now.getDate() + ' ' + months[now.getMonth()];
        }
      }
      if (_clockInterval) clearInterval(_clockInterval);
      _tick();
      _clockInterval = setInterval(_tick, 60000);
    }



    function loadPage(pageName) {
      if (pageName !== 'Page_Login') {
        localStorage.setItem('last_active_page', pageName);
      }
      try {
        var isLogin = (pageName === 'Page_Login');
        document.body.classList.toggle('is-login-page', isLogin);
        document.documentElement.classList.toggle('is-login-page', isLogin);
      } catch (_) { }
      const container = document.getElementById('app-container');
      const isDefaultPass = localStorage.getItem('is_default_pass') === 'true';
      const forceSecQ = localStorage.getItem('force_security_question') === 'true';
      const forceEmailVerify = localStorage.getItem('force_email_verify') === 'true' ||
        localStorage.getItem('has_email_verified') === 'false';
      if (isDefaultPass && pageName !== 'Page_Profile' && pageName !== 'Page_Login') {
        showToast("Demi keamanan, mohon ubah password default Anda terlebih dahulu.", "error");
        pageName = 'Page_Profile';
      }
      if (forceSecQ && pageName !== 'Page_Profile' && pageName !== 'Page_Login') {
        showToast("Harap atur pertanyaan keamanan Anda terlebih dahulu sebelum melanjutkan.", "error");
        pageName = 'Page_Profile';
        setTimeout(() => {
          if (!document.getElementById('secQuestionOverlay')) showSecurityQuestionOverlay();
        }, 400);
      }
      if (!isDefaultPass && !forceSecQ && forceEmailVerify &&
        pageName !== 'Page_Profile' && pageName !== 'Page_Login') {
        showToast("Harap verifikasi email Anda terlebih dahulu untuk mengakses halaman lain.", "error");
        pageName = 'Page_Profile';
      }
      container.classList.add('opacity-0');
      if (typeof navLoadingBarStart === 'function') navLoadingBarStart();
      google.script.run
        .withSuccessHandler(function (html) {
          container.innerHTML = html;
          container.classList.remove('opacity-0');
          window.currentPageState = getClientPageState_(pageName);
          const elYear = document.getElementById('txtFooterYear');
          if (elYear) elYear.innerText = new Date().getFullYear();
          try {
            var loginYears = document.querySelectorAll('.sim-footer-year');
            if (loginYears && loginYears.length) {
              var y = String(new Date().getFullYear());
              for (var i = 0; i < loginYears.length; i++) loginYears[i].textContent = y;
            }
          } catch (_) { }
          updateSidebarActive(pageName);
          updateNavbarUser();
          updateSidebarVisibility();
          initSidebarState();
          _startNavClock();
          if (globalConfig) {
            if (globalConfig.app_name) {
              const el = document.getElementById('sidebarAppName');
              if (el) el.innerHTML = globalConfig.app_name;
              const elFooterSchool = document.getElementById('txtFooterSchoolName');
              if (elFooterSchool && globalConfig.school_name) elFooterSchool.innerText = globalConfig.school_name;
            }
            const elVer = document.getElementById('txtFooterVersion');
            if (elVer) elVer.innerText = globalConfig.app_version || '2.1.1';
            const elLoginVer = document.getElementById('txtLoginVersionLeft');
            if (elLoginVer) elLoginVer.innerText = globalConfig.app_version || '2.1.1';
          }
          initializeClientPage_(pageName);
          updateNotificationBadges();
          updatePicketBadge();
          if (typeof navLoadingBarFinish === 'function') navLoadingBarFinish();
          if (typeof window.refreshFloatingScrollTop === 'function') {
            window.refreshFloatingScrollTop();
          }
          if (pageName !== 'Page_Login' && typeof window.maybeShowAnnouncements === 'function') {
            window.maybeShowAnnouncements();
          }
        })
        .withFailureHandler(function (err) {
          container.innerHTML = `<div class="p-10 text-red-500 font-bold">Error Loading Page: ${err}</div>`;
          container.classList.remove('opacity-0');
          if (typeof navLoadingBarFinish === 'function') navLoadingBarFinish();
        })
        .getPageContent(pageName);
    }
    