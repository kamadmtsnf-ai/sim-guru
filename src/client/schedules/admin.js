function initManageSchedule() {
      populateGlobalClassSelects();
      if (globalConfig) {
        const tf = document.getElementById('filterTahunPelajaran');
        if (tf && !tf.value) tf.value = globalConfig.tahun_pelajaran || '';
        const sf = document.getElementById('filterSemester');
        if (sf && !sf.value) sf.value = globalConfig.semester || '';
      }
      const token = localStorage.getItem('auth_token');
      const tbody = document.getElementById('tbodyManageSchedule');
      if (tbody) tbody.innerHTML = skeletonTableRows(7, 5);
      cachedSchedules = cachedSchedules || [];
      _updateFilterIndicators();
      google.script.run.withSuccessHandler((data) => {
        cachedSchedules = data || [];
        applyScheduleFilters();
      }).withFailureHandler((err) => {
        if (tbody) tbody.innerHTML = errorTableRows(7, 'Gagal memuat jadwal: ' + (err && err.message ? err.message : err), 'initManageSchedule()');
      }).getAllSchedulesAdmin(token);
      if (Array.isArray(window._allUsersCache) && window._allUsersCache.length) {
        _populateScheduleTeacherSelect(window._allUsersCache);
      } else {
        google.script.run.withSuccessHandler((users) => {
          if (Array.isArray(users)) window._allUsersCache = users;
          _populateScheduleTeacherSelect(users || []);
        }).getAllUsers(token);
      }
      if (Array.isArray(window._subjectsCache) && window._subjectsCache.length) {
        _populateScheduleSubjectSelect(window._subjectsCache);
      } else {
        google.script.run.withSuccessHandler((res) => {
          if (res && res.status === 'success' && res.subjects) {
            window._subjectsCache = res.subjects;
            _populateScheduleSubjectSelect(res.subjects);
          } else if (res && res.message) {
            console.error("Gagal memuat mata pelajaran:", res.message);
          }
        }).getSettingsMasterData(token);
      }
    }
    function _populateScheduleTeacherSelect(users) {
      const sel = document.getElementById('inpSchedTeacher');
      if (!sel) return;
      let html = '<option value="">Pilih Guru...</option>';
      (users || []).filter(u => u.role === 'guru').forEach(u => {
        html += '<option value="' + escapeHtml(String(u.id)) + '">' + escapeHtml(u.full_name || '') + '</option>';
      });
      sel.innerHTML = html;
    }
    function _populateScheduleSubjectSelect(subjects) {
      const sel = document.getElementById('inpSchedSubject');
      if (!sel) return;
      let html = '<option value="">Pilih Mapel...</option>';
      (subjects || []).forEach(s => {
        const v = escapeHtml(s.name || '');
        html += '<option value="' + v + '">' + v + '</option>';
      });
      sel.innerHTML = html;
    }
    function _updateFilterIndicators() {
      const search = (document.getElementById('filterSearch') || {}).value || '';
      const day = (document.getElementById('filterDay') || {}).value || '';
      const cls = (document.getElementById('filterClass') || {}).value || '';
      const tp = ((document.getElementById('filterTahunPelajaran') || {}).value || '').trim().toLowerCase();
      const sem = (document.getElementById('filterSemester') || {}).value || '';
      const activeTP = (typeof globalConfig !== 'undefined' && globalConfig && globalConfig.tahun_pelajaran) ? globalConfig.tahun_pelajaran.toLowerCase() : '';
      const activeSem = (typeof globalConfig !== 'undefined' && globalConfig && globalConfig.semester) ? globalConfig.semester : '';
      let activeCount = 0;
      if (search.trim()) activeCount++;
      if (day) activeCount++;
      if (cls) activeCount++;
      if (tp && tp !== activeTP) activeCount++;
      if (sem && sem !== activeSem) activeCount++;
      const badge = document.getElementById('badgeFilterActive');
      const badgeCount = document.getElementById('badgeFilterActiveCount');
      const btnClearAll = document.getElementById('btnClearFilters');
      const btnClearSearch = document.getElementById('btnClearSearch');
      if (badge && badgeCount) {
        if (activeCount > 0) {
          badge.classList.remove('hidden');
          badge.classList.add('inline-flex');
          badgeCount.textContent = String(activeCount);
        } else {
          badge.classList.add('hidden');
          badge.classList.remove('inline-flex');
        }
      }
      if (btnClearAll) btnClearAll.classList.toggle('hidden', activeCount === 0);
      if (btnClearSearch) btnClearSearch.classList.toggle('hidden', !search);
    }
    function clearScheduleSearch() {
      var s = document.getElementById('filterSearch');
      if (s) { s.value = ''; s.focus(); }
      applyScheduleFilters();
    }
    function clearScheduleFilters() {
      var s = document.getElementById('filterSearch'); if (s) s.value = '';
      var d = document.getElementById('filterDay'); if (d) d.value = '';
      var c = document.getElementById('filterClass'); if (c) c.value = '';
      var t = document.getElementById('filterTahunPelajaran'); 
      if (t) t.value = (typeof globalConfig !== 'undefined' && globalConfig) ? globalConfig.tahun_pelajaran || '' : '';
      var m = document.getElementById('filterSemester'); 
      if (m) m.value = (typeof globalConfig !== 'undefined' && globalConfig) ? globalConfig.semester || '' : '';
      applyScheduleFilters();
    }
    function applyScheduleFilters() {
      if (!Array.isArray(cachedSchedules)) cachedSchedules = [];
      const search = ((document.getElementById('filterSearch') || {}).value || '').toLowerCase();
      const day = (document.getElementById('filterDay') || {}).value || '';
      const cls = (document.getElementById('filterClass') || {}).value || '';
      const tp = ((document.getElementById('filterTahunPelajaran') || {}).value || '').trim().toLowerCase();
      const sem = (document.getElementById('filterSemester') || {}).value || '';
      const activeTP = (typeof globalConfig !== 'undefined' && globalConfig && globalConfig.tahun_pelajaran) ? globalConfig.tahun_pelajaran.toLowerCase() : '';
      const activeSem = (typeof globalConfig !== 'undefined' && globalConfig && globalConfig.semester) ? globalConfig.semester : '';
      let filtered = cachedSchedules.filter(s => {
        const matchSearch = !search ||
          ((s.guru_name || '').toLowerCase().includes(search) ||
            (s.subject || '').toLowerCase().includes(search));
        const matchDay = day === "" || String(s.day_index) === String(day);
        const matchClass = cls === "" || String(s.class_name) === String(cls);
        const sTP = s.tahun_pelajaran ? String(s.tahun_pelajaran).toLowerCase() : activeTP;
        const sSem = s.semester ? String(s.semester) : activeSem;
        const matchTP = tp === "" || sTP.includes(tp);
        const matchSem = sem === "" || sSem === sem;
        return matchSearch && matchDay && matchClass && matchTP && matchSem;
      });
      filtered.sort((a, b) => {
        if (Number(a.day_index) !== Number(b.day_index)) {
          return Number(a.day_index) - Number(b.day_index);
        }
        return (a.time_start || '').localeCompare(b.time_start || '');
      });
      filteredSchedules = filtered;
      renderManageScheduleTable(filtered);
      _updateFilterIndicators();
    }
    function renderManageScheduleTable(schedules) {
      const tbody = document.getElementById('tbodyManageSchedule');
      if (!tbody) return;
      schedules = Array.isArray(schedules) ? schedules : [];
      const totalAll = (cachedSchedules || []).length;
      const totalJadwal = schedules.length;
      const uniqueDays = [...new Set(schedules.map(s => s.day_index))].length;
      const uniqueGuru = [...new Set(schedules.map(s => String(s.user_id)))].length;
      const totalJTM = schedules.reduce((acc, s) => acc + Number(s.jtm_val || 0), 0);
      const _st = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      _st('statTotalJadwal', totalJadwal);
      _st('statTotalHari', uniqueDays);
      _st('statTotalGuru', uniqueGuru);
      _st('statTotalJTM', totalJTM);
      const lbl = document.getElementById('labelJadwalCount');
      if (lbl) {
        if (totalJadwal === totalAll) {
          lbl.textContent = totalJadwal + ' jadwal';
        } else {
          lbl.textContent = totalJadwal + ' / ' + totalAll + ' jadwal';
        }
      }
      if (schedules.length === 0) {
        const search = ((document.getElementById('filterSearch') || {}).value || '').trim();
        const day = (document.getElementById('filterDay') || {}).value || '';
        const cls = (document.getElementById('filterClass') || {}).value || '';
        const tp = ((document.getElementById('filterTahunPelajaran') || {}).value || '').trim().toLowerCase();
        const sem = (document.getElementById('filterSemester') || {}).value || '';
        const activeTP = (typeof globalConfig !== 'undefined' && globalConfig && globalConfig.tahun_pelajaran) ? globalConfig.tahun_pelajaran.toLowerCase() : '';
        const activeSem = (typeof globalConfig !== 'undefined' && globalConfig && globalConfig.semester) ? globalConfig.semester : '';
        const hasFilter = !!(search || day || cls || (tp && tp !== activeTP) || (sem && sem !== activeSem));
        if (hasFilter) {
          tbody.innerHTML = `<tr><td colspan="8" class="py-2"><div class="error-state-container">
          <div class="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3 mx-auto border border-amber-100">
            <svg class="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <p class="text-slate-600 font-bold text-sm">Tidak ada jadwal yang cocok</p>
          <p class="text-slate-400 text-xs mt-1">Coba ubah atau bersihkan filter pencarian</p>
          <button type="button" onclick="clearScheduleFilters()" class="mt-3 inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold transition">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            Reset Filter
          </button>
        </div></td></tr>`;
        } else {
          tbody.innerHTML = `<tr><td colspan="8" class="py-2"><div class="error-state-container">
          <div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3 mx-auto border border-blue-100">
            <svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <p class="text-slate-600 font-bold text-sm">Belum ada jadwal pelajaran</p>
          <p class="text-slate-400 text-xs mt-1">Tambahkan jadwal pertama untuk memulai</p>
          <button type="button" onclick="openScheduleModal()" class="mt-3 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            Tambah Jadwal
          </button>
        </div></td></tr>`;
        }
        return;
      }
      const DAY_CFG = {
        'Senin': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
        'Selasa': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        'Rabu': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
        'Kamis': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
        'Jumat': { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
        'Sabtu': { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
      };
      const AVATAR_COLORS = [
        'from-blue-400 to-blue-600',
        'from-emerald-400 to-teal-500',
        'from-violet-400 to-purple-600',
        'from-amber-400 to-orange-500',
        'from-pink-400 to-rose-500',
        'from-cyan-400 to-blue-500',
        'from-indigo-400 to-violet-600',
        'from-green-400 to-emerald-600',
      ];
      let html = '';
      schedules.forEach((s, idx) => {
        const tStart = formatTimeID(s.time_start);
        const tEnd = formatTimeID(s.time_end);
        const dayName = String(s.day_name || '');
        const dcfg = DAY_CFG[dayName] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
        const guruName = String(s.guru_name || '?');
        const subject = String(s.subject || '-');
        const className = String(s.class_name || '-');
        const initials = guruName.split(' ').slice(0, 2).map(n => (n[0] || '').toUpperCase()).join('') || '?';
        let avatarIdx = 0;
        for (let i = 0; i < guruName.length; i++) avatarIdx = (avatarIdx * 31 + guruName.charCodeAt(i)) >>> 0;
        const avatarGradient = AVATAR_COLORS[avatarIdx % AVATAR_COLORS.length];
        const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';
        const argId = _escJsArg(s.id);
        const argUserId = _escJsArg(s.user_id);
        const argDayIdx = _escJsArg(s.day_index);
        const argStart = _escJsArg(s.time_start);
        const argEnd = _escJsArg(s.time_end);
        const argClass = _escJsArg(className);
        const argSubject = _escJsArg(subject);
        const argJtm = _escJsArg(s.jtm_val);
        const argTP = _escJsArg(s.tahun_pelajaran || '');
        const argSem = _escJsArg(s.semester || '');
        html += `
        <tr data-sched-id="${escapeHtml(String(s.id || ''))}" class="${rowBg} hover:bg-blue-50/50 transition-colors duration-100 border-b border-slate-100 last:border-0">
          <td class="px-5 py-3.5 text-center">
            <input type="checkbox" class="schedule-checkbox w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer" value="${escapeHtml(String(s.id || ''))}" onclick="updateScheduleCheckboxes()">
          </td>
          <td class="px-5 py-3.5">
            <span class="inline-flex items-center gap-1.5 ${dcfg.bg} ${dcfg.text} px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide">
              <span class="w-1.5 h-1.5 rounded-full ${dcfg.dot} flex-shrink-0"></span>
              ${escapeHtml(dayName)}
            </span>
          </td>
          <td class="px-5 py-3.5">
            <div class="font-mono text-xs font-bold text-slate-700 leading-tight">${escapeHtml(tStart)}</div>
            <div class="font-mono text-[10px] text-slate-400 mt-0.5">${escapeHtml(tEnd)}</div>
          </td>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0 shadow-sm">
                ${escapeHtml(initials)}
              </div>
              <span class="font-semibold text-slate-800 text-sm">${escapeHtml(guruName)}</span>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <span class="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold">
              ${escapeHtml(className)}
            </span>
          </td>
          <td class="px-5 py-3.5 text-slate-600 text-sm">${escapeHtml(subject)}</td>
          <td class="px-5 py-3.5 text-center">
            <span class="inline-flex items-center justify-center w-8 h-7 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-extrabold">
              ${escapeHtml(String(s.jtm_val || ''))}
            </span>
          </td>
          <td class="px-5 py-3.5">
            <div class="flex items-center justify-center gap-1.5">
              ${actionBtn('edit', `editScheduleAction('${argId}', '${argUserId}', '${argDayIdx}', '${argStart}', '${argEnd}', '${argClass}', '${argSubject}', '${argJtm}', '${argTP}', '${argSem}')`, 'Edit Jadwal')}
              ${actionBtn('delete', `deleteScheduleAction('${argId}', this)`, 'Hapus Jadwal')}
            </div>
          </td>
        </tr>`;
      });
      tbody.innerHTML = html;
      if (typeof updateScheduleCheckboxes === 'function') updateScheduleCheckboxes();
    }
    function _escJsArg(v) {
      return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
    }
    function openScheduleModal() {
      document.getElementById('scheduleModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      var form = document.getElementById('formSchedule');
      if (form) form.reset();
      document.getElementById('inpSchedId').value = '';
      document.getElementById('titleScheduleModal').textContent = 'Tambah Jadwal';
      populateGlobalClassSelects();
      _schedUpdateDuration();
      _schedClearConflict();
      setTimeout(function () {
        var el = document.getElementById('inpSchedDay');
        if (el) try { el.focus(); } catch (_) { }
      }, 200);
      var tpInput = document.getElementById('inpSchedTP');
      var semInput = document.getElementById('inpSchedSem');
      if (tpInput) {
        tpInput.value = (document.getElementById('filterTahunPelajaran') || {}).value || (globalConfig ? globalConfig.tahun_pelajaran : '') || '';
      }
      if (semInput) {
        semInput.value = (document.getElementById('filterSemester') || {}).value || (globalConfig ? globalConfig.semester : '') || 'Ganjil';
      }
    }
    function closeScheduleModal() {
      document.getElementById('scheduleModal').classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
      _schedClearConflict();
    }
    function _schedAutoCalcEnd() {
      var s = (document.getElementById('inpSchedStart') || {}).value;
      var jtm = (document.getElementById('inpSchedJTM') || {}).value;
      var rest = (document.getElementById('inpSchedRestTime') || {}).value;
      if (!s || !jtm) return;
      var jtmMin = (globalConfig && globalConfig.waktu_per_jtm) ? parseInt(globalConfig.waktu_per_jtm) : 40;
      var totalMin = (parseInt(jtm) * jtmMin) + (parseInt(rest) || 0);
      var sm = s.split(':');
      if (sm.length < 2) return;
      var startMin = (+sm[0]) * 60 + (+sm[1]);
      var endMin = startMin + totalMin;
      var h = Math.floor(endMin / 60) % 24;
      var m = endMin % 60;
      var hh = (h < 10 ? '0' : '') + h;
      var mm = (m < 10 ? '0' : '') + m;
      var endInput = document.getElementById('inpSchedEnd');
      if (endInput) endInput.value = hh + ':' + mm;
    }
    function _schedUpdateDuration() {
      var s = (document.getElementById('inpSchedStart') || {}).value;
      var e = (document.getElementById('inpSchedEnd') || {}).value;
      var box = document.getElementById('schedDurationPreview');
      var lbl = document.getElementById('schedDurationLabel');
      if (!box || !lbl) return;
      if (!s || !e) { box.classList.add('hidden'); return; }
      var sm = s.split(':'), em = e.split(':');
      if (sm.length < 2 || em.length < 2) { box.classList.add('hidden'); return; }
      var startMin = (+sm[0]) * 60 + (+sm[1]);
      var endMin = (+em[0]) * 60 + (+em[1]);
      var diff = endMin - startMin;
      if (diff <= 0) {
        box.classList.remove('hidden');
        box.classList.remove('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
        box.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
        lbl.textContent = 'Jam selesai harus lebih dari jam mulai';
        return;
      }
      box.classList.remove('hidden');
      box.classList.remove('bg-rose-50', 'border-rose-200', 'text-rose-700');
      box.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
      var hh = Math.floor(diff / 60);
      var mm = diff % 60;
      var label = (hh ? (hh + ' jam ') : '') + (mm ? (mm + ' menit') : '');
      lbl.textContent = 'Durasi: ' + label.trim();
    }
    function _schedClearConflict() {
      var w = document.getElementById('schedConflictWarning');
      if (w) w.classList.add('hidden');
    }
    function _schedCheckLocalConflict() {
      var idCur = (document.getElementById('inpSchedId') || {}).value || '';
      var teacherId = (document.getElementById('inpSchedTeacher') || {}).value || '';
      var dayIdx = (document.getElementById('inpSchedDay') || {}).value || '';
      var s = (document.getElementById('inpSchedStart') || {}).value || '';
      var e = (document.getElementById('inpSchedEnd') || {}).value || '';
      var cls = (document.getElementById('inpSchedClass') || {}).value || '';
      var inputTP = ((document.getElementById('inpSchedTP') || {}).value || '').trim().toLowerCase();
      var inputSem = (document.getElementById('inpSchedSem') || {}).value || '';
      var activeTP = (globalConfig && globalConfig.tahun_pelajaran) ? globalConfig.tahun_pelajaran.toLowerCase() : '';
      var activeSem = (globalConfig && globalConfig.semester) ? globalConfig.semester : '';
      var checkTP = inputTP || activeTP;
      var checkSem = inputSem || activeSem;
      var box = document.getElementById('schedConflictWarning');
      var msg = document.getElementById('schedConflictMessage');
      if (!box || !msg) return false;
      if (!teacherId || !dayIdx || !s || !e) { box.classList.add('hidden'); return false; }
      if (!Array.isArray(cachedSchedules)) { box.classList.add('hidden'); return false; }
      var sMin = (+s.split(':')[0]) * 60 + (+s.split(':')[1]);
      var eMin = (+e.split(':')[0]) * 60 + (+e.split(':')[1]);
      if (eMin <= sMin) { box.classList.add('hidden'); return false; }
      var conflicts = [];
      cachedSchedules.forEach(function (item) {
        if (String(item.id) === String(idCur)) return;
        if (String(item.day_index) !== String(dayIdx)) return;
        var itemTP = item.tahun_pelajaran ? String(item.tahun_pelajaran).toLowerCase() : activeTP;
        var itemSem = item.semester ? String(item.semester) : activeSem;
        if (checkTP && itemTP && itemTP !== checkTP) return;
        if (checkSem && itemSem && itemSem !== checkSem) return;
        var iS = String(item.time_start || ''); var iE = String(item.time_end || '');
        if (!iS || !iE) return;
        var iSMin = (+iS.split(':')[0]) * 60 + (+iS.split(':')[1]);
        var iEMin = (+iE.split(':')[0]) * 60 + (+iE.split(':')[1]);
        if (iEMin <= iSMin) return;
        var overlap = (sMin < iEMin) && (eMin > iSMin);
        if (!overlap) return;
        var sameTeacher = String(item.user_id) === String(teacherId);
        var sameClass = cls && String(item.class_name) === String(cls);
        if (sameTeacher) conflicts.push('Guru sudah mengajar (' + (item.subject || '-') + ' di kelas ' + (item.class_name || '-') + ' pukul ' + (iS.slice(0,5)) + ' - ' + (iE.slice(0,5)) + ')');
        else if (sameClass) conflicts.push('Kelas ' + cls + ' sudah ada jadwal (' + (item.subject || '-') + ' oleh ' + (item.guru_name || '-') + ' pukul ' + (iS.slice(0,5)) + ' - ' + (iE.slice(0,5)) + ')');
      });
      if (conflicts.length === 0) { box.classList.add('hidden'); return false; }
      box.classList.remove('hidden');
      msg.innerHTML = '<strong>Bentrok jadwal:</strong> ' + escapeHtml(conflicts[0]) + (conflicts.length > 1 ? ' (+' + (conflicts.length - 1) + ' lainnya)' : '');
      return true;
    }
    function editScheduleAction(id, userId, dayIdx, start, end, classNm, subject, jtm, tp, sem) {
      openScheduleModal();
      var deadline = Date.now() + 2500;
      var setIfReady = function () {
        var teacherSel = document.getElementById('inpSchedTeacher');
        var subjectSel = document.getElementById('inpSchedSubject');
        var classSel = document.getElementById('inpSchedClass');
        var ready = teacherSel && teacherSel.options.length > 1 &&
          subjectSel && subjectSel.options.length > 1 &&
          classSel && classSel.options.length > 0;
        if (!ready && Date.now() < deadline) {
          return setTimeout(setIfReady, 80);
        }
        document.getElementById('inpSchedId').value = id || '';
        if (teacherSel) teacherSel.value = userId || '';
        document.getElementById('inpSchedDay').value = dayIdx || '1';
        document.getElementById('inpSchedStart').value = start || '';
        document.getElementById('inpSchedEnd').value = end || '';
        if (classSel) classSel.value = classNm || '';
        if (subjectSel) subjectSel.value = subject || '';
        document.getElementById('inpSchedJTM').value = jtm || '';
        if (document.getElementById('inpSchedRestTime')) document.getElementById('inpSchedRestTime').value = '';
        if (document.getElementById('inpSchedTP')) {
          var tEl = document.getElementById('inpSchedTP');
          tEl.value = tp || tEl.value;
        }
        if (document.getElementById('inpSchedSem')) {
          var sEl = document.getElementById('inpSchedSem');
          sEl.value = sem || sEl.value;
        }
        document.getElementById('titleScheduleModal').textContent = 'Edit Jadwal Pelajaran';
        _schedUpdateDuration();
        _schedCheckLocalConflict();
      };
      setIfReady();
    }
    function submitSchedule() {
      const data = {
        id: document.getElementById('inpSchedId').value,
        user_id: document.getElementById('inpSchedTeacher').value,
        day_index: document.getElementById('inpSchedDay').value,
        time_start: document.getElementById('inpSchedStart').value,
        time_end: document.getElementById('inpSchedEnd').value,
        class_name: document.getElementById('inpSchedClass').value,
        subject: document.getElementById('inpSchedSubject').value,
        jtm_val: document.getElementById('inpSchedJTM').value,
        tahun_pelajaran: (document.getElementById('inpSchedTP') || {}).value || '',
        semester: (document.getElementById('inpSchedSem') || {}).value || ''
      };
      if (!data.user_id) return showToast('Pilih guru pengampu terlebih dahulu', 'error');
      if (!data.time_start || !data.time_end) return showToast('Lengkapi jam mulai dan jam selesai', 'error');
      if (data.time_end <= data.time_start) return showToast('Jam selesai harus lebih dari jam mulai', 'error');
      if (!data.class_name) return showToast('Pilih kelas terlebih dahulu', 'error');
      if (!data.subject) return showToast('Pilih mata pelajaran terlebih dahulu', 'error');
      var jtmNum = Number(data.jtm_val);
      if (!jtmNum || jtmNum < 1 || jtmNum > 10) return showToast('JTM harus antara 1 - 10', 'error');
      if (_schedCheckLocalConflict()) {
        showToast('Jadwal bentrok dengan jadwal yang sudah ada. Periksa peringatan di form.', 'error');
        return;
      }
      const btn = document.getElementById('btnSaveSchedule');
      var restore = (typeof _busyButton === 'function') ? _busyButton(btn, 'Menyimpan...') : function () { };
      const token = localStorage.getItem('auth_token');
      google.script.run.withSuccessHandler((res) => {
        restore();
        if (res && res.status === 'success') {
          showToast(data.id ? 'Jadwal berhasil diperbarui' : 'Jadwal baru berhasil ditambahkan', 'success');
          closeScheduleModal();
          reloadScheduleWithFilters();
        } else {
          showToast((res && res.message) || 'Gagal menyimpan jadwal', 'error');
        }
      }).withFailureHandler((err) => {
        restore();
        showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
      }).saveScheduleAdmin(token, data);
    }
    function deleteScheduleAction(id, btnEl) {
      showConfirm(
        'Hapus Jadwal',
        'Apakah Anda yakin ingin menghapus jadwal ini?',
        () => {
          var restoreBtn = (typeof _busyButton === 'function') ? _busyButton(btnEl, '') : function () { };
          var restoreRow = (typeof _setRowLoading === 'function') ? _setRowLoading(btnEl) : function () { };
          const token = localStorage.getItem('auth_token');
          google.script.run.withSuccessHandler((res) => {
            if (res && res.status === 'success') {
              showToast('Jadwal telah dihapus', 'success');
              reloadScheduleWithFilters();
            } else {
              restoreBtn(); restoreRow();
              showToast((res && res.message) || 'Gagal menghapus jadwal', 'error');
            }
          }).withFailureHandler((err) => {
            restoreBtn(); restoreRow();
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          }).deleteScheduleAdmin(token, id);
        }
      );
    }
    function toggleAllScheduleCheckboxes(source) {
      const checkboxes = document.querySelectorAll('.schedule-checkbox');
      checkboxes.forEach(cb => cb.checked = source.checked);
      updateDeleteSelectedButton();
    }
    function updateScheduleCheckboxes() {
      const checkboxes = document.querySelectorAll('.schedule-checkbox');
      const allChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(cb => cb.checked);
      const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
      const checkAll = document.getElementById('checkAllSchedules');
      if (checkAll) {
        checkAll.checked = allChecked;
        checkAll.indeterminate = anyChecked && !allChecked;
      }
      updateDeleteSelectedButton();
    }
    function updateDeleteSelectedButton() {
      const checkboxes = document.querySelectorAll('.schedule-checkbox:checked');
      const btn = document.getElementById('btnDeleteSelectedSchedules');
      if (btn) {
        if (checkboxes.length > 0) {
          btn.classList.remove('hidden');
          document.getElementById('countSelectedSchedules').textContent = checkboxes.length;
        } else {
          btn.classList.add('hidden');
        }
      }
    }
    function deleteSelectedSchedules() {
      const checkboxes = document.querySelectorAll('.schedule-checkbox:checked');
      const ids = Array.from(checkboxes).map(cb => cb.value);
      if (ids.length === 0) return;
      showConfirm(
        'Hapus Jadwal Terpilih?',
        `Anda akan menghapus ${ids.length} jadwal pelajaran. Tindakan ini tidak dapat dibatalkan!`,
        () => {
          const btn = document.getElementById('btnDeleteSelectedSchedules');
          var restoreBtn = (typeof _busyButton === 'function') ? _busyButton(btn, 'Menghapus...') : function () { };
          google.script.run.withSuccessHandler((res) => {
            restoreBtn();
            if (res && res.status === 'success') {
              showToast(res.message || `${ids.length} jadwal berhasil dihapus`, 'success');
              const checkAll = document.getElementById('checkAllSchedules');
              if (checkAll) {
                checkAll.checked = false;
                checkAll.indeterminate = false;
              }
              document.querySelectorAll('.schedule-checkbox').forEach(cb => cb.checked = false);
              updateDeleteSelectedButton();
              reloadScheduleWithFilters();
            } else {
              showToast((res && res.message) || 'Gagal menghapus jadwal', 'error');
            }
          }).withFailureHandler((err) => {
            restoreBtn();
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          }).deleteMultipleSchedulesAdmin(localStorage.getItem('auth_token'), ids);
        }
      );
    }
    