function _renderPage_Settings_BlokTransport_() {
return `<div class="flex h-screen overflow-hidden bg-slate-50">
${_sidebar()}
<div class="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
  ${_navbar()}
  <main class="w-full grow p-3 sm:p-6">
    <div class="mb-4 sm:mb-5">
      <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Blokir Tunjangan Transportasi</h1>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">Atur tanggal atau rentang tanggal di mana tunjangan transportasi tidak dihitung.</p>
    </div>

    <!-- Tabel Daftar Blokir -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/40">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 6h13l4 6v5H3V6z"/>
              </svg>
            </div>
            <p class="text-sm font-bold text-slate-700">Blokir Tunjangan Transportasi</p>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">Blokir aktif akan mengecualikan tanggal tersebut dari penghitungan tunjangan transportasi semua guru.</p>
        </div>
        <button onclick="blokTransport_openForm()"
          class="inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm shadow-rose-100 self-start sm:self-auto active:scale-95">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Tambah Blokir
        </button>
      </div>
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-sm text-left settings-mobile-cards">
          <thead class="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Periode</th>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan</th>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
              <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
            </tr>
          </thead>
          <tbody id="tbodyBlokTransport" class="divide-y divide-slate-50">
            <tr><td colspan="4" class="py-8 text-center text-slate-400 italic text-sm">Memuat data...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Form Tambah/Edit Blokir -->
    <div id="blokTransportFormPanel" class="hidden bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
      <div class="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/40">
        <p id="blokTransportFormTitle" class="text-sm font-bold text-slate-700">Tambah Blokir Baru</p>
        <p class="text-xs text-slate-400 mt-0.5">Tunjangan transportasi tidak akan dihitung untuk semua guru pada tanggal yang ditentukan.</p>
      </div>
      <div class="p-4 sm:p-6">
        <input type="hidden" id="blokTransportId" value="">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Mulai <span class="text-rose-500">*</span></label>
            <input type="date" id="blokTransportTglMulai" class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Selesai <span class="text-rose-500">*</span></label>
            <input type="date" id="blokTransportTglSelesai" class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition">
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <div class="flex items-center gap-3 h-10">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" id="blokTransportAktif" checked class="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-400">
                <span class="text-sm text-slate-700 font-medium">Aktif</span>
              </label>
            </div>
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-xs font-semibold text-slate-600 mb-1.5">Keterangan <span class="text-rose-500">*</span></label>
          <textarea id="blokTransportKeterangan" rows="3" placeholder="Contoh: Libur Nasional Hari Raya — tunjangan transportasi tidak dihitung pada tanggal ini."
            class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition resize-none min-h-[80px]"></textarea>
          <p class="text-[11px] text-slate-400 mt-1">Keterangan ini hanya terlihat oleh admin.</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <button onclick="blokTransport_simpan()" id="btnSimpanBlokTransport"
            class="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 min-h-[44px] rounded-xl transition shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
            <svg id="iconSimpanBlokTransport" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
            <svg id="spinnerSimpanBlokTransport" class="hidden w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span id="lblSimpanBlokTransport">Simpan</span>
          </button>
          <button onclick="blokTransport_batalForm()" type="button"
            class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-5 py-2.5 min-h-[44px] rounded-xl transition active:scale-95">
            Batal
          </button>
        </div>
      </div>
    </div>
  </main>
  ${_footer()}
</div>
</div>
${_modal()}`;
}
