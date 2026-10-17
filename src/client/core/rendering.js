function skeletonTableRows(cols, rows) {
      rows = rows || 4;
      let html = '';
      for (let r = 0; r < rows; r++) {
        html += '<tr class="border-b">';
        for (let c = 0; c < cols; c++) {
          const widths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16'];
          const w = widths[c % widths.length];
          html += `<td class="px-4 py-3"><div class="skeleton h-4 ${w} rounded"></div></td>`;
        }
        html += '</tr>';
      }
      return html;
    }
    function errorStateHTML(message, retryFn) {
      const retryAttr = retryFn ? `onclick="${retryFn}"` : '';
      return `
      <div class="error-state-container">
        <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>
        <p class="text-slate-700 font-semibold text-sm mb-1">Gagal Memuat Data</p>
        <p class="text-slate-400 text-xs mb-4">${message || 'Terjadi kesalahan. Silakan coba lagi.'}</p>
        ${retryFn ? `<button ${retryAttr} class="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Coba Lagi
        </button>` : ''}
      </div>`;
    }
    function errorTableRows(cols, message, retryFn) {
      return `<tr><td colspan="${cols}" class="py-2">${errorStateHTML(message, retryFn)}</td></tr>`;
    }
    const ICON = {
      edit: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`,
      delete: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`,
      resetKey: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>`,
      view: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`,
      approve: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
      cancel: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
      present: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      swap: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>`,
    };
    function actionBtn(type, onclick, tooltip) {
      return `<button type="button" onclick="${onclick}" class="action-btn action-btn-${type}" data-tooltip="${tooltip}" title="${tooltip}">${ICON[type] || ICON.edit}</button>`;
    }
    function renderGreetingCard() {
      const name = localStorage.getItem('user_name') || 'Pengguna';
      const role = (localStorage.getItem('user_role') || 'guru').toLowerCase();
      const now = new Date();
      const hour = now.getHours();
      let greeting, greetingIcon, greetingGradient;
      if (hour >= 5 && hour < 11) { greeting = 'Selamat Pagi'; greetingIcon = '🌤️'; greetingGradient = 'from-amber-500 via-orange-500 to-rose-500'; }
      else if (hour >= 11 && hour < 15) { greeting = 'Selamat Siang'; greetingIcon = '☀️'; greetingGradient = 'from-sky-500 via-blue-500 to-cyan-500'; }
      else if (hour >= 15 && hour < 18) { greeting = 'Selamat Sore'; greetingIcon = '🌇'; greetingGradient = 'from-orange-500 via-rose-500 to-violet-500'; }
      else { greeting = 'Selamat Malam'; greetingIcon = '🌙'; greetingGradient = 'from-indigo-700 via-violet-700 to-slate-800'; }
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dayName = days[now.getDay()];
      const dateStr = `${dayName}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
      const liveTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const isAdmin = role === 'admin';
      const roleLabel = isAdmin ? 'Administrator' : 'Guru';
      const roleColor = isAdmin ? 'from-violet-600 to-indigo-600' : 'from-blue-600 to-cyan-600';
      const quotesGuru = [
        'Setiap pelajaran yang Anda berikan menanam benih masa depan.',
        'Mengajar adalah bentuk kebaikan yang gemanya melampaui kelas.',
        'Hari ini sebuah kesempatan baru untuk menginspirasi.',
        'Disiplin kecil hari ini menjadi prestasi besar besok.',
        'Catat jurnal, jaga progres, raih honor maksimal.'
      ];
      const quotesAdmin = [
        'Pengelolaan yang rapi adalah kunci sekolah yang produktif.',
        'Data hari ini adalah keputusan tepat besok.',
        'Pantau, evaluasi, dan beri umpan balik tepat waktu.',
        'Setiap konfirmasi mempercepat workflow guru.',
        'Disiplin administrasi = sekolah yang sehat.'
      ];
      const quoteList = isAdmin ? quotesAdmin : quotesGuru;
      const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
      const subMsg = quoteList[dayOfYear % quoteList.length];
      const avatarInitial = (name.charAt(0) || 'P').toUpperCase();
      let cardHTML = `
      <div id="greetingCard" class="greeting-card mb-6 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <div class="bg-gradient-to-br ${roleColor} p-5 sm:p-6 relative overflow-hidden">
          <div class="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none"></div>
          <div class="absolute -bottom-8 -right-2 w-24 h-24 rounded-full bg-white/5 pointer-events-none"></div>
          <div class="absolute top-4 right-16 w-10 h-10 rounded-full bg-white/10 pointer-events-none"></div>
          <div class="relative z-10 flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 backdrop-blur-sm border border-white/30">
              ${escapeHtml(avatarInitial)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white/85 text-xs font-medium tracking-wide uppercase mb-0.5">${greetingIcon} ${greeting}</p>
              <h2 class="text-white font-bold text-lg sm:text-xl leading-tight truncate">${escapeHtml(name)}</h2>
              <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                <span class="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/30">
                  ${isAdmin
          ? `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`
          : `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`
        }
                  ${roleLabel}
                </span>
                <span class="text-white/70 text-[10px] inline-flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  ${dateStr}
                </span>
                <span class="text-white/70 text-[10px] inline-flex items-center gap-1 font-mono">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span id="dashLiveClock">${liveTime}</span> WIB
                </span>
              </div>
            </div>
            <button onclick="refreshDashboard()" id="btnRefreshDashboard" class="hidden sm:flex relative z-10 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 items-center justify-center text-white transition flex-shrink-0" title="Perbarui data">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
          <p class="relative z-10 text-white/85 text-xs mt-3 leading-relaxed italic">"${escapeHtml(subMsg)}"</p>
        </div>
      </div>`;
      const targetId = isAdmin ? 'viewAdminDashboard' : 'viewGuruDashboard';
      const target = document.getElementById(targetId);
      if (target) {
        const existing = document.getElementById('greetingCard');
        if (existing) existing.remove();
        target.insertAdjacentHTML('afterbegin', cardHTML);
      }
    }
    