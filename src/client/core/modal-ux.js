(function setupGlobalModalUX() {
      const ESC_CLOSEABLE_MODALS = [
        'journalModal',
        'viewJournalModal',
        'confirmModal',
        'userModal',
        'scheduleModal',
        'allowanceModal',
        'subjectModal',
        'subModal',
        'replaceConfirmModal',
        'rekapKelasModal',
        'rekapGuruModal',
        'rekapHariModal',
        'rekapKelasHariModal',
        'slipModal',
        'examBapModal',
        'msDetailModal',
        'examPeriodModal',
        'examSessionModal',
        'examRoomModal',
        'examSupModal',
        'examComModal',
        'examSubstModal',
        'studentAttendanceModal',
        'adminPicketModal',
        'blokirJurnalModal',
        'blokirAcaraModal'
      ];
      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 'NumpadEnter')) {
          const jm = document.getElementById('journalModal');
          if (jm && !jm.classList.contains('hidden')) {
            e.preventDefault();
            if (typeof submitJournal === 'function') submitJournal();
            return;
          }
          const sm = document.getElementById('subModal');
          if (sm && !sm.classList.contains('hidden')) {
            e.preventDefault();
            if (typeof submitSubstitute === 'function') submitSubstitute();
            return;
          }
          var examModalActions = [
            { id: 'examPeriodModal', fn: 'exam_savePeriod' },
            { id: 'examSessionModal', fn: 'exam_saveSession' },
            { id: 'examRoomModal', fn: 'exam_saveRoom' },
            { id: 'examSupModal', fn: 'exam_saveAssignSup' },
            { id: 'examComModal', fn: 'exam_saveAssignCom' },
            { id: 'examSubstModal', fn: 'exam_saveSubst' }
          ];
          for (var k = 0; k < examModalActions.length; k++) {
            var em = document.getElementById(examModalActions[k].id);
            if (em && !em.classList.contains('hidden') && typeof window[examModalActions[k].fn] === 'function') {
              e.preventDefault();
              window[examModalActions[k].fn]();
              return;
            }
          }
        }
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        for (let i = ESC_CLOSEABLE_MODALS.length - 1; i >= 0; i--) {
          const id = ESC_CLOSEABLE_MODALS[i];
          const el = document.getElementById(id);
          if (el && !el.classList.contains('hidden')) {
            if (id === 'confirmModal') {
              closeConfirmModal();
            } else if (id === 'journalModal') {
              if (typeof closeJournalModal === 'function') closeJournalModal();
              else el.classList.add('hidden');
            } else if (id === 'subModal') {
              if (typeof closeSubModal === 'function') closeSubModal();
              else el.classList.add('hidden');
            } else if (id === 'replaceConfirmModal') {
              if (typeof closeReplaceConfirmModal === 'function') closeReplaceConfirmModal();
              else el.remove();
            } else if (id === 'slipModal') {
              if (typeof closeSlipModal === 'function') closeSlipModal();
              else el.classList.add('hidden');
            } else if (id === 'examPeriodModal' && typeof exam_closePeriodModal === 'function') {
              exam_closePeriodModal();
            } else if (id === 'examSessionModal' && typeof exam_closeSessionModal === 'function') {
              exam_closeSessionModal();
            } else if (id === 'examRoomModal' && typeof exam_closeRoomModal === 'function') {
              exam_closeRoomModal();
            } else if (id === 'examSupModal' && typeof exam_closeSupModal === 'function') {
              exam_closeSupModal();
            } else if (id === 'examComModal' && typeof exam_closeComModal === 'function') {
              exam_closeComModal();
            } else if (id === 'examSubstModal' && typeof exam_closeSubstModal === 'function') {
              exam_closeSubstModal();
            } else if (id === 'subjectModal' && typeof closeSubjectModal === 'function') {
              closeSubjectModal();
            } else if (id === 'allowanceModal' && typeof closeAllowanceModal === 'function') {
              closeAllowanceModal();
            } else if (id === 'adminPicketModal' && typeof closeAdminPicketModal === 'function') {
              closeAdminPicketModal();
            } else if (id === 'blokirJurnalModal' && typeof closeBlokirJurnalModal === 'function') {
              closeBlokirJurnalModal();
            } else if (id === 'blokirAcaraModal' && typeof closeBlokirAcaraModal === 'function') {
              closeBlokirAcaraModal();
            } else {
              el.classList.add('hidden');
            }
            e.preventDefault();
            return;
          }
        }
      });
      document.addEventListener('click', function (e) {
        const tgt = e.target;
        if (!tgt) return;
        if (tgt.matches && tgt.matches('#journalModal > div > div.fixed')) {
          const btn = document.getElementById('btnSubmitJournal');
          if (btn && btn.dataset.submitting === 'true') return;
          document.getElementById('journalModal').classList.add('hidden');
        }
        if (tgt.matches && tgt.matches('#viewJournalModal > div > div.fixed')) {
          document.getElementById('viewJournalModal').classList.add('hidden');
        }
      });
    })();
    