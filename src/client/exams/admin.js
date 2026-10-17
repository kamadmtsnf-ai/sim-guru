function initExamSchedule() {
      var token = localStorage.getItem('auth_token');
      var ES = {
        periods: [],
        teachers: [],
        selPeriodId: null,
        detail: null,
        activeTab: 'periods',
        reqToken: 0,
        expandedSessions: {},
        seededPeriods: {},
        today: (function () {
          var d = new Date();
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        })()
      };
      function _examModalLock(modalId, locked) {
        var m = document.getElementById(modalId);
        if (!m) return;
        m.dataset.locked = locked ? 'true' : '';
        var panel = m.querySelector('.relative');
        if (panel) {
          if (locked) {
            panel.style.transition = 'opacity 0.15s ease';
            panel.style.opacity = '0.92';
          } else {
            panel.style.opacity = '';
          }
        }
      }
      window._examModalLock = _examModalLock;
      function _examModalIsLocked(modalId) {
        var m = document.getElementById(modalId);
        return !!(m && m.dataset.locked === 'true');
      }
      function _examOpenModal(modalId, focusInputId) {
        var m = document.getElementById(modalId);
        if (!m) return;
        m.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        if (focusInputId) {
          setTimeout(function () {
            var inp = document.getElementById(focusInputId);
            if (inp) try { inp.focus(); } catch (_) { }
          }, 80);
        }
      }
      function _examCloseModal(modalId) {
        var m = document.getElementById(modalId);
        if (!m) return;
        m.classList.add('hidden');
        var anyOpen = ['examPeriodModal', 'examSessionModal', 'examRoomModal', 'examSupModal', 'examComModal', 'examSubstModal', 'examBapModal']
          .some(function (id) { var el = document.getElementById(id); return el && !el.classList.contains('hidden'); });
        if (!anyOpen) document.body.classList.remove('overflow-hidden');
      }
      window.exam_showLoading = function (msg) {
        var ov = document.getElementById('examLoadingOverlay');
        var txt = document.getElementById('examLoadingMsg');
        if (txt) txt.textContent = msg || 'Memproses...';
        if (ov) ov.classList.remove('hidden');
      };
      window.exam_hideLoading = function () {
        var ov = document.getElementById('examLoadingOverlay');
        if (ov) ov.classList.add('hidden');
      };
      window.exam_switchTab = function (tab) {
        ES.activeTab = tab;
        if (tab !== 'periods') {
          var panel0 = document.getElementById('examPanel_periods');
          if (panel0) panel0.classList.remove('is-detail-view');
          var backBar0 = document.getElementById('examMobileBackBar');
          if (backBar0) backBar0.classList.remove('is-detail-view');
        }
        ['periods', 'jtm', 'bap'].forEach(function (t) {
          var panel = document.getElementById('examPanel_' + t);
          var btn = document.getElementById('examTabBtn_' + t);
          if (!panel || !btn) return;
          if (t === tab) {
            panel.classList.remove('hidden');
            btn.classList.add('border-blue-600', 'text-blue-600', 'bg-blue-50');
            btn.classList.remove('border-transparent', 'text-slate-500');
          } else {
            panel.classList.add('hidden');
            btn.classList.remove('border-blue-600', 'text-blue-600', 'bg-blue-50');
            btn.classList.add('border-transparent', 'text-slate-500');
          }
        });
        if (tab === 'jtm' && ES.selPeriodId) exam_loadRekapJtm();
        if (tab === 'bap' && ES.selPeriodId) exam_loadRekapBap();
      };
      function statusBadge(s) {
        var cfg = {
          'Akan Datang': 'bg-blue-50 text-blue-700 border-blue-200',
          'Berlangsung': 'bg-emerald-50 text-emerald-700 border-emerald-200',
          'Selesai': 'bg-slate-100 text-slate-500 border-slate-200'
        };
        return '<span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ' + (cfg[s] || cfg['Selesai']) + '">' + s + '</span>';
      }
      function populateTeacherSelect(selId, excludeIds) {
        excludeIds = excludeIds || [];
        var sel = document.getElementById(selId);
        if (!sel) return;
        var html = '<option value="">Pilih Guru...</option>';
        ES.teachers.forEach(function (t) {
          if (!excludeIds.includes(String(t.id)))
            html += '<option value="' + t.id + '">' + escHtml(t.name) + '</option>';
        });
        sel.innerHTML = html;
      }
      function escHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      function getTeacherName(userId) {
        if (!userId) return '';
        var t = ES.teachers.find(function (x) { return String(x.id) === String(userId); });
        return t ? t.name : 'Guru Tidak Dikenal';
      }
      function fmtDate(d) { return typeof formatDateID === 'function' ? formatDateID(d) : d; }
      function fmtTime(t) { return String(t || '').substring(0, 5); }
      function refreshDetail() {
        exam_hideLoading();
        if (ES.selPeriodId) exam_selectPeriod(ES.selPeriodId);
      }
      function loadData() {
        var listEl = document.getElementById('examPeriodList');
        if (listEl) {
          listEl.innerHTML =
            '<div class="p-3 flex flex-col gap-2">' + '<div class="skeleton h-16 rounded-xl"></div>'.repeat(4) + '</div>';
        }
        google.script.run
          .withSuccessHandler(function (res) {
            if (res.status !== 'success') { showToast(res.message, 'error'); return; }
            ES.periods = res.periods || [];
            ES.teachers = res.teachers || [];
            ES.periods.sort(function (a, b) {
              var da = String(a.date_start || '');
              var db = String(b.date_start || '');
              if (da !== db) return da < db ? -1 : 1;
              var ea = String(a.date_end || '');
              var eb = String(b.date_end || '');
              if (ea !== eb) return ea < eb ? -1 : 1;
              return String(a.name || '').localeCompare(String(b.name || ''));
            });
            renderPeriodList();
          })
          .withFailureHandler(function (err) {
            if (listEl) {
              listEl.innerHTML =
                '<div class="flex flex-col items-center justify-center flex-1 p-6 text-center">' +
                '<div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-3">' +
                '<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"/></svg>' +
                '</div>' +
                '<p class="text-slate-700 font-bold text-xs mb-1">Gagal Memuat Periode</p>' +
                '<p class="text-slate-400 text-xs mb-3">' + escHtml(String(err)) + '</p>' +
                '<button type="button" onclick="window._examLoadDataAgain && window._examLoadDataAgain()" class="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">Coba Lagi</button>' +
                '</div>';
            }
            showToast('Koneksi gagal: ' + err, 'error');
          })
          .getExamAdminMasterData(token);
      }
      window._examLoadDataAgain = loadData;
      function renderPeriodList() {
        var cont = document.getElementById('examPeriodList');
        if (!cont) return;
        if (!ES.periods.length) {
          cont.innerHTML = '<div class="flex flex-col items-center justify-center flex-1 p-8 text-center">'
            + '<div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">'
            + '<svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>'
            + '<p class="text-slate-500 text-xs font-medium">Belum ada periode ujian</p>'
            + '<p class="text-slate-400 text-xs mt-0.5">Klik "+ Buat Periode Baru" di atas</p></div>';
          return;
        }
        var search = (ES.search || '').toLowerCase().trim();
        var filterToday = !!ES.filterTodayOnly;
        var filtered = ES.periods.filter(function (p) {
          if (filterToday) {
            if (!(ES.today >= p.date_start && ES.today <= p.date_end)) return false;
          }
          if (search && (p.name || '').toLowerCase().indexOf(search) === -1) return false;
          return true;
        });
        var totalCount = ES.periods.length;
        var activeCount = ES.periods.filter(function (p) { return ES.today >= p.date_start && ES.today <= p.date_end; }).length;
        var html = '<div class="sticky top-0 z-10 bg-white border-b border-slate-200 px-3 py-2.5 flex flex-col gap-2">'
          + '<div class="flex items-center justify-between">'
          + '<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Periode (' + totalCount + ')</span>'
          + (activeCount > 0
            ? '<button type="button" onclick="window._examTogglePeriodFilter()" class="text-[10px] font-bold ' +
            (filterToday ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200') +
            ' border px-2 py-0.5 rounded-full transition" title="Filter hanya periode aktif">' +
            (filterToday ? '✓ ' : '') + activeCount + ' AKTIF</button>'
            : '<span class="text-[10px] font-medium text-slate-400">Tidak aktif</span>')
          + '</div>'
          + '<div class="relative">'
          + '<svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>'
          + '<input id="examPeriodSearchInp" type="text" placeholder="Cari periode..." value="' + escHtml(ES.search || '') + '"'
          + ' oninput="window._examPeriodSearch(this.value)" autocomplete="off"'
          + ' class="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition">'
          + '</div>'
          + '</div>';
        if (!filtered.length) {
          html += '<div class="flex flex-col items-center justify-center flex-1 p-6 text-center">'
            + '<svg class="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>'
            + '<p class="text-slate-500 text-xs font-semibold">Tidak ada periode cocok</p>'
            + '<p class="text-slate-400 text-[10px] mt-0.5">Coba kata kunci lain</p>';
          if (search || filterToday) {
            html += '<button type="button" onclick="window._examResetPeriodFilters()" class="mt-2 text-[10px] font-bold text-blue-600 hover:underline">Reset filter</button>';
          }
          html += '</div>';
        } else {
          html += '<div class="p-2 flex flex-col gap-1">';
          filtered.forEach(function (p) {
            var isActive = ES.selPeriodId === p.id;
            var isToday = ES.today >= p.date_start && ES.today <= p.date_end;
            html += '<button onclick="exam_selectPeriod(\'' + p.id + '\')" class="text-left p-3 rounded-xl transition border '
              + (isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50') + '">'
              + '<div class="flex items-start justify-between gap-2 mb-1.5">'
              + '<p class="text-sm font-semibold text-slate-800 leading-snug flex-1">' + escHtml(p.name) + '</p>'
              + (isToday ? '<span class="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">AKTIF</span>' : '')
              + '</div>'
              + '<p class="text-xs text-slate-500">' + fmtDate(p.date_start) + ' — ' + fmtDate(p.date_end) + '</p>'
              + '<div class="flex items-center gap-2 mt-1.5">' + statusBadge(p.status)
              + '<span class="text-xs text-slate-400">' + p.jtm_committee_per_day + ' JTM/hari</span></div>'
              + '</button>';
          });
          html += '</div>';
        }
        cont.innerHTML = html;
        if (ES._searchFocused) {
          var inp = document.getElementById('examPeriodSearchInp');
          if (inp) {
            inp.focus();
            var v = inp.value; inp.value = ''; inp.value = v;
          }
          ES._searchFocused = false;
        }
      }
      window._examPeriodSearch = function (v) {
        ES.search = String(v || '');
        ES._searchFocused = true;
        renderPeriodList();
      };
      window._examTogglePeriodFilter = function () {
        ES.filterTodayOnly = !ES.filterTodayOnly;
        renderPeriodList();
      };
      window._examResetPeriodFilters = function () {
        ES.search = '';
        ES.filterTodayOnly = false;
        renderPeriodList();
      };
      window.exam_selectPeriod = function (pid) {
        ES.selPeriodId = pid;
        renderPeriodList();
        var detEl = document.getElementById('examPeriodDetail');
        var panel = document.getElementById('examPanel_periods');
        if (panel) panel.classList.add('is-detail-view');
        var backBar = document.getElementById('examMobileBackBar');
        if (backBar) backBar.classList.add('is-detail-view');
        if (detEl) {
          detEl.innerHTML =
            '<div class="p-4 sm:p-6">' +
            '<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">' +
            '<div class="bg-slate-100 px-5 py-4"><div class="skeleton h-6 w-48 rounded"></div><div class="skeleton h-4 w-64 rounded mt-2"></div></div>' +
            '<div class="px-5 py-3 flex gap-2"><div class="skeleton h-7 w-20 rounded-lg"></div><div class="skeleton h-7 w-20 rounded-lg"></div><div class="skeleton h-7 w-24 rounded-lg"></div></div>' +
            '</div>' +
            '<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">' +
            '<div class="bg-slate-100 px-5 py-3"><div class="skeleton h-5 w-32 rounded"></div></div>' +
            '<div class="px-5 py-4 space-y-2"><div class="skeleton h-12 rounded-lg"></div><div class="skeleton h-12 rounded-lg"></div></div>' +
            '</div>' +
            '</div>';
        }
        var myReq = ++ES.reqToken;
        google.script.run
          .withSuccessHandler(function (res) {
            if (myReq !== ES.reqToken) return;
            if (res.status !== 'success') { showToast(res.message, 'error'); return; }
            ES.detail = res;
            if (!ES.seededPeriods[pid]) {
              ES.seededPeriods[pid] = true;
              (res.sessions || []).forEach(function (s) {
                if (String(s.date) === ES.today) {
                  ES.expandedSessions[String(s.id)] = true;
                }
              });
            }
            renderDetail();
          })
          .withFailureHandler(function (err) {
            if (myReq !== ES.reqToken) return;
            if (detEl) {
              detEl.innerHTML =
                '<div class="flex flex-col items-center justify-center h-full text-center p-8">' +
                '<div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">' +
                '<svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"/></svg>' +
                '</div>' +
                '<p class="text-slate-700 font-bold text-sm mb-1">Gagal Memuat Detail</p>' +
                '<p class="text-slate-400 text-xs mb-3">' + escHtml(String(err)) + '</p>' +
                '<button type="button" onclick="exam_selectPeriod(\'' + pid + '\')" class="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">Coba Lagi</button>' +
                '</div>';
            }
            showToast('Koneksi gagal: ' + err, 'error');
          })
          .getExamPeriodDetail(token, pid);
      };
      window.exam_backToPeriodList = function () {
        var panel = document.getElementById('examPanel_periods');
        if (panel) panel.classList.remove('is-detail-view');
        var backBar = document.getElementById('examMobileBackBar');
        if (backBar) backBar.classList.remove('is-detail-view');
        try {
          if (window.ES) ES.selPeriodId = null;
        } catch (_) { }
        try { renderPeriodList(); } catch (_) { }
      };
      function renderDetail() {
        var detEl = document.getElementById('examPeriodDetail');
        if (!detEl || !ES.detail) return;
        var p = ES.detail.period;
        var ses = ES.detail.sessions || [];
        var com = ES.detail.committee || [];
        var isActivePeriod = ES.today >= p.date_start && ES.today <= p.date_end;
        var html = '<div class="p-4 sm:p-6">'
          + '<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">'
          + '<div class="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">'
          + '<div class="flex items-start justify-between gap-3 flex-wrap">'
          + '<div class="flex-1 min-w-0"><h2 class="text-white font-bold text-lg leading-snug">' + escHtml(p.name) + '</h2>'
          + '<p class="text-slate-300 text-xs mt-1">' + fmtDate(p.date_start) + ' — ' + fmtDate(p.date_end)
          + ' &nbsp;·&nbsp; Panitia ' + p.jtm_committee_per_day + ' JTM/hari</p>'
          + (p.description ? '<p class="text-slate-400 text-xs mt-0.5">' + escHtml(p.description) + '</p>' : '')
          + '</div><div class="flex items-center gap-2">' + statusBadge(p.status) + '</div></div></div>'
          + '<div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2 flex-wrap">'
          + '<button onclick="exam_openPeriodModal(\'' + p.id + '\')" class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">'
          + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>Edit</button>'
          + '<button onclick="exam_deletePeriod(\'' + p.id + '\')" class="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">'
          + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>Hapus</button>'
          + '<button onclick="exam_loadRekapJtm();exam_switchTab(\'jtm\')" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">📊 Rekap JTM</button>'
          + '<button onclick="exam_loadRekapBap();exam_switchTab(\'bap\')" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">📝 Rekap BAP</button>'
          + '</div></div>';
        var byDate = {};
        ses.forEach(function (s) { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s); });
        var allDates = {};
        Object.keys(byDate).forEach(function (d) { allDates[d] = true; });
        com.forEach(function (c) { allDates[c.date] = true; });
        var dates = Object.keys(allDates).sort();
        if (!dates.length) {
          html += '<div class="bg-white rounded-2xl border border-slate-200 p-6 text-center">'
            + '<p class="text-slate-400 text-sm">Belum ada sesi ujian.</p>'
            + '<button onclick="exam_openSessionModal(\'' + p.id + '\', null)" class="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white bg-emerald-600 px-4 py-2 rounded-xl hover:bg-emerald-700 transition">+ Tambah Sesi Pertama</button></div>';
        } else {
          dates.forEach(function (date) {
            var sessionsOnDate = (byDate[date] || []).sort(function (a, b) { return a.time_start.localeCompare(b.time_start); });
            var comOnDate = com.filter(function (c) { return c.date === date && String(c.status || 'active') === 'active'; });
            var isHariH = date === ES.today;
            if (typeof ES.expandedDates === 'undefined') {
              ES.expandedDates = {};
            }
            if (typeof ES.expandedDates[date] === 'undefined') {
              ES.expandedDates[date] = isHariH; // Default open for today
            }
            var isDateExpanded = ES.expandedDates[date] === true;
            var openCount = 0;
            sessionsOnDate.forEach(function (s) {
              if (ES.expandedSessions[String(s.id)]) openCount++;
            });
            var allOpen = sessionsOnDate.length > 0 && openCount === sessionsOnDate.length;
            var sessionCount = sessionsOnDate.length;
            html += '<div class="exam-date-accordion ' + (isDateExpanded ? 'is-open' : '') + ' bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4" data-date="' + escHtml(date) + '">'
              + '<div class="exam-date-header px-5 py-3 bg-gradient-to-r from-slate-700 to-slate-600 flex items-center justify-between gap-2 flex-wrap cursor-pointer" '
              + 'onclick="exam_toggleDateAccordion(\'' + escJsAttr(date) + '\')" '
              + 'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();exam_toggleDateAccordion(\'' + escJsAttr(date) + '\');}" '
              + 'role="button" tabindex="0" aria-expanded="' + (isDateExpanded ? 'true' : 'false') + '">'
              + '<div class="flex items-center gap-2 flex-wrap">'
              + '<button type="button" class="exam-date-chevron flex-shrink-0" aria-label="' + (isDateExpanded ? 'Tutup tanggal' : 'Buka tanggal') + '">'
              + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>'
              + '</button>'
              + (isHariH ? '<span class="text-xs font-bold text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-700">HARI INI</span>' : '')
              + '<span class="text-white font-bold text-sm">' + fmtDate(date) + '</span>'
              + '<span class="text-[10px] font-semibold text-slate-300 bg-white/10 border border-white/15 px-1.5 py-0.5 rounded-full">'
              + sessionCount + ' SESI'
              + '</span>'
              + '</div>'
              + '<div class="flex items-center gap-2" onclick="event.stopPropagation();">'
              + (sessionCount > 0
                ? '<button type="button" onclick="exam_toggleAllSessionsForDate(\'' + escJsAttr(date) + '\', ' + (!allOpen) + ')" '
                + 'class="btn-toggle-all-sessions inline-flex items-center gap-1 text-xs font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2 py-1 rounded-lg transition" '
                + (isDateExpanded ? 'style="display: inline-flex;"' : 'style="display: none;"') + '>'
                + '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="' + (allOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7') + '"/></svg>'
                + (allOpen ? 'Tutup Semua' : 'Buka Semua')
                + '</button>'
                : '')
              + '<button onclick="exam_openSessionModal(\'' + p.id + '\', null, \'' + date + '\')" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-white transition">'
              + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>Tambah Sesi</button>'
              + '</div>'
              + '</div>'
              + '<div class="exam-date-body">'
              + '<div class="exam-date-body-inner">';
            sessionsOnDate.forEach(function (s) { html += renderSessionBlock(s, isHariH); });
            html += '<div class="px-5 py-3 border-t border-slate-100">'
              + '<div class="flex items-center justify-between mb-2">'
              + '<h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">👥 Panitia Hari Ini</h4>'
              + '<button onclick="exam_openComModal(\'' + p.id + '\', \'' + date + '\')" class="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition">'
              + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>Tetapkan</button></div>';
            if (!comOnDate.length) {
              html += '<p class="text-xs text-slate-400 italic">Belum ada panitia ditetapkan.</p>';
            } else {
              comOnDate.forEach(function (c) {
                var isConf = !!(c.confirmed_by && c.confirmed_by.trim());
                var isSub = c.is_substitute === true || String(c.is_substitute) === 'true';
                html += '<div class="flex items-center gap-2 py-1.5 flex-wrap">'
                  + '<div class="flex-1 min-w-0">'
                  + '<span class="text-sm font-semibold text-slate-700">' + escHtml(c.guru_name) + '</span>';
                if (isSub) {
                  var origName = getTeacherName(c.original_user_id);
                  html += ' <span class="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">'
                    + '↩ Menggantikan ' + escHtml(origName) + '</span>';
                }
                html += ' <span class="text-xs text-slate-400">' + c.jtm_val + ' JTM</span></div>'
                  + '<div class="flex items-center gap-1">';
                if (isHariH) {
                  if (isConf) {
                    html += '<span class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">✓ Hadir</span>'
                      + '<button onclick="exam_revokeCom(\'' + c.id + '\')" class="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 transition font-semibold">Cabut</button>';
                    if (isSub) html += '<button onclick="exam_cancelSubst(\'' + c.id + '\',\'committee\')" class="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-100 transition font-semibold">Batal Ganti</button>';
                  } else {
                    html += '<button onclick="exam_confirmCom(\'' + c.id + '\')" class="text-xs text-white bg-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-700 transition font-semibold">Konfirmasi</button>';
                    if (isSub) {
                      html += '<button onclick="exam_cancelSubst(\'' + c.id + '\',\'committee\')" class="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-100 transition font-semibold">Batal Ganti</button>';
                    } else {
                      html += '<button onclick="exam_openSubstModal(\'' + c.id + '\',\'committee\')" class="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg hover:bg-rose-100 transition font-semibold">Ganti</button>'
                        + '<button onclick="exam_removeCom(\'' + c.id + '\')" class="text-xs text-red-400 hover:text-red-600 transition font-semibold">✕</button>';
                    }
                  }
                } else {
                  if (isConf) {
                    html += '<span class="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">✓ Hadir</span>';
                  } else {
                    html += '<span class="text-xs text-slate-400">Belum dikonfirmasi</span>';
                    if (isSub) {
                      html += '<button onclick="exam_cancelSubst(\'' + c.id + '\',\'committee\')" class="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-100 transition font-semibold">Batal Ganti</button>';
                    } else {
                      html += '<button onclick="exam_openSubstModal(\'' + c.id + '\',\'committee\')" class="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg hover:bg-rose-100 transition font-semibold">Ganti</button>'
                        + '<button onclick="exam_removeCom(\'' + c.id + '\')" class="text-xs text-red-400 hover:text-red-600 transition font-semibold">✕</button>';
                    }
                  }
                }
                html += '</div></div>';
              });
            }
            html += '</div></div></div></div>';
          });
        }
        if (ses.length > 0) {
          html += '<button onclick="exam_openSessionModal(\'' + p.id + '\', null)" '
            + 'class="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition mb-4">+ Tambah Sesi Ujian</button>';
        }
        html += '</div>';
        detEl.innerHTML = html;
      }
      function renderSessionBlock(s, isHariH) {
        var sid = String(s.id);
        var rooms = s.rooms || [];
        var isOpen = ES.expandedSessions[sid] === true;
        var totalRooms = rooms.length;
        var totalSups = 0;
        var totalConf = 0;
        var totalBap = 0;
        var totalSub = 0;
        rooms.forEach(function (r) {
          (r.supervisors || []).forEach(function (sup) {
            if (String(sup.status || 'active') !== 'active') return;
            totalSups++;
            if (sup.confirmed_by && String(sup.confirmed_by).trim()) totalConf++;
            if (sup.has_bap) totalBap++;
            if (sup.is_substitute === true || String(sup.is_substitute) === 'true') totalSub++;
          });
        });
        var summary = ''
          + '<span class="exam-acc-chip" title="Jumlah ruang">'
          + '<svg class="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1"/></svg>'
          + '<span class="hidden sm:inline">' + totalRooms + ' Ruang</span>'
          + '<span class="sm:hidden">' + totalRooms + '</span>'
          + '</span>'
          + '<span class="exam-acc-chip" title="Jumlah pengawas aktif">'
          + '<svg class="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
          + '<span class="hidden sm:inline">' + totalSups + ' Pengawas</span>'
          + '<span class="sm:hidden">' + totalSups + '</span>'
          + '</span>';
        if (totalConf > 0) {
          summary += '<span class="exam-acc-chip exam-acc-chip-emerald" title="Pengawas yang sudah dikonfirmasi kehadirannya">'
            + '<svg class="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            + '<span class="hidden sm:inline">' + totalConf + ' Hadir</span>'
            + '<span class="sm:hidden">' + totalConf + '</span>'
            + '</span>';
        }
        if (totalBap > 0) {
          summary += '<span class="exam-acc-chip exam-acc-chip-blue" title="BAP yang sudah disubmit">'
            + '<svg class="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
            + '<span class="hidden sm:inline">' + totalBap + ' BAP</span>'
            + '<span class="sm:hidden">' + totalBap + '</span>'
            + '</span>';
        }
        if (totalSub > 0) {
          summary += '<span class="exam-acc-chip exam-acc-chip-amber" title="Pengawas pengganti">'
            + '<svg class="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>'
            + '<span class="hidden sm:inline">' + totalSub + ' Pengganti</span>'
            + '<span class="sm:hidden">' + totalSub + '</span>'
            + '</span>';
        }
        var html = '<div class="exam-acc-session ' + (isOpen ? 'is-open' : '') + '" data-session-id="' + escHtml(sid) + '">'
          + '<div class="exam-acc-header-wrapper">'
          + '<div class="exam-acc-header" onclick="exam_toggleSession(\'' + escJsAttr(sid) + '\')" '
          + 'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();exam_toggleSession(\'' + escJsAttr(sid) + '\');}" '
          + 'role="button" tabindex="0" aria-expanded="' + (isOpen ? 'true' : 'false') + '">'
          + '<div class="exam-acc-header-left">'
          + '<button type="button" class="exam-acc-chevron" aria-label="' + (isOpen ? 'Tutup sesi' : 'Buka sesi') + '">'
          + '<svg class="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>'
          + '</button>'
          + '<svg class="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
          + '<div class="exam-acc-title min-w-0">'
          + '<div class="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 sm:flex-wrap">'
          + '<span class="text-xs md:text-sm font-bold text-slate-700 truncate">' + escHtml(s.session_name) + '</span>'
          + '<div class="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400">'
          + '<span class="whitespace-nowrap">' + fmtTime(s.time_start) + ' – ' + fmtTime(s.time_end) + '</span>'
          + '<span class="hidden sm:inline">•</span>'
          + '<span class="whitespace-nowrap">' + s.jtm_val + ' JTM</span>'
          + '</div>'
          + '</div>'
          + '<div class="exam-acc-summary flex items-center gap-1 sm:gap-1.5 flex-wrap mt-1">' + summary + '</div>'
          + '</div>'
          + '</div>'
          + '<div class="exam-acc-actions hidden sm:flex flex-row items-center gap-1" onclick="event.stopPropagation();">'
          + '<button onclick="event.stopPropagation(); exam_openSessionModal(null, \'' + escJsAttr(sid) + '\')" class="action-btn action-btn-edit" data-tooltip="Edit Sesi">'
          + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
          + '</button>'
          + '<button onclick="event.stopPropagation(); exam_deleteSession(\'' + escJsAttr(sid) + '\')" class="action-btn action-btn-delete" data-tooltip="Hapus Sesi">'
          + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
          + '</button>'
          + '<button onclick="event.stopPropagation(); exam_openRoomModal(\'' + escJsAttr(sid) + '\', null)" class="inline-flex items-center justify-center gap-1 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-100 active:scale-95 transition whitespace-nowrap">'
          + '+ Ruang'
          + '</button>'
          + '</div>'
          + '</div>'
          + '<div class="exam-acc-mobile-actions sm:hidden flex flex-col gap-1.5 px-4 pb-3 pt-2 bg-slate-50 border-t border-slate-200">'
          + '<button onclick="exam_openSessionModal(null, \'' + escJsAttr(sid) + '\')" class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 px-4 py-2.5 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition min-h-[44px]">'
          + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
          + 'Edit Sesi'
          + '</button>'
          + '<button onclick="exam_deleteSession(\'' + escJsAttr(sid) + '\')" class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-red-600 bg-white border border-red-300 px-4 py-2.5 rounded-lg hover:bg-red-50 active:scale-[0.98] transition min-h-[44px]">'
          + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
          + 'Hapus Sesi'
          + '</button>'
          + '<button onclick="exam_openRoomModal(\'' + escJsAttr(sid) + '\', null)" class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-4 py-2.5 rounded-lg hover:bg-violet-100 active:scale-[0.98] transition min-h-[44px]">'
          + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>'
          + 'Tambah Ruang'
          + '</button>'
          + '</div>'
          + '</div>'
          + '<div class="exam-acc-body">'
          + '<div class="exam-acc-body-inner">';
        if (!rooms.length) {
          html += '<div class="px-4 md:px-5 pb-3 pt-2"><p class="text-xs text-slate-400 italic">Belum ada ruang. Tambahkan ruang untuk sesi ini.</p></div>';
        } else {
          rooms.forEach(function (r) { html += renderRoomBlock(r, s, isHariH); });
        }
        html += '</div></div></div>';
        return html;
      }
      function escJsAttr(s) {
        return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      }
      window.exam_toggleSession = function (sid) {
        var key = String(sid);
        var nowOpen = !ES.expandedSessions[key];
        if (nowOpen) ES.expandedSessions[key] = true;
        else delete ES.expandedSessions[key];
        var nodes = document.querySelectorAll('.exam-acc-session[data-session-id="' + key.replace(/"/g, '&quot;') + '"]');
        nodes.forEach(function (node) {
          node.classList.toggle('is-open', nowOpen);
          var hdr = node.querySelector('.exam-acc-header');
          if (hdr) hdr.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
          var chevBtn = node.querySelector('.exam-acc-chevron');
          if (chevBtn) chevBtn.setAttribute('aria-label', nowOpen ? 'Tutup sesi' : 'Buka sesi');
        });
      };
      window.exam_toggleDateAccordion = function (date) {
        if (!ES.expandedDates) ES.expandedDates = {};
        var key = String(date);
        var nowOpen = !ES.expandedDates[key];
        if (nowOpen) ES.expandedDates[key] = true;
        else ES.expandedDates[key] = false;
        var nodes = document.querySelectorAll('.exam-date-accordion[data-date="' + key.replace(/"/g, '&quot;') + '"]');
        nodes.forEach(function (node) {
          node.classList.toggle('is-open', nowOpen);
          var hdr = node.querySelector('.exam-date-header');
          if (hdr) hdr.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
          var chevBtn = node.querySelector('.exam-date-chevron');
          if (chevBtn) chevBtn.setAttribute('aria-label', nowOpen ? 'Tutup tanggal' : 'Buka tanggal');
          var toggleAllBtn = node.querySelector('.btn-toggle-all-sessions');
          if (toggleAllBtn) toggleAllBtn.style.display = nowOpen ? 'inline-flex' : 'none';
        });
      };
      window.exam_toggleAllSessionsForDate = function (date, expand) {
        if (!ES.detail) return;
        (ES.detail.sessions || [])
          .filter(function (s) { return String(s.date) === String(date); })
          .forEach(function (s) {
            var key = String(s.id);
            if (expand) ES.expandedSessions[key] = true;
            else delete ES.expandedSessions[key];
          });
        renderDetail();
      };
      window._examPeriodPreviewDuration = function () {
        var startEl = document.getElementById('inpExamPeriodStart');
        var endEl = document.getElementById('inpExamPeriodEnd');
        var box = document.getElementById('examPeriodDurationPreview');
        var text = document.getElementById('examPeriodDurationText');
        if (!startEl || !endEl || !box || !text) return;
        var s = startEl.value, e = endEl.value;
        if (!s || !e) {
          box.classList.add('hidden');
          return;
        }
        var dStart = new Date(s + 'T00:00:00');
        var dEnd = new Date(e + 'T00:00:00');
        if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
          box.classList.add('hidden');
          return;
        }
        if (dEnd < dStart) {
          text.textContent = '⚠️ Tanggal selesai sebelum tanggal mulai';
          box.classList.remove('hidden');
          box.classList.remove('bg-blue-50', 'border-blue-100');
          box.classList.add('bg-rose-50', 'border-rose-200');
          text.classList.remove('text-blue-700');
          text.classList.add('text-rose-700');
          return;
        }
        var days = Math.round((dEnd - dStart) / 86400000) + 1;
        text.textContent = 'Periode: ' + days + ' hari (' + (typeof formatDateID === 'function' ? formatDateID(s) : s) + ' → ' + (typeof formatDateID === 'function' ? formatDateID(e) : e) + ')';
        box.classList.remove('hidden');
        box.classList.add('bg-blue-50', 'border-blue-100');
        box.classList.remove('bg-rose-50', 'border-rose-200');
        text.classList.add('text-blue-700');
        text.classList.remove('text-rose-700');
      };
      window._examSessionPreviewDuration = function () {
        var startEl = document.getElementById('inpExamSessionStart');
        var endEl = document.getElementById('inpExamSessionEnd');
        var box = document.getElementById('examSessionDurationPreview');
        var text = document.getElementById('examSessionDurationText');
        if (!startEl || !endEl || !box || !text) return;
        var s = startEl.value, e = endEl.value;
        if (!s || !e) {
          box.classList.add('hidden');
          return;
        }
        var sp = s.split(':'), ep = e.split(':');
        var sm = (parseInt(sp[0]) || 0) * 60 + (parseInt(sp[1]) || 0);
        var em = (parseInt(ep[0]) || 0) * 60 + (parseInt(ep[1]) || 0);
        if (em <= sm) {
          text.textContent = '⚠️ Jam selesai harus setelah jam mulai';
          box.classList.remove('hidden');
          box.classList.remove('bg-emerald-50', 'border-emerald-100');
          box.classList.add('bg-rose-50', 'border-rose-200');
          text.classList.remove('text-emerald-700');
          text.classList.add('text-rose-700');
          return;
        }
        var diff = em - sm;
        var hh = Math.floor(diff / 60);
        var mm = diff % 60;
        var label = '';
        if (hh > 0) label += hh + ' jam';
        if (mm > 0) label += (label ? ' ' : '') + mm + ' menit';
        text.textContent = 'Durasi sesi: ' + label;
        box.classList.remove('hidden');
        box.classList.add('bg-emerald-50', 'border-emerald-100');
        box.classList.remove('bg-rose-50', 'border-rose-200');
        text.classList.add('text-emerald-700');
        text.classList.remove('text-rose-700');
      };
      window._examFilterTeacherSelect = function (selectId, query) {
        var sel = document.getElementById(selectId);
        if (!sel) return;
        var q = String(query || '').toLowerCase().trim();
        var firstMatch = null, total = 0, shown = 0;
        for (var i = 0; i < sel.options.length; i++) {
          var opt = sel.options[i];
          if (!opt.value) { opt.style.display = ''; continue; }
          total++;
          var label = (opt.textContent || '').toLowerCase();
          var match = !q || label.indexOf(q) !== -1;
          opt.style.display = match ? '' : 'none';
          if (match) {
            shown++;
            if (!firstMatch) firstMatch = opt;
          }
        }
        if (sel.value) {
          var current = sel.querySelector('option[value="' + sel.value.replace(/"/g, '\\"') + '"]');
          if (current && current.style.display === 'none') {
            sel.value = firstMatch ? firstMatch.value : '';
          }
        }
      };
      function renderRoomBlock(r, s, isHariH) {
        var sups = (r.supervisors || []).filter(function (sup) {
          return String(sup.status || 'active') === 'active';
        });
        var html = '<div class="mx-4 sm:mx-5 mb-3 bg-white border border-slate-200 rounded-xl overflow-hidden">'
          + '<div class="px-4 py-2.5 bg-violet-50 border-b border-violet-100">'
          + '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">'
          + '<div class="flex items-center gap-2">'
          + '<svg class="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>'
          + '<div class="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">'
          + '<span class="text-sm font-bold text-violet-700 truncate">' + escHtml(r.room_name) + '</span>'
          + '<span class="text-xs text-slate-500">' + escHtml(r.subject) + ' &middot; Kelas ' + escHtml(r.class_name) + '</span>'
          + '</div></div>'
          + '<div class="hidden sm:flex items-center gap-1">'
          + '<button onclick="exam_openRoomModal(\'' + s.id + '\', \'' + r.id + '\')" class="action-btn action-btn-edit" data-tooltip="Edit Ruang"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>'
          + '<button onclick="exam_deleteRoom(\'' + r.id + '\')" class="action-btn action-btn-delete" data-tooltip="Hapus Ruang"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>'
          + '</div></div></div>'
          + '<div class="px-4 py-2.5">';
        if (!sups.length) {
          html += '<div class="flex items-center justify-between">'
            + '<p class="text-xs text-slate-400 italic">Belum ada pengawas</p>'
            + '<button onclick="exam_openSupModal(\'' + r.id + '\')" class="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg hover:bg-amber-100 transition">+ Pengawas</button></div>';
        } else {
          sups.forEach(function (sup) {
            var isConf = !!(sup.confirmed_by && sup.confirmed_by.trim());
            var isSub = sup.is_substitute === true || String(sup.is_substitute) === 'true';
            var hasBap = sup.has_bap;
            html += '<div class="flex items-center gap-2 py-1 flex-wrap">'
              + '<div class="flex-1 min-w-0">'
              + '<span class="text-sm font-semibold text-slate-700">' + escHtml(sup.guru_name) + '</span>';
            if (isSub) {
              var origName = getTeacherName(sup.original_user_id);
              html += ' <span class="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">'
                + '↩ Menggantikan ' + escHtml(origName) + '</span>';
            }
            if (hasBap) {
              html += ' <span class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">📋 BAP Terkirim</span>';
            }
            html += ' <span class="text-xs text-slate-400 font-medium">' + (sup.jtm_val || 0) + ' JTM</span>';
            html += '</div><div class="hidden sm:flex items-center gap-1 flex-wrap">';
            if (isConf) {
              html += '<span class="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Hadir</span>';
            } else {
              html += '<span class="text-xs text-slate-400">Belum dikonfirmasi</span>';
            }
            if (isHariH) {
              if (!isConf) {
                html += '<button onclick="exam_confirmSup(\'' + sup.id + '\')" class="text-xs text-white bg-emerald-600 px-2 py-0.5 rounded-lg hover:bg-emerald-700 transition font-semibold">Konfirmasi</button>';
              } else {
                html += '<button onclick="exam_revokeSup(\'' + sup.id + '\', false)" class="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg hover:bg-red-100 transition font-semibold">Cabut</button>';
              }
              if (isSub) {
                html += '<button onclick="exam_cancelSubst(\'' + sup.id + '\',\'supervisor\')" class="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg hover:bg-orange-100 transition font-semibold">Batal Ganti</button>';
              } else {
                html += '<button onclick="exam_openSubstModal(\'' + sup.id + '\',\'supervisor\')" class="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg hover:bg-rose-100 transition font-semibold">Ganti</button>';
              }
            } else {
              if (isSub) {
                html += '<button onclick="exam_cancelSubst(\'' + sup.id + '\',\'supervisor\')" class="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg hover:bg-orange-100 transition font-semibold">Batal Ganti</button>';
              } else {
                html += '<button onclick="exam_openSubstModal(\'' + sup.id + '\',\'supervisor\')" class="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg hover:bg-rose-100 transition font-semibold">Ganti</button>';
              }
            }
            if (!isConf && !isSub) {
              html += '<button onclick="exam_editSupModal(\'' + sup.id + '\')" title="Edit pengawas (ganti guru / JTM)" class="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg hover:bg-blue-100 transition font-semibold">'
                + '<svg class="w-3 h-3 inline -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
                + ' Edit</button>';
              html += '<button onclick="exam_removeSup(\'' + sup.id + '\')" title="Hapus pengawas dari jadwal" class="text-xs text-red-400 hover:text-red-600 transition font-semibold">✕</button>';
            }
            html += '</div>';
            html += '<div class="sm:hidden w-full flex flex-col gap-1.5 mt-2">';
            if (isConf) {
              html += '<div class="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg text-center">✓ Sudah Dikonfirmasi Hadir</div>';
            } else {
              html += '<div class="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-center italic">Belum dikonfirmasi hadir</div>';
            }
            if (isHariH) {
              if (!isConf) {
                html += '<button onclick="exam_confirmSup(\'' + sup.id + '\')" class="w-full text-sm font-semibold text-white bg-emerald-600 px-4 py-2.5 rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition min-h-[44px]">Konfirmasi Kehadiran</button>';
              } else {
                html += '<button onclick="exam_revokeSup(\'' + sup.id + '\', false)" class="w-full text-sm font-semibold text-red-600 bg-red-50 border border-red-300 px-4 py-2.5 rounded-lg hover:bg-red-100 active:scale-[0.98] transition min-h-[44px]">Cabut Konfirmasi</button>';
              }
              if (isSub) {
                html += '<button onclick="exam_cancelSubst(\'' + sup.id + '\',\'supervisor\')" class="w-full text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-300 px-4 py-2.5 rounded-lg hover:bg-orange-100 active:scale-[0.98] transition min-h-[44px]">Batalkan Penggantian</button>';
              } else {
                html += '<button onclick="exam_openSubstModal(\'' + sup.id + '\',\'supervisor\')" class="w-full text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-300 px-4 py-2.5 rounded-lg hover:bg-rose-100 active:scale-[0.98] transition min-h-[44px]">Ganti Pengawas</button>';
              }
            } else {
              if (isSub) {
                html += '<button onclick="exam_cancelSubst(\'' + sup.id + '\',\'supervisor\')" class="w-full text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-300 px-4 py-2.5 rounded-lg hover:bg-orange-100 active:scale-[0.98] transition min-h-[44px]">Batalkan Penggantian</button>';
              } else {
                html += '<button onclick="exam_openSubstModal(\'' + sup.id + '\',\'supervisor\')" class="w-full text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-300 px-4 py-2.5 rounded-lg hover:bg-rose-100 active:scale-[0.98] transition min-h-[44px]">Ganti Pengawas</button>';
              }
            }
            if (!isConf && !isSub) {
              html += '<button onclick="exam_editSupModal(\'' + sup.id + '\')" class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-300 px-4 py-2.5 rounded-lg hover:bg-blue-100 active:scale-[0.98] transition min-h-[44px]">'
                + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
                + 'Edit Pengawas</button>';
              html += '<button onclick="exam_removeSup(\'' + sup.id + '\')" class="w-full text-sm font-semibold text-red-600 bg-white border border-red-300 px-4 py-2.5 rounded-lg hover:bg-red-50 active:scale-[0.98] transition min-h-[44px]">Hapus Pengawas</button>';
            }
            html += '</div>';
            html += '</div>';
          });
          html += '<div class="mt-1.5 pt-1.5 border-t border-slate-100">'
            + '<button onclick="exam_openSupModal(\'' + r.id + '\')" class="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 transition">+ Tambah Pengawas</button></div>';
        }
        html += '</div>';
        html += '<div class="sm:hidden flex flex-col gap-1.5 px-4 pb-3 border-t border-slate-200 pt-3">'
          + '<button onclick="exam_openRoomModal(\'' + s.id + '\', \'' + r.id + '\')" class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 px-4 py-2.5 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition min-h-[44px]">'
          + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
          + 'Edit Ruang'
          + '</button>'
          + '<button onclick="exam_deleteRoom(\'' + r.id + '\')" class="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-red-600 bg-white border border-red-300 px-4 py-2.5 rounded-lg hover:bg-red-50 active:scale-[0.98] transition min-h-[44px]">'
          + '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
          + 'Hapus Ruang'
          + '</button>'
          + '</div>';
        html += '</div>';
        return html;
      }
      window.exam_openPeriodModal = function (id) {
        document.getElementById('inpExamPeriodId').value = id || '';
        document.getElementById('inpExamPeriodName').value = '';
        document.getElementById('inpExamPeriodStart').value = '';
        document.getElementById('inpExamPeriodEnd').value = '';
        document.getElementById('inpExamPeriodJtm').value = '';
        document.getElementById('inpExamPeriodDesc').value = '';
        document.getElementById('examPeriodModalTitle').textContent = id ? 'Edit Periode Ujian' : 'Buat Periode Ujian';
        if (id) {
          var p = ES.periods.find(function (x) { return x.id === id; });
          if (!p && ES.detail && ES.detail.period && ES.detail.period.id === id) p = ES.detail.period;
          if (p) {
            document.getElementById('inpExamPeriodName').value = p.name;
            document.getElementById('inpExamPeriodStart').value = p.date_start;
            document.getElementById('inpExamPeriodEnd').value = p.date_end;
            document.getElementById('inpExamPeriodJtm').value = p.jtm_committee_per_day;
            document.getElementById('inpExamPeriodDesc').value = p.description || '';
          }
        }
        if (typeof _examPeriodPreviewDuration === 'function') _examPeriodPreviewDuration();
        _examOpenModal('examPeriodModal', 'inpExamPeriodName');
      };
      window.exam_closePeriodModal = function () {
        if (_examModalIsLocked('examPeriodModal')) return;
        _examCloseModal('examPeriodModal');
      };
      window.exam_savePeriod = function () {
        var id = document.getElementById('inpExamPeriodId').value;
        var name = document.getElementById('inpExamPeriodName').value.trim();
        var start = document.getElementById('inpExamPeriodStart').value;
        var end = document.getElementById('inpExamPeriodEnd').value;
        var jtm = document.getElementById('inpExamPeriodJtm').value;
        var desc = document.getElementById('inpExamPeriodDesc').value.trim();
        if (!name) { showToast('Nama periode wajib diisi', 'error'); return; }
        if (!start || !end) { showToast('Tanggal mulai dan selesai wajib diisi', 'error'); return; }
        if (start > end) { showToast('Tanggal mulai tidak boleh setelah selesai', 'error'); return; }
        if (jtm === '' || isNaN(Number(jtm)) || Number(jtm) < 0) {
          showToast('Nilai JTM Panitia harus angka ≥ 0', 'error');
          return;
        }
        var saveBtn = document.getElementById('btnSaveExamPeriod');
        if (saveBtn && saveBtn.dataset.busy === 'true') return;
        var restore = _busyButton(saveBtn, 'Menyimpan...');
        _examModalLock('examPeriodModal', true);
        if (typeof exam_showLoading === 'function') {
          exam_showLoading('Menyimpan periode ujian...');
        }
        var data = { name: name, date_start: start, date_end: end, jtm_committee_per_day: Number(jtm), description: desc };
        if (id) data.id = id;
        var fn = id ? 'editExamPeriod' : 'addExamPeriod';
        google.script.run
          .withSuccessHandler(function (res) {
            restore();
            _examModalLock('examPeriodModal', false);
            if (typeof exam_hideLoading === 'function') {
              exam_hideLoading();
            }
            if (res && res.status === 'success') {
              exam_closePeriodModal();
              showToast(res.message);
              loadData();
              if (id) refreshDetail();
            } else {
              showToast((res && res.message) || 'Gagal menyimpan periode', 'error');
            }
          })
          .withFailureHandler(function (err) {
            restore();
            _examModalLock('examPeriodModal', false);
            if (typeof exam_hideLoading === 'function') {
              exam_hideLoading();
            }
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          })
        [fn](token, data);
      };
      window.exam_deletePeriod = function (id, force) {
        if (!force) {
          showConfirm('Hapus Periode Ujian', 'Yakin ingin menghapus periode ini beserta semua sesi, ruang, dan jadwal terkait?', function () {
            exam_deletePeriod(id, true);
          });
          return;
        }
        exam_showLoading('Menghapus periode ujian...');
        google.script.run
          .withSuccessHandler(function (res) {
            exam_hideLoading();
            if (res.status === 'confirm_required') {
              showConfirm('⚠️ Data Konfirmasi Ditemukan', res.message, function () {
                exam_showLoading('Menghapus periode beserta semua data...');
                google.script.run
                  .withSuccessHandler(function (r2) {
                    exam_hideLoading();
                    if (r2.status === 'success') {
                      showToast(r2.message); ES.selPeriodId = null; loadData();
                      document.getElementById('examPeriodDetail').innerHTML = '';
                    } else showToast(r2.message, 'error');
                  })
                  .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
                  .deleteExamPeriod(token, id, true);
              });
            } else if (res.status === 'success') {
              showToast(res.message); ES.selPeriodId = null; loadData();
              document.getElementById('examPeriodDetail').innerHTML = '';
            } else { showToast(res.message, 'error'); }
          })
          .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
          .deleteExamPeriod(token, id, false);
      };
      window.exam_openSessionModal = function (periodId, sessionId, prefillDate) {
        document.getElementById('inpExamSessionId').value = sessionId || '';
        document.getElementById('inpExamSessionPeriodId').value = periodId || (ES.detail ? ES.detail.period.id : '');
        document.getElementById('inpExamSessionDate').value = prefillDate || '';
        document.getElementById('inpExamSessionName').value = '';
        document.getElementById('inpExamSessionStart').value = '';
        document.getElementById('inpExamSessionEnd').value = '';
        document.getElementById('inpExamSessionJtm').value = '';
        document.getElementById('examSessionModalTitle').textContent = sessionId ? 'Edit Sesi Ujian' : 'Tambah Sesi Ujian';
        if (sessionId && ES.detail) {
          var s = (ES.detail.sessions || []).find(function (x) { return x.id === sessionId; });
          if (s) {
            document.getElementById('inpExamSessionDate').value = s.date;
            document.getElementById('inpExamSessionName').value = s.session_name;
            document.getElementById('inpExamSessionStart').value = s.time_start;
            document.getElementById('inpExamSessionEnd').value = s.time_end;
            document.getElementById('inpExamSessionJtm').value = s.jtm_val;
          }
        }
        if (typeof _examSessionPreviewDuration === 'function') _examSessionPreviewDuration();
        _examOpenModal('examSessionModal', 'inpExamSessionDate');
      };
      window.exam_closeSessionModal = function () {
        if (_examModalIsLocked('examSessionModal')) return;
        _examCloseModal('examSessionModal');
      };
      window.exam_saveSession = function () {
        var id = document.getElementById('inpExamSessionId').value;
        var periodId = document.getElementById('inpExamSessionPeriodId').value;
        var date = document.getElementById('inpExamSessionDate').value;
        var name = document.getElementById('inpExamSessionName').value.trim();
        var ts = document.getElementById('inpExamSessionStart').value;
        var te = document.getElementById('inpExamSessionEnd').value;
        var jtm = document.getElementById('inpExamSessionJtm').value;
        if (!date) { showToast('Tanggal sesi wajib diisi', 'error'); return; }
        if (!name) { showToast('Nama sesi wajib diisi', 'error'); return; }
        if (!ts || !te) { showToast('Jam mulai dan selesai wajib diisi', 'error'); return; }
        if (ts >= te) { showToast('Jam mulai harus sebelum jam selesai', 'error'); return; }
        if (jtm === '' || isNaN(Number(jtm)) || Number(jtm) < 0) {
          showToast('Nilai JTM harus angka ≥ 0', 'error');
          return;
        }
        var saveBtn = document.getElementById('btnSaveExamSession');
        if (saveBtn && saveBtn.dataset.busy === 'true') return;
        var restore = _busyButton(saveBtn, 'Menyimpan...');
        _examModalLock('examSessionModal', true);
        var data = id
          ? { id: id, session_name: name, time_start: ts, time_end: te, jtm_val: Number(jtm) }
          : { period_id: periodId, date: date, session_name: name, time_start: ts, time_end: te, jtm_val: Number(jtm) };
        google.script.run
          .withSuccessHandler(function (res) {
            restore();
            _examModalLock('examSessionModal', false);
            if (res && res.status === 'success') {
              exam_closeSessionModal();
              showToast(res.message);
              refreshDetail();
            } else {
              showToast((res && res.message) || 'Gagal menyimpan sesi', 'error');
            }
          })
          .withFailureHandler(function (err) {
            restore();
            _examModalLock('examSessionModal', false);
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          })
        [id ? 'editExamSession' : 'addExamSession'](token, data);
      };
      window.exam_deleteSession = function (id) {
        showConfirm('Hapus Sesi', 'Hapus sesi ini beserta semua ruang dan pengawas terkait?', function () {
          exam_showLoading('Menghapus sesi ujian...');
          google.script.run
            .withSuccessHandler(function (res) {
              if (res.status === 'success') { showToast(res.message); refreshDetail(); }
              else { exam_hideLoading(); showToast(res.message, 'error'); }
            })
            .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
            .deleteExamSession(token, id);
        });
      };
      window.exam_openRoomModal = function (sessionId, roomId) {
        document.getElementById('inpExamRoomId').value = roomId || '';
        document.getElementById('inpExamRoomSessionId').value = sessionId || '';
        document.getElementById('inpExamRoomName').value = '';
        document.getElementById('inpExamRoomSubject').value = '';
        document.getElementById('inpExamRoomClass').value = '';
        document.getElementById('inpExamRoomTotalSiswa').value = '';
        document.getElementById('examRoomModalTitle').textContent = roomId ? 'Edit Ruang Ujian' : 'Tambah Ruang Ujian';
        if (roomId && ES.detail) {
          var found = null;
          (ES.detail.sessions || []).forEach(function (s) { (s.rooms || []).forEach(function (r) { if (r.id === roomId) found = r; }); });
          if (found) {
            document.getElementById('inpExamRoomName').value = found.room_name;
            document.getElementById('inpExamRoomSubject').value = found.subject;
            document.getElementById('inpExamRoomClass').value = found.class_name;
            document.getElementById('inpExamRoomTotalSiswa').value = found.total_siswa || '';
          }
        }
        _examOpenModal('examRoomModal', 'inpExamRoomName');
      };
      window.exam_closeRoomModal = function () {
        if (_examModalIsLocked('examRoomModal')) return;
        _examCloseModal('examRoomModal');
      };
      window.exam_saveRoom = function () {
        var id = document.getElementById('inpExamRoomId').value;
        var sessionId = document.getElementById('inpExamRoomSessionId').value;
        var name = document.getElementById('inpExamRoomName').value.trim();
        var subject = document.getElementById('inpExamRoomSubject').value.trim();
        var cls = document.getElementById('inpExamRoomClass').value.trim();
        var totalSiswa = document.getElementById('inpExamRoomTotalSiswa').value.trim();
        if (!name) { showToast('Nama/nomor ruang wajib diisi', 'error'); return; }
        if (!subject) { showToast('Mata ujian wajib diisi', 'error'); return; }
        if (!cls) { showToast('Nama kelas wajib diisi', 'error'); return; }
        if (totalSiswa !== '' && (isNaN(Number(totalSiswa)) || Number(totalSiswa) < 0)) {
          showToast('Total siswa harus angka dan tidak boleh negatif', 'error');
          return;
        }
        var saveBtn = document.getElementById('btnSaveExamRoom');
        if (saveBtn && saveBtn.dataset.busy === 'true') return;
        var restore = _busyButton(saveBtn, 'Menyimpan...');
        _examModalLock('examRoomModal', true);
        var data = id
          ? { id: id, room_name: name, subject: subject, class_name: cls, total_siswa: totalSiswa }
          : { session_id: sessionId, room_name: name, subject: subject, class_name: cls, total_siswa: totalSiswa };
        google.script.run
          .withSuccessHandler(function (res) {
            restore();
            _examModalLock('examRoomModal', false);
            if (res && res.status === 'success') {
              exam_closeRoomModal();
              showToast(res.message);
              refreshDetail();
            } else {
              showToast((res && res.message) || 'Gagal menyimpan ruang', 'error');
            }
          })
          .withFailureHandler(function (err) {
            restore();
            _examModalLock('examRoomModal', false);
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          })
        [id ? 'editExamRoom' : 'addExamRoom'](token, data);
      };
      window.exam_deleteRoom = function (id) {
        showConfirm('Hapus Ruang', 'Hapus ruang ini beserta semua pengawas yang ditugaskan?', function () {
          exam_showLoading('Menghapus ruang ujian...');
          google.script.run
            .withSuccessHandler(function (res) {
              if (res.status === 'success') { showToast(res.message); refreshDetail(); }
              else { exam_hideLoading(); showToast(res.message, 'error'); }
            })
            .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
            .deleteExamRoom(token, id);
        });
      };
      window.exam_openSupModal = function (roomId, supId) {
        var idEl = document.getElementById('inpExamSupId');
        if (idEl) idEl.value = supId || '';
        document.getElementById('inpExamSupRoomId').value = roomId;
        var roomInfo = '', sessionJtm = 0, currentSup = null;
        if (ES.detail) {
          (ES.detail.sessions || []).forEach(function (s) {
            (s.rooms || []).forEach(function (r) {
              if (r.id === roomId) {
                roomInfo = escHtml(r.room_name) + ' — ' + escHtml(s.session_name);
                sessionJtm = s.jtm_val;
                if (supId) {
                  (r.supervisors || []).forEach(function (sup) {
                    if (String(sup.id) === String(supId)) currentSup = sup;
                  });
                }
              }
            });
          });
        }
        var titleEl = document.getElementById('examSupModalTitle');
        var subEl = document.getElementById('examSupModalSub');
        var hintEl = document.getElementById('examSupHint');
        var saveBtn = document.getElementById('btnSaveExamSup');
        if (supId) {
          if (titleEl) titleEl.textContent = 'Edit Pengawas';
          if (subEl) subEl.textContent = roomInfo || 'Perbarui guru pengawas atau JTM';
          if (hintEl) hintEl.textContent = 'Mengubah guru: konflik di sesi yang sama akan dicegah otomatis.';
          if (saveBtn) saveBtn.textContent = 'Simpan Perubahan';
        } else {
          if (titleEl) titleEl.textContent = 'Tetapkan Pengawas';
          if (subEl) subEl.textContent = roomInfo || 'Pilih guru pengawas ruang';
          if (hintEl) hintEl.textContent = 'Guru Panitia Ujian diperbolehkan merangkap sebagai Pengawas Ruang di hari yang sama.';
          if (saveBtn) saveBtn.textContent = 'Tetapkan';
        }
        populateTeacherSelect('inpExamSupTeacher');
        var jtmEl = document.getElementById('inpExamSupJtm');
        if (currentSup) {
          var sel = document.getElementById('inpExamSupTeacher');
          if (sel) sel.value = String(currentSup.user_id || '');
          if (jtmEl) jtmEl.value = (currentSup.jtm_val !== undefined && currentSup.jtm_val !== null && currentSup.jtm_val !== '')
            ? Number(currentSup.jtm_val) : (sessionJtm || '');
        } else {
          if (jtmEl) jtmEl.value = sessionJtm || '';
        }
        _examOpenModal('examSupModal', 'inpExamSupTeacher');
        var searchInp = document.getElementById('inpExamSupTeacherSearch');
        if (searchInp) searchInp.value = '';
        var supSel = document.getElementById('inpExamSupTeacher');
        if (supSel) {
          for (var i = 0; i < supSel.options.length; i++) supSel.options[i].style.display = '';
        }
      };
      window.exam_closeSupModal = function () {
        if (_examModalIsLocked('examSupModal')) return;
        _examCloseModal('examSupModal');
      };
      window.exam_editSupModal = function (supId) {
        if (!supId || !ES.detail) return;
        var roomId = null;
        (ES.detail.sessions || []).forEach(function (s) {
          (s.rooms || []).forEach(function (r) {
            (r.supervisors || []).forEach(function (sup) {
              if (String(sup.id) === String(supId)) roomId = r.id;
            });
          });
        });
        if (!roomId) {
          showToast('Data ruang untuk pengawas ini tidak ditemukan.', 'error');
          return;
        }
        window.exam_openSupModal(roomId, supId);
      };
      window.exam_saveAssignSup = function () {
        var supId = (document.getElementById('inpExamSupId') && document.getElementById('inpExamSupId').value) || '';
        var roomId = document.getElementById('inpExamSupRoomId').value;
        var userId = document.getElementById('inpExamSupTeacher').value;
        var jtmEl = document.getElementById('inpExamSupJtm');
        var jtm = jtmEl ? Number(jtmEl.value) : 0;
        if (!userId) { showToast('Pilih guru terlebih dahulu', 'error'); return; }
        if (isNaN(jtm) || jtm < 0) { showToast('Nilai JTM tidak valid', 'error'); return; }
        var saveBtn = document.getElementById('btnSaveExamSup');
        if (saveBtn && saveBtn.dataset.busy === 'true') return;
        var restore = _busyButton(saveBtn, supId ? 'Menyimpan...' : 'Menetapkan...');
        _examModalLock('examSupModal', true);
        var onDone = function (res) {
          restore();
          _examModalLock('examSupModal', false);
          if (res && res.status === 'success') {
            exam_closeSupModal();
            showToast(res.message);
            refreshDetail();
          } else {
            showToast((res && res.message) || (supId ? 'Gagal menyimpan perubahan' : 'Gagal menetapkan pengawas'), 'error');
          }
        };
        var onFail = function (err) {
          restore();
          _examModalLock('examSupModal', false);
          showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
        };
        if (supId) {
          google.script.run
            .withSuccessHandler(onDone)
            .withFailureHandler(onFail)
            .editExamSupervisor(token, { id: supId, user_id: userId, jtm_val: jtm });
        } else {
          google.script.run
            .withSuccessHandler(onDone)
            .withFailureHandler(onFail)
            .assignExamSupervisor(token, { room_id: roomId, user_id: userId, jtm_val: jtm });
        }
      };
      window.exam_removeSup = function (id) {
        showConfirm('Hapus Pengawas', 'Hapus pengawas ini dari jadwal?', function () {
          exam_showLoading('Menghapus pengawas...');
          google.script.run
            .withSuccessHandler(function (res) {
              if (res.status === 'success') { showToast(res.message); refreshDetail(); }
              else { exam_hideLoading(); showToast(res.message, 'error'); }
            })
            .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
            .removeExamSupervisor(token, id);
        });
      };
      window.exam_openComModal = function (periodId, date) {
        document.getElementById('inpExamComPeriodId').value = periodId;
        document.getElementById('inpExamComDate').value = date;
        document.getElementById('inpExamComDateDisplay').value = date;
        document.getElementById('examComModalSub').textContent = 'Tanggal: ' + fmtDate(date);
        populateTeacherSelect('inpExamComTeacher');
        _examOpenModal('examComModal', 'inpExamComTeacher');
        var searchInp = document.getElementById('inpExamComTeacherSearch');
        if (searchInp) searchInp.value = '';
        var comSel = document.getElementById('inpExamComTeacher');
        if (comSel) {
          for (var i = 0; i < comSel.options.length; i++) comSel.options[i].style.display = '';
        }
      };
      window.exam_closeComModal = function () {
        if (_examModalIsLocked('examComModal')) return;
        _examCloseModal('examComModal');
      };
      window.exam_saveAssignCom = function () {
        var periodId = document.getElementById('inpExamComPeriodId').value;
        var date = document.getElementById('inpExamComDate').value;
        var userId = document.getElementById('inpExamComTeacher').value;
        if (!userId) { showToast('Pilih guru terlebih dahulu', 'error'); return; }
        var saveBtn = document.getElementById('btnSaveExamCom');
        if (saveBtn && saveBtn.dataset.busy === 'true') return;
        var restore = _busyButton(saveBtn, 'Menetapkan...');
        _examModalLock('examComModal', true);
        if (typeof exam_showLoading === 'function') {
          exam_showLoading('Menetapkan panitia ujian...');
        }
        google.script.run
          .withSuccessHandler(function (res) {
            restore();
            _examModalLock('examComModal', false);
            if (typeof exam_hideLoading === 'function') {
              exam_hideLoading();
            }
            if (res && res.status === 'success') {
              exam_closeComModal();
              showToast(res.message);
              refreshDetail();
            } else {
              showToast((res && res.message) || 'Gagal menetapkan panitia', 'error');
            }
          })
          .withFailureHandler(function (err) {
            restore();
            _examModalLock('examComModal', false);
            if (typeof exam_hideLoading === 'function') {
              exam_hideLoading();
            }
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          })
          .assignExamCommittee(token, { period_id: periodId, date: date, user_id: userId });
      };
      window.exam_removeCom = function (id) {
        showConfirm('Hapus Panitia', 'Hapus panitia ini dari jadwal?', function () {
          exam_showLoading('Menghapus panitia...');
          google.script.run
            .withSuccessHandler(function (res) {
              if (res.status === 'success') { showToast(res.message); refreshDetail(); }
              else { exam_hideLoading(); showToast(res.message, 'error'); }
            })
            .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
            .removeExamCommittee(token, id);
        });
      };
      window.exam_confirmCom = function (id) {
        exam_showLoading('Mengonfirmasi kehadiran Panitia...');
        google.script.run
          .withSuccessHandler(function (res) {
            if (res.status === 'success') { showToast(res.message); refreshDetail(); }
            else { exam_hideLoading(); showToast(res.message, 'error'); }
          })
          .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
          .confirmCommitteeAttendance(token, id);
      };
      window.exam_revokeCom = function (id) {
        showConfirm('Cabut Konfirmasi Panitia', 'JTM Panitia akan dihapus dari honorarium. Lanjutkan?', function () {
          exam_showLoading('Mencabut konfirmasi kehadiran Panitia...');
          google.script.run
            .withSuccessHandler(function (res) {
              if (res.status === 'success') { showToast(res.message); refreshDetail(); }
              else { exam_hideLoading(); showToast(res.message, 'error'); }
            })
            .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
            .revokeCommitteeAttendance(token, id);
        });
      };
      window.exam_confirmSup = function (id) {
        exam_showLoading('Mengonfirmasi kehadiran Pengawas...');
        google.script.run
          .withSuccessHandler(function (res) {
            if (res.status === 'success') { showToast(res.message); refreshDetail(); }
            else { exam_hideLoading(); showToast(res.message, 'error'); }
          })
          .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
          .confirmSupervisorAttendance(token, id);
      };
      window.exam_revokeSup = function (id, force) {
        if (!force) {
          showConfirm('Cabut Konfirmasi Pengawas',
            'Jika BAP sudah disubmit, BAP akan terkunci dan JTM dihapus. Lanjutkan?',
            function () { exam_revokeSup(id, true); });
          return;
        }
        exam_showLoading('Mencabut konfirmasi Pengawas...');
        google.script.run
          .withSuccessHandler(function (res) {
            if (res.status === 'confirm_required') {
              exam_hideLoading();
              showConfirm('⚠️ BAP Sudah Disubmit', res.message, function () {
                exam_showLoading('Mencabut konfirmasi + menghapus JTM...');
                google.script.run
                  .withSuccessHandler(function (r2) {
                    if (r2.status === 'success') { showToast(r2.message); refreshDetail(); }
                    else { exam_hideLoading(); showToast(r2.message, 'error'); }
                  })
                  .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
                  .revokeSupervisorAttendance(token, id, true);
              });
            } else if (res.status === 'success') {
              showToast(res.message); refreshDetail();
            } else { exam_hideLoading(); showToast(res.message, 'error'); }
          })
          .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
          .revokeSupervisorAttendance(token, id, false);
      };
      window.exam_openSubstModal = function (id, type) {
        document.getElementById('inpExamSubstId').value = id;
        document.getElementById('inpExamSubstType').value = type;
        document.getElementById('examSubstModalTitle').textContent = type === 'committee' ? 'Ganti Panitia' : 'Ganti Pengawas';
        var info = '';
        if (type === 'supervisor' && ES.detail) {
          (ES.detail.sessions || []).forEach(function (s) {
            (s.rooms || []).forEach(function (r) {
              (r.supervisors || []).forEach(function (sup) {
                if (sup.id === id) info = '<div class="flex items-start gap-2"><svg class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg><div><div class="font-bold mb-0.5">Menggantikan: ' + escHtml(sup.guru_name) + '</div><div class="text-amber-600">' + escHtml(r.room_name) + ' &middot; ' + escHtml(s.session_name) + '</div></div></div>';
              });
            });
          });
        } else if (type === 'committee' && ES.detail) {
          (ES.detail.committee || []).forEach(function (c) {
            if (c.id === id) info = '<div class="flex items-start gap-2"><svg class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg><div><div class="font-bold mb-0.5">Menggantikan: ' + escHtml(c.guru_name) + '</div><div class="text-amber-600">Panitia &middot; ' + fmtDate(c.date) + '</div></div></div>';
          });
        }
        document.getElementById('examSubstInfo').innerHTML = info || 'Pilih guru pengganti.';
        populateTeacherSelect('inpExamSubstTeacher');
        _examOpenModal('examSubstModal', 'inpExamSubstTeacher');
        var searchInp = document.getElementById('inpExamSubstTeacherSearch');
        if (searchInp) searchInp.value = '';
        var substSel = document.getElementById('inpExamSubstTeacher');
        if (substSel) {
          for (var i = 0; i < substSel.options.length; i++) substSel.options[i].style.display = '';
        }
      };
      window.exam_closeSubstModal = function () {
        if (_examModalIsLocked('examSubstModal')) return;
        _examCloseModal('examSubstModal');
      };
      window.exam_saveSubst = function () {
        var id = document.getElementById('inpExamSubstId').value;
        var type = document.getElementById('inpExamSubstType').value;
        var userId = document.getElementById('inpExamSubstTeacher').value;
        if (!userId) { showToast('Pilih guru pengganti terlebih dahulu', 'error'); return; }
        var saveBtn = document.getElementById('btnSaveExamSubst');
        if (saveBtn && saveBtn.dataset.busy === 'true') return;
        var restore = _busyButton(saveBtn, 'Memproses...');
        _examModalLock('examSubstModal', true);
        var fn = type === 'committee' ? 'substituteExamCommittee' : 'substituteExamSupervisor';
        google.script.run
          .withSuccessHandler(function (res) {
            restore();
            _examModalLock('examSubstModal', false);
            if (res && res.status === 'success') {
              exam_closeSubstModal();
              showToast(res.message);
              refreshDetail();
            } else {
              showToast((res && res.message) || 'Gagal memproses penggantian', 'error');
            }
          })
          .withFailureHandler(function (err) {
            restore();
            _examModalLock('examSubstModal', false);
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          })
        [fn](token, id, userId);
      };
      window.exam_cancelSubst = function (id, type, force) {
        var fn = type === 'committee' ? 'cancelExamCommitteeSubstitution' : 'cancelExamSupervisorSubstitution';
        var label = type === 'committee' ? 'Panitia' : 'Pengawas';
        if (!force) {
          showConfirm('Batalkan Penggantian ' + label,
            'Guru asli akan dikembalikan ke jadwal. Lanjutkan?',
            function () { exam_cancelSubst(id, type, true); });
          return;
        }
        exam_showLoading('Membatalkan penggantian ' + label + '...');
        google.script.run
          .withSuccessHandler(function (res) {
            if (res.status === 'confirm_required') {
              exam_hideLoading();
              showConfirm('⚠️ ' + res.message.split('.')[0], res.message, function () {
                exam_showLoading('Membatalkan penggantian + menghapus JTM...');
                google.script.run
                  .withSuccessHandler(function (r2) {
                    if (r2.status === 'success') { showToast(r2.message); refreshDetail(); }
                    else { exam_hideLoading(); showToast(r2.message, 'error'); }
                  })
                  .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
                [fn](token, id, true);
              });
            } else if (res.status === 'success') {
              showToast(res.message); refreshDetail();
            } else { exam_hideLoading(); showToast(res.message, 'error'); }
          })
          .withFailureHandler(function () { exam_hideLoading(); showToast('Koneksi gagal', 'error'); })
        [fn](token, id, false);
      };
      window.exam_loadRekapJtm = function () {
        if (!ES.selPeriodId) { showToast('Pilih periode terlebih dahulu', 'info'); return; }
        var cont = document.getElementById('examJtmContent');
        if (cont) cont.innerHTML = '<div class="flex justify-center py-16"><div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>';
        google.script.run
          .withSuccessHandler(function (res) {
            if (res.status !== 'success') {
              if (cont) cont.innerHTML = '<div class="text-center py-12 text-red-500 text-sm font-bold">' + escHtml(res.message || 'Gagal memuat rekap JTM') + '</div>';
              showToast(res.message, 'error');
              return;
            }
            var p = res.period, data = res.recap_jtm || [];
            var html = '<div class="mb-4"><h2 class="text-lg font-bold text-slate-800">Rekap JTM — ' + escHtml(p.name) + '</h2>'
              + '<p class="text-sm text-slate-500">' + fmtDate(p.date_start) + ' s.d. ' + fmtDate(p.date_end) + '</p></div>'
              + '<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">'
              + '<table class="w-full text-sm"><thead class="bg-slate-50 border-b border-slate-200"><tr>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">No</th>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nama Guru</th>'
              + '<th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">JTM Pengawas</th>'
              + '<th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">JTM Panitia</th>'
              + '<th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Total JTM</th>'
              + '<th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">BAP Tersubmit</th>'
              + '</tr></thead><tbody>';
            if (!data.length) {
              html += '<tr><td colspan="6" class="px-4 py-12 text-center text-slate-400 italic">Belum ada data JTM.</td></tr>';
            } else {
              data.forEach(function (g, idx) {
                html += '<tr class="border-b hover:bg-slate-50 transition">'
                  + '<td class="px-4 py-3 text-slate-500">' + (idx + 1) + '</td>'
                  + '<td class="px-4 py-3 font-semibold text-slate-800">' + escHtml(g.guru_name) + '</td>'
                  + '<td class="px-4 py-3 text-center"><span class="font-bold text-blue-600">' + g.jtm_supervisor + '</span>'
                  + '<span class="text-slate-400 text-xs ml-1">(' + g.bap_submitted + ' BAP)</span></td>'
                  + '<td class="px-4 py-3 text-center font-bold text-cyan-600">' + g.jtm_committee + '</td>'
                  + '<td class="px-4 py-3 text-center"><span class="font-bold text-emerald-600 text-base">' + g.total_jtm + '</span></td>'
                  + '<td class="px-4 py-3 text-center">' + (g.bap_submitted > 0
                    ? '<span class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ ' + g.bap_submitted + ' BAP</span>'
                    : '<span class="text-xs text-slate-400">—</span>') + '</td></tr>';
              });
            }
            html += '</tbody></table></div>';
            if (cont) cont.innerHTML = html;
          })
          .withFailureHandler(function (err) {
            if (cont) {
              cont.innerHTML = '<div class="flex flex-col items-center justify-center py-12 text-center">'
                + '<div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">'
                + '<svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"/></svg>'
                + '</div>'
                + '<p class="text-slate-700 font-bold text-sm mb-1">Gagal Memuat Rekap JTM</p>'
                + '<p class="text-slate-400 text-xs mb-3">' + escHtml(String(err)) + '</p>'
                + '<button type="button" onclick="exam_loadRekapJtm()" class="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">Coba Lagi</button>'
                + '</div>';
            }
            showToast('Koneksi gagal: ' + err, 'error');
          })
          .getExamRecapData(token, ES.selPeriodId);
      };
      window.exam_loadRekapBap = function () {
        if (!ES.selPeriodId) { showToast('Pilih periode terlebih dahulu', 'info'); return; }
        var cont = document.getElementById('examBapContent');
        if (cont) cont.innerHTML = '<div class="flex justify-center py-16"><div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>';
        google.script.run
          .withSuccessHandler(function (res) {
            if (res.status !== 'success') {
              if (cont) cont.innerHTML = '<div class="text-center py-12 text-red-500 text-sm font-bold">' + escHtml(res.message || 'Gagal memuat rekap BAP') + '</div>';
              showToast(res.message, 'error');
              return;
            }
            var p = res.period, data = res.recap_bap || [];
            var html = '<div class="mb-4"><h2 class="text-lg font-bold text-slate-800">Rekap BAP — ' + escHtml(p.name) + '</h2>'
              + '<p class="text-sm text-slate-500">' + fmtDate(p.date_start) + ' s.d. ' + fmtDate(p.date_end) + ' &nbsp;·&nbsp; ' + data.length + ' BAP disubmit</p></div>'
              + '<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">'
              + '<table class="w-full text-sm whitespace-nowrap"><thead class="bg-slate-50 border-b border-slate-200"><tr>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tanggal</th>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Sesi</th>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Ruang</th>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Pengawas</th>'
              + '<th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">JTM</th>'
              + '<th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Hadir</th>'
              + '<th class="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Absen</th>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Catatan</th>'
              + '<th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Submit</th>'
              + '</tr></thead><tbody>';
            if (!data.length) {
              html += '<tr><td colspan="9" class="px-4 py-12 text-center text-slate-400 italic">Belum ada BAP yang disubmit.</td></tr>';
            } else {
              data.forEach(function (b) {
                html += '<tr class="border-b hover:bg-slate-50 transition">'
                  + '<td class="px-4 py-3 text-slate-700">' + fmtDate(b.date) + '</td>'
                  + '<td class="px-4 py-3 text-slate-600">' + escHtml(b.session_name) + '<br><span class="text-xs text-slate-400">' + fmtTime(b.time_start) + ' – ' + fmtTime(b.time_end) + '</span></td>'
                  + '<td class="px-4 py-3 text-slate-600">' + escHtml(b.room_name) + '<br><span class="text-xs text-slate-400">' + escHtml(b.subject) + ' / Kls ' + escHtml(b.class_name) + '</span></td>'
                  + '<td class="px-4 py-3 font-semibold text-slate-800">' + escHtml(b.guru_name) + (b.is_substitute ? '<br><span class="text-xs text-amber-600">(Pengganti)</span>' : '') + '</td>'
                  + '<td class="px-4 py-3 text-center font-bold text-blue-600">' + b.jtm_val + '</td>'
                  + '<td class="px-4 py-3 text-center font-bold text-emerald-600">' + b.peserta_hadir + '</td>'
                  + '<td class="px-4 py-3 text-center font-bold text-red-500">' + b.peserta_absen + '</td>'
                  + '<td class="px-4 py-3 text-slate-500 max-w-xs whitespace-normal">' + escHtml(b.catatan || '—') + '</td>'
                  + '<td class="px-4 py-3 text-slate-400 text-xs">' + (function (ts) {
                    if (!ts) return '-';
                    var d = new Date(ts);
                    if (isNaN(d.getTime())) return ts;
                    var day = String(d.getDate()).padStart(2, '0');
                    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
                    var month = months[d.getMonth()];
                    var year = String(d.getFullYear()).substring(2);
                    var hh = String(d.getHours()).padStart(2, '0');
                    var mm = String(d.getMinutes()).padStart(2, '0');
                    return day + ' ' + month + ' ' + year + ' ' + hh + ':' + mm;
                  })(b.submitted_at) + '</td>'
                  + '</tr>';
              });
            }
            html += '</tbody></table></div>';
            if (cont) cont.innerHTML = html;
          })
          .withFailureHandler(function (err) {
            if (cont) {
              cont.innerHTML = '<div class="flex flex-col items-center justify-center py-12 text-center">'
                + '<div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">'
                + '<svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"/></svg>'
                + '</div>'
                + '<p class="text-slate-700 font-bold text-sm mb-1">Gagal Memuat Rekap BAP</p>'
                + '<p class="text-slate-400 text-xs mb-3">' + escHtml(String(err)) + '</p>'
                + '<button type="button" onclick="exam_loadRekapBap()" class="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">Coba Lagi</button>'
                + '</div>';
            }
            showToast('Koneksi gagal: ' + err, 'error');
          })
          .getExamRecapData(token, ES.selPeriodId);
      };
      loadData();
    }
    