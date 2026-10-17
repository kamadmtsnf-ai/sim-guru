(function () {
      let startY = 0;
      let currentY = 0;
      let isDragging = false;
      let isRefreshing = false;
      let isModalOpen = false;
      const indicator = document.getElementById('pullToRefreshIndicator');
      const spinner = document.getElementById('ptrSpinner');
      const arrow = document.getElementById('ptrArrow');
      const text = document.getElementById('ptrText');
      const threshold = 80; // Minimum pull distance to trigger refresh
      function checkModalState() {
        const modals = document.querySelectorAll('[id$="Modal"]:not(.hidden), .modal:not(.hidden)');
        isModalOpen = modals.length > 0;
        return isModalOpen;
      }
      const observer = new MutationObserver(checkModalState);
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: true
      });
      function _getScrollTop(el) {
        let current = el;
        while (current && current !== document.body && current !== document.documentElement) {
          const style = window.getComputedStyle(current);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            return current.scrollTop;
          }
          current = current.parentElement;
        }
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      function handleTouchStart(e) {
        if (isRefreshing || checkModalState()) return;
        startY = e.touches[0].pageY;
        isDragging = true;
      }
      function handleTouchMove(e) {
        if (!isDragging || isRefreshing || isModalOpen) return;
        currentY = e.touches[0].pageY;
        if (_getScrollTop(e.target) > 0) {
          startY = currentY;
          return;
        }
        const pullDistance = currentY - startY;
        if (pullDistance > 0 && _getScrollTop(e.target) <= 0) {
          if (e.cancelable) e.preventDefault();
          const progress = Math.min(pullDistance / threshold, 1);
          const translateY = Math.min(pullDistance * 0.5, threshold * 0.5);
          indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
          indicator.classList.add('visible');
          arrow.style.transform = `rotate(${progress * 180}deg)`;
          if (progress >= 1) {
            text.textContent = 'Lepas untuk refresh';
            indicator.classList.add('bg-gradient-to-r', 'from-emerald-500', 'to-green-600');
            indicator.classList.remove('from-blue-500', 'to-indigo-600');
          } else {
            text.textContent = 'Tarik untuk refresh';
            indicator.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-indigo-600');
            indicator.classList.remove('from-emerald-500', 'to-green-600');
          }
        }
      }
      function handleTouchEnd(e) {
        if (!isDragging || isRefreshing || isModalOpen) return;
        const pullDistance = currentY - startY;
        isDragging = false;
        if (pullDistance >= threshold) {
          triggerRefresh();
        } else {
          resetIndicator();
        }
      }
      function triggerRefresh() {
        isRefreshing = true;
        indicator.classList.add('refreshing');
        indicator.classList.remove('from-emerald-500', 'to-green-600');
        indicator.classList.add('from-blue-500', 'to-indigo-600');
        arrow.classList.add('hidden');
        spinner.classList.remove('hidden');
        text.textContent = 'Memperbarui...';
        const currentPage = window.currentPageState || 'dashboard';
        performPageRefresh(currentPage);
      }
      function performPageRefresh(page) {
        setTimeout(function () {
          try {
            const pageNameMap = {
              'dashboard': 'Page_Dashboard',
              'schedule': 'Page_MySchedule',
              'journal': 'Page_Journal',
              'recap': 'Page_Honorarium',
              'settings-config': 'Page_Settings_Config',
              'settings-kalender': 'Page_Settings_Kalender',
              'settings-mapel': 'Page_Settings_Mapel',
              'settings-tunjangan': 'Page_Settings_Tunjangan',
              'settings-pengumuman': 'Page_Settings_Pengumuman',
              'exam': 'Page_ExamSchedule',
              'picket': 'Page_Picket',
              'users': 'Page_Users',
              'manage-schedule': 'Page_ManageSchedule',
              'honorarium-history': 'Page_HonorariumHistory',
              'exam-panitia': 'Page_ExamPanitia',
              'profile': 'Page_Profile'
            };
            const pageName = pageNameMap[page];
            if (page === 'dashboard' && typeof initDashboard === 'function') {
              initDashboard();
            } else if (page === 'schedule' && typeof initMySchedule === 'function') {
              initMySchedule();
            } else if (page === 'journal' && typeof initJournal === 'function') {
              initJournal();
            } else if (page === 'recap' && typeof initHonorarium === 'function') {
              initHonorarium();
            } else if (page === 'settings' && typeof initSettings === 'function') {
              initSettings();
            } else if (page === 'exam' && typeof initExamSchedule === 'function') {
              initExamSchedule();
            } else if (page === 'picket' && typeof initPicket === 'function') {
              initPicket();
            } else if (page === 'users' && typeof initUsers === 'function') {
              initUsers();
            } else if (page === 'manage-schedule' && typeof initManageSchedule === 'function') {
              initManageSchedule();
            } else if (page === 'honorarium-history' && typeof initHonorariumHistory === 'function') {
              initHonorariumHistory();
            } else if (page === 'exam-panitia' && typeof initExamPanitiaPage === 'function') {
              initExamPanitiaPage();

            } else if (page === 'profile' && typeof initProfile === 'function') {
              initProfile();
            } else if (pageName && typeof loadPage === 'function') {
              loadPage(pageName);
            } else {
              location.reload();
            }
            setTimeout(function () {
              text.textContent = '✓ Berhasil diperbarui';
              setTimeout(resetIndicator, 800);
            }, 500);
          } catch (err) {
            console.error('Refresh error:', err);
            text.textContent = '✗ Gagal memperbarui';
            setTimeout(resetIndicator, 1200);
          }
        }, 600);
      }
      function resetIndicator() {
        indicator.style.transform = '';
        indicator.classList.remove('visible', 'refreshing');
        indicator.classList.add('from-blue-500', 'to-indigo-600');
        indicator.classList.remove('from-emerald-500', 'to-green-600');
        arrow.classList.remove('hidden');
        arrow.style.transform = '';
        spinner.classList.add('hidden');
        text.textContent = 'Tarik untuk refresh';
        isRefreshing = false;
        startY = 0;
        currentY = 0;
      }
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    })();
    