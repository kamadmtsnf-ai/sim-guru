document.addEventListener('DOMContentLoaded', function () {
      (function () {
        var tip = document.getElementById('globalTooltip');
        if (!tip) return;
        document.addEventListener('mouseover', function (e) {
          var btn = e.target.closest('[data-tooltip]');
          if (!btn) return;
          var label = btn.getAttribute('data-tooltip');
          if (!label) return;
          tip.textContent = label;
          var r = btn.getBoundingClientRect();
          var tipW = tip.offsetWidth || 80;
          var left = r.left + r.width / 2 - tipW / 2;
          var top = r.top - tip.offsetHeight - 7;
          if (top < 4) top = r.bottom + 7;
          if (left < 4) left = 4;
          if (left + tipW > window.innerWidth - 4) left = window.innerWidth - tipW - 4;
          tip.style.left = left + 'px';
          tip.style.top = top + 'px';
          tip.classList.add('visible');
        });
        document.addEventListener('mouseout', function (e) {
          if (!e.target.closest('[data-tooltip]')) return;
          tip.classList.remove('visible');
        });
        document.addEventListener('click', function () { tip.classList.remove('visible'); });
      })();
      const app = document.getElementById('app-container');
      if (app) app.classList.remove('opacity-0');
      const token = localStorage.getItem('auth_token');
      if (token) {
        google.script.run.withSuccessHandler((res) => {
          if (res && res.status === 'success' && res.is_holiday && !res.has_auto_jurnal) {
            const role = localStorage.getItem('user_role');
            if (String(role).toLowerCase() === 'admin') {
              showToast('📅 Hari ini adalah hari libur bonus. Jangan lupa generate Auto Jurnal!', 'info', 8000);
            } else {
              showToast('🎉 Hari libur bonus! JTM Anda akan otomatis ditambahkan.', 'success', 6000);
            }
          }
        }).checkAutoJurnalStatus(token);
      }
      if (token) {
        google.script.run
          .withSuccessHandler((cfg) => {
            if (cfg && cfg.status === 'error') {
              localStorage.removeItem('auth_token');
              loadPage('Page_Login');
            } else {
              if (cfg) globalConfig = cfg.config || cfg;
              const lastPage = localStorage.getItem('last_active_page');
              loadPage(lastPage || 'Page_Dashboard');
            }
          })
          .withFailureHandler((err) => {
            console.error(err);
            localStorage.removeItem('auth_token');
            loadPage('Page_Login');
          })
          .getSettingsMasterData(token);
      } else {
        loadPage('Page_Login');
      }
    });
    