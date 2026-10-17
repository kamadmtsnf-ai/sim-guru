function updatePicketBadge() {
      const token = localStorage.getItem('auth_token');
      const badge = document.getElementById('badgePicketNotification');
      const badgeAdmin = document.getElementById('badgePicketNotification_Admin');
      if (!badge && !badgeAdmin) return;
      google.script.run.withSuccessHandler((res) => {
        if (res.status === 'success' && res.is_picket) {
          if (badge) badge.classList.remove('hidden');
          if (badgeAdmin) badgeAdmin.classList.remove('hidden');
        } else {
          if (badge) badge.classList.add('hidden');
          if (badgeAdmin) badgeAdmin.classList.add('hidden');
        }
      }).getPicketStatus(token);
    }
    function updateNotificationBadges() {
      const role = localStorage.getItem('user_role');
      if (String(role).toLowerCase() !== 'admin') return;
      const token = localStorage.getItem('auth_token');
      const badgeSidebar = document.getElementById('badgeResetRequest');
      const badgeSettings = document.getElementById('badgeResetCount');
      const badgeTabBtn = document.getElementById('badgeResetTabBtn');
      google.script.run.withSuccessHandler((res) => {
        if (res.status === 'success' && res.count > 0) {
          if (badgeSidebar) {
            badgeSidebar.innerText = res.count;
            badgeSidebar.classList.remove('hidden');
          }
          if (badgeSettings) {
            badgeSettings.innerText = res.count;
            badgeSettings.classList.remove('hidden');
          }
          if (badgeTabBtn) {
            badgeTabBtn.innerText = res.count;
            badgeTabBtn.classList.remove('hidden');
          }
        } else {
          if (badgeSidebar) badgeSidebar.classList.add('hidden');
          if (badgeSettings) badgeSettings.classList.add('hidden');
          if (badgeTabBtn) badgeTabBtn.classList.add('hidden');
        }
      }).getPendingResetCount(token);
    }
    