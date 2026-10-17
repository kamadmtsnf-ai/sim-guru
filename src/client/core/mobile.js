function _fixMobileLayouts() {
      if (window.innerWidth >= 640) return;
      // Re-check marquee overflow saat layout berubah
      if (typeof _initDashboardMarquees === 'function') _initDashboardMarquees();
      var profBtns = document.querySelectorAll('.profile-tab-btn');
      if (profBtns.length > 0) {
        var profParent = profBtns[0].parentElement;
        if (profParent) {
          profParent.style.overflowX = 'auto';
          profParent.style.webkitOverflowScrolling = 'touch';
          profParent.style.display = 'flex';
          profParent.style.flexWrap = 'nowrap';
          profParent.style.gap = '0.375rem';
          profParent.style.scrollbarWidth = 'none';
          profBtns.forEach(function (btn) {
            btn.style.flexShrink = '0';
            btn.style.whiteSpace = 'nowrap';
          });
        }
      }
      var picketBtns = document.querySelectorAll('.admin-picket-tab-btn');
      if (picketBtns.length > 0) {
        var picketParent = picketBtns[0].parentElement;
        if (picketParent) {
          picketParent.style.overflowX = 'auto';
          picketParent.style.webkitOverflowScrolling = 'touch';
          picketParent.style.display = 'flex';
          picketParent.style.flexWrap = 'nowrap';
          picketParent.style.gap = '0.25rem';
          picketParent.style.scrollbarWidth = 'none';
          picketBtns.forEach(function (btn) {
            btn.style.flexShrink = '0';
            btn.style.whiteSpace = 'nowrap';
          });
        }
      }
      var adminPN = document.getElementById('adminJournalPageNumbers');
      if (adminPN) {
        adminPN.style.overflowX = 'auto';
        adminPN.style.flexWrap = 'nowrap';
        adminPN.style.display = 'flex';
        adminPN.style.scrollbarWidth = 'none';
        adminPN.style.webkitOverflowScrolling = 'touch';
      }
      var adminFirst = document.getElementById('btnFirstJournal');
      if (adminFirst) {
        var navRow = adminFirst.parentElement;
        if (navRow) {
          navRow.style.flexWrap = 'wrap';
          navRow.style.justifyContent = 'center';
          navRow.style.gap = '0.25rem';
          if (navRow.parentElement) {
            navRow.parentElement.style.flexDirection = 'column';
            navRow.parentElement.style.alignItems = 'stretch';
            navRow.parentElement.style.gap = '0.5rem';
          }
        }
      }
      var guruPN = document.getElementById('guruJournalPageNumbers');
      if (guruPN) {
        guruPN.style.overflowX = 'auto';
        guruPN.style.flexWrap = 'nowrap';
        guruPN.style.display = 'flex';
        guruPN.style.scrollbarWidth = 'none';
        guruPN.style.webkitOverflowScrolling = 'touch';
      }
      var guruFirst = document.getElementById('btnFirstGuruJournal');
      if (guruFirst) {
        var guruNavRow = guruFirst.parentElement;
        if (guruNavRow) {
          guruNavRow.style.flexWrap = 'wrap';
          guruNavRow.style.justifyContent = 'center';
          guruNavRow.style.gap = '0.25rem';
          if (guruNavRow.parentElement) {
            guruNavRow.parentElement.style.flexDirection = 'column';
            guruNavRow.parentElement.style.alignItems = 'stretch';
            guruNavRow.parentElement.style.gap = '0.5rem';
          }
        }
      }
      ['inpAdminJournalJump', 'inpGuruJournalJump'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.parentElement) {
          el.parentElement.style.width = '100%';
          el.parentElement.style.justifyContent = 'center';
        }
      });
      var journalView = document.getElementById('viewGuruJournal');
      if (journalView) {
        var flexRows = journalView.querySelectorAll('.flex.justify-between, .flex.items-center.justify-between');
        flexRows.forEach(function (row) {
          if (!row.closest('td') && !row.closest('tr')) {
            row.style.flexWrap = 'wrap';
            row.style.gap = '0.5rem';
          }
        });
        var statGrids = journalView.querySelectorAll('.grid.grid-cols-3, .grid.grid-cols-4');
        statGrids.forEach(function (grid) {
          grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        });
        var progressItems = journalView.querySelectorAll('[class*="progress-item"], [class*="schedule-item"]');
        progressItems.forEach(function (item) {
          item.style.flexWrap = 'wrap';
          item.style.gap = '0.375rem';
        });
        var logRows = journalView.querySelectorAll('.flex.items-start, .flex.items-center');
        logRows.forEach(function (row) {
          if (!row.closest('td') && !row.closest('tr') && !row.closest('button')) {
            var children = Array.from(row.children);
            if (children.length >= 2) {
              row.style.flexWrap = 'wrap';
              row.style.gap = '0.375rem';
            }
          }
        });
      }
    }
    