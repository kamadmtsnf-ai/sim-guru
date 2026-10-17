function _renderPage_Settings_BlokJurnal_() {
return `<div class="flex h-screen overflow-hidden bg-slate-50">
  ${_sidebar()}
  <div class="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
    ${_navbar()}
    <main class="w-full grow p-3 sm:p-6">
      <div class="mb-4 sm:mb-5">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Blokir Input Jurnal</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">Atur mata pelajaran dan tanggal yang diblokir dari input jurnal.</p>
      </div>

      <!-- Tabel Daftar Blokir -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/40">
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-700">Daftar Blokir Jurnal</p>
            <p class="text-xs text-slate-400 mt-0.5">Blokir aktif akan mencegah guru menginput jurnal pada tanggal yang ditentukan.</p>
          </div>
          <button onclick="blokJurnal_openForm()"
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
                <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran</th>
                <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Periode</th>
                <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Pesan</th>
                <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th class="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="tbodyBlokJurnal" class="divide-y divide-slate-50">
              <tr><td colspan="5" class="py-8 text-center text-slate-400 italic text-sm">Memuat data...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Form Tambah/Edit Blokir -->
      <div id="blokJurnalFormPanel" class="hidden bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
        <div class="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/40">
          <p id="blokJurnalFormTitle" class="text-sm font-bold text-slate-700">Tambah Blokir Baru</p>
          <p class="text-xs text-slate-400 mt-0.5">Isi detail di bawah untuk memblokir input jurnal pada tanggal tertentu.</p>
        </div>
        <div class="p-4 sm:p-6">
          <input type="hidden" id="blokJurnalId" value="">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran <span class="text-rose-500">*</span></label>
              <select id="blokJurnalMapel" class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition">
                <option value="">-- Pilih Mata Pelajaran --</option>
                <option value="SEMUA">🔒 SEMUA MATA PELAJARAN</option>
              </select>
              <p class="text-[11px] text-slate-400 mt-1">Pilih <strong>SEMUA</strong> untuk memblokir seluruh mata pelajaran.</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <div class="flex items-center gap-3 h-10 mt-1">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" id="blokJurnalAktif" checked class="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-400">
                  <span class="text-sm text-slate-700 font-medium">Aktif</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Mulai <span class="text-rose-500">*</span></label>
              <input type="date" id="blokJurnalTglMulai" class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Selesai <span class="text-rose-500">*</span></label>
              <input type="date" id="blokJurnalTglSelesai" class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition">
            </div>
          </div>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Pesan untuk Guru <span class="text-rose-500">*</span></label>
            <textarea id="blokJurnalPesan" rows="3" placeholder="Contoh: Input jurnal tidak tersedia selama Ujian Akhir Semester. Hubungi admin untuk informasi lebih lanjut."
              class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition resize-none min-h-[80px]"></textarea>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <button onclick="blokJurnal_simpan()" id="btnSimpanBlokJurnal"
              class="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 min-h-[44px] rounded-xl transition shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              <span id="lblSimpanBlokJurnal">Simpan</span>
            </button>
            <button onclick="blokJurnal_batalForm()" type="button"
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
