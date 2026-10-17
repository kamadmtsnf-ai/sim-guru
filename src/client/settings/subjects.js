function openSubjectModal(id = '', name = '') {
      document.getElementById('subjectModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      document.getElementById('inpSubjectId').value = id;
      document.getElementById('inpSubjectName').value = name;
      document.getElementById('subjectModalTitle').innerText = id ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran';
      if (typeof _settingsUpdateSubjectCounter === 'function') _settingsUpdateSubjectCounter();
      setTimeout(function () {
        var inp = document.getElementById('inpSubjectName');
        if (inp) {
          try { inp.focus(); inp.select(); } catch (_) { }
        }
      }, 200);
    }
    function closeSubjectModal() {
      document.getElementById('subjectModal').classList.add('hidden');
      _maybeReleaseBodyLock();
    }
    function submitSubject() {
      const id = document.getElementById('inpSubjectId').value;
      const name = (document.getElementById('inpSubjectName').value || '').trim();
      const token = localStorage.getItem('auth_token');
      if (!name) {
        showToast('Nama mata pelajaran tidak boleh kosong', 'error');
        var inp = document.getElementById('inpSubjectName');
        if (inp) try { inp.focus(); } catch (_) { }
        return;
      }
      if (name.length < 2) {
        showToast('Nama mata pelajaran minimal 2 karakter', 'error');
        return;
      }
      var btn = document.getElementById('btnSubmitSubject');
      if (btn && btn.dataset.busy === 'true') return;
      var restore = _busyButton(btn, 'Menyimpan...');
      google.script.run.withSuccessHandler((res) => {
        restore();
        if (res && res.status === 'success') {
          showToast('Data Mapel disimpan', 'success');
          closeSubjectModal();
          initSettings();
        } else {
          showToast((res && res.message) || 'Gagal menyimpan mapel.', 'error');
        }
      }).withFailureHandler((err) => {
        restore();
        showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
      }).saveSubject(token, { id: id, name: name });
    }
    