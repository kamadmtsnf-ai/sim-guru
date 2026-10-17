# SiM-Guru — sumber modular

Refactoring dari `kamadmtsnf-ai/sim-guru`, commit `d6a04ffab16e4be26feb2e5fc9f78a89df93335b`.
Aplikasi yang ditemukan menggunakan **Google Apps Script, HtmlService, dan Google Sheets**. Tidak ditemukan Next.js, Vercel, Supabase, manifest OAuth, atau konfigurasi deployment pada snapshot ini.

Sumber pengembangan berada di `src/`. Berkas besar untuk runtime dihasilkan oleh build; jangan mengedit hasil build.

## Mulai

Diperlukan Node.js 20 atau lebih baru dan npm.

```sh
npm ci --ignore-scripts
npm run verify
npm run analyze
```

- `npm run build`: menghasilkan `dist/Code.gs` dan `dist/Index.html`.
- `npm run check`: memeriksa sintaks, pendaftaran sumber, duplikasi fungsi server baru, dan endpoint RPC literal.
- `npm test`: build dan pengujian regresi lokal.
- `npm run analyze`: memperbarui peta fungsi, dependensi langsung, RPC, trigger, dan definisi skema di `docs/code-map.json`.

## Struktur

| Lokasi | Tanggung jawab |
| --- | --- |
| `src/server/core/` | Konfigurasi, setup spreadsheet, akses data, snapshot, format |
| `src/server/<fitur>/` | Operasi backend menurut domain |
| `src/client/core/` | State awal, bootstrap, modal, komponen UI bersama |
| `src/client/<fitur>/` | Interaksi halaman dan pemanggilan RPC |
| `src/views/pages/` | Satu factory template untuk setiap halaman |
| `src/styles/` | Dua blok CSS global, urutannya dipertahankan |
| `build.config.json` | Urutan bundling dan registrasi halaman server/frontend |
| `scripts/` | Build, pemeriksaan, analisis |
| `tests/` | Fingerprint snapshot awal, golden render, pengujian aturan domain |
| `dist/` | Hasil build yang dipindahkan ke Apps Script |

Baca [analisis](docs/ANALISIS.md), [panduan maintenance](docs/MAINTENANCE.md), dan [deployment serta rollback](docs/DEPLOYMENT.md).

## Ruang lingkup perubahan

Sumber dipisah ke 69 modul backend, 69 modul frontend, dan 34 factory halaman. Dispatcher server dan inisialisasi frontend menggunakan registri bersama. Kontrak RPC, handler trigger, urutan eksekusi, CSS, dan aturan bisnis dipertahankan.

Ini merupakan modularisasi sumber yang kompatibel dengan runtime lama. Kode runtime masih menggunakan global scope dan sejumlah state bersama; belum menggunakan isolasi ES Modules atau repository interface pada setiap fitur. Menghapus satu direktori tanpa memeriksa dependensi tetap tidak aman. Temuan keamanan dan integritas data lama dicatat di analisis dan belum diperbaiki pada perubahan struktur ini.

Tidak ada perubahan pada spreadsheet, pengiriman email, pemasangan trigger, push GitHub, atau deployment selama pengerjaan. Uji Google Apps Script dan data nyata masih diperlukan sebelum produksi.
