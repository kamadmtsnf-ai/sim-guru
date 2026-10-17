function _gExamToday() {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function _gExamNowTime() {
      var d = new Date();
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    function _gExamFmtDate(s) {
      if (!s) return '—';
      try { return formatDateID(new Date(s + 'T00:00:00')); } catch (e) { return s; }
    }
    function _gExamEsc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function checkExamBannerForDashboard() {
      var token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler(function (res) {
          if (!res) return;
          if (res.is_exam_period) {
            renderExamDashboardCard(res);
            hideTeachingCardsDuringExam();
          } else {
            var examPanel = document.getElementById('panelExamDashboard');
            if (examPanel) examPanel.classList.add('hidden');
            showTeachingCards();
          }
        })
        .withFailureHandler(function () { })
        .getExamPageData(token);
    }
    function hideTeachingCardsDuringExam() {
      var panelJurnal = document.getElementById('panelJurnalHariIni');
      var panelJadwal = document.getElementById('panelJadwalMengajarHariIni');
      if (panelJurnal) panelJurnal.classList.add('hidden');
      if (panelJadwal) panelJadwal.classList.add('hidden');
    }
    function showTeachingCards() {
      var panelJurnal = document.getElementById('panelJurnalHariIni');
      var panelJadwal = document.getElementById('panelJadwalMengajarHariIni');
      if (panelJurnal) panelJurnal.classList.remove('hidden');
      if (panelJadwal) panelJadwal.classList.remove('hidden');
    }
    function renderExamDashboardCard(data) {
      var panel = document.getElementById('panelExamDashboard');
      if (!panel) return;
      var today = _gExamToday();
      var nowTime = _gExamNowTime();
      var period = data.period || {};
      var supDuties = data.supervisor_duties || [];
      var comDuties = data.committee_duties || [];
      if (!supDuties.length && !comDuties.length) {
        panel.innerHTML =
          '<div class="bg-gradient-to-r from-sky-50 to-blue-50 border border-blue-200 rounded-2xl p-4 md:p-5 flex items-start gap-3 md:gap-4 shadow-sm">'
          + '<div class="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-base md:text-lg">🎉</div>'
          + '<div class="flex-1 min-w-0"><p class="font-bold text-blue-800 text-sm md:text-base">Periode Ujian Aktif — ' + _gExamEsc(period.name) + '</p>'
          + '<p class="text-blue-600 text-xs md:text-sm mt-0.5 md:mt-1">Anda tidak memiliki tugas pada hari ini. Selamat berlibur!</p></div></div>';
        panel.classList.remove('hidden');
        return;
      }
      var html = '<div class="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">'
        + '<div class="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 md:px-5 py-3 md:py-4">'
        + '<div class="flex items-center gap-2 md:gap-3">'
        + '<div class="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">'
        + '<svg class="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>'
        + '</div>'
        + '<div class="flex-1 min-w-0"><p class="text-white font-bold text-sm md:text-base">Tugas Ujian Hari Ini</p>'
        + '<p class="text-blue-100 text-xs md:text-sm truncate">' + _gExamEsc(period.name) + '</p></div>'
        + '</div></div>';
      supDuties.forEach(function (d) {
        var isConf = !!(d.confirmed_by && d.confirmed_by.trim());
        var hasBap = d.has_bap;
        var bapReady = isConf && nowTime >= d.bap_active_time;
        var isToday = d.date === today;
        var periodOver = today > period.date_end;
        html += '<div class="px-4 md:px-5 py-3 md:py-4 border-t border-slate-100">'
          + '<div class="flex flex-col md:flex-row md:items-start justify-between gap-3">'
          + '<div class="flex-1 min-w-0">'
          + '<div class="flex items-center gap-2 mb-2">'
          + '<span class="inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-lg bg-indigo-100 text-indigo-600 text-xs md:text-sm">📋</span>'
          + '<p class="text-xs md:text-sm font-bold text-indigo-600 uppercase tracking-wider">Pengawas Ruang Ujian</p>'
          + '</div>'
          + '<p class="text-slate-800 font-bold text-sm md:text-base mb-1">' + _gExamEsc(d.session_name) + '</p>'
          + '<p class="text-slate-500 text-xs md:text-sm mb-1"><span class="font-mono">' + d.time_start + '–' + d.time_end + '</span>'
          + ' · 🚪 ' + _gExamEsc(d.room_name) + '</p>'
          + '<p class="text-slate-500 text-xs md:text-sm">' + _gExamEsc(d.subject) + ' · Kelas ' + _gExamEsc(d.class_name) + '</p>'
          + '<div class="flex flex-wrap items-center gap-2 mt-2">'
          + '<span class="inline-flex items-center gap-1 text-xs md:text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">JTM: <strong class="font-bold">' + d.jtm_val + '</strong></span>'
          + (d.is_substitute ? '<span class="inline-flex items-center gap-1 text-xs md:text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">🔄 Pengganti</span>' : '')
          + '</div></div>';
        html += '<div class="flex flex-col gap-2 md:w-auto w-full">';
        if (!isConf) {
          html += '<div class="flex flex-col gap-2">'
            + '<span class="inline-flex items-center justify-center gap-1.5 text-xs md:text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 md:py-1.5 rounded-xl">'
            + '<span class="w-2 h-2 rounded-full bg-slate-400"></span>Menunggu Konfirmasi</span>'
            + '<p class="text-xs text-slate-500 text-center md:text-right">Menunggu konfirmasi panitia</p>'
            + '</div>';
        } else if (hasBap) {
          html += '<div class="flex flex-col gap-2">'
            + '<span class="inline-flex items-center justify-center gap-1.5 text-xs md:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 md:py-1.5 rounded-xl">'
            + '✓ BAP Terkirim</span>';
          if (!periodOver) {
            html += '<button onclick="gExam_openBapModal(\'' + d.supervisor_id + '\', true)" '
              + 'class="text-xs md:text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2 md:py-1.5 rounded-xl hover:bg-blue-100 transition active:scale-95">Lihat / Edit BAP</button>';
          }
          html += '</div>';
        } else if (!bapReady && isToday) {
          html += '<div class="flex flex-col gap-2">'
            + '<span class="inline-flex items-center justify-center gap-1.5 text-xs md:text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 md:py-1.5 rounded-xl">'
            + '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>Hadir — Menunggu Selesai</span>'
            + '<button disabled title="BAP aktif mulai pukul ' + d.bap_active_time + '" '
            + 'class="text-xs md:text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-3 py-2 md:py-1.5 rounded-xl cursor-not-allowed">'
            + 'Isi BAP (aktif ' + d.bap_active_time + ')</button>'
            + '</div>';
        } else {
          html += '<div class="flex flex-col gap-2">'
            + '<span class="inline-flex items-center justify-center gap-1.5 text-xs md:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 md:py-1.5 rounded-xl">'
            + '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>Hadir — Dikonfirmasi</span>'
            + '<button onclick="gExam_openBapModal(\'' + d.supervisor_id + '\', false)" '
            + 'class="text-xs md:text-sm font-bold text-white bg-blue-600 border border-blue-600 px-3 py-2 md:py-1.5 rounded-xl hover:bg-blue-700 active:scale-95 transition shadow-sm flex items-center justify-center gap-1">'
            + '<svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
            + 'Isi BAP</button>'
            + '</div>';
        }
        html += '</div></div></div>';
      });
      comDuties.forEach(function (d) {
        var isConf = !!(d.confirmed_by && d.confirmed_by.trim());
        html += '<div class="px-4 md:px-5 py-3 md:py-4 border-t border-slate-100">'
          + '<div class="flex flex-col md:flex-row md:items-center justify-between gap-3">'
          + '<div class="flex-1 min-w-0">'
          + '<div class="flex items-center gap-2 mb-2">'
          + '<span class="inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-lg bg-cyan-100 text-cyan-600 text-xs md:text-sm">👥</span>'
          + '<p class="text-xs md:text-sm font-bold text-cyan-600 uppercase tracking-wider">Panitia Ujian</p>'
          + '</div>'
          + '<p class="text-slate-800 font-bold text-sm md:text-base mb-1">Panitia Ujian</p>'
          + '<div class="flex flex-wrap items-center gap-2">'
          + '<span class="inline-flex items-center gap-1 text-xs md:text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">JTM: <strong class="font-bold">' + d.jtm_val + '</strong></span>'
          + '<span class="text-slate-500 text-xs md:text-sm">' + _gExamFmtDate(d.date) + '</span>'
          + (d.is_substitute ? '<span class="inline-flex items-center gap-1 text-xs md:text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">🔄 Pengganti</span>' : '')
          + '</div></div>'
          + '<div class="md:w-auto w-full">';
        if (isConf) {
          html += '<span class="inline-flex items-center justify-center gap-1.5 text-xs md:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 md:py-1.5 rounded-xl w-full md:w-auto">'
            + '✓ Dikonfirmasi — JTM Terhitung</span>';
        } else {
          html += '<span class="inline-flex items-center justify-center gap-1.5 text-xs md:text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 md:py-1.5 rounded-xl w-full md:w-auto">'
            + '<span class="w-2 h-2 rounded-full bg-amber-500"></span>Menunggu Konfirmasi</span>';
        }
        html += '</div></div></div>';
      });
      html += '</div>';
      panel.innerHTML = html;
      panel.classList.remove('hidden');
      setTimeout(function () {
        var cards = panel.querySelectorAll('[class*="border-t"]');
        cards.forEach(function (card, index) {
          if (index > 0) {
            card.classList.add('mt-1');
          }
        });
        var buttons = panel.querySelectorAll('button:not([disabled])');
        buttons.forEach(function (btn) {
          btn.style.minHeight = '44px'; // Ukuran minimum untuk touch target (Apple Human Interface Guidelines)
          btn.style.minWidth = '44px';
        });
      }, 50);
    }
    window.gExam_openBapModal = function (supId, isEdit) {
      var token = localStorage.getItem('auth_token');
      document.getElementById('inpBapSupervisorId').value = supId;
      document.getElementById('examBapInfoDate').textContent = '…';
      document.getElementById('examBapInfoSession').textContent = '…';
      document.getElementById('examBapInfoRoom').textContent = '…';
      document.getElementById('examBapInfoSubject').textContent = '…';
      document.getElementById('inpBapHadir').value = '';
      document.getElementById('inpBapAbsen').value = '';
      document.getElementById('inpBapCatatan').value = '';
      document.getElementById('examBapReadOnlyMsg').classList.add('hidden');
      var statusBadge = document.getElementById('examBapStatusBadge');
      if (statusBadge) statusBadge.classList.add('hidden');
      var actEl = document.getElementById('examBapActions');
      if (actEl) {
        actEl.innerHTML =
          '<button type="button" onclick="gExam_closeBapModal()" class="flex-1 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 rounded-xl font-semibold text-sm transition">Tutup</button>' +
          '<button type="button" onclick="gExam_submitBap()" id="btnSubmitBap" class="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition shadow-md flex items-center justify-center gap-2">' +
          _bapBtnLabel(isEdit) +
          '</button>';
      }
      if (typeof updateBapCatatanCounter === 'function') updateBapCatatanCounter();
      if (typeof updateBapTotalIndicator === 'function') updateBapTotalIndicator();
      var skeleton = document.getElementById('examBapSkeleton');
      var content = document.getElementById('examBapContent');
      if (skeleton) skeleton.classList.remove('hidden');
      if (content) content.classList.add('hidden');
      document.getElementById('examBapModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      setTimeout(function () {
        var textarea = document.getElementById('inpBapCatatan');
        var modalBody = document.querySelector('#examBapModal .overflow-y-auto');
        if (textarea && modalBody) {
          var handleFocus = function () {
            setTimeout(function () {
              textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
              var textareaRect = textarea.getBoundingClientRect();
              var modalBodyRect = modalBody.getBoundingClientRect();
              if (textareaRect.bottom > modalBodyRect.bottom - 100) {
                modalBody.scrollTop += (textareaRect.bottom - modalBodyRect.bottom + 120);
              }
            }, 300); // Delay untuk menunggu keyboard muncul
          };
          textarea.addEventListener('focus', handleFocus);
          var originalClose = window.gExam_closeBapModal;
          window.gExam_closeBapModal = function () {
            if (textarea && handleFocus) {
              textarea.removeEventListener('focus', handleFocus);
            }
            window.gExam_closeBapModal = originalClose;
            originalClose();
          };
        }
      }, 100);
      google.script.run
        .withSuccessHandler(function (res) {
          if (!res || res.status !== 'success') {
            if (window._gExamLastPageData) {
              return _gExam_fillBapFromPageData(window._gExamLastPageData, supId, isEdit);
            }
            google.script.run.withSuccessHandler(function (d) {
              window._gExamLastPageData = d;
              _gExam_fillBapFromPageData(d, supId, isEdit);
            }).withFailureHandler(function () {
              showToast('Gagal memuat detail BAP.', 'error');
            }).getExamPageData(token);
            return;
          }
          _gExam_fillBapFromDetail(res, isEdit);
        })
        .withFailureHandler(function (err) {
          if (window._gExamLastPageData) {
            return _gExam_fillBapFromPageData(window._gExamLastPageData, supId, isEdit);
          }
          google.script.run.withSuccessHandler(function (d) {
            window._gExamLastPageData = d;
            _gExam_fillBapFromPageData(d, supId, isEdit);
          }).withFailureHandler(function () { }).getExamPageData(token);
        })
        .getSupervisorBapDetail(token, supId);
      setTimeout(function () {
        var fld = document.getElementById('inpBapHadir');
        if (fld && !fld.disabled) try { fld.focus(); fld.select(); } catch (_) { }
      }, 220);
    };
    function _gExam_fillBapFromDetail(d, isEdit) {
      document.getElementById('examBapInfoDate').textContent = _gExamFmtDate(d.date);
      document.getElementById('examBapInfoSession').textContent = d.session_name + ' ' + d.time_start + '–' + d.time_end;
      document.getElementById('examBapInfoRoom').textContent = d.room_name;
      document.getElementById('examBapInfoSubject').textContent = d.subject + (d.class_name ? ' / Kelas ' + d.class_name : '');
      document.getElementById('examBapModalTitle').textContent = isEdit ? 'Lihat / Edit BAP' : 'Isi BAP Pengawas Ujian';
      document.getElementById('examBapModalSub').textContent = isEdit ? 'Perbarui Berita Acara Pelaksanaan' : 'Berita Acara Pelaksanaan';
      var statusBadge = document.getElementById('examBapStatusBadge');
      var statusLabel = document.getElementById('examBapStatusBadgeLabel');
      var statusDot = document.getElementById('examBapStatusBadgeDot');
      if (statusBadge && statusLabel && statusDot) {
        if (d.is_substitute) {
          statusLabel.textContent = 'Pengganti';
          statusDot.style.background = '#FCD34D';
          statusBadge.classList.remove('hidden');
        } else if (d.has_bap) {
          statusLabel.textContent = 'BAP Tersimpan';
          statusDot.style.background = '#34D399';
          statusBadge.classList.remove('hidden');
        } else {
          statusBadge.classList.add('hidden');
        }
      }
      var inputs = ['inpBapHadir', 'inpBapAbsen', 'inpBapCatatan'];
      var readOnly = !!(d.period_over || d.is_cancelled);
      if (isEdit && d.bap) {
        document.getElementById('inpBapHadir').value = d.bap.peserta_hadir;
        document.getElementById('inpBapAbsen').value = d.bap.peserta_absen;
        document.getElementById('inpBapCatatan').value = d.bap.catatan || '';
      }
      if (typeof updateBapCatatanCounter === 'function') updateBapCatatanCounter();
      if (typeof updateBapTotalIndicator === 'function') updateBapTotalIndicator();
      if (readOnly) {
        inputs.forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.setAttribute('readonly', ''); el.setAttribute('disabled', '');
          el.classList.add('bg-slate-50');
        });
        var msg = document.getElementById('examBapReadOnlyMsg');
        var msgText = document.getElementById('examBapReadOnlyMsgText');
        if (msg && msgText) {
          msgText.textContent = d.period_over ? 'Periode ujian sudah selesai. BAP tidak dapat diubah.'
            : 'Substitusi Anda pada jadwal ini telah dibatalkan.';
          msg.classList.remove('hidden');
        }
        var actEl = document.getElementById('examBapActions');
        if (actEl) actEl.innerHTML = '<button type="button" onclick="gExam_closeBapModal()" class="w-full py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 rounded-xl font-semibold text-sm transition">Tutup</button>';
      } else {
        inputs.forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.removeAttribute('readonly'); el.removeAttribute('disabled');
          el.classList.remove('bg-slate-50');
        });
        var btn = document.getElementById('btnSubmitBap');
        if (btn) {
          btn.classList.remove('hidden');
          btn.dataset.editMode = isEdit ? '1' : '0';
          btn.innerHTML = _bapBtnLabel(isEdit);
        }
        var msg2 = document.getElementById('examBapReadOnlyMsg');
        if (msg2) msg2.classList.add('hidden');
      }
      var skeleton = document.getElementById('examBapSkeleton');
      var content = document.getElementById('examBapContent');
      if (skeleton) skeleton.classList.add('hidden');
      if (content) content.classList.remove('hidden');
    }
    function _gExam_fillBapFromPageData(res, supId, isEdit) {
      if (!res || !res.is_exam_period) return;
      var sup = null;
      (res.supervisor_duties || []).forEach(function (d) { if (d.supervisor_id === supId) sup = d; });
      if (!sup) return;
      var detailLike = {
        session_name: sup.session_name, date: sup.date,
        time_start: sup.time_start, time_end: sup.time_end,
        room_name: sup.room_name, subject: sup.subject, class_name: sup.class_name,
        is_substitute: !!sup.is_substitute, has_bap: !!sup.has_bap, bap: sup.bap || null,
        is_cancelled: sup.status === 'cancelled',
        period_over: _gExamToday() > (res.period || {}).date_end
      };
      _gExam_fillBapFromDetail(detailLike, isEdit);
    }
    window.gExam_closeBapModal = function () {
      document.getElementById('examBapModal').classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    };
    function updateBapCatatanCounter() {
      var el = document.getElementById('inpBapCatatan');
      var counter = document.getElementById('bapCatatanCounter');
      if (!el || !counter) return;
      var len = (el.value || '').length;
      counter.innerText = len + '/300';
      counter.style.color = len > 270 ? '#DC2626' : (len > 220 ? '#D97706' : '#94A3B8');
    }
    function updateBapTotalIndicator() {
      var inpH = document.getElementById('inpBapHadir');
      var inpA = document.getElementById('inpBapAbsen');
      var indicator = document.getElementById('bapTotalIndicator');
      var totalEl = document.getElementById('bapTotalCount');
      var rateEl = document.getElementById('bapAttendanceRate');
      var hadirBar = document.getElementById('bapHadirBar');
      var absenBar = document.getElementById('bapAbsenBar');
      if (!inpH || !inpA || !indicator || !totalEl) return;
      var h = parseInt(inpH.value || '0', 10) || 0;
      var a = parseInt(inpA.value || '0', 10) || 0;
      var total = h + a;
      if (total > 0) {
        indicator.classList.remove('hidden');
        totalEl.innerText = total;
        var hPct = Math.round((h / total) * 100);
        var aPct = 100 - hPct;
        if (rateEl) rateEl.textContent = hPct + '%';
        if (hadirBar) hadirBar.style.width = hPct + '%';
        if (absenBar) absenBar.style.width = aPct + '%';
      } else {
        indicator.classList.add('hidden');
      }
    }
    function _bapBtnLabel(isEdit) {
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> ' + (isEdit ? 'Perbarui BAP' : 'Submit BAP');
    }
    window.gExam_submitBap = function () {
      var token = localStorage.getItem('auth_token');
      var supId = document.getElementById('inpBapSupervisorId').value;
      var hadir = document.getElementById('inpBapHadir').value;
      var absen = document.getElementById('inpBapAbsen').value;
      var cat = document.getElementById('inpBapCatatan').value.trim();
      if (hadir === '' || absen === '' || isNaN(Number(hadir)) || isNaN(Number(absen))) {
        showToast('Jumlah peserta hadir dan tidak hadir wajib diisi', 'error');
        return;
      }
      if (Number(hadir) < 0 || Number(absen) < 0) {
        showToast('Jumlah peserta tidak boleh negatif', 'error');
        return;
      }
      var btn = document.getElementById('btnSubmitBap');
      var isEdit = btn && btn.dataset && btn.dataset.editMode === '1';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Menyimpan...';
      }
      if (typeof window.exam_showLoading === 'function') {
        window.exam_showLoading(isEdit ? 'Menyimpan perubahan BAP...' : 'Mengirim BAP...');
      }
      var bapData = { peserta_hadir: Number(hadir), peserta_absen: Number(absen), catatan: cat };
      var fn = isEdit ? 'editExamBAP' : 'submitExamBAP';
      google.script.run
        .withSuccessHandler(function (res) {
          if (typeof window.exam_hideLoading === 'function') {
            window.exam_hideLoading();
          }
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = _bapBtnLabel(isEdit);
          }
          if (res.status === 'success') {
            showToast(res.message);
            gExam_closeBapModal();
            if (typeof refreshGuruDashboardCards === 'function') refreshGuruDashboardCards();
            if (typeof checkExamBannerForDashboard === 'function') checkExamBannerForDashboard();
            if (typeof checkExamForMySchedule === 'function' && document.getElementById('panelExamMySchedule')) checkExamForMySchedule();
          } else {
            showToast(res.message, 'error');
          }
        })
        .withFailureHandler(function (err) {
          if (typeof window.exam_hideLoading === 'function') {
            window.exam_hideLoading();
          }
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = _bapBtnLabel(isEdit);
          }
          showToast('Koneksi gagal: ' + err, 'error');
        })
      [fn](token, supId, bapData);
    };
    function checkExamForMySchedule() {
      var token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler(function (res) {
          if (!res || !res.is_exam_period) {
            document.getElementById('panelExamMySchedule') &&
              document.getElementById('panelExamMySchedule').classList.add('hidden');
            return;
          }
          renderExamMyScheduleSection(res);
        })
        .withFailureHandler(function () { })
        .getExamPageData(token);
    }
    function renderExamMyScheduleSection(data) {
      var panel = document.getElementById('panelExamMySchedule');
      if (!panel) return;
      var today = _gExamToday();
      var nowTime = _gExamNowTime();
      var period = data.period || {};
      var supDuties = data.supervisor_duties || [];
      var comDuties = data.committee_duties || [];
      var periodOver = today > period.date_end;
      var html = '<div class="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-5 shadow-md overflow-hidden relative mb-1">'
        + '<div class="absolute inset-0 opacity-10" style="background-image:radial-gradient(circle at 70% 50%,white 1px,transparent 1px); background-size:20px 20px;"></div>'
        + '<div class="relative z-10 flex items-start gap-4 flex-wrap">'
        + '<div class="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-2xl">🎓</div>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="text-blue-100 text-xs font-semibold uppercase tracking-wider">Periode Ujian Aktif</p>'
        + '<h3 class="text-white font-extrabold text-base leading-tight mt-0.5">' + _gExamEsc(period.name) + '</h3>'
        + '<p class="text-blue-200 text-xs mt-1">' + _gExamFmtDate(period.date_start) + ' — ' + _gExamFmtDate(period.date_end)
        + ' &nbsp;·&nbsp; Jadwal mengajar reguler tidak berlaku selama periode ini.</p>'
        + '</div></div></div>';
      if (!supDuties.length && !comDuties.length) {
        html += '<div class="bg-sky-50 border border-sky-200 rounded-2xl p-5 text-center shadow-sm">'
          + '<p class="text-4xl mb-3">🌟</p>'
          + '<p class="text-slate-700 font-bold text-sm">Anda tidak memiliki tugas pada periode ujian ini</p>'
          + '<p class="text-slate-500 text-xs mt-1">Hari ini adalah hari libur selama periode ujian berlangsung.</p>'
          + '</div>';
        panel.innerHTML = html;
        panel.classList.remove('hidden');
        var grid = panel.nextElementSibling;
        if (grid) grid.classList.add('hidden');
        return;
      }
      if (supDuties.length) {
        html += '<div class="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">'
          + '<div class="px-4 md:px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">'
          + '<svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>'
          + '<span class="text-xs font-bold text-indigo-700 uppercase tracking-wider">Jadwal Pengawasan Ujian</span>'
          + '</div>';
        supDuties.forEach(function (d) {
          var isConf = !!(d.confirmed_by && d.confirmed_by.trim());
          var hasBap = d.has_bap;
          var bapReady = isConf && nowTime >= d.bap_active_time;
          var isToday = d.date === today;
          var statusHtml;
          if (!isConf) {
            statusHtml = '<span class="inline-flex items-center text-[11px] md:text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 md:px-2.5 py-1 rounded-full font-semibold">⏳ Menunggu Konfirmasi</span>';
          } else if (hasBap) {
            statusHtml = '<span class="inline-flex items-center text-[11px] md:text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 md:px-2.5 py-1 rounded-full font-semibold">✓ BAP Terkirim</span>';
          } else if (isToday && !bapReady) {
            statusHtml = '<span class="inline-flex items-center text-[11px] md:text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 md:px-2.5 py-1 rounded-full font-semibold">✓ Hadir — BAP ' + d.bap_active_time + '</span>';
          } else {
            statusHtml = '<span class="inline-flex items-center text-[11px] md:text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 md:px-2.5 py-1 rounded-full font-semibold">✓ Siap Isi BAP</span>';
          }
          html += '<div class="px-4 md:px-5 py-4 border-t border-slate-100">'
            + '<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">'
            + '<div class="flex-1 min-w-0">'
            + '<div class="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2">'
            + '<span class="inline-flex items-center text-[11px] md:text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">' + d.time_start + '–' + d.time_end + '</span>'
            + '<span class="text-xs md:text-sm font-bold text-slate-800">' + _gExamEsc(d.session_name) + '</span>'
            + (d.is_substitute ? '<span class="inline-flex items-center text-[10px] md:text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-1.5 md:px-2 py-0.5 rounded-full shrink-0">Pengganti</span>' : '')
            + '</div>'
            + '<div class="space-y-1">'
            + '<p class="text-[11px] md:text-xs text-slate-500 flex items-center gap-1">'
            + '<span class="shrink-0">🚪</span>'
            + '<strong class="font-semibold">' + _gExamEsc(d.room_name) + '</strong>'
            + '</p>'
            + '<p class="text-[11px] md:text-xs text-slate-500">'
            + _gExamEsc(d.subject) + ' · Kelas ' + _gExamEsc(d.class_name)
            + '</p>'
            + '<p class="text-[11px] md:text-xs text-slate-400">'
            + '<span class="font-semibold text-slate-600">JTM: ' + d.jtm_val + '</span> · ' + _gExamFmtDate(d.date)
            + '</p>'
            + '</div>'
            + '</div>'
            + '<div class="flex flex-col gap-2 md:items-end md:shrink-0">'
            + statusHtml;
          if (isConf && !hasBap && bapReady && !periodOver) {
            html += '<button onclick="gExam_openBapModal(\'' + d.supervisor_id + '\', false)" class="w-full md:w-auto text-xs md:text-sm font-bold text-white bg-blue-600 px-4 py-2.5 md:py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5">'
              + '<svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
              + 'Isi BAP'
              + '</button>';
          } else if (isConf && hasBap && !periodOver) {
            html += '<button onclick="gExam_openBapModal(\'' + d.supervisor_id + '\', true)" class="w-full md:w-auto text-xs md:text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-4 py-2.5 md:py-2 rounded-xl hover:bg-blue-100 active:scale-95 transition flex items-center justify-center gap-1.5">'
              + '<svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>'
              + 'Lihat / Edit BAP'
              + '</button>';
          }
          html += '</div>'
            + '</div>'
            + '</div>';
        });
        html += '</div>';
      }
      if (comDuties.length) {
        html += '<div class="bg-white rounded-2xl border border-cyan-200 shadow-sm overflow-hidden">'
          + '<div class="px-4 md:px-5 py-3 bg-cyan-50 border-b border-cyan-100 flex items-center gap-2">'
          + '<svg class="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
          + '<span class="text-xs font-bold text-cyan-700 uppercase tracking-wider">Jadwal Panitia Ujian</span>'
          + '</div>';
        comDuties.forEach(function (d) {
          var isConf = !!(d.confirmed_by && d.confirmed_by.trim());
          html += '<div class="px-4 md:px-5 py-4 border-t border-slate-100">'
            + '<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3">'
            + '<div class="flex-1 min-w-0">'
            + '<p class="text-sm md:text-base font-bold text-slate-800 mb-1">Panitia Ujian</p>'
            + '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] md:text-xs text-slate-500">'
            + '<span>' + _gExamFmtDate(d.date) + '</span>'
            + '<span class="text-slate-300">·</span>'
            + '<span class="font-semibold text-slate-600">JTM: ' + d.jtm_val + '</span>'
            + (d.is_substitute ? '<span class="text-slate-300">·</span><span class="text-amber-600 font-semibold">Pengganti</span>' : '')
            + '</div>'
            + '</div>'
            + '<div class="shrink-0">'
            + (isConf
              ? '<span class="inline-flex items-center text-[11px] md:text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 md:px-2.5 py-1 rounded-full font-semibold">✓ Dikonfirmasi</span>'
              : '<span class="inline-flex items-center text-[11px] md:text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 md:px-2.5 py-1 rounded-full font-semibold">⏳ Menunggu Konfirmasi</span>')
            + '</div>'
            + '</div>'
            + '</div>';
        });
        html += '</div>';
      }
      panel.innerHTML = html;
      panel.classList.remove('hidden');
      var grid = panel.nextElementSibling;
      if (grid) grid.classList.add('hidden');
    }
    function loadExamPanitiaPanel() {
      var token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler(function (res) {
          if (!res || !res.is_exam_period || !res.is_confirmed_panitia) {
            var p = document.getElementById('panelExamPanitia');
            if (p) p.classList.add('hidden');
            return;
          }
          renderExamPanitiaPanel(res);
        })
        .withFailureHandler(function (err) {
          var skel = document.getElementById('examPanitiaSkeleton');
          if (skel) skel.classList.add('hidden');
          var noAccess = document.getElementById('examPanitiaNoAccess');
          var noAccessTitle = document.getElementById('examPanitiaNoAccessTitle');
          var noAccessMsg = document.getElementById('examPanitiaNoAccessMsg');
          if (noAccess) {
            if (noAccessTitle) noAccessTitle.textContent = 'Koneksi Gagal';
            if (noAccessMsg) noAccessMsg.textContent =
              'Tidak dapat memuat data panitia ujian: ' + (err && err.message ? err.message : 'Coba muat ulang halaman.');
            noAccess.classList.remove('hidden');
          }
        })
        .getExamPageData(token);
    }
    function initExamPanitiaPage() {
      var token = localStorage.getItem('auth_token');
      var skel = document.getElementById('examPanitiaSkeleton');
      var panel = document.getElementById('panelExamPanitia');
      var noAccess = document.getElementById('examPanitiaNoAccess');
      var noAccessTitle = document.getElementById('examPanitiaNoAccessTitle');
      var noAccessMsg = document.getElementById('examPanitiaNoAccessMsg');
      var periodInfo = document.getElementById('examPanitiaPeriodInfo');
      var periodName = document.getElementById('examPanitiaPeriodName');
      var periodRange = document.getElementById('examPanitiaPeriodRange');
      var todayEl = document.getElementById('examPanitiaToday');
      if (skel) skel.classList.remove('hidden');
      if (panel) panel.classList.add('hidden');
      if (noAccess) noAccess.classList.add('hidden');
      if (periodInfo) periodInfo.classList.add('hidden');
      if (todayEl && typeof formatDateID === 'function') {
        try { todayEl.textContent = formatDateID(new Date()); } catch (_) { }
      }
      google.script.run
        .withSuccessHandler(function (res) {
          if (skel) skel.classList.add('hidden');
          if (!res || res.status === 'error') {
            if (noAccess) {
              if (noAccessTitle) noAccessTitle.textContent = 'Gagal Memuat Data';
              if (noAccessMsg) noAccessMsg.textContent = (res && res.message) || 'Tidak dapat memuat data ujian. Coba muat ulang.';
              noAccess.classList.remove('hidden');
            }
            return;
          }
          if (res.is_exam_period && res.period) {
            if (periodInfo) periodInfo.classList.remove('hidden');
            if (periodName) periodName.textContent = res.period.name || '—';
            if (periodRange && typeof formatDateID === 'function') {
              try {
                periodRange.textContent =
                  formatDateID(res.period.date_start) + ' — ' + formatDateID(res.period.date_end);
              } catch (_) {
                periodRange.textContent = res.period.date_start + ' — ' + res.period.date_end;
              }
            }
          }
          if (!res.is_exam_period) {
            if (noAccess) {
              if (noAccessTitle) noAccessTitle.textContent = 'Tidak Ada Periode Ujian Aktif';
              if (noAccessMsg) noAccessMsg.textContent =
                'Saat ini tidak ada periode ujian yang sedang berlangsung. Halaman ini akan aktif saat periode ujian dimulai dan Anda dikonfirmasi sebagai panitia.';
              noAccess.classList.remove('hidden');
            }
            if (typeof checkExamPanitiaAccess === 'function') {
              try { sessionStorage.removeItem('_examPanitiaAccess'); } catch (_) { }
              checkExamPanitiaAccess();
            }
            return;
          }
          if (!res.is_confirmed_panitia) {
            if (noAccess) {
              if (noAccessTitle) noAccessTitle.textContent = 'Belum Dikonfirmasi sebagai Panitia';
              if (noAccessMsg) noAccessMsg.textContent =
                'Halaman ini akan aktif setelah Anda dikonfirmasi sebagai panitia ujian oleh admin pada periode ujian aktif.';
              noAccess.classList.remove('hidden');
            }
            return;
          }
          renderExamPanitiaPanel(res);
          try { sessionStorage.removeItem('_examPanitiaAccess'); } catch (_) { }
          if (typeof checkExamPanitiaAccess === 'function') checkExamPanitiaAccess();
        })
        .withFailureHandler(function (err) {
          if (skel) skel.classList.add('hidden');
          if (noAccess) {
            if (noAccessTitle) noAccessTitle.textContent = 'Koneksi Gagal';
            if (noAccessMsg) noAccessMsg.textContent =
              'Tidak dapat memuat data: ' + (err && err.message ? err.message : err);
            noAccess.classList.remove('hidden');
          }
        })
        .getExamPageData(token);
    }
    function renderExamPanitiaPanel(data) {
      var panel = document.getElementById('panelExamPanitia');
      if (!panel) return;
      var today = _gExamToday();
      var period = data.period || {};
      var toConf = data.supervisors_to_confirm || [];
      // Gate: cek apakah rekap absensi siswa semua kelas sudah selesai
      var saComplete = !!data.student_attendance_complete;
      var html = '<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">'
        + '<div class="bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-4 flex items-center gap-3">'
        + '<div class="w-9 h-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">'
        + '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        + '</div>'
        + '<div class="min-w-0 flex-1">'
        + '<p class="text-emerald-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Panel Panitia</p>'
        + '<p class="text-white text-sm font-bold leading-snug">Konfirmasi Kehadiran Pengawas</p>'
        + '</div>'
        + '<div class="text-right flex-shrink-0">'
        + '<p class="text-emerald-200 text-[10px] font-semibold mb-0.5">' + _gExamEsc(period.name || '') + '</p>'
        + '<p class="text-white/70 text-[11px]">' + _gExamFmtDate(today) + '</p>'
        + '</div>'
        + '</div>';

      // Banner peringatan jika rekap absensi siswa belum lengkap
      if (!saComplete) {
        html += '<div class="flex items-start gap-3 px-5 py-4 bg-amber-50 border-b border-amber-200">'
          + '<div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">'
          + '<svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"/></svg>'
          + '</div>'
          + '<div class="min-w-0 flex-1">'
          + '<p class="text-sm font-bold text-amber-800">Rekap Absensi Siswa Belum Lengkap</p>'
          + '<p class="text-xs text-amber-600 mt-0.5 leading-relaxed">Selesaikan input rekap absensi siswa di semua kelas terlebih dahulu sebelum dapat mengonfirmasi atau mengganti pengawas ujian.</p>'
          + '<button onclick="handleNav(\'Page_StudentAttendanceInput\')" class="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition touch-manipulation">'
          + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
          + 'Buka Halaman Absensi Siswa'
          + '</button>'
          + '</div>'
          + '</div>';
      }
      if (!toConf.length) {
        html += '<div class="px-5 py-12 flex flex-col items-center gap-3 text-center">'
          + '<div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">'
          + '<svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>'
          + '</div>'
          + '<p class="text-sm font-semibold text-slate-500">Tidak Ada Sesi Hari Ini</p>'
          + '<p class="text-xs text-slate-400 max-w-xs">Belum ada sesi ujian hari ini, atau belum ada pengawas yang ditetapkan.</p>'
          + '</div>';
      } else {
        toConf.forEach(function (entry, idx) {
          if (!entry) return;
          var sessionName = entry.session_name || '';
          var timeStart = entry.time_start || '';
          var timeEnd = entry.time_end || '';
          var roomName = entry.room_name || '';
          var subject = entry.subject || '';
          var borderTop = idx === 0 ? '' : 'border-t border-slate-100';
          html += '<div class="px-5 py-4 ' + borderTop + '">';
          html += '<div class="flex flex-wrap items-center gap-2 mb-3">'
            + '<span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">'
            + '<svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            + _gExamEsc(sessionName) + (timeStart ? ' \u00a0' + _gExamEsc(timeStart) + '\u2013' + _gExamEsc(timeEnd) : '')
            + '</span>'
            + (roomName ? '<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">'
            + '<svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>'
            + _gExamEsc(roomName) + '</span>' : '')
            + (subject ? '<span class="text-xs font-semibold text-slate-500">' + _gExamEsc(subject) + '</span>' : '')
            + '</div>';
          if (!Array.isArray(entry.supervisors)) {
            html += '</div>';
            return;
          }
          entry.supervisors.forEach(function (sup) {
            if (!sup) return;
            if (sup.status === 'cancelled') return;
            if (sup.status === 'substituted') return;
            var confirmedBy = sup.confirmed_by != null ? String(sup.confirmed_by) : '';
            var isConf = !!(confirmedBy && confirmedBy.trim());
            var guruName = sup.guru_name || '(Nama tidak tersedia)';
            var supervisorId = sup.supervisor_id || '';
            var userId = sup.user_id || '';
            html += '<div class="flex flex-col gap-2.5 p-3 rounded-xl border mb-2 '
              + (isConf ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200') + '">'
              + '<div>'
              + '<div class="flex flex-wrap items-center gap-1.5 mb-1">'
              + '<span class="text-sm font-bold text-slate-900">' + _gExamEsc(guruName) + '</span>'
              + (sup.is_substitute ? '<span class="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pengganti</span>' : '')
              + (sup.has_bap ? '<span class="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">\u2713 BAP Terkirim</span>' : '')
              + '</div>'
              + (isConf
                ? '<span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>Sudah Hadir</span>'
                : '<span class="inline-flex items-center gap-1 text-xs font-medium text-slate-400"><svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>Belum Hadir</span>')
              + '</div>'
              + '<div class="flex flex-col gap-2">';
            if (isConf) {
              html += '<button type="button" onclick="gExam_picketRevokeSup(\'' + _jsStr(supervisorId) + '\', this)" '
                + 'class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 py-2.5 px-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] touch-manipulation">'
                + '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
                + 'Cabut Konfirmasi Kehadiran'
                + '</button>';
            } else {
              html += '<button type="button"'
                + (saComplete ? ' onclick="gExam_picketConfirmSup(\'' + _jsStr(supervisorId) + '\', this)"' : ' disabled title="Selesaikan rekap absensi siswa terlebih dahulu"')
                + ' class="w-full inline-flex items-center justify-center gap-2 text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm touch-manipulation'
                + (saComplete ? ' text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 border-0 cursor-pointer active:scale-[0.98]' : ' text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60')
                + '">'
                + '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>'
                + 'Konfirmasi Kehadiran'
                + '</button>';
            }
            if (!sup.is_substitute) {
              html += '<button type="button"'
                + (saComplete ? ' onclick="gExam_picketOpenSubst(\'' + _jsStr(supervisorId) + '\', \'' + _gExamEsc(guruName) + '\')"' : ' disabled title="Selesaikan rekap absensi siswa terlebih dahulu"')
                + ' class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-xl transition-all touch-manipulation'
                + (saComplete ? ' text-pink-700 bg-white hover:bg-pink-50 border border-pink-200 cursor-pointer active:scale-[0.98]' : ' text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60')
                + '">'
                + '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>'
                + 'Ganti Pengawas'
                + '</button>';
            } else {
              html += '<button type="button" onclick="gExam_picketCancelSubst(\'' + _jsStr(supervisorId) + '\')" '
                + 'class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-orange-700 bg-white hover:bg-orange-50 border border-orange-200 py-2.5 px-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] touch-manipulation">'
                + '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>'
                + 'Batalkan Penggantian'
                + '</button>';
            }
            var _jeSid = _jtmSid(supervisorId);
            var _jeEscId = escapeHtml(_jeSid);
            var _jeSupId = _jsStr(supervisorId);
            var _jeUid = _jsStr(userId);
            if (isConf) {
              html += '<button type="button" onclick="toggleExamJtmPanel(\'' + _jeSupId + '\', \'' + _jeUid + '\')" '
                + 'class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-2.5 px-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] touch-manipulation">'
                + '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
                + 'Atur JTM'
                + '</button>';
            }
            html += '</div>'; // close action buttons column
            if (isConf) {
            html += '<div id="jtmExamAdjRow-' + _jeEscId + '" class="hidden">'
              + '<div class="rounded-lg border border-indigo-200 bg-white p-3 mt-1">'
                + '<div class="flex items-center justify-between mb-2">'
                  + '<span class="text-xs font-bold text-indigo-700">Penyesuaian JTM</span>'
                  + '<span id="jtmExamAdjStatus-' + _jeEscId + '" class="text-[11px] text-slate-400"></span>'
                + '</div>'
                + '<div class="flex flex-wrap items-end gap-3">'
                  + '<div class="flex gap-3 text-xs">'
                    + '<div class="text-center"><div class="text-slate-400">Terjadwal</div><div id="jtmExamSchedDisp-' + _jeEscId + '" class="font-bold text-slate-700">-</div></div>'
                    + '<div class="text-center"><div class="text-slate-400">Disesuaikan</div><div id="jtmExamAdjDisp-' + _jeEscId + '" class="font-bold text-indigo-700">-</div></div>'
                    + '<div class="text-center"><div class="text-slate-400">Selisih</div><div id="jtmExamDiffDisp-' + _jeEscId + '" class="font-bold text-amber-600">-</div></div>'
                  + '</div>'
                  + '<div class="flex flex-col">'
                    + '<label class="text-[11px] text-slate-500 mb-0.5">Adjusted JTM</label>'
                    + '<input id="jtmExamAdjInput-' + _jeEscId + '" type="number" step="1" min="0" inputmode="numeric" oninput="recomputeExamJtmDiff(\'' + _jeSupId + '\')" class="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400">'
                  + '</div>'
                  + '<div id="jtmExamReasonWrap-' + _jeEscId + '" class="flex flex-col flex-1 min-w-[180px] hidden">'
                    + '<label class="text-[11px] text-slate-500 mb-0.5">Alasan penyesuaian (wajib saat dikurangi)</label>'
                    + '<textarea id="jtmExamReason-' + _jeEscId + '" rows="2" maxlength="500" class="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" placeholder="Tuliskan alasan pengurangan JTM..."></textarea>'
                  + '</div>'
                  + '<button type="button" onclick="saveExamJtmAdjustment(\'' + _jeSupId + '\', \'' + _jeUid + '\', this)" '
                    + 'class="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm">Simpan JTM</button>'
                  + '<button type="button" id="jtmExamCancelBtn-' + _jeEscId + '" onclick="cancelExamJtmAdjustment(\'' + _jeSupId + '\', this)" '
                    + 'class="hidden inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all">'
                    + '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
                    + 'Batalkan Penyesuaian</button>'
                + '</div>'
                + '<div id="jtmExamAllocPanel-' + _jeEscId + '" data-original-uid="' + escapeHtml(sup.user_id) + '" class="mt-3 pt-3 border-t border-indigo-100 hidden">'
                  + '<div class="flex items-center justify-between mb-2">'
                    + '<span class="text-xs font-bold text-emerald-700">Alokasi Pengganti Sebagian</span>'
                    + '<span class="text-[11px] text-slate-500">Sisa selisih: <span id="jtmExamRemainDisp-' + _jeEscId + '" class="font-bold text-amber-600">-</span></span>'
                  + '</div>'
                  + '<div class="flex flex-wrap items-end gap-2 mb-2">'
                    + '<div class="flex flex-col flex-1 min-w-[160px]">'
                      + '<label class="text-[11px] text-slate-500 mb-0.5">Guru pengganti</label>'
                      + '<select id="jtmExamAllocSelect-' + _jeEscId + '" class="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"><option value="">Pilih Guru...</option></select>'
                    + '</div>'
                    + '<div class="flex flex-col">'
                      + '<label class="text-[11px] text-slate-500 mb-0.5">Alokasi JTM</label>'
                      + '<input id="jtmExamAllocInput-' + _jeEscId + '" type="number" step="any" min="0" inputmode="decimal" class="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400">'
                    + '</div>'
                    + '<button type="button" onclick="addExamJtmAllocation(\'' + _jeSupId + '\', \'' + _jeUid + '\', this)" '
                      + 'class="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm">Tambah Alokasi</button>'
                  + '</div>'
                  + '<div id="jtmExamAllocList-' + _jeEscId + '" class="space-y-1"></div>'
                + '</div>'
              + '</div>'
            + '</div>';
            } // end if (isConf) — EXAM JTM adjustment panel
            html += '</div>'; // close supervisor card
          });
          html += '</div>';
        });
      }
      html += '</div>';
      panel.innerHTML = html;
      panel.classList.remove('hidden');
    }
    /* =====================================================================
     * JTM Adjustment — EXAM supervisor frontend controls
     * (Feature: jtm-adjustment, task 10.3)
     *
     * Mirrors the KBM Piket controls (tasks 10.1/10.2) for exam-supervisor
     * confirmation rows in the Panitia view (renderExamPanitiaPanel). These
     * use the EXAM backend contract:
     *   adjustOccurrenceJtm(token, { occurrence_type:'EXAM', supervisor_id,
     *                                adjusted_jtm, reason })
     *   getOccurrenceJtmState(token, 'EXAM', supervisor_id)
     *   reallocateJtmDifference(token, { occurrence_type:'EXAM',
     *       occurrence_ref:supervisor_id,
     *       allocations:[{ substitute_user_id, allocated_jtm }] })
     *   removeReallocation(token, reallocation_id)
     *
     * Element ids are namespaced with a `jtmExam` prefix so they never collide
     * with the KBM controls. The shared helpers `_jtmSid`, `_jtmTeacherName`,
     * `_jsStr`, `escapeHtml`, `_busyButton`, and `showToast` are reused. Per
     * Req 6.1/6.2 the supervisor Adjusted_JTM is validated the same as KBM
     * (whole-number, 0..scheduled). Client-side validation is for UX only; the
     * backend remains authoritative.
     * ===================================================================== */
    