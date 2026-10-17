function _examJtmEnsureTeachers(cb) {
      if (allTeachersCache && allTeachersCache.length) { cb(); return; }
      var token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler(function (users) {
          allTeachersCache = (users || []).filter(function (u) {
            return String(u.role).toLowerCase() === 'guru' && String(u.username) !== 'PenjagaMadrasah';
          });
          cb();
        })
        .withFailureHandler(function () { cb(); })
        .getAllUsers(token);
    }
    function toggleExamJtmPanel(supervisorId, userId) {
      var sid = _jtmSid(supervisorId);
      var row = document.getElementById('jtmExamAdjRow-' + sid);
      if (!row) return;
      if (row.classList.contains('hidden')) {
        row.classList.remove('hidden');
        loadExamJtmState(supervisorId);
      } else {
        row.classList.add('hidden');
      }
    }
    function loadExamJtmState(supervisorId) {
      var sid = _jtmSid(supervisorId);
      var token = localStorage.getItem('auth_token');
      var statusEl = document.getElementById('jtmExamAdjStatus-' + sid);
      if (statusEl) statusEl.textContent = 'Memuat...';
      google.script.run
        .withSuccessHandler(function (res) {
          var _statusEl = document.getElementById('jtmExamAdjStatus-' + sid);
          if (!res || res.status !== 'success') {
            var _errMsg = res ? (res.message || ('Status: ' + res.status)) : 'Response kosong dari server';
            if (_statusEl) _statusEl.textContent = _errMsg;
            return;
          }
          var schedEl  = document.getElementById('jtmExamSchedDisp-' + sid);
          var adjEl    = document.getElementById('jtmExamAdjDisp-'   + sid);
          var diffEl   = document.getElementById('jtmExamDiffDisp-'  + sid);
          var inputEl  = document.getElementById('jtmExamAdjInput-'  + sid);
          var reasonEl = document.getElementById('jtmExamReason-'    + sid);
          if (schedEl)  schedEl.textContent  = res.scheduled_jtm;
          if (adjEl)    adjEl.textContent    = res.adjusted_jtm;
          if (diffEl)   diffEl.textContent   = res.jtm_difference;
          if (inputEl) {
            inputEl.value = res.adjusted_jtm;
            inputEl.setAttribute('max', res.scheduled_jtm);
            inputEl.dataset.scheduled = res.scheduled_jtm;
          }
          if (reasonEl)  reasonEl.value  = res.reason || '';
          if (_statusEl) _statusEl.textContent = '';
          recomputeExamJtmDiff(supervisorId);
          var _cancelBtn = document.getElementById('jtmExamCancelBtn-' + sid);
          if (_cancelBtn) {
            var _hasAdj = (Number(res.adjusted_jtm) !== Number(res.scheduled_jtm))
              || (res.reason && String(res.reason).trim().length > 0)
              || (res.allocations && res.allocations.length > 0);
            if (_hasAdj) _cancelBtn.classList.remove('hidden');
            else         _cancelBtn.classList.add('hidden');
          }
          renderExamJtmAllocPanel(supervisorId, res);
        })
        .withFailureHandler(function (err) {
          var _statusEl = document.getElementById('jtmExamAdjStatus-' + sid);
          if (_statusEl) _statusEl.textContent = 'Koneksi gagal: ' + err;
        })
        .getOccurrenceJtmState(token, 'EXAM', supervisorId);
    }
    function recomputeExamJtmDiff(supervisorId) {
      var sid = _jtmSid(supervisorId);
      var inputEl = document.getElementById('jtmExamAdjInput-' + sid);
      if (!inputEl) return;
      var adjEl = document.getElementById('jtmExamAdjDisp-' + sid);
      var diffEl = document.getElementById('jtmExamDiffDisp-' + sid);
      var reasonWrap = document.getElementById('jtmExamReasonWrap-' + sid);
      var scheduled = Number(inputEl.dataset.scheduled || inputEl.getAttribute('max') || 0);
      var raw = String(inputEl.value).trim();
      var val = Number(raw);
      var isWholeInRange = raw !== '' && isFinite(val) && Math.floor(val) === val && val >= 0 && val <= scheduled;
      if (isWholeInRange) {
        if (adjEl) adjEl.textContent = val;
        if (diffEl) diffEl.textContent = (scheduled - val);
      }
      if (reasonWrap) {
        if (isWholeInRange && val < scheduled) reasonWrap.classList.remove('hidden');
        else reasonWrap.classList.add('hidden');
      }
    }
    function saveExamJtmAdjustment(supervisorId, userId, btnEl) {
      var sid = _jtmSid(supervisorId);
      var inputEl = document.getElementById('jtmExamAdjInput-' + sid);
      var reasonEl = document.getElementById('jtmExamReason-' + sid);
      var statusEl = document.getElementById('jtmExamAdjStatus-' + sid);
      if (!inputEl) return;
      var scheduled = Number(inputEl.dataset.scheduled || inputEl.getAttribute('max') || 0);
      var raw = String(inputEl.value).trim();
      var val = Number(raw);
      if (raw === '' || !isFinite(val) || Math.floor(val) !== val) {
        showToast('Adjusted JTM harus berupa bilangan bulat.', 'error');
        return;
      }
      if (val < 0 || val > scheduled) {
        showToast('Adjusted JTM harus di antara 0 dan ' + scheduled + '.', 'error');
        return;
      }
      var reason = reasonEl ? String(reasonEl.value).trim() : '';
      if (val < scheduled && reason.length === 0) {
        showToast('Alasan penyesuaian wajib diisi saat mengurangi JTM.', 'error');
        if (reasonEl) reasonEl.focus();
        return;
      }
      if (reason.length > 500) {
        showToast('Alasan penyesuaian maksimal 500 karakter.', 'error');
        return;
      }
      var token = localStorage.getItem('auth_token');
      var restoreBtn = _busyButton(btnEl, 'Menyimpan...');
      var payload = {
        occurrence_type: 'EXAM',
        supervisor_id: supervisorId,
        adjusted_jtm: val,
        reason: reason
      };
      google.script.run
        .withSuccessHandler(function (res) {
          restoreBtn();
          if (res && res.status === 'success') {
            showToast('Penyesuaian JTM tersimpan.', 'success');
            var _statusEl = document.getElementById('jtmExamAdjStatus-' + sid);
            var schedEl = document.getElementById('jtmExamSchedDisp-' + sid);
            var adjEl   = document.getElementById('jtmExamAdjDisp-'   + sid);
            var diffEl  = document.getElementById('jtmExamDiffDisp-'  + sid);
            if (schedEl) schedEl.textContent = res.scheduled_jtm;
            if (adjEl)   adjEl.textContent   = res.adjusted_jtm;
            if (diffEl)  diffEl.textContent  = res.jtm_difference;
            if (_statusEl) _statusEl.textContent = '';
            var _panel    = document.getElementById('jtmExamAllocPanel-' + sid);
            var _listEl   = document.getElementById('jtmExamAllocList-'  + sid);
            var _remainEl = document.getElementById('jtmExamRemainDisp-' + sid);
            var newDiff   = Number(res.jtm_difference) || 0;
            var allocSum  = 0;
            if (_listEl) {
              var rows = _listEl.querySelectorAll('[data-alloc-jtm]');
              for (var _i = 0; _i < rows.length; _i++) {
                allocSum += Number(rows[_i].dataset.allocJtm) || 0;
              }
            }
            var newRemaining = Math.max(0, newDiff - allocSum);
            if (_remainEl) _remainEl.textContent = newRemaining;
            if (_panel) {
              _panel.dataset.remaining = newRemaining;
              if (newDiff > 0) _panel.classList.remove('hidden');
              else             _panel.classList.add('hidden');
            }
            var _cancelBtnExam = document.getElementById('jtmExamCancelBtn-' + sid);
            if (_cancelBtnExam) _cancelBtnExam.classList.remove('hidden');
          } else {
            showToast((res && res.message) || 'Gagal menyimpan penyesuaian JTM.', 'error');
            var _statusEl2 = document.getElementById('jtmExamAdjStatus-' + sid);
            if (_statusEl2) _statusEl2.textContent = (res && res.message) || '';
          }
        })
        .withFailureHandler(function (err) {
          restoreBtn();
          showToast('Koneksi gagal: ' + err, 'error');
        })
        .adjustOccurrenceJtm(token, payload);
    }
    function _examJtmPopulateAllocSelect(sid, originalUserId) {
      var sel = document.getElementById('jtmExamAllocSelect-' + sid);
      if (!sel) return;
      var prev = sel.value;
      var origId = String(originalUserId == null ? '' : originalUserId);
      var html = '<option value="">Pilih Guru...</option>';
      (allTeachersCache || []).forEach(function (t) {
        if (String(t.id) === origId) return; // exclude the original supervisor
        html += '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.full_name || t.username || t.id) + '</option>';
      });
      sel.innerHTML = html;
      if (prev) sel.value = prev;
    }
    function _examJtmRenderAllocList(supervisorId, allocations) {
      var sid = _jtmSid(supervisorId);
      var listEl = document.getElementById('jtmExamAllocList-' + sid);
      if (!listEl) return;
      var allocs = allocations || [];
      if (allocs.length === 0) {
        listEl.innerHTML = '<div class="text-[11px] text-slate-400 italic">Belum ada alokasi.</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < allocs.length; i++) {
        var a = allocs[i] || {};
        var name = escapeHtml(_jtmTeacherName(a.substitute_user_id));
        var jtm = escapeHtml(a.allocated_jtm);
        var safeReallocId = _jsStr(a.id);
        html += '<div class="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-lg px-2.5 py-1.5"' +
          ' data-realloc-id="' + escapeHtml(a.id) + '" data-alloc-jtm="' + escapeHtml(a.allocated_jtm) + '">' +
          '<span class="text-xs text-slate-700"><span class="font-semibold">' + name + '</span> ' +
          '<span class="text-emerald-700 font-bold">+' + jtm + ' JTM</span></span>' +
          '<button type="button" onclick="removeExamJtmAllocation(\'' + _jsStr(supervisorId) + '\', \'' + safeReallocId + '\', this)" ' +
          'class="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-[11px] font-semibold">' +
          '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
          'Hapus</button>' +
          '</div>';
      }
      listEl.innerHTML = html;
    }
    function renderExamJtmAllocPanel(supervisorId, res) {
      var sid = _jtmSid(supervisorId);
      var panel = document.getElementById('jtmExamAllocPanel-' + sid);
      if (!panel) return;
      var scheduled = Number(res.scheduled_jtm) || 0;
      var adjusted = Number(res.adjusted_jtm) || 0;
      var difference = scheduled - adjusted;
      var allocs = res.allocations || [];
      var allocated = 0;
      for (var i = 0; i < allocs.length; i++) {
        allocated += Number((allocs[i] || {}).allocated_jtm) || 0;
      }
      var remaining = difference - allocated;
      if (remaining < 0) remaining = 0;
      if (difference > 0) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
      var remainEl = document.getElementById('jtmExamRemainDisp-' + sid);
      if (remainEl) remainEl.textContent = remaining;
      _examJtmEnsureTeachers(function () {
        _examJtmPopulateAllocSelect(sid, panel.dataset.originalUid);
        _examJtmRenderAllocList(supervisorId, allocs);
      });
      panel.dataset.remaining = remaining;
    }
    function addExamJtmAllocation(supervisorId, userId, btnEl) {
      var sid = _jtmSid(supervisorId);
      var selEl = document.getElementById('jtmExamAllocSelect-' + sid);
      var inputEl = document.getElementById('jtmExamAllocInput-' + sid);
      var panel = document.getElementById('jtmExamAllocPanel-' + sid);
      if (!selEl || !inputEl) return;
      var substituteUserId = String(selEl.value || '');
      var raw = String(inputEl.value).trim();
      var val = Number(raw);
      if (!substituteUserId) {
        showToast('Pilih guru pengganti terlebih dahulu.', 'error');
        return;
      }
      if (raw === '' || !isFinite(val) || val <= 0) {
        showToast('Alokasi JTM harus berupa angka lebih dari 0.', 'error');
        return;
      }
      var remaining = panel ? Number(panel.dataset.remaining || 0) : 0;
      if (val > remaining) {
        showToast('Alokasi melebihi sisa selisih JTM (' + remaining + ').', 'error');
        return;
      }
      var token = localStorage.getItem('auth_token');
      var restoreBtn = _busyButton(btnEl, 'Menyimpan...');
      var payload = {
        occurrence_type: 'EXAM',
        occurrence_ref: supervisorId,
        allocations: [{ substitute_user_id: substituteUserId, allocated_jtm: val }]
      };
      google.script.run
        .withSuccessHandler(function (res) {
          restoreBtn();
          if (res && res.status === 'success') {
            showToast('Alokasi JTM pengganti tersimpan.', 'success');
            if (inputEl) inputEl.value = '';
            if (selEl) selEl.value = '';
            var _panel    = document.getElementById('jtmExamAllocPanel-' + sid);
            var _remainEl = document.getElementById('jtmExamRemainDisp-' + sid);
            var _newRemaining = Number(res.remaining_difference);
            if (isNaN(_newRemaining)) _newRemaining = 0;
            if (_remainEl) _remainEl.textContent = _newRemaining;
            if (_panel) {
              _panel.dataset.remaining = _newRemaining;
              if (_newRemaining > 0) _panel.classList.remove('hidden');
              else _panel.classList.add('hidden');
            }
            _examJtmRenderAllocList(supervisorId, res.allocations || []);
            _examJtmEnsureTeachers(function () {
              _examJtmPopulateAllocSelect(sid, _panel ? _panel.dataset.originalUid : '');
            });
          } else {
            showToast((res && res.message) || 'Gagal menyimpan alokasi JTM.', 'error');
          }
        })
        .withFailureHandler(function (err) {
          restoreBtn();
          showToast('Koneksi gagal: ' + err, 'error');
        })
        .reallocateJtmDifference(token, payload);
    }
    function removeExamJtmAllocation(supervisorId, reallocationId, btnEl) {
      var sid = _jtmSid(supervisorId);
      var token = localStorage.getItem('auth_token');
      var restoreBtn = _busyButton(btnEl, 'Menghapus...');
      google.script.run
        .withSuccessHandler(function (res) {
          restoreBtn();
          if (res && res.status === 'success') {
            showToast('Alokasi JTM dihapus.', 'success');
            var panel = document.getElementById('jtmExamAllocPanel-' + sid);
            var removedJtm = 0;
            if (btnEl) {
              var rowEl = btnEl.closest
                ? btnEl.closest('[data-realloc-id]')
                : (function () {
                  var el = btnEl;
                  while (el && !el.dataset.reallocId) el = el.parentElement;
                  return el;
                })();
              if (rowEl) {
                removedJtm = Number(rowEl.dataset.allocJtm) || 0;
                rowEl.parentNode && rowEl.parentNode.removeChild(rowEl);
              }
            }
            var remainEl = document.getElementById('jtmExamRemainDisp-' + sid);
            var currentRemaining = panel ? Number(panel.dataset.remaining || 0) : 0;
            var newRemaining = currentRemaining + removedJtm;
            if (remainEl) remainEl.textContent = newRemaining;
            if (panel) {
              panel.dataset.remaining = newRemaining;
              if (newRemaining > 0) panel.classList.remove('hidden');
            }
          } else {
            showToast((res && res.message) || 'Gagal menghapus alokasi JTM.', 'error');
          }
        })
        .withFailureHandler(function (err) {
          restoreBtn();
          showToast('Koneksi gagal: ' + err, 'error');
        })
        .removeReallocation(token, reallocationId);
    }
    function cancelExamJtmAdjustment(supervisorId, btnEl) {
      showConfirm(
        'Batalkan Penyesuaian JTM Ujian',
        'Apakah Anda yakin? Semua penyesuaian dan alokasi pengganti sebagian untuk pengawas ini akan dihapus, dan JTM akan kembali ke nilai terjadwal.',
        function () {
          var sid = _jtmSid(supervisorId);
          var token = localStorage.getItem('auth_token');
          var restoreBtn = btnEl ? _busyButton(btnEl, 'Membatalkan...') : function () {};
          google.script.run
            .withSuccessHandler(function (res) {
              restoreBtn();
              if (res && res.status === 'success') {
                showToast(res.message || 'Penyesuaian JTM ujian dibatalkan.', 'success');
                var inputEl    = document.getElementById('jtmExamAdjInput-'    + sid);
                var schedEl    = document.getElementById('jtmExamSchedDisp-'   + sid);
                var adjEl      = document.getElementById('jtmExamAdjDisp-'     + sid);
                var diffEl     = document.getElementById('jtmExamDiffDisp-'    + sid);
                var reasonEl   = document.getElementById('jtmExamReason-'      + sid);
                var allocPanel = document.getElementById('jtmExamAllocPanel-'  + sid);
                var allocList  = document.getElementById('jtmExamAllocList-'   + sid);
                var cancelBtn  = document.getElementById('jtmExamCancelBtn-'   + sid);
                var remainEl   = document.getElementById('jtmExamRemainDisp-'  + sid);
                var sched = inputEl ? Number(inputEl.dataset.scheduled || inputEl.getAttribute('max') || 0) : 0;
                if (schedEl)  schedEl.textContent  = sched;
                if (adjEl)    adjEl.textContent    = sched;
                if (diffEl)   diffEl.textContent   = 0;
                if (inputEl)  { inputEl.value = sched; }
                if (reasonEl) reasonEl.value = '';
                var reasonWrap = document.getElementById('jtmExamReasonWrap-' + sid);
                if (reasonWrap)  reasonWrap.classList.add('hidden');
                if (allocPanel) { allocPanel.classList.add('hidden'); allocPanel.dataset.remaining = 0; }
                if (allocList)  allocList.innerHTML = '';
                if (remainEl)   remainEl.textContent = 0;
                if (cancelBtn)  cancelBtn.classList.add('hidden');
              } else {
                showToast((res && res.message) || 'Gagal membatalkan penyesuaian JTM.', 'error');
              }
            })
            .withFailureHandler(function (err) {
              restoreBtn();
              showToast('Koneksi gagal: ' + err, 'error');
            })
            .resetOccurrenceJtm(token, { occurrence_type: 'EXAM', occurrence_ref: supervisorId });
        },
        { type: 'danger' }
      );
    }
    window.gExam_picketConfirmSup = function (supId, btnEl) {
      var token = localStorage.getItem('auth_token');
      var restoreBtn = btnEl ? _busyButton(btnEl, 'Mengonfirmasi...') : function () {};
      if (typeof window.exam_showLoading === 'function') {
        window.exam_showLoading('Mengonfirmasi kehadiran pengawas...');
      }
      google.script.run
        .withSuccessHandler(function (res) {
          restoreBtn();
          if (typeof window.exam_hideLoading === 'function') {
            window.exam_hideLoading();
          }
          if (res.status === 'success') { showToast(res.message); loadExamPanitiaPanel(); }
          else showToast(res.message, 'error');
        })
        .withFailureHandler(function () {
          restoreBtn();
          if (typeof window.exam_hideLoading === 'function') {
            window.exam_hideLoading();
          }
          showToast('Koneksi gagal', 'error');
        })
        .confirmSupervisorAttendance(token, supId);
    };
    window.gExam_picketRevokeSup = function (supId, btnEl) {
      showConfirm('Cabut Konfirmasi Pengawas',
        'Jika BAP sudah disubmit, BAP akan terkunci dan JTM dihapus dari honorarium. Lanjutkan?',
        function () {
          var token = localStorage.getItem('auth_token');
          var restoreBtn = btnEl ? _busyButton(btnEl, 'Memproses...') : function () {};
          if (typeof window.exam_showLoading === 'function') {
            window.exam_showLoading('Memproses permintaan...');
          }
          google.script.run
            .withSuccessHandler(function (res) {
              restoreBtn();
              if (typeof window.exam_hideLoading === 'function') {
                window.exam_hideLoading();
              }
              if (res.status === 'confirm_required') {
                showConfirm('⚠️ BAP Sudah Disubmit', res.message, function () {
                  if (typeof window.exam_showLoading === 'function') {
                    window.exam_showLoading('Mencabut konfirmasi pengawas...');
                  }
                  google.script.run
                    .withSuccessHandler(function (r2) {
                      if (typeof window.exam_hideLoading === 'function') {
                        window.exam_hideLoading();
                      }
                      if (r2.status === 'success') { showToast(r2.message); loadExamPanitiaPanel(); }
                      else showToast(r2.message, 'error');
                    })
                    .withFailureHandler(function () {
                      if (typeof window.exam_hideLoading === 'function') {
                        window.exam_hideLoading();
                      }
                      showToast('Koneksi gagal', 'error');
                    })
                    .revokeSupervisorAttendance(token, supId, true);
                });
              } else if (res.status === 'success') {
                showToast(res.message); loadExamPanitiaPanel();
              } else { showToast(res.message, 'error'); }
            })
            .withFailureHandler(function () {
              restoreBtn();
              if (typeof window.exam_hideLoading === 'function') {
                window.exam_hideLoading();
              }
              showToast('Koneksi gagal', 'error');
            })
            .revokeSupervisorAttendance(token, supId, false);
        }
      );
    };
    window.gExam_picketOpenSubst = function (supId, guruName) {
      var modal = document.getElementById('panitiSubstModal');
      if (!modal) {
        showToast('Modal tidak tersedia. Coba muat ulang halaman.', 'error');
        return;
      }
      var idInp = document.getElementById('inpPanitiaSubstId');
      if (idInp) idInp.value = supId;
      var infoEl = document.getElementById('panitiSubstInfo');
      if (infoEl) {
        infoEl.innerHTML = '<div class="flex items-start gap-2">'
          + '<svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>'
          + '<div><div class="font-bold mb-0.5">Menggantikan: ' + escapeHtml(guruName || 'Pengawas') + '</div>'
          + '<div class="text-amber-600">Pilih guru yang akan menggantikan pengawas ini.</div></div>'
          + '</div>';
      }
      var searchInp = document.getElementById('inpPanitiaSubstSearch');
      if (searchInp) searchInp.value = '';
      var sel = document.getElementById('inpPanitiaSubstTeacher');
      if (sel) {
        sel.innerHTML = '<option value="" disabled selected>Memuat daftar guru...</option>';
      }
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      setTimeout(function () {
        if (searchInp) searchInp.focus();
      }, 150);
      _examJtmEnsureTeachers(function () {
        if (!sel) return;
        var teachers = (allTeachersCache || []).slice().sort(function (a, b) {
          return (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '');
        });
        sel.innerHTML = '<option value="">-- Pilih Guru Pengganti --</option>';
        teachers.forEach(function (u) {
          var opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = u.full_name || u.username || u.id;
          sel.appendChild(opt);
        });
        if (!teachers.length) {
          sel.innerHTML = '<option value="" disabled>Tidak ada guru tersedia</option>';
        }
      });
    };
    window.panitia_closeSubstModal = function () {
      var modal = document.getElementById('panitiSubstModal');
      if (modal) modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    };
    window.panitia_filterSubstTeacher = function (query) {
      var sel = document.getElementById('inpPanitiaSubstTeacher');
      if (!sel) return;
      var q = (query || '').toLowerCase().trim();
      for (var i = 0; i < sel.options.length; i++) {
        var opt = sel.options[i];
        if (!opt.value) { opt.style.display = ''; opt.disabled = false; continue; }
        var hidden = !!(q && opt.textContent.toLowerCase().indexOf(q) === -1);
        opt.style.display = hidden ? 'none' : '';
        opt.disabled = hidden;
      }
    };
    window.panitia_saveSubst = function () {
      var supId = (document.getElementById('inpPanitiaSubstId') || {}).value;
      var newUserId = (document.getElementById('inpPanitiaSubstTeacher') || {}).value;
      if (!supId) { showToast('ID pengawas tidak ditemukan.', 'error'); return; }
      if (!newUserId) { showToast('Pilih guru pengganti terlebih dahulu.', 'warning'); return; }
      var btn = document.getElementById('btnSavePanitiaSubst');
      var origHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg style="width:14px;height:14px;animation:spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Memproses...';
      }
      var token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler(function (res) {
          if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
          if (res && res.status === 'success') {
            panitia_closeSubstModal();
            showToast(res.message || 'Pengawas berhasil diganti.');
            loadExamPanitiaPanel();
          } else {
            showToast((res && res.message) || 'Gagal memproses penggantian.', 'error');
          }
        })
        .withFailureHandler(function (err) {
          if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
          showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
        })
        .substituteExamSupervisor(token, supId, newUserId);
    };
    window.gExam_picketCancelSubst = function (supId, force) {
      if (!force) {
        showConfirm('Batalkan Penggantian', 'Guru asli akan dikembalikan ke jadwal. Lanjutkan?', function () {
          gExam_picketCancelSubst(supId, true);
        });
        return;
      }
      var token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler(function (res) {
          if (res.status === 'confirm_required') {
            showConfirm('⚠️ ' + res.message.split('.')[0], res.message, function () {
              google.script.run
                .withSuccessHandler(function (r2) {
                  if (r2.status === 'success') { showToast(r2.message); loadExamPanitiaPanel(); }
                  else showToast(r2.message, 'error');
                })
                .withFailureHandler(function () { showToast('Koneksi gagal', 'error'); })
                .cancelExamSupervisorSubstitution(token, supId, true);
            });
          } else if (res.status === 'success') {
            showToast(res.message); loadExamPanitiaPanel();
          } else { showToast(res.message, 'error'); }
        })
        .withFailureHandler(function () { showToast('Koneksi gagal', 'error'); })
        .cancelExamSupervisorSubstitution(token, supId, false);
    };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        var modal = document.getElementById('panitiSubstModal');
        if (modal && !modal.classList.contains('hidden')) {
          panitia_closeSubstModal();
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 'NumpadEnter')) {
        var modal = document.getElementById('panitiSubstModal');
        if (modal && !modal.classList.contains('hidden')) {
          e.preventDefault();
          panitia_saveSubst();
        }
      }
    });
    