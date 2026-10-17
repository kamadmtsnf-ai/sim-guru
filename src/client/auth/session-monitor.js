(function () {
      var SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // cek sesi ke server setiap 5 menit
      var IDLE_TIMEOUT_MS        = 2 * 60 * 60 * 1000; // logout setelah 2 jam tanpa aktivitas
      var IDLE_WARNING_MS        = IDLE_TIMEOUT_MS - 60 * 1000; // peringatan 1 menit sebelum logout
      var _sessionCheckTimer = null;
      var _idleTimer         = null;
      var _idleWarnTimer     = null;
      var _sessionCheckInFlight = false;
      function _forceLogout(reason) {
        _stopAllTimers();
        var token = localStorage.getItem('auth_token');
        if (token) {
          try { google.script.run.logoutUser(token); } catch (_) {}
        }
        localStorage.clear();
        showToast(reason || 'Sesi Anda telah berakhir. Silakan login kembali.', 'error', 5000);
        loadPage('Page_Login');
      }
      function _stopAllTimers() {
        if (_sessionCheckTimer) { clearInterval(_sessionCheckTimer); _sessionCheckTimer = null; }
        if (_idleTimer)         { clearTimeout(_idleTimer);          _idleTimer = null; }
        if (_idleWarnTimer)     { clearTimeout(_idleWarnTimer);      _idleWarnTimer = null; }
      }
      function _runSessionCheck() {
        var token = localStorage.getItem('auth_token');
        if (!token) return;
        if (_sessionCheckInFlight) return;
        _sessionCheckInFlight = true;
        google.script.run
          .withSuccessHandler(function (res) {
            _sessionCheckInFlight = false;
            if (!res || res.status === 'expired') {
              _forceLogout('Sesi Anda telah berakhir. Silakan login kembali.');
            }
          })
          .withFailureHandler(function () {
            _sessionCheckInFlight = false;
          })
          .checkSessionStatus(token);
      }
      function _resetIdleTimer() {
        if (!localStorage.getItem('auth_token')) return;
        if (_idleTimer)     { clearTimeout(_idleTimer);     _idleTimer = null; }
        if (_idleWarnTimer) { clearTimeout(_idleWarnTimer); _idleWarnTimer = null; }
        var warnBanner = document.getElementById('_idleWarnBanner');
        if (warnBanner) warnBanner.remove();
        _idleWarnTimer = setTimeout(function () {
          if (!localStorage.getItem('auth_token')) return;
          _showIdleWarning();
        }, IDLE_WARNING_MS);
        _idleTimer = setTimeout(function () {
          if (!localStorage.getItem('auth_token')) return;
          _forceLogout('Anda telah logout otomatis karena tidak ada aktivitas selama 2 jam.');
        }, IDLE_TIMEOUT_MS);
      }
      function _showIdleWarning() {
        var existing = document.getElementById('_idleWarnBanner');
        if (existing) return;
        var banner = document.createElement('div');
        banner.id = '_idleWarnBanner';
        banner.style.cssText = [
          'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
          'z-index:99999', 'background:#1E293B', 'color:#F1F5F9',
          'padding:14px 20px', 'border-radius:14px',
          'box-shadow:0 8px 32px rgba(0,0,0,0.35)',
          'font-family:Plus Jakarta Sans,sans-serif', 'font-size:13px', 'font-weight:500',
          'display:flex', 'align-items:center', 'gap:12px',
          'max-width:calc(100% - 48px)', 'width:max-content'
        ].join(';');
        banner.innerHTML =
          '<span style="font-size:18px">⏱️</span>' +
          '<span>Tidak ada aktivitas. Anda akan logout otomatis dalam <strong>1 menit</strong>.</span>' +
          '<button onclick="_resetIdleTimer()" style="' +
            'background:#0EA5E9;color:#fff;border:none;border-radius:8px;' +
            'padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap' +
          '">Tetap Login</button>';
        document.body.appendChild(banner);
      }
      var _activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
      function _onActivity() {
        if (localStorage.getItem('auth_token')) {
          _resetIdleTimer();
        }
      }
      function _startIdleWatcher() {
        _activityEvents.forEach(function (evt) {
          document.addEventListener(evt, _onActivity, { passive: true, capture: true });
        });
        _resetIdleTimer();
      }
      function _stopIdleWatcher() {
        _activityEvents.forEach(function (evt) {
          document.removeEventListener(evt, _onActivity, { capture: true });
        });
        if (_idleTimer)     { clearTimeout(_idleTimer);     _idleTimer = null; }
        if (_idleWarnTimer) { clearTimeout(_idleWarnTimer); _idleWarnTimer = null; }
        var warnBanner = document.getElementById('_idleWarnBanner');
        if (warnBanner) warnBanner.remove();
      }
      document.addEventListener('DOMContentLoaded', function () {
        _sessionCheckTimer = setInterval(_runSessionCheck, SESSION_CHECK_INTERVAL);
        if (localStorage.getItem('auth_token')) {
          _startIdleWatcher();
        }
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          _runSessionCheck();
          if (localStorage.getItem('auth_token')) {
            _resetIdleTimer();
          }
        }
      });
      window._onLoginSuccess = function () {
        _startIdleWatcher();
      };
      window._onLogoutStart = function () {
        _stopIdleWatcher();
        _stopAllTimers();
      };
      window._runSessionCheck = _runSessionCheck;
      window._forceLogout     = _forceLogout;
      window._resetIdleTimer  = _resetIdleTimer;
    })();
    