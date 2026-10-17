function _renderPage_ExamPanitia_() {
return `<div class="flex h-screen overflow-hidden bg-slate-50">
  ${_sidebar()}
  <div class="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
    ${_navbar()}
    <main class="w-full grow p-4 sm:p-6 space-y-4">
      <!-- Hero Banner -->
      <div class="rounded-2xl shadow-lg overflow-hidden relative" style="background:linear-gradient(135deg,#064E3B 0%,#065F46 45%,#047857 100%);">
        <div class="absolute inset-0" style="background-image:radial-gradient(circle at 80% 20%, rgba(255,255,255,0.07) 1px, transparent 1px),radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 1px, transparent 1px);background-size:30px 30px, 20px 20px;"></div>
        <div class="absolute top-0 right-0 w-48 h-48 opacity-5" style="background:radial-gradient(circle,#fff 0%,transparent 70%);transform:translate(30%,-30%);"></div>
        <div class="relative z-10 px-5 sm:px-7 py-5 sm:py-6">
          <div class="flex items-start gap-4">
            <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-emerald-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-0.5">Panel Khusus Panitia</p>
              <h1 class="text-white font-extrabold text-lg sm:text-2xl leading-tight">Panitia Ujian</h1>
              <p class="text-emerald-100/80 text-xs sm:text-sm mt-1 leading-relaxed" id="examPanitiaSubtitle">Konfirmasi kehadiran &amp; substitusi pengawas ruang ujian.</p>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></div>
              <span class="text-emerald-200 text-xs font-medium">Sesi aktif otomatis terdeteksi</span>
            </div>
            <button id="btnRefreshExamPanitia" type="button" onclick="initExamPanitiaPage()"
              class="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all duration-150 flex-shrink-0">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Muat Ulang
            </button>
          </div>
        </div>
      </div>
      <!-- Period Info Card -->
      <div id="examPanitiaPeriodInfo" class="hidden bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Info Periode Ujian Aktif</p>
        </div>
        <div class="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-slate-400 mb-0.5">Periode</p>
            <p class="text-sm font-bold text-slate-800 truncate" id="examPanitiaPeriodName">—</p>
            <p class="text-xs text-slate-500 mt-0.5" id="examPanitiaPeriodRange">—</p>
          </div>
          <div class="flex-shrink-0 text-right">
            <p class="text-xs text-slate-400 mb-0.5">Hari Ini</p>
            <p class="text-sm font-bold text-slate-700" id="examPanitiaToday">—</p>
          </div>
        </div>
      </div>
      <!-- No Access Notice -->
      <div id="examPanitiaNoAccess" class="hidden bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"/>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-amber-900 text-sm" id="examPanitiaNoAccessTitle">Belum Dikonfirmasi sebagai Panitia</p>
            <p class="text-amber-700 text-xs mt-1 leading-relaxed" id="examPanitiaNoAccessMsg">
              Halaman ini akan aktif setelah Anda dikonfirmasi sebagai panitia ujian oleh admin pada periode ujian aktif.
            </p>
          </div>
        </div>
      </div>
      <!-- Main Panel (rendered dynamically) -->
      <div id="panelExamPanitia" class="hidden"></div>
      <!-- Skeleton Loader -->
      <div id="examPanitiaSkeleton" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
          <div class="skeleton h-4 w-1/3 rounded-lg mb-2"></div>
          <div class="skeleton h-3 w-1/2 rounded"></div>
        </div>
        <div class="p-5 space-y-4">
          <div class="skeleton h-8 w-2/3 rounded-xl"></div>
          <div class="border-t border-slate-100 pt-4 space-y-3">
            <div class="flex items-center gap-3">
              <div class="skeleton h-8 w-8 rounded-full"></div>
              <div class="flex-1 space-y-1.5">
                <div class="skeleton h-4 w-2/3 rounded"></div>
                <div class="skeleton h-3 w-1/2 rounded"></div>
              </div>
              <div class="skeleton h-7 w-20 rounded-lg"></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="skeleton h-8 w-8 rounded-full"></div>
              <div class="flex-1 space-y-1.5">
                <div class="skeleton h-4 w-1/2 rounded"></div>
                <div class="skeleton h-3 w-1/3 rounded"></div>
              </div>
              <div class="skeleton h-7 w-20 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
    ${_footer()}
  </div>
</div>
${_modal()}
<!-- Modal Ganti Pengawas (Panitia) -->
<div id="panitiSubstModal" class="hidden fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="panitiSubstModalTitle">
  <div class="flex items-end sm:items-center justify-center min-h-screen p-0 sm:p-4">
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" onclick="panitia_closeSubstModal()"></div>
    <div class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col" style="max-height:92vh;">
      <div class="bg-gradient-to-br from-pink-700 to-rose-800 px-5 py-4 relative flex-shrink-0">
        <button type="button" onclick="panitia_closeSubstModal()" aria-label="Tutup"
          class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/20 hover:bg-white/35 border-0 flex items-center justify-center cursor-pointer text-white transition-colors touch-manipulation">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div class="flex items-center gap-3 pr-9">
          <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
          </div>
          <div>
            <h3 id="panitiSubstModalTitle" class="text-white font-bold text-base leading-tight mb-0.5">Ganti Pengawas</h3>
            <p class="text-white/75 text-xs">Pilih guru pengganti untuk hari ini</p>
          </div>
        </div>
      </div>
      <div class="px-5 py-4 overflow-y-auto flex-1 custom-scrollbar">
        <input type="hidden" id="inpPanitiaSubstId">
        <div id="panitiSubstInfo" class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-4"></div>
        <div>
          <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Guru Pengganti <span class="text-red-500">*</span></label>
          <div class="relative mb-2">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="inpPanitiaSubstSearch" placeholder="Cari nama guru..." autocomplete="off"
              oninput="panitia_filterSubstTeacher(this.value)"
              class="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400">
          </div>
          <select id="inpPanitiaSubstTeacher" class="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white cursor-pointer">
            <option value="">Memuat daftar guru...</option>
          </select>
          <p class="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
            <svg class="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Guru asli akan ditandai "diganti" hingga Anda membatalkan penggantian.
          </p>
        </div>
      </div>
      <div class="flex-shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2.5">
        <button type="button" onclick="panitia_closeSubstModal()"
          class="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition touch-manipulation cursor-pointer">Batal</button>
        <button type="button" onclick="panitia_saveSubst()" id="btnSavePanitiaSubst"
          class="flex-1 py-2.5 bg-gradient-to-br from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 border-0 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition touch-manipulation cursor-pointer">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          Konfirmasi Ganti
        </button>
      </div>
    </div>
  </div>
</div>`;
}
