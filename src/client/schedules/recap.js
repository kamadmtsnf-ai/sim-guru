function reloadScheduleWithFilters() {
      const token = localStorage.getItem('auth_token');
      const tbody = document.getElementById('tbodyManageSchedule');
      if (!tbody) { initManageSchedule(); return; }
      tbody.innerHTML = skeletonTableRows(7, 5);
      google.script.run.withSuccessHandler((data) => {
        cachedSchedules = data || [];
        applyScheduleFilters();
        const savedId = document.getElementById('inpSchedId') ? document.getElementById('inpSchedId').value : '';
        if (savedId) {
          setTimeout(() => {
            const rows = document.querySelectorAll('#tbodyManageSchedule tr');
            rows.forEach(row => {
              if (row.innerHTML.includes(savedId)) {
                row.classList.add('bg-emerald-50');
                setTimeout(() => row.classList.remove('bg-emerald-50'), 1500);
              }
            });
          }, 100);
        }
      }).withFailureHandler((err) => {
        tbody.innerHTML = errorTableRows(7, 'Gagal memuat ulang jadwal: ' + err, 'reloadScheduleWithFilters()');
      }).getAllSchedulesAdmin(token);
    }
    function _buildRekapStatBadge(label, value, colorClass) {
      return `<div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
      <span class="text-white/80 text-xs">${escapeHtml(String(label))}:</span>
      <span class="text-white font-bold text-sm">${escapeHtml(String(value))}</span>
    </div>`;
    }
    function _getRekapSchedules() {
      if (!Array.isArray(cachedSchedules) || cachedSchedules.length === 0) return [];
      const tp = ((document.getElementById('filterTahunPelajaran') || {}).value || '').trim().toLowerCase();
      const sem = (document.getElementById('filterSemester') || {}).value || '';
      const activeTP = (globalConfig && globalConfig.tahun_pelajaran) ? globalConfig.tahun_pelajaran.toLowerCase() : '';
      const activeSem = (globalConfig && globalConfig.semester) ? globalConfig.semester : '';
      return cachedSchedules.filter(function (s) {
        var sTP = s.tahun_pelajaran ? String(s.tahun_pelajaran).toLowerCase() : activeTP;
        var sSem = s.semester ? String(s.semester) : activeSem;
        var matchTP = tp === '' || sTP.includes(tp);
        var matchSem = sem === '' || sSem === sem;
        return matchTP && matchSem;
      });
    }
    function openRekapKelas() {
      var rekapData = _getRekapSchedules();
      if (!rekapData || rekapData.length === 0) {
        showToast('Tidak ada data jadwal untuk tahun pelajaran atau semester yang aktif.', 'error');
        return;
      }
      document.getElementById('rekapKelasModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      var inp = document.getElementById('rekapKelasSearch');
      if (inp) inp.value = '';
      _renderRekapKelas(rekapData);
    }
    function closeRekapKelasModal() {
      document.getElementById('rekapKelasModal').classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    }
    function _renderRekapKelas(schedules) {
      const grouped = {};
      schedules.forEach(s => {
        const key = String(s.class_name);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });
      const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const numA = parseInt(a); const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
      const totalClasses = sortedKeys.length;
      const totalJadwal = schedules.length;
      const totalJtm = schedules.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
      const statsEl = document.getElementById('rekapKelasStats');
      if (statsEl) statsEl.innerHTML =
        _buildRekapStatBadge('Total Kelas', totalClasses) +
        _buildRekapStatBadge('Total Jadwal', totalJadwal) +
        _buildRekapStatBadge('Total JTM', totalJtm);
      const body = document.getElementById('rekapKelasBody');
      if (!body) return;
      const dayOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
      const kelasColors = ['violet', 'purple', 'indigo', 'blue', 'sky', 'teal', 'emerald', 'green', 'amber', 'orange', 'rose', 'pink'];
      const borderColors = {
        violet: 'border-violet-300', purple: 'border-purple-300', indigo: 'border-indigo-300',
        blue: 'border-blue-300', sky: 'border-sky-300', teal: 'border-teal-300',
        emerald: 'border-emerald-300', green: 'border-green-300', amber: 'border-amber-300',
        orange: 'border-orange-300', rose: 'border-rose-300', pink: 'border-pink-300'
      };
      const bgColors = {
        violet: 'bg-violet-50', purple: 'bg-purple-50', indigo: 'bg-indigo-50',
        blue: 'bg-blue-50', sky: 'bg-sky-50', teal: 'bg-teal-50',
        emerald: 'bg-emerald-50', green: 'bg-green-50', amber: 'bg-amber-50',
        orange: 'bg-orange-50', rose: 'bg-rose-50', pink: 'bg-pink-50'
      };
      const textColors = {
        violet: 'text-violet-700', purple: 'text-purple-700', indigo: 'text-indigo-700',
        blue: 'text-blue-700', sky: 'text-sky-700', teal: 'text-teal-700',
        emerald: 'text-emerald-700', green: 'text-green-700', amber: 'text-amber-700',
        orange: 'text-orange-700', rose: 'text-rose-700', pink: 'text-pink-700'
      };
      const badgeBg = {
        violet: 'bg-violet-100', purple: 'bg-purple-100', indigo: 'bg-indigo-100',
        blue: 'bg-blue-100', sky: 'bg-sky-100', teal: 'bg-teal-100',
        emerald: 'bg-emerald-100', green: 'bg-green-100', amber: 'bg-amber-100',
        orange: 'bg-orange-100', rose: 'bg-rose-100', pink: 'bg-pink-100'
      };
      let html = '';
      sortedKeys.forEach((kelas, idx) => {
        const items = grouped[kelas].sort((a, b) => {
          const da = dayOrder[a.day_name] || 9; const db = dayOrder[b.day_name] || 9;
          if (da !== db) return da - db;
          return (a.time_start || '').localeCompare(b.time_start || '');
        });
        const color = kelasColors[idx % kelasColors.length];
        const kelasJtm = items.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
        const kelasSafe = escapeHtml(kelas);
        html += `<div class="rounded-2xl border ${borderColors[color]} overflow-hidden shadow-sm">
        <div class="${bgColors[color]} px-5 py-3 flex items-center justify-between border-b ${borderColors[color]}">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl ${badgeBg[color]} ${textColors[color]} flex items-center justify-center font-black text-sm">${kelasSafe}</div>
            <div>
              <p class="font-bold ${textColors[color]} text-sm">Kelas ${kelasSafe}</p>
              <p class="text-xs text-slate-500">${items.length} jadwal · ${kelasJtm} JTM/minggu</p>
            </div>
          </div>
          <span class="inline-flex items-center gap-1 ${badgeBg[color]} ${textColors[color]} px-3 py-1 rounded-full text-xs font-bold border ${borderColors[color]}">${items.length} Sesi</span>
        </div>
        <div class="bg-white overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th class="px-4 py-2.5 text-left">Hari</th>
                <th class="px-4 py-2.5 text-left">Waktu</th>
                <th class="px-4 py-2.5 text-left">Guru Pengampu</th>
                <th class="px-4 py-2.5 text-left">Mata Pelajaran</th>
                <th class="px-4 py-2.5 text-center">JTM</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">`;
        items.forEach(s => {
          const guruName = String(s.guru_name || '?');
          const subject = String(s.subject || '-');
          const dayName = String(s.day_name || '-');
          html += `<tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-2.5 font-semibold text-slate-700">${escapeHtml(dayName)}</td>
          <td class="px-4 py-2.5 font-mono text-xs text-slate-500">${escapeHtml(formatTimeID(s.time_start))} – ${escapeHtml(formatTimeID(s.time_end))}</td>
          <td class="px-4 py-2.5">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full ${badgeBg[color]} ${textColors[color]} flex items-center justify-center text-[10px] font-bold flex-shrink-0">${escapeHtml(guruName.charAt(0).toUpperCase() || '?')}</div>
              <span class="font-medium text-slate-700 text-sm">${escapeHtml(guruName)}</span>
            </div>
          </td>
          <td class="px-4 py-2.5 text-slate-600">${escapeHtml(subject)}</td>
          <td class="px-4 py-2.5 text-center"><span class="inline-flex items-center justify-center ${badgeBg[color]} ${textColors[color]} w-8 h-7 rounded-lg text-xs font-bold">${escapeHtml(String(s.jtm_val || ''))}</span></td>
        </tr>`;
        });
        html += `</tbody></table></div></div>`;
      });
      body.innerHTML = html || '<p class="text-center text-slate-400 py-10 italic">Tidak ada data jadwal.</p>';
    }
    function openRekapGuru() {
      var rekapData = _getRekapSchedules();
      if (!rekapData || rekapData.length === 0) {
        showToast('Tidak ada data jadwal untuk tahun pelajaran atau semester yang aktif.', 'error');
        return;
      }
      document.getElementById('rekapGuruModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      var inp = document.getElementById('rekapGuruSearch');
      if (inp) inp.value = '';
      _renderRekapGuru(rekapData);
    }
    function closeRekapGuruModal() {
      document.getElementById('rekapGuruModal').classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    }
    function _renderRekapGuru(schedules) {
      const grouped = {};
      schedules.forEach(s => {
        const key = String(s.guru_name);
        if (!grouped[key]) grouped[key] = { name: s.guru_name, user_id: s.user_id, items: [] };
        grouped[key].items.push(s);
      });
      const sortedKeys = Object.keys(grouped).sort();
      const totalGuru = sortedKeys.length;
      const totalJadwal = schedules.length;
      const totalJtm = schedules.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
      const statsEl = document.getElementById('rekapGuruStats');
      if (statsEl) statsEl.innerHTML =
        _buildRekapStatBadge('Total Guru', totalGuru) +
        _buildRekapStatBadge('Total Jadwal', totalJadwal) +
        _buildRekapStatBadge('Total JTM', totalJtm);
      const body = document.getElementById('rekapGuruBody');
      if (!body) return;
      const dayOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
      let html = '';
      sortedKeys.forEach((namaGuru, idx) => {
        const { items } = grouped[namaGuru];
        const sorted = items.sort((a, b) => {
          const da = dayOrder[a.day_name] || 9; const db = dayOrder[b.day_name] || 9;
          if (da !== db) return da - db;
          return (a.time_start || '').localeCompare(b.time_start || '');
        });
        const guruJtm = items.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
        const initials = namaGuru.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        const uniqueSubjects = [...new Set(items.map(x => x.subject))];
        const uniqueClasses = [...new Set(items.map(x => String(x.class_name)))];
        const guruSafe = escapeHtml(namaGuru);
        html += `<div class="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-4 border-b border-slate-200">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-teal-200 flex-shrink-0">${escapeHtml(initials)}</div>
              <div>
                <p class="font-bold text-slate-800">${guruSafe}</p>
                <p class="text-xs text-slate-500 mt-0.5">${items.length} jadwal · <span class="font-semibold text-teal-600">${guruJtm} JTM/minggu</span></p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="flex flex-wrap gap-1 justify-end">
                ${uniqueClasses.map(c => `<span class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Kelas ${escapeHtml(c)}</span>`).join('')}
              </div>
              <div class="flex flex-wrap gap-1 justify-end mt-1">
                ${uniqueSubjects.slice(0, 3).map(s => `<span class="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">${escapeHtml(s || '')}</span>`).join('')}
                ${uniqueSubjects.length > 3 ? `<span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">+${uniqueSubjects.length - 3} lagi</span>` : ''}
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th class="px-4 py-2.5 text-left">Hari</th>
                <th class="px-4 py-2.5 text-left">Waktu</th>
                <th class="px-4 py-2.5 text-left">Kelas</th>
                <th class="px-4 py-2.5 text-left">Mata Pelajaran</th>
                <th class="px-4 py-2.5 text-center">JTM</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">`;
        sorted.forEach(s => {
          html += `<tr class="hover:bg-teal-50/30 transition-colors">
          <td class="px-4 py-2.5 font-semibold text-slate-700">${escapeHtml(String(s.day_name || '-'))}</td>
          <td class="px-4 py-2.5 font-mono text-xs text-slate-500">${escapeHtml(formatTimeID(s.time_start))} – ${escapeHtml(formatTimeID(s.time_end))}</td>
          <td class="px-4 py-2.5"><span class="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg text-xs font-bold">${escapeHtml(String(s.class_name || '-'))}</span></td>
          <td class="px-4 py-2.5 text-slate-600">${escapeHtml(String(s.subject || '-'))}</td>
          <td class="px-4 py-2.5 text-center"><span class="inline-flex items-center justify-center bg-teal-100 text-teal-700 w-8 h-7 rounded-lg text-xs font-bold">${escapeHtml(String(s.jtm_val || ''))}</span></td>
        </tr>`;
        });
        html += `</tbody>
            <tfoot class="bg-teal-50 border-t border-teal-100">
              <tr>
                <td colspan="4" class="px-4 py-2 text-right text-xs font-bold text-teal-600 uppercase tracking-wider">Total JTM per Minggu:</td>
                <td class="px-4 py-2 text-center"><span class="inline-flex items-center justify-center bg-teal-600 text-white w-10 h-7 rounded-lg text-xs font-bold">${guruJtm}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
      });
      body.innerHTML = html || '<p class="text-center text-slate-400 py-10 italic">Tidak ada data jadwal.</p>';
    }
    function openRekapHari() {
      var rekapData = _getRekapSchedules();
      if (!rekapData || rekapData.length === 0) {
        showToast('Tidak ada data jadwal untuk tahun pelajaran atau semester yang aktif.', 'error');
        return;
      }
      document.getElementById('rekapHariModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      var inp = document.getElementById('rekapHariSearch');
      if (inp) inp.value = '';
      _renderRekapHari(rekapData);
    }
    function closeRekapHariModal() {
      document.getElementById('rekapHariModal').classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    }
    function _renderRekapHari(schedules) {
      const dayOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
      const dayConfig = {
        'Senin': { color: 'blue', emoji: '🔵', gradient: 'from-blue-600 to-blue-700', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100' },
        'Selasa': { color: 'indigo', emoji: '🟣', gradient: 'from-indigo-600 to-indigo-700', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100' },
        'Rabu': { color: 'teal', emoji: '🟢', gradient: 'from-teal-600 to-teal-700', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badge: 'bg-teal-100' },
        'Kamis': { color: 'amber', emoji: '🟡', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100' },
        'Jumat': { color: 'emerald', emoji: '💚', gradient: 'from-emerald-600 to-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100' },
        'Sabtu': { color: 'rose', emoji: '🔴', gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100' },
      };
      const grouped = {};
      schedules.forEach(s => {
        const key = s.day_name;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });
      const sortedKeys = Object.keys(grouped).sort((a, b) => (dayOrder[a] || 9) - (dayOrder[b] || 9));
      const totalHari = sortedKeys.length;
      const totalJadwal = schedules.length;
      const maxHari = sortedKeys.reduce((max, h) => grouped[h].length > (grouped[max] || { length: 0 }).length ? h : max, sortedKeys[0]);
      const statsEl = document.getElementById('rekapHariStats');
      if (statsEl) statsEl.innerHTML =
        _buildRekapStatBadge('Hari Aktif', totalHari) +
        _buildRekapStatBadge('Total Jadwal', totalJadwal) +
        _buildRekapStatBadge('Tersibuk', maxHari + ' (' + (grouped[maxHari] || []).length + ' sesi)');
      const body = document.getElementById('rekapHariBody');
      if (!body) return;
      let html = '<div class="space-y-6">';
      sortedKeys.forEach(hari => {
        const items = grouped[hari].sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));
        const cfg = dayConfig[hari] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-100', gradient: 'from-slate-600 to-slate-700', emoji: '⚪' };
        const hariJtm = items.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
        const hariSafe = escapeHtml(String(hari || '-'));
        html += `<div class="rounded-2xl border ${cfg.border} overflow-hidden shadow-sm">
        <div class="${cfg.bg} px-5 py-3.5 border-b ${cfg.border} flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${cfg.emoji}</span>
            <div>
              <p class="font-bold ${cfg.text} text-base">${hariSafe}</p>
              <p class="text-xs text-slate-500">${items.length} sesi mengajar · ${hariJtm} total JTM</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="${cfg.badge} ${cfg.text} px-3 py-1 rounded-full text-xs font-bold border ${cfg.border}">${items.length} Jadwal</span>
            <span class="${cfg.badge} ${cfg.text} px-3 py-1 rounded-full text-xs font-bold border ${cfg.border}">${hariJtm} JTM</span>
          </div>
        </div>
        <div class="bg-white overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-100">
              <tr>
                <th class="px-4 py-2.5 text-left w-28">Waktu</th>
                <th class="px-4 py-2.5 text-left">Guru Pengampu</th>
                <th class="px-4 py-2.5 text-left">Kelas</th>
                <th class="px-4 py-2.5 text-left">Mata Pelajaran</th>
                <th class="px-4 py-2.5 text-center w-16">JTM</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">`;
        items.forEach(s => {
          const guruName = String(s.guru_name || '?');
          const initials = guruName.split(' ').slice(0, 2).map(n => (n[0] || '').toUpperCase()).join('') || '?';
          html += `<tr class="hover:${cfg.bg} transition-colors">
          <td class="px-4 py-2.5 font-mono text-xs font-semibold text-slate-600">${escapeHtml(formatTimeID(s.time_start))}<br><span class="text-slate-400">${escapeHtml(formatTimeID(s.time_end))}</span></td>
          <td class="px-4 py-2.5">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full ${cfg.badge} ${cfg.text} flex items-center justify-center text-[10px] font-bold flex-shrink-0">${escapeHtml(initials)}</div>
              <span class="font-medium text-slate-700">${escapeHtml(guruName)}</span>
            </div>
          </td>
          <td class="px-4 py-2.5"><span class="${cfg.badge} ${cfg.text} border ${cfg.border} px-2.5 py-1 rounded-lg text-xs font-bold">${escapeHtml(String(s.class_name || '-'))}</span></td>
          <td class="px-4 py-2.5 text-slate-600">${escapeHtml(String(s.subject || '-'))}</td>
          <td class="px-4 py-2.5 text-center"><span class="inline-flex items-center justify-center ${cfg.badge} ${cfg.text} w-8 h-7 rounded-lg text-xs font-bold">${escapeHtml(String(s.jtm_val || ''))}</span></td>
        </tr>`;
        });
        html += `</tbody></table></div></div>`;
      });
      html += '</div>';
      body.innerHTML = html || '<p class="text-center text-slate-400 py-10 italic">Tidak ada data jadwal.</p>';
    }
    function openRekapKelasHari() {
      var rekapData = _getRekapSchedules();
      if (!rekapData || rekapData.length === 0) {
        showToast('Tidak ada data jadwal untuk tahun pelajaran atau semester yang aktif.', 'error');
        return;
      }
      document.getElementById('rekapKelasHariModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      var inp = document.getElementById('rekapKelasHariSearch');
      if (inp) inp.value = '';
      _renderRekapKelasHari(rekapData);
    }
    function closeRekapKelasHariModal() {
      document.getElementById('rekapKelasHariModal').classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    }
    function _rekapFilter(bodyId, query) {
      var body = document.getElementById(bodyId);
      if (!body) return;
      var q = String(query || '').toLowerCase().trim();
      var groups = body.querySelectorAll(':scope > div');
      var totalShown = 0;
      groups.forEach(function (g) {
        if (g.className && g.className.indexOf('grid') >= 0 && g.children.length) {
          var anyShownInner = false;
          Array.prototype.forEach.call(g.children, function (child) {
            var visible = !q || (child.textContent || '').toLowerCase().indexOf(q) >= 0;
            child.style.display = visible ? '' : 'none';
            if (visible) anyShownInner = true;
          });
          g.style.display = anyShownInner ? '' : 'none';
          if (anyShownInner) totalShown++;
          return;
        }
        var visible = !q || (g.textContent || '').toLowerCase().indexOf(q) >= 0;
        g.style.display = visible ? '' : 'none';
        if (visible) totalShown++;
      });
    }
    function _renderRekapKelasHari(schedules) {
      const grouped = {};
      schedules.forEach(s => {
        const key = String(s.class_name);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });
      const sortedKelas = Object.keys(grouped).sort((a, b) => {
        const numA = parseInt(a); const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
      const totalKelas = sortedKelas.length;
      const totalJadwal = schedules.length;
      const totalJtm = schedules.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
      const statsEl = document.getElementById('rekapKelasHariStats');
      if (statsEl) statsEl.innerHTML =
        _buildRekapStatBadge('Total Kelas', totalKelas) +
        _buildRekapStatBadge('Total Jadwal', totalJadwal) +
        _buildRekapStatBadge('Total JTM', totalJtm);
      const body = document.getElementById('rekapKelasHariBody');
      if (!body) return;
      const dayOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
      const dayConfig = {
        'Senin': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100', dot: 'bg-blue-400' },
        'Selasa': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100', dot: 'bg-indigo-400' },
        'Rabu': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badge: 'bg-teal-100', dot: 'bg-teal-400' },
        'Kamis': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100', dot: 'bg-amber-400' },
        'Jumat': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100', dot: 'bg-emerald-400' },
        'Sabtu': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100', dot: 'bg-rose-400' },
      };
      const kelasPalette = [
        { header: 'bg-gradient-to-r from-sky-50 to-cyan-50', border: 'border-sky-200', avatar: 'bg-sky-600', shadow: 'shadow-sky-100' },
        { header: 'bg-gradient-to-r from-violet-50 to-purple-50', border: 'border-violet-200', avatar: 'bg-violet-600', shadow: 'shadow-violet-100' },
        { header: 'bg-gradient-to-r from-teal-50 to-emerald-50', border: 'border-teal-200', avatar: 'bg-teal-600', shadow: 'shadow-teal-100' },
        { header: 'bg-gradient-to-r from-blue-50 to-indigo-50', border: 'border-blue-200', avatar: 'bg-blue-600', shadow: 'shadow-blue-100' },
        { header: 'bg-gradient-to-r from-amber-50 to-yellow-50', border: 'border-amber-200', avatar: 'bg-amber-500', shadow: 'shadow-amber-100' },
        { header: 'bg-gradient-to-r from-rose-50 to-pink-50', border: 'border-rose-200', avatar: 'bg-rose-600', shadow: 'shadow-rose-100' },
        { header: 'bg-gradient-to-r from-indigo-50 to-blue-50', border: 'border-indigo-200', avatar: 'bg-indigo-600', shadow: 'shadow-indigo-100' },
        { header: 'bg-gradient-to-r from-emerald-50 to-green-50', border: 'border-emerald-200', avatar: 'bg-emerald-600', shadow: 'shadow-emerald-100' },
        { header: 'bg-gradient-to-r from-orange-50 to-amber-50', border: 'border-orange-200', avatar: 'bg-orange-500', shadow: 'shadow-orange-100' },
        { header: 'bg-gradient-to-r from-pink-50 to-rose-50', border: 'border-pink-200', avatar: 'bg-pink-600', shadow: 'shadow-pink-100' },
        { header: 'bg-gradient-to-r from-cyan-50 to-sky-50', border: 'border-cyan-200', avatar: 'bg-cyan-600', shadow: 'shadow-cyan-100' },
        { header: 'bg-gradient-to-r from-purple-50 to-violet-50', border: 'border-purple-200', avatar: 'bg-purple-600', shadow: 'shadow-purple-100' },
      ];
      let html = '';
      sortedKelas.forEach((kelas, idx) => {
        const items = grouped[kelas];
        const kelasJtm = items.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
        const cc = kelasPalette[idx % kelasPalette.length];
        const byDay = {};
        items.forEach(s => {
          const d = s.day_name;
          if (!byDay[d]) byDay[d] = [];
          byDay[d].push(s);
        });
        const sortedDays = Object.keys(byDay).sort((a, b) => (dayOrder[a] || 9) - (dayOrder[b] || 9));
        const activeDays = sortedDays.length;
        html += `<div class="rounded-2xl border ${cc.border} overflow-hidden shadow-sm">
        <div class="${cc.header} px-5 py-4 border-b ${cc.border}">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl ${cc.avatar} flex items-center justify-center text-white font-black text-sm shadow-lg ${cc.shadow} flex-shrink-0">${escapeHtml(String(kelas))}</div>
              <div>
                <p class="font-bold text-slate-800 text-base">Kelas ${escapeHtml(String(kelas))}</p>
                <p class="text-xs text-slate-500 mt-0.5">${items.length} jadwal &middot; <span class="font-semibold text-slate-700">${kelasJtm} JTM/minggu</span> &middot; ${activeDays} hari aktif</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5 justify-end">
              ${sortedDays.map(d => {
          const dc = dayConfig[d] || { badge: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
          return `<span class="inline-flex items-center gap-1 ${dc.badge} ${dc.text} px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${dc.border}">
                  <span class="w-1.5 h-1.5 rounded-full ${dc.dot} inline-block"></span>${escapeHtml(String(d))}</span>`;
        }).join('')}
            </div>
          </div>
        </div>
        <div class="divide-y divide-slate-100">`;
        sortedDays.forEach(hari => {
          const dayItems = byDay[hari].sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));
          const dc = dayConfig[hari] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-100', dot: 'bg-slate-400' };
          const hariJtm = dayItems.reduce((s, x) => s + Number(x.jtm_val || 0), 0);
          const hariSafe = escapeHtml(String(hari || '-'));
          html += `<div>
          <div class="${dc.bg} px-5 py-2.5 flex items-center justify-between border-b ${dc.border}">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${dc.dot} inline-block"></span>
              <span class="font-bold ${dc.text} text-xs uppercase tracking-wider">${hariSafe}</span>
              <span class="text-slate-400 text-xs">&middot;</span>
              <span class="text-slate-500 text-xs">${dayItems.length} sesi</span>
            </div>
            <span class="${dc.badge} ${dc.text} text-[10px] font-bold px-2 py-0.5 rounded-full border ${dc.border}">${hariJtm} JTM</span>
          </div>
          <div class="bg-white overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50/80 text-xs text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th class="px-4 py-2 text-left w-28">Waktu</th>
                  <th class="px-4 py-2 text-left">Guru Pengampu</th>
                  <th class="px-4 py-2 text-left">Mata Pelajaran</th>
                  <th class="px-4 py-2 text-center w-16">JTM</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">`;
          dayItems.forEach(s => {
            const guruName = String(s.guru_name || '?');
            const initials = guruName.split(' ').slice(0, 2).map(n => (n[0] || '').toUpperCase()).join('') || '?';
            html += `<tr class="hover:${dc.bg} transition-colors">
            <td class="px-4 py-2.5 font-mono text-xs font-semibold text-slate-600">${escapeHtml(formatTimeID(s.time_start))}<br><span class="text-slate-400">${escapeHtml(formatTimeID(s.time_end))}</span></td>
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full ${dc.badge} ${dc.text} flex items-center justify-center text-[10px] font-bold flex-shrink-0">${escapeHtml(initials)}</div>
                <span class="font-medium text-slate-700">${escapeHtml(guruName)}</span>
              </div>
            </td>
            <td class="px-4 py-2.5 text-slate-600">${escapeHtml(String(s.subject || '-'))}</td>
            <td class="px-4 py-2.5 text-center"><span class="inline-flex items-center justify-center ${dc.badge} ${dc.text} w-8 h-7 rounded-lg text-xs font-bold">${escapeHtml(String(s.jtm_val || ''))}</span></td>
          </tr>`;
          });
          html += `</tbody></table></div></div>`;
        });
        html += `</div></div>`;
      });
      body.innerHTML = html || '<p class="text-center text-slate-400 py-10 italic">Tidak ada data jadwal.</p>';
    }
    function downloadRekapDirectPDF(elementId, filenameBase, btnEl) {
      const element = document.getElementById(elementId);
      if (!element) return showToast('Elemen tidak ditemukan.', 'error');
      const filename = filenameBase.replace(/\s+/g, '_') + '_' + new Date().toLocaleDateString('id-ID').replace(/\//g, '-') + '.pdf';
      showToast('Menyiapkan PDF...', 'info');
      var restore = (btnEl && typeof _busyButton === 'function') ? _busyButton(btnEl, 'Menyiapkan...') : function () { };
      var hiddenEls = element.querySelectorAll('[style*="display: none"]');
      var restored = [];
      hiddenEls.forEach(function (el) { restored.push({ el: el, prev: el.getAttribute('data-prev-disp') }); });
      const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save().then(() => {
        restore();
        showToast('PDF berhasil diunduh!', 'success');
      }).catch(err => {
        restore();
        showToast('Gagal membuat PDF: ' + (err && err.message ? err.message : err), 'error');
      });
    }
    