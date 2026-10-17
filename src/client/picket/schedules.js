function savePicketScheduleAction() {
      const dayEl = document.getElementById('inpPicketDay');
      const teacherEl = document.getElementById('inpPicketTeacher');
      const data = {
        day_index: dayEl ? dayEl.value : '',
        user_id: teacherEl ? teacherEl.value : ''
      };
      if (!data.user_id) return showToast('Pilih guru terlebih dahulu.', 'error');
      const token = localStorage.getItem('auth_token');
      const btn = document.getElementById('btnSavePicket');
      if (!btn) return;
      if (btn.dataset.saving === 'true') return showToast('Sedang menyimpan, mohon tunggu...', 'info');
      btn.dataset.saving = 'true';
      const restore = _busyButton(btn, 'Menyimpan...');
      const finalize = () => {
        btn.dataset.saving = 'false';
        restore();
      };
      google.script.run
        .withSuccessHandler((res) => {
          finalize();
          if (res && res.status === 'success') {
            showToast('Jadwal piket disimpan.', 'success');
            if (teacherEl) teacherEl.value = '';
            initPicket();
          } else {
            showToast((res && res.message) || 'Gagal menyimpan jadwal.', 'error');
          }
        })
        .withFailureHandler((err) => {
          finalize();
          showToast('Koneksi gagal: ' + err, 'error');
        })
        .savePicketSchedule(token, data);
    }
    function deletePicketAction(id, btnEl) {
      showConfirm(
        'Hapus Jadwal Piket',
        'Apakah Anda yakin ingin menghapus jadwal piket ini?',
        () => {
          const token = localStorage.getItem('auth_token');
          const restoreBtn = _busyButton(btnEl, 'Menghapus...');
          const restoreRow = _setRowLoading(btnEl);
          google.script.run
            .withSuccessHandler((res) => {
              if (res && res.status === 'success') {
                showToast('Jadwal piket dihapus.', 'success');
                initPicket();
              } else {
                restoreBtn(); restoreRow();
                showToast((res && res.message) || 'Gagal menghapus.', 'error');
              }
            })
            .withFailureHandler((err) => {
              restoreBtn(); restoreRow();
              showToast('Koneksi gagal: ' + err, 'error');
            })
            .deletePicketSchedule(token, id);
        }
      );
    }
    