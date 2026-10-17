function renderCeremonyAdmin(info) {
      const card = document.getElementById('cardCeremonyAdmin');
      if (card) card.classList.remove('hidden');
      const panel = document.getElementById('panelCeremonyToday');
      if (!panel) return;
      if (!info.is_ceremony_day) {
        panel.innerHTML = `
             <div class="flex flex-col items-center justify-center py-2 text-slate-400">
                <span class="text-2xl mb-1">📅</span>
                <p class="font-bold text-sm">Hari Ini Bukan Jadwal Upacara</p>
                <p class="text-[10px]">Panel status aktif hanya pada hari Senin.</p>
             </div>`;
        renderUpcomingCeremonies(info.upcoming);
        return;
      }
      if (!info.data) {
        panel.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
              <p class="text-red-600 font-bold mb-1">Belum ada pembina hari ini.</p>
              <p class="text-xs text-slate-500">Silakan atur jadwal di tab "Atur Jadwal".</p>
            </div>`;
        renderUpcomingCeremonies(info.upcoming);
        return;
      }
      const safeUid = _jsStr(info.data.user_id);
      const safeName = _jsStr(info.data.name);
      const dispName = escapeHtml(info.data.name || '-');
      const statusBadge = info.data.is_confirmed
        ? `<span class="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              Terkonfirmasi · +5 JTM
            </span>`
        : `<span class="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">
              <span class="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block"></span>
              Belum Dikonfirmasi
            </span>`;
      let btns = '';
      if (info.data.is_confirmed) {
        btns = `<button onclick="revokeCeremonyAction('${safeUid}', '${safeName}', this)" class="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition">Batalkan</button>`;
      } else {
        btns = `<div class="flex gap-2 justify-center flex-wrap">
              <button onclick="confirmCeremonyAction('${safeUid}', '${safeName}', this)" class="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Konfirmasi
              </button>
              <button onclick="openSubModalCeremony('${safeUid}', '${safeName}')" class="inline-flex items-center gap-1 bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-yellow-600 transition shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                Ganti
              </button>
          </div>`;
      }
      panel.innerHTML = `
         <div class="mb-2">
            <p class="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Pembina Hari Ini</p>
            <p class="text-base font-bold text-slate-800" style="word-break:break-word;">${dispName}</p>
            <div class="mt-2">${statusBadge}</div>
         </div>
         <div class="mt-3">${btns}</div>`;
      renderUpcomingCeremonies(info.upcoming);
    }
    function renderCeremonyPicket(info, currentUserId) {
      const panel = document.getElementById('panelCeremonyGuru');
      if (!panel) return;
      if (!info.is_ceremony_day) {
        panel.innerHTML = `
             <div class="flex flex-col items-center justify-center py-4 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <span class="text-2xl mb-1">📅</span>
                <p class="font-bold text-sm">Bukan Jadwal Upacara</p>
                <p class="text-xs mt-0.5">Hari ini bukan hari Senin.</p>
             </div>`;
        return;
      }
      if (!info.data) {
        panel.innerHTML = `
            <div class="bg-yellow-50 text-yellow-800 p-4 rounded-lg border border-yellow-200 text-center">
                <p class="font-bold">Belum ada Pembina Upacara</p>
                <p class="text-xs">Hubungi admin untuk pengaturan jadwal.</p>
            </div>`;
        return;
      }
      const isMe = String(info.data.user_id) === String(currentUserId);
      const safeUid = _jsStr(info.data.user_id);
      const safeName = _jsStr(info.data.name);
      const dispName = escapeHtml(info.data.name || '-');
      const statusBadge = info.data.is_confirmed
        ? `<span class="inline-flex items-center justify-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 w-full mt-2">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              Terkonfirmasi · +5 JTM
            </span>`
        : `<span class="inline-flex items-center justify-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 w-full mt-2">
              <span class="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block"></span>
              Menunggu Konfirmasi
            </span>`;
      let actionBtn = '';
      if (isMe && !info.data.is_confirmed) {
        actionBtn = `
            <div class="mt-3 pt-3 border-t border-slate-100">
                <p class="text-xs text-center text-slate-500 mb-2">Anda bertugas hari ini?</p>
                <button onclick="confirmCeremonyAction('${safeUid}', '${safeName}', this)" class="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    Konfirmasi Kehadiran
                </button>
            </div>`;
      }
      panel.innerHTML = `
         <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p class="text-[10px] text-slate-500 uppercase font-bold mb-1 text-center tracking-wider">Pembina Upacara Hari Ini</p>
            <p class="text-lg font-bold text-slate-800 text-center" style="word-break:break-word;">${dispName}</p>
            ${statusBadge}
            ${actionBtn}
         </div>`;
    }
    