function checkJournalAccess(isConfirmed, id, subject, className, timeRange, endTimeStr, jtmVal) {
      if (!isConfirmed) {
        showToast("Silakan Konfirmasi Terlebih Dahulu Kehadiran Bapak/Ibu kepada Admin atau Guru Piket Hari ini, sebelum Anda Mengisi Jurnal Mengajar!", "error");
        return;
      }
      const now = new Date();
      const [endHour, endMinute] = endTimeStr.split(':').map(Number);
      const scheduleEnd = new Date();
      scheduleEnd.setHours(endHour, endMinute, 0, 0);
      const allowedTime = new Date(scheduleEnd.getTime() + 5 * 60000);
      if (now < allowedTime) {
        showToast("Silakan tunggu Hingga Masuk Periode/Jam Pengisian Jurnal Mengajar, yakni Minimal 5 Menit Setelah Jam Pelajaran Bapak/Ibu Selesai!", "error");
        return;
      }
      openJournalModal(id, subject, className, timeRange, null, jtmVal);
    }
    function openH1JournalModal(id, subject, className, timeRange, h1DateStr, jtmVal) {
      // Tidak perlu cek attendance_confirmed karena item H-1 sudah difilter backend
      // dan h1_target_date sudah tervalidasi server side
      showToast('⚠️ Input jurnal H-1 — JTM dihitung 80% (' + jtmVal + ' JTM)', 'warning', 5000);
      openJournalModal(id, subject, className, timeRange, h1DateStr, jtmVal);
    }
    function initJournal() {
      const token = localStorage.getItem('auth_token');
      const role = localStorage.getItem('user_role');
      const vGuru = document.getElementById('viewGuruJournal');
      const vAdmin = document.getElementById('viewAdminJournal');
      if (vGuru) vGuru.classList.add('hidden');
      if (vAdmin) vAdmin.classList.add('hidden');
      _adminJournalCache = [];
      _guruJournalCache = [];
      _viewJournalCurrentLog = null;
      _journalEditLogId = null;
      _journalExpectedStd = null;
      _journalUserConfirmedMismatch = false;
      if (String(role).toLowerCase() === 'admin') {
        const sub = document.getElementById('jrnHeroSubtitle');
        if (sub) sub.innerText = 'Pemantauan log mengajar seluruh guru';
        if (vAdmin) vAdmin.classList.remove('hidden');
        currentJournalPage = 1;
        loadAdminJournalData(token, currentJournalPage);
      } else {
        const sub = document.getElementById('jrnHeroSubtitle');
        if (sub) sub.innerText = 'Rekam jejak aktivitas pembelajaran Anda';
        if (vGuru) vGuru.classList.remove('hidden');
        currentGuruJournalPage = 1;
        const limitSel = document.getElementById('selGuruJournalLimit');
        currentGuruJournalLimit = parseInt(limitSel && limitSel.value, 10) || 10;
        loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
      }
      setTimeout(_fixMobileLayouts, 400);
    }
    let _viewJournalCurrentLog = null;
    function _openViewJournalWithObject(data) {
      _viewJournalCurrentLog = data || {};
      const dateStr = data.date || '-';
      const timeStr = data.time || '-';
      const cls = data.class_name || '-';
      const subj = data.subject || '-';
      const materi = data.materi || '-';
      const present = (data.students !== undefined ? data.students : (data.students_present || 0)) || 0;
      const absent = data.students_absent || 0;
      const notes = data.clean_notes || data.notes || '';
      setText('viewJournalDate', dateStr);
      setText('viewJournalTime', timeStr);
      setText('viewJournalClassMapel', `${cls} · ${subj}`);
      setText('viewJournalMateri', materi);
      setText('viewJournalPresent', String(present));
      setText('viewJournalAbsent', String(absent));
      const subEl = document.getElementById('viewJournalSubtitle');
      if (subEl) subEl.innerText = `${dateStr} · ${timeStr}`;
      const jtmEl = document.getElementById('viewJournalJTM');
      if (jtmEl) {
        const jtm = Number(data.jtm_val || 0);
        jtmEl.innerText = jtm;
      }
      const notesWrap = document.getElementById('viewJournalNotesWrap');
      const notesEl = document.getElementById('viewJournalNotes');
      if (notes && String(notes).trim() && String(notes).trim() !== '-') {
        if (notesWrap) notesWrap.style.display = '';
        if (notesEl) notesEl.innerText = notes;
      } else {
        if (notesWrap) notesWrap.style.display = 'none';
      }
      const total = Number(present) + Number(absent);
      const pct = total > 0 ? Math.round((Number(present) * 100) / total) : 0;
      const absPct = total > 0 ? 100 - pct : 0;
      const hbar = document.getElementById('viewJournalAttHadirBar');
      const abar = document.getElementById('viewJournalAttAbsenBar');
      const lbl = document.getElementById('viewJournalAttPct');
      if (hbar) hbar.style.width = pct + '%';
      if (abar) abar.style.width = absPct + '%';
      if (lbl) lbl.innerText = total === 0 ? '—' : (pct + '%');
      const guruRow = document.getElementById('viewJournalGuruRow');
      const guruName = data.guru_name || '';
      const guruAvatar = document.getElementById('viewJournalGuruAvatar');
      const guruNameEl = document.getElementById('viewJournalGuruName');
      if (guruRow) {
        if (guruName) {
          guruRow.style.display = 'flex';
          if (guruAvatar) guruAvatar.innerText = String(guruName).split(' ').slice(0, 2).map(n => (n[0] || '?')).join('').toUpperCase();
          if (guruNameEl) guruNameEl.innerText = guruName;
        } else {
          guruRow.style.display = 'none';
        }
      }
      const role = String(localStorage.getItem('user_role') || '').toLowerCase();
      const btnEdit = document.getElementById('btnViewJournalEdit');
      const btnDelete = document.getElementById('btnViewJournalDelete');
      const isAdmin = role === 'admin';
      const isGuru = role === 'guru';
      const canEdit = (isAdmin || isGuru) && !!data.log_id;
      const canDelete = isAdmin && !!data.log_id;
      if (btnEdit) btnEdit.style.display = canEdit ? 'inline-flex' : 'none';
      if (btnDelete) btnDelete.style.display = canDelete ? 'inline-flex' : 'none';
      const modal = document.getElementById('viewJournalModal');
      if (modal) modal.classList.remove('hidden');
    }
    function closeViewJournalModal() {
      const modal = document.getElementById('viewJournalModal');
      if (modal) modal.classList.add('hidden');
      _viewJournalCurrentLog = null;
    }
    function copyJournalMateri() {
      const txt = (document.getElementById('viewJournalMateri') || {}).innerText || '';
      if (!txt || txt === '-') return showToast('Tidak ada materi untuk disalin.', 'info');
      const done = () => {
        const btn = document.getElementById('btnCopyMateri');
        if (btn) {
          const orig = btn.innerHTML;
          btn.innerHTML = '<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Tersalin';
          setTimeout(() => { btn.innerHTML = orig; }, 1500);
        }
        showToast('Materi disalin ke clipboard.', 'success');
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(done, () => _fallbackCopy(txt, done));
        } else {
          _fallbackCopy(txt, done);
        }
      } catch (e) { _fallbackCopy(txt, done); }
    }
    function _fallbackCopy(text, cb) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        if (typeof cb === 'function') cb();
      } catch (e) { showToast('Gagal menyalin: ' + e, 'error'); }
    }
    function deleteJournalFromView() {
      const data = _viewJournalCurrentLog;
      if (!data || !data.log_id) return;
      const logId = data.log_id;
      closeViewJournalModal();
      setTimeout(() => deleteJournalAction(logId), 200);
    }
    function editJournalFromView() {
      const data = _viewJournalCurrentLog;
      if (!data || !data.log_id) return;
      closeViewJournalModal();
      setTimeout(() => openJournalEditModal(data), 200);
    }
    function deleteJournalAction(logId) {
      showConfirm(
        'Hapus Jurnal Mengajar',
        'Apakah Anda yakin ingin menghapus data jurnal ini? Data yang dihapus tidak dapat dikembalikan.',
        () => {
          const token = localStorage.getItem('auth_token');
          showToast('Menghapus jurnal...', 'info', 1500);
          google.script.run
            .withSuccessHandler((res) => {
              if (res && res.status === 'success') {
                if (typeof refreshGuruDashboardCards === 'function') refreshGuruDashboardCards();
                showToast('Jurnal berhasil dihapus', 'success');
                const role = String(localStorage.getItem('user_role') || '').toLowerCase();
                if (role === 'admin') {
                  loadAdminJournalData(token, currentJournalPage);
                } else {
                  loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
                }
              } else {
                showToast((res && res.message) || 'Gagal menghapus jurnal.', 'error');
              }
            })
            .withFailureHandler((err) => {
              showToast('Koneksi gagal: ' + err, 'error');
            })
            .deleteTeachingLog(token, logId);
        }
      );
    }
    let _journalEditLogId = null;
    let _journalExpectedStd = null;
    let _journalExpectedFetchToken = null;
    let _journalUserConfirmedMismatch = false;
    function openJournalModal(id, mapel, kelas, jam, dateStr, jtmVal) {
      // Cek blokir jurnal sebelum membuka modal
      const token = localStorage.getItem('auth_token');
      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      if (mapel && mapel !== '-' && token) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.diblokir) {
              openBlokirJurnalModal(res.pesan);
              return;
            }
            _openJournalModalInternal(id, mapel, kelas, jam, dateStr, jtmVal);
          })
          .withFailureHandler(function() {
            // Gagal cek — izinkan buka modal (fail-open)
            _openJournalModalInternal(id, mapel, kelas, jam, dateStr, jtmVal);
          })
          .cekBlokJurnal(token, mapel, targetDate);
        return;
      }
      _openJournalModalInternal(id, mapel, kelas, jam, dateStr, jtmVal);
    }
    function _openJournalModalInternal(id, mapel, kelas, jam, dateStr, jtmVal) {
      _journalEditLogId = null;
      _journalExpectedStd = null;
      _journalUserConfirmedMismatch = false;
      _resetJournalForm();
      document.getElementById('inpScheduleId').value = id || '';
      document.getElementById('inpJournalLogId').value = '';
      setText('txtMapel', mapel || '-');
      setText('txtKelas', kelas || '-');
      setText('txtJam', jam || '00:00');
      const titleEl = document.getElementById('journalModalTitle');
      if (titleEl) titleEl.innerText = 'Laporan Jurnal Mengajar';
      const lblBtn = document.getElementById('lblSubmitJournal');
      if (lblBtn) lblBtn.innerText = 'Kirim Laporan';
      const editNotice = document.getElementById('journalEditNotice');
      if (editNotice) editNotice.style.display = 'none';
      const jtmEl = document.getElementById('txtJournalJTM');
      if (jtmEl) jtmEl.innerText = jtmVal || '0';
      _renderJournalDurationFromRange(jam);
      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      document.getElementById('inpJournalDateHidden').value = targetDate;
      document.getElementById('journalModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      _fetchExpectedStudents(id, targetDate);
      setTimeout(() => {
        const m = document.getElementById('inpMateri');
        if (m) m.focus();
      }, 200);
      _attachJournalNumberListeners();
    }
    function openJournalEditModal(data) {
      // Catatan desain: fungsi ini tidak memanggil cekBlokJurnal secara sengaja.
      // Aturan blokir hanya berlaku untuk input jurnal baru (openJournalModal).
      // Edit jurnal yang sudah ada tetap diizinkan meski tanggalnya sedang diblokir.
      if (!data || !data.log_id) return;
      _journalEditLogId = data.log_id;
      _journalExpectedStd = null;
      _journalUserConfirmedMismatch = false;
      _resetJournalForm();
      document.getElementById('inpScheduleId').value = '';
      document.getElementById('inpJournalLogId').value = data.log_id;
      setText('txtMapel', data.subject || '-');
      setText('txtKelas', data.class_name || '-');
      setText('txtJam', data.time || '-');
      const titleEl = document.getElementById('journalModalTitle');
      if (titleEl) titleEl.innerText = 'Edit Jurnal Mengajar';
      const lblBtn = document.getElementById('lblSubmitJournal');
      if (lblBtn) lblBtn.innerText = 'Simpan Perubahan';
      const editNotice = document.getElementById('journalEditNotice');
      if (editNotice) editNotice.style.display = 'block';
      const jtmEl = document.getElementById('txtJournalJTM');
      if (jtmEl) jtmEl.innerText = (data.jtm_val !== undefined ? data.jtm_val : 0);
      document.getElementById('inpJournalDateHidden').value = data.date_iso || '';
      document.getElementById('inpMateri').value = data.materi || '';
      const present = (data.students !== undefined ? data.students : (data.students_present || 0)) || 0;
      const absent = data.students_absent || 0;
      document.getElementById('inpHadir').value = String(present);
      document.getElementById('inpSakit').value = String(absent);
      document.getElementById('inpCatatan').value = data.notes || data.clean_notes || '';
      document.getElementById('journalModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      if (typeof updateMateriCounter === 'function') updateMateriCounter();
      if (typeof updateCatatanCounter === 'function') updateCatatanCounter();
      updateStudentTotalIndicator();
      _renderJournalDurationFromRange(data.time);
      setTimeout(() => {
        const m = document.getElementById('inpMateri');
        if (m) m.focus();
      }, 200);
      _attachJournalNumberListeners();
    }
    function _resetJournalForm() {
      const form = document.getElementById('formJournal');
      if (form) form.reset();
      document.getElementById('inpHadir').value = '0';
      document.getElementById('inpSakit').value = '0';
      const inp = document.getElementById('inpMateri');
      if (inp) {
        inp.style.borderColor = '';
        inp.style.boxShadow = '';
      }
      const hint = document.getElementById('materiHint');
      if (hint) hint.style.display = 'none';
      const totalIndicator = document.getElementById('studentTotalIndicator');
      if (totalIndicator) totalIndicator.style.display = 'none';
      const expectedHint = document.getElementById('studentExpectedHint');
      if (expectedHint) expectedHint.style.display = 'none';
      const mismatchBox = document.getElementById('mismatchAlertBox');
      if (mismatchBox) mismatchBox.style.display = 'none';
      const btn = document.getElementById('btnSubmitJournal');
      const loader = document.getElementById('modalLoading');
      if (btn) {
        btn.dataset.submitting = 'false';
        btn.disabled = false;
        btn.classList.remove('hidden');
        btn.style.opacity = '';
      }
      if (loader) loader.classList.add('hidden');
      const counter = document.getElementById('materiCounter');
      if (counter) { counter.innerText = '0/500'; counter.style.color = '#94A3B8'; }
      const cCounter = document.getElementById('catatanCounter');
      if (cCounter) { cCounter.innerText = '0/200'; cCounter.style.color = '#94A3B8'; }
      const durBadge = document.getElementById('journalDurationBadge');
      if (durBadge) durBadge.style.display = 'none';
    }
    function _renderJournalDurationFromRange(rangeStr) {
      const badge = document.getElementById('journalDurationBadge');
      const lbl = document.getElementById('txtJournalDuration');
      if (!badge || !lbl || !rangeStr) { if (badge) badge.style.display = 'none'; return; }
      const m = String(rangeStr).match(/(\d{1,2}):(\d{2})\s*[-–~]\s*(\d{1,2}):(\d{2})/);
      if (!m) { badge.style.display = 'none'; return; }
      const startMin = (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
      const endMin = (parseInt(m[3], 10) || 0) * 60 + (parseInt(m[4], 10) || 0);
      const dur = endMin - startMin;
      if (dur <= 0) { badge.style.display = 'none'; return; }
      badge.style.display = 'inline-flex';
      if (dur < 60) {
        lbl.innerText = dur + ' mnt';
      } else {
        const h = Math.floor(dur / 60);
        const mm = dur % 60;
        lbl.innerText = mm === 0 ? (h + ' jam') : (h + 'j ' + mm + 'm');
      }
    }
    function _fetchExpectedStudents(scheduleId, dateStr) {
      if (!scheduleId) return;
      const myToken = Date.now();
      _journalExpectedFetchToken = myToken;
      const sessionToken = localStorage.getItem('auth_token');
      if (!sessionToken) return;
      // Tentukan apakah ini jurnal H-1: dateStr ada dan berbeda dari hari ini
      const todayISO = new Date().toISOString().split('T')[0];
      const isH1 = dateStr && dateStr !== todayISO;
      google.script.run
        .withSuccessHandler((res) => {
          if (myToken !== _journalExpectedFetchToken) return;
          if (res && res.status === 'success' && res.expected) {
            _journalExpectedStd = Number(res.expected);
            const wrap = document.getElementById('studentExpectedHint');
            const num = document.getElementById('studentExpected');
            if (wrap && num) {
              num.innerText = _journalExpectedStd;
              wrap.style.display = 'block';
              updateStudentTotalIndicator();
            }
          }
        })
        .withFailureHandler(() => { })
        .getClassExpectedStudents(sessionToken, scheduleId);
      // H-MINUS-1: Ambil rekap piket tanggal target agar Guru bisa melihat data acuan
      if (isH1 && dateStr) {
        google.script.run
          .withSuccessHandler((res) => {
            if (myToken !== _journalExpectedFetchToken) return;
            if (!res || res.status !== 'success' || !res.rekap) return;
            const r = res.rekap;
            // Prefill field hadir dan absen dengan data rekap piket H-1
            const inpHadir = document.getElementById('inpHadir');
            const inpSakit = document.getElementById('inpSakit');
            if (inpHadir && inpSakit) {
              inpHadir.value = String(r.hadir);
              inpSakit.value = String(r.absen);
              updateStudentTotalIndicator();
            }
            // Tampilkan banner rekap piket H-1
            const mismatchBox = document.getElementById('mismatchAlertBox');
            const mismatchMsg = document.getElementById('mismatchAlertMsg');
            if (mismatchBox && mismatchMsg) {
              mismatchMsg.innerHTML =
                '<strong>Rekap Absensi Piket Kemarin (' + escapeHtml(r.date) + ') — Kelas ' + escapeHtml(r.class_name) + '</strong><br>' +
                '<div style="margin-top:6px;line-height:1.9;font-size:12px;">' +
                'Hadir <strong>' + r.hadir + '</strong>&nbsp;&nbsp;' +
                'Sakit <strong>' + r.sakit + '</strong>&nbsp;' +
                'Izin <strong>' + r.izin + '</strong>&nbsp;' +
                'Alpa <strong>' + r.alpa + '</strong>' +
                '<br><span style="color:#92400E;font-size:11px;">Data di atas telah diisi otomatis dari rekap piket. Sesuaikan jika perlu, lalu submit.</span>' +
                '</div>';
              mismatchBox.style.display = 'block';
              mismatchBox.style.background = 'linear-gradient(135deg,#FFFBEB,#FEF3C7)';
              mismatchBox.style.borderColor = '#FCD34D';
              mismatchBox.style.borderWidth = '1px';
              mismatchBox.style.borderStyle = 'solid';
            }
          })
          .withFailureHandler(() => { })
          .getPicketRekapForDate(sessionToken, scheduleId, dateStr);
      }
    }
    function _attachJournalNumberListeners() {
      const inpHadir = document.getElementById('inpHadir');
      const inpSakit = document.getElementById('inpSakit');
      [inpHadir, inpSakit].forEach(el => {
        if (!el) return;
        el.oninput = updateStudentTotalIndicator;
        el.onfocus = function () { try { this.select(); } catch (e) { } };
      });
    }
    function adjustNumberInput(id, delta) {
      const el = document.getElementById(id);
      if (!el) return;
      let v = parseInt(el.value || '0', 10) || 0;
      v = Math.max(0, Math.min(200, v + delta));
      el.value = v;
      if (id === 'inpHadir' || id === 'inpSakit') {
        if (typeof updateStudentTotalIndicator === 'function') updateStudentTotalIndicator();
      } else if (id === 'inpBapHadir' || id === 'inpBapAbsen') {
        if (typeof updateBapTotalIndicator === 'function') updateBapTotalIndicator();
      }
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
    }
    function updateMateriCounter() {
      const el = document.getElementById('inpMateri');
      const counter = document.getElementById('materiCounter');
      if (!el || !counter) return;
      const len = (el.value || '').length;
      counter.innerText = `${len}/500`;
      counter.style.color = len > 450 ? '#DC2626' : (len > 350 ? '#D97706' : '#94A3B8');
      const hint = document.getElementById('materiHint');
      if (hint && len > 0) hint.style.display = 'none';
      if (len > 0) {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }
    }
    function updateCatatanCounter() {
      const el = document.getElementById('inpCatatan');
      const counter = document.getElementById('catatanCounter');
      if (!el || !counter) return;
      const len = (el.value || '').length;
      counter.innerText = `${len}/200`;
      counter.style.color = len > 180 ? '#DC2626' : (len > 150 ? '#D97706' : '#94A3B8');
    }
    function updateStudentTotalIndicator() {
      const inpHadir = document.getElementById('inpHadir');
      const inpSakit = document.getElementById('inpSakit');
      const indicator = document.getElementById('studentTotalIndicator');
      const totalEl = document.getElementById('totalStudents');
      if (!inpHadir || !inpSakit || !indicator || !totalEl) return;
      const h = parseInt(inpHadir.value || '0', 10) || 0;
      const s = parseInt(inpSakit.value || '0', 10) || 0;
      const total = h + s;

      // --- Update studentTotalIndicator (progress bar hadir/absen) ---
      if (total > 0) {
        indicator.style.display = 'block';
        totalEl.innerText = total;
        const rate = Math.round((h * 100) / total);
        const rateEl = document.getElementById('totalAttendanceRate');
        if (rateEl) rateEl.innerText = rate + '%';
        const hbar = document.getElementById('totalAttHadirBar');
        const abar = document.getElementById('totalAttAbsenBar');
        if (hbar) hbar.style.width = rate + '%';
        if (abar) abar.style.width = (100 - rate) + '%';
      } else {
        indicator.style.display = 'none';
      }

      // --- Update studentExpectedHint dan mismatchAlertBox ---
      const expectedHint = document.getElementById('studentExpectedHint');
      const deltaEl = document.getElementById('studentExpectedDelta');
      const deltaWrap = document.getElementById('studentExpectedDeltaWrap');
      const iconEl = document.getElementById('studentExpectedIcon');
      const labelEl = document.getElementById('studentExpectedLabel');
      const progressWrap = document.getElementById('studentExpectedProgressWrap');
      const progressBar = document.getElementById('studentExpectedProgressBar');
      const filledCount = document.getElementById('studentExpectedFilledCount');
      const slotLabel = document.getElementById('studentExpectedSlotLabel');
      const mismatchBox = document.getElementById('mismatchAlertBox');
      const mismatchMsg = document.getElementById('mismatchAlertMsg');

      if (!_journalExpectedStd || !expectedHint) {
        if (mismatchBox) mismatchBox.style.display = 'none';
        return;
      }

      expectedHint.style.display = 'block';
      const diff = total - _journalExpectedStd;
      const std = _journalExpectedStd;

      // Progress bar vs standar
      if (progressWrap && progressBar && filledCount && slotLabel) {
        progressWrap.style.display = total > 0 ? 'block' : 'none';
        const pct = total > 0 ? Math.min(100, Math.round((total / std) * 100)) : 0;
        if (filledCount) filledCount.innerText = total;
        if (progressBar) {
          progressBar.style.width = pct + '%';
        }
        if (slotLabel) {
          const sisa = std - total;
          if (diff === 0) {
            slotLabel.innerText = '✓ Lengkap';
            slotLabel.style.color = '#047857';
          } else if (diff > 0) {
            slotLabel.innerText = 'Kelebihan ' + diff;
            slotLabel.style.color = '#DC2626';
          } else {
            slotLabel.innerText = 'Sisa ' + Math.abs(sisa);
            slotLabel.style.color = '#D97706';
          }
        }
      }

      if (total === 0) {
        // Belum ada input — tampilkan info netral
        expectedHint.style.background = '#F0F9FF';
        expectedHint.style.borderColor = '#BAE6FD';
        if (iconEl) { iconEl.style.background = '#DBEAFE'; iconEl.querySelector('svg').setAttribute('stroke', '#2563EB'); }
        if (labelEl) { labelEl.style.color = '#1D4ED8'; }
        if (deltaEl) { deltaEl.innerText = ''; deltaEl.style.background = ''; deltaEl.style.color = ''; }
        if (mismatchBox) mismatchBox.style.display = 'none';
        _journalUserConfirmedMismatch = false;
      } else if (diff === 0) {
        // Sesuai standar — hijau
        expectedHint.style.background = 'linear-gradient(135deg,#ECFDF5,#D1FAE5)';
        expectedHint.style.borderColor = '#6EE7B7';
        if (iconEl) { iconEl.style.background = '#A7F3D0'; iconEl.querySelector('svg').setAttribute('stroke', '#065F46'); }
        if (labelEl) { labelEl.style.color = '#065F46'; }
        if (deltaEl) {
          deltaEl.innerText = '✓ Sesuai';
          deltaEl.style.background = '#D1FAE5';
          deltaEl.style.color = '#047857';
          deltaEl.style.padding = '2px 10px';
          deltaEl.style.borderRadius = '20px';
        }
        if (progressBar) progressBar.style.background = '#10B981';
        if (mismatchBox) mismatchBox.style.display = 'none';
        _journalUserConfirmedMismatch = false;
      } else {
        // Tidak sesuai — merah/kuning
        const isOver = diff > 0;
        expectedHint.style.background = isOver
          ? 'linear-gradient(135deg,#FFF1F2,#FFE4E6)'
          : 'linear-gradient(135deg,#FFFBEB,#FEF3C7)';
        expectedHint.style.borderColor = isOver ? '#FDA4AF' : '#FDE68A';
        if (iconEl) {
          iconEl.style.background = isOver ? '#FECDD3' : '#FDE68A';
          iconEl.querySelector('svg').setAttribute('stroke', isOver ? '#9F1239' : '#713F12');
        }
        if (labelEl) { labelEl.style.color = isOver ? '#9F1239' : '#92400E'; }
        if (deltaEl) {
          deltaEl.innerText = isOver ? '⚠ Lebih ' + diff + ' siswa' : '⚠ Kurang ' + Math.abs(diff) + ' siswa';
          deltaEl.style.background = isOver ? '#FFE4E6' : '#FEF3C7';
          deltaEl.style.color = isOver ? '#BE123C' : '#92400E';
          deltaEl.style.padding = '2px 10px';
          deltaEl.style.borderRadius = '20px';
        }
        if (progressBar) progressBar.style.background = isOver ? '#EF4444' : '#F59E0B';

        // Tampilkan mismatchAlertBox sebagai penolakan inline (menggantikan confirm())
        if (mismatchBox && mismatchMsg) {
          mismatchMsg.innerHTML =
            'Total yang diisi: <strong style="font-family:\'JetBrains Mono\',monospace;">' + total + '</strong> siswa, ' +
            'standar kelas: <strong style="font-family:\'JetBrains Mono\',monospace;">' + std + '</strong> siswa. ' +
            (isOver
              ? 'Harap kurangi <strong>' + diff + '</strong> siswa dari input hadir atau absen.'
              : 'Harap tambahkan <strong>' + Math.abs(diff) + '</strong> siswa lagi ke hadir atau absen.');
          mismatchBox.style.display = 'block';
        }
        _journalUserConfirmedMismatch = false;
      }
    }
    function closeJournalModal() {
      const btn = document.getElementById('btnSubmitJournal');
      if (btn && btn.dataset.submitting === 'true') {
        showToast('Sedang menyimpan, mohon tunggu...', 'info');
        return;
      }
      const modal = document.getElementById('journalModal');
      if (modal) modal.classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
      _journalEditLogId = null;
      _journalExpectedStd = null;
      _journalExpectedFetchToken = null;
      _journalUserConfirmedMismatch = false;
    }
    function openBlokirJurnalModal(pesan) {
      const modal = document.getElementById('blokirJurnalModal');
      const pesanEl = document.getElementById('blokirJurnalPesanModal');
      if (pesanEl) pesanEl.textContent = pesan || 'Input jurnal tidak tersedia untuk mata pelajaran dan tanggal yang dipilih.';
      if (modal) modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
    function closeBlokirJurnalModal() {
      const modal = document.getElementById('blokirJurnalModal');
      if (modal) modal.classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    }
    function openBlokirAcaraModal(pesan) {
      var modal = document.getElementById('blokirAcaraModal');
      var pesanEl = document.getElementById('blokirAcaraPesanModal');
      if (pesanEl) pesanEl.textContent = pesan || 'Input jurnal acara tidak tersedia untuk tipe acara dan tanggal yang dipilih.';
      if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
    }
    function closeBlokirAcaraModal() {
      var modal = document.getElementById('blokirAcaraModal');
      if (modal) modal.classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    }
    function submitJournal() {
      const btn = document.getElementById('btnSubmitJournal');
      const loader = document.getElementById('modalLoading');
      const isEdit = !!_journalEditLogId;
      const scheduleId = document.getElementById('inpScheduleId').value;
      const journalDate = document.getElementById('inpJournalDateHidden').value;
      const materi = document.getElementById('inpMateri').value.trim();
      const catatan = document.getElementById('inpCatatan').value;
      const hadir = parseInt(document.getElementById('inpHadir').value || '0', 10) || 0;
      const sakit = parseInt(document.getElementById('inpSakit').value || '0', 10) || 0;
      if (!materi) {
        const inp = document.getElementById('inpMateri');
        const hint = document.getElementById('materiHint');
        if (inp) {
          inp.style.borderColor = '#F43F5E';
          inp.style.boxShadow = '0 0 0 3px rgba(244,63,94,0.10)';
          inp.focus();
        }
        if (hint) hint.style.display = 'block';
        return showToast("Materi pembelajaran wajib diisi", "error");
      }
      if ((hadir + sakit) === 0) {
        return showToast("Mohon isi jumlah siswa hadir dan/atau absen.", "error");
      }
      // Validasi ketat: tolak langsung jika total tidak sesuai standar
      if (_journalExpectedStd && (hadir + sakit) !== _journalExpectedStd) {
        const diff = (hadir + sakit) - _journalExpectedStd;
        const msg = diff > 0
          ? 'Total siswa (' + (hadir + sakit) + ') melebihi standar kelas (' + _journalExpectedStd + '). Harap kurangi ' + diff + ' siswa.'
          : 'Total siswa (' + (hadir + sakit) + ') kurang dari standar kelas (' + _journalExpectedStd + '). Harap tambah ' + Math.abs(diff) + ' siswa lagi.';
        showToast(msg, 'error', 5000);
        // Pastikan mismatchAlertBox terlihat
        const mismatchBox = document.getElementById('mismatchAlertBox');
        const mismatchMsg = document.getElementById('mismatchAlertMsg');
        if (mismatchBox && mismatchMsg) {
          const isOver = diff > 0;
          mismatchMsg.innerHTML =
            'Total yang diisi: <strong style="font-family:\'JetBrains Mono\',monospace;">' + (hadir + sakit) + '</strong> siswa, ' +
            'standar kelas: <strong style="font-family:\'JetBrains Mono\',monospace;">' + _journalExpectedStd + '</strong> siswa. ' +
            (isOver
              ? 'Harap kurangi <strong>' + diff + '</strong> siswa dari input hadir atau absen.'
              : 'Harap tambahkan <strong>' + Math.abs(diff) + '</strong> siswa lagi ke hadir atau absen.');
          mismatchBox.style.display = 'block';
          mismatchBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      // Sembunyikan mismatchAlertBox jika lolos validasi
      const mismatchBoxOk = document.getElementById('mismatchAlertBox');
      if (mismatchBoxOk) mismatchBoxOk.style.display = 'none';
      if (btn && btn.dataset.submitting === "true") {
        showToast("Sedang memproses, mohon tunggu...", "info");
        return;
      }
      if (btn) btn.dataset.submitting = "true";
      if (btn) {
        btn.disabled = true;
        btn.classList.add('hidden');
      }
      if (loader) loader.classList.remove('hidden');
      const token = localStorage.getItem('auth_token');
      const onDone = () => {
        if (btn) {
          btn.dataset.submitting = "false";
          btn.disabled = false;
          btn.classList.remove('hidden');
        }
        if (loader) loader.classList.add('hidden');
      };
      const handleSuccess = (res) => {
        onDone();
        if (res && res.status === 'success') {
          if (typeof refreshGuruDashboardCards === 'function') refreshGuruDashboardCards();
          if (!isEdit && typeof _markScheduleItemDone === 'function') _markScheduleItemDone(scheduleId);
          showToast(isEdit ? "Perubahan jurnal disimpan." : "Laporan berhasil disimpan", "success");
          const modal = document.getElementById('journalModal');
          if (modal) modal.classList.add('hidden');
          _journalEditLogId = null;
          if (typeof initDashboard === 'function') {
            const dashGuru = document.getElementById('viewGuruDashboard');
            const dashAdmin = document.getElementById('viewAdminDashboard');
            if ((dashGuru && !dashGuru.classList.contains('hidden')) || (dashAdmin && !dashAdmin.classList.contains('hidden'))) {
              initDashboard();
            }
          }
          if (typeof initMySchedule === 'function') {
            const viewMySchedule = document.getElementById('Page_MySchedule');
            if (viewMySchedule && !viewMySchedule.classList.contains('hidden')) {
              initMySchedule();
            }
          }
          const role = String(localStorage.getItem('user_role') || '').toLowerCase();
          const vGuru = document.getElementById('viewGuruJournal');
          const vAdmin = document.getElementById('viewAdminJournal');
          if (vAdmin && !vAdmin.classList.contains('hidden') && role === 'admin') {
            loadAdminJournalData(token, currentJournalPage);
          } else if (vGuru && !vGuru.classList.contains('hidden')) {
            loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
          }
        } else {
          const msg = res && res.message ? res.message : 'Gagal menyimpan jurnal.';
          const code = res && res.code;
          if (code === 'STUDENT_COUNT_MISMATCH' && res.expected) {
            _journalExpectedStd = Number(res.expected);
            const wrap = document.getElementById('studentExpectedHint');
            const num = document.getElementById('studentExpected');
            if (wrap && num) { num.innerText = _journalExpectedStd; wrap.style.display = 'block'; }
            updateStudentTotalIndicator();
            // Tampilkan mismatchAlertBox juga
            const mismatchBox = document.getElementById('mismatchAlertBox');
            const mismatchMsg = document.getElementById('mismatchAlertMsg');
            if (mismatchBox && mismatchMsg) {
              mismatchMsg.innerHTML = res.message || msg;
              mismatchBox.style.display = 'block';
            }
            showToast(msg, 'error', 6000);
          } else if (code === 'STUDENT_ATTENDANCE_MISMATCH') {
            var expHadir = res.expected_hadir !== undefined ? res.expected_hadir : '?';
            var expAbsen = res.expected_absen !== undefined ? res.expected_absen : '?';
            var actHadir = res.actual_hadir   !== undefined ? res.actual_hadir   : '?';
            var actAbsen = res.actual_absen   !== undefined ? res.actual_absen   : '?';
            var saKelas  = escapeHtml(res.class_name || '');
            var saDetail = res.rekap_detail || {};
            var isHadirOk = (actHadir === expHadir);
            var isAbsenOk = (actAbsen === expAbsen);
            var alertHtml =
              'Data tidak sesuai rekap guru piket untuk <strong>Kelas ' + saKelas + '</strong>.<br>' +
              '<div style="margin-top:8px;line-height:1.9;font-size:12px;">' +
              '<div><span style="display:inline-block;min-width:115px;color:#64748B;font-size:11px;">Rekap Piket:</span>' +
              'Hadir <strong>' + expHadir + '</strong>&nbsp;&nbsp;' +
              'Sakit <strong>' + (saDetail.sakit||0) + '</strong>&nbsp;' +
              'Izin <strong>' + (saDetail.izin||0) + '</strong>&nbsp;' +
              'Alpa <strong>' + (saDetail.alpa||0) + '</strong></div>' +
              '<div style="margin-top:3px;"><span style="display:inline-block;min-width:115px;color:#64748B;font-size:11px;">Anda Mengisi:</span>' +
              'Hadir <strong style="color:' + (isHadirOk?'#047857':'#DC2626') + '">' + actHadir + '</strong>' +
              (isHadirOk ? ' \u2713' : ' \u2717') +
              '&nbsp;&nbsp;Absen <strong style="color:' + (isAbsenOk?'#047857':'#DC2626') + '">' + actAbsen + '</strong>' +
              (isAbsenOk ? ' \u2713' : ' \u2717') + '</div>' +
              '</div>';
            var mismatchBox = document.getElementById('mismatchAlertBox');
            var mismatchMsg = document.getElementById('mismatchAlertMsg');
            if (mismatchBox && mismatchMsg) {
              mismatchMsg.innerHTML = alertHtml;
              mismatchBox.style.display = 'block';
              mismatchBox.style.background = 'linear-gradient(135deg,#FFF7ED,#FFEDD5)';
              mismatchBox.style.borderColor = '#FED7AA';
              mismatchBox.style.borderWidth = '1px';
              mismatchBox.style.borderStyle = 'solid';
              setTimeout(function() { mismatchBox.scrollIntoView({ behavior:'smooth', block:'nearest' }); }, 50);
            }
            showToast(
              'Kelas ' + (res.class_name||'') + ': Hadir harus ' + expHadir + ', Absen harus ' + expAbsen + '.',
              'error', 7000
            );
          } else if (code === 'DUPLICATE') {
            showToast(msg, 'error', 6000);
            setTimeout(() => {
              const modal = document.getElementById('journalModal');
              if (modal) modal.classList.add('hidden');
              _journalEditLogId = null;
            }, 1500);
          } else {
            showToast(msg, 'error');
          }
        }
      };
      const handleFailure = (err) => {
        onDone();
        showToast("Koneksi gagal: " + err, "error");
      };
      if (isEdit) {
        const editPayload = {
          log_id: _journalEditLogId,
          material: materi,
          notes: catatan,
          siswa_hadir: hadir,
          siswa_absen: sakit,
          force_submit: false
        };
        google.script.run
          .withSuccessHandler(handleSuccess)
          .withFailureHandler(handleFailure)
          .updateTeachingLog(token, editPayload);
      } else {
        const payload = {
          schedule_id: scheduleId,
          material: materi,
          notes: catatan,
          siswa_hadir: hadir,
          siswa_absen: sakit,
          date: journalDate || null,
          force_submit: false
        };
        google.script.run
          .withSuccessHandler(handleSuccess)
          .withFailureHandler(handleFailure)
          .saveTeachingJournal(token, payload);
      }
    }
    