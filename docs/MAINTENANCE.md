# Panduan maintenance

## Sumber dan aturan bundling

Edit `src/`, bukan `dist/`. Semua sumber runtime harus tercatat pada `build.config.json`; `npm run check` menolak file yang tidak terdaftar. `backend` dan `frontend` adalah urutan bundling, sehingga side effect dan override fungsi lama tidak berpindah diam-diam. Jangan menambahkan `import`/`export` pada runtime sumber sebelum ada desain transformasi modul; keluaran saat ini adalah script scope Apps Script/browser.

File modul mengelompokkan tanggung jawab, bukan membatasi visibilitas JavaScript. `globalConfig`, cache, DOM id, handler inline, dan fungsi bersama tetap digunakan lintas fitur. Hindari mengubah nama RPC/handler tanpa menelusuri pemanggil, template inline, trigger, dan aplikasi lain.

## Menambah halaman

1. Buat `src/views/pages/Page_Contoh.js` berisi `function _renderPage_Contoh_() { return ...; }`. Untuk shell, ikuti halaman yang sudah ada; interpolasi `_sidebar()`, `_navbar()`, `_footer()`, dan `_modal()` sesuai kebutuhan.
2. Buat `src/client/contoh/page.js` dengan `initContohPage` dan handler UI. Daftarkan path pada array `frontend` di posisi yang sesuai. Deklarasi fungsi saja tidak mempunyai side effect; listener top-level harus dipertimbangkan urutannya.
3. Tambahkan objek pada `views` di konfigurasi build:

```json
{
  "id": "Page_Contoh",
  "file": "src/views/pages/Page_Contoh.js",
  "render": "_renderPage_Contoh_",
  "state": "contoh",
  "initialize": ["initContohPage"]
}
```

4. Tambahkan navigasi yang sesuai dalam `src/server/web/sidebar.js`, serta aturan visibilitas/active menu yang masih relevan di `src/client/navigation/`. Registri menyatukan pemuatan halaman, bukan seluruh desain menu.
5. Jika diperlukan backend baru, buat file pada domain yang sesuai dan daftarkan pada `backend`. Terapkan verifikasi sesi dan izin di RPC; jangan hanya menyembunyikan tombol.
6. Tambahkan pengujian perilaku fitur, jalankan `npm run verify` dan `npm run analyze`, lalu uji pada salinan Apps Script/data.

## Menambah operasi data

Pisahkan aturan murni dari akses spreadsheet seperti pola `transport/rules.js` dan `jtm/rules.js`. Gunakan `core/database.js` sebagai titik akses bersama sampai repository per-domain diperkenalkan. Perhatikan normalisasi header di `getData`, kolom yang masih diakses berdasarkan indeks, invalidasi `_invalidateDataSnapshot`, dan konsistensi timezone. Perubahan kolom perlu migrasi eksplisit; jangan menjalankan `doSetup` sebagai percobaan pada produksi.

## Menghapus fitur

Hapus pendaftaran route terlebih dahulu pada cabang kerja, lalu menu, initializer, event listener, DOM modal terkait, dan endpoint khususnya. Cari nama route, DOM id, RPC, serta fungsi dengan `rg`; gunakan `code-map.json` untuk kandidat pemanggil lintas modul. Laporan ini mendeteksi direct calls dan bukan bukti lengkap untuk akses dinamis, inline event atau scope shadowing.

Periksa khusus hubungan jurnal/piket/ujian/acara terhadap JTM dan honorarium. Menyembunyikan menu bukan mencabut akses RPC. Jangan menghapus sheet, riwayat, atau trigger langsung karena direktori sumber dihapus. Nonaktifkan trigger fitur secara sadar pada lingkungan target dan pertahankan data audit/history yang diperlukan.

Setelah berkas sumber benar-benar tidak dipakai, hapus juga pendaftarannya dari konfigurasi. Parser dan RPC checker membantu mendeteksi referensi yang tertinggal, tetapi smoke test tetap diperlukan.

## Pengujian dan baseline

`tests/baseline.json` dibuat sekali dari commit awal. Jangan dibuat ulang otomatis saat build. Test karakterisasi menjaga migrasi ini tetap setara; ketika perubahan fitur/bugfix memang dimaksudkan mengubah perilaku, ubah ekspektasi test yang terkait setelah review serta tambahkan test aturan baru. Tidak perlu mengganti seluruh baseline atau menghapus test hanya agar hijau.

Gunakan `npm run verify` sebagai pemeriksaan perubahan; CI melakukan perintah yang sama. Setelah perubahan arsitektur, jalankan `npm run analyze` dan tinjau peta dependensi. Peta lama di `function-inventory.json` adalah catatan historis, sementara `code-map.json` adalah peta current source.

## Tahap arsitektur berikutnya

Mulai dengan membatasi endpoint publik dan membuat auth guard tunggal. Berikutnya, bungkus operasi spreadsheet per-domain dengan repository interface, lalu injeksikan dependency pada service baru. Setelah fixture honorarium lengkap, konsolidasikan perhitungan live/final/history dan notifikasi. Terakhir, pindahkan shared frontend state ke pemilik domain dan isolasi modul tanpa memutus handler inline. Lakukan per domain agar perubahan mudah direview dan dikembalikan.
