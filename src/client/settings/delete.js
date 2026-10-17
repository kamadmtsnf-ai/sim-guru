function deleteSubjectAction(id, btnEl) {
      showConfirm('Hapus Mapel', 'Yakin ingin menghapus mapel ini?', () => {
        const token = localStorage.getItem('auth_token');
        var restoreBtn = (typeof _busyButton === 'function') ? _busyButton(btnEl, '') : function () { };
        var restoreRow = (typeof _setRowLoading === 'function') ? _setRowLoading(btnEl) : function () { };
        google.script.run.withSuccessHandler((res) => {
          if (res && res.status === 'success') {
            showToast('Mapel dihapus', 'success');
            initSettings();
          } else {
            restoreBtn(); restoreRow();
            showToast((res && res.message) || 'Gagal menghapus mapel.', 'error');
          }
        }).withFailureHandler((err) => {
          restoreBtn(); restoreRow();
          showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
        }).deleteSubject(token, id);
      });
    }
    function deleteAllowanceAction(id, btnEl) {
      showConfirm('Hapus Tunjangan', 'Yakin ingin menghapus data tunjangan ini?', () => {
        const token = localStorage.getItem('auth_token');
        var restoreBtn = (typeof _busyButton === 'function') ? _busyButton(btnEl, '') : function () { };
        var restoreRow = (typeof _setRowLoading === 'function') ? _setRowLoading(btnEl) : function () { };
        google.script.run.withSuccessHandler((res) => {
          if (res && res.status === 'success') {
            showToast('Tunjangan dihapus', 'success');
            initSettings();
          } else {
            restoreBtn(); restoreRow();
            showToast((res && res.message) || 'Gagal menghapus.', 'error');
          }
        }).withFailureHandler((err) => {
          restoreBtn(); restoreRow();
          showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
        }).deleteAllowance(token, id);
      });
    }
    /**
     * Dipanggil oleh tombol "Isi Jurnal" di quick-action dashboard guru.
     * Scroll halaman ke panel "Jadwal Mengajar Hari Ini" tanpa berpindah halaman.
     */
    