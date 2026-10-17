# Deployment, pengujian staging, dan rollback

## Status paket

Tidak ada push, merge, deployment, akses spreadsheet langsung, pengiriman email, pemasangan trigger, atau perubahan data selama refactoring. Paket berisi sumber, dokumentasi, pengujian, dan hasil build untuk diunggah manual. Branch/commit acuan ada di `tests/baseline.json`.

## Menyiapkan hasil

```sh
npm ci --ignore-scripts
npm run verify
npm run analyze
```

Salin **isi `dist/Code.gs` ke Code.gs** dan **isi `dist/Index.html` ke Index.html** pada proyek Apps Script target. Jangan menambahkan seluruh `src/**/*.js` ke proyek Apps Script bersamaan dengan hasil build: itu akan menduplikasi deklarasi. Dua file besar di `dist` adalah artefak deployment; modularitas untuk maintenance berada di `src`.

Repositori awal tidak menyediakan `appsscript.json`, script ID, OAuth scopes, maupun konfigurasi deployment. Pertahankan manifest dan pengaturan proyek yang sudah benar pada akun Anda; jangan menebak atau menggantinya dari paket ini. Tidak ada konfigurasi Vercel yang dibutuhkan oleh snapshot aplikasi ini.

`EXT_USERS_SS_ID` pada `src/server/core/config.js` masih menunjuk sumber pengguna yang sama dengan kode awal. Untuk staging, arahkan secara sadar ke salinan data pengguna; perubahan sumber profil lokal saja tidak mengisolasi database password eksternal.

## Uji sebelum produksi

Gunakan proyek terpisah yang terikat ke salinan spreadsheet, termasuk sumber pengguna eksternal. Pastikan izin dan zona waktu sesuai. Jangan memasang scheduler atau menjalankan finalisasi dengan data/email nyata untuk sekadar mencoba tampilan.

| Area | Skenario yang perlu diperiksa langsung |
| --- | --- |
| Auth | Login admin/guru, salah password, logout, sesi habis, profil wajib, OTP dan reset pada akun uji |
| Navigasi | Semua 34 route, alias input absensi siswa, menu mobile, sidebar collapse, modal dan tombol kembali |
| KBM | Jadwal, konfirmasi/revoke, jurnal baru/edit/hapus, pengganti dan pembatalan, konsistensi absensi siswa |
| Piket/upacara | Penjadwalan, konfirmasi/revoke, pengganti, jam hadir, notifikasi pada penerima uji |
| Ujian | Periode/sesi/ruang, panitia/pengawas, BAP, penggantian, konflik jadwal dan absensi siswa |
| Kehadiran | Template jadwal, datang/pulang, izin, peserta tambahan, history dan perhitungan durasi |
| JTM | Alasan pengurangan, pembatasan hari/role, alokasi, reset, serta saldo konservasi |
| Honorarium | Bandingkan live/recap/slip/history dengan data acuan; finalisasi periode uji dan penolakan duplikasi |
| Acara | Definisi, hadir, jurnal, history, pengaruh pada JTM dan transportasi |
| Administrasi | Kalender/blokir, pengumuman, maintenance, subject/tunjangan, ekspor PDF/Excel/CSV |
| Trigger | Handler existing tetap bernama sama; periksa jadwal dan hindari pemasangan duplikat |

Trigger yang dibuat secara eksplisit pada sumber: `checkAndSendAnnouncementEmails`, `autoFinalizeHonorarium`, dan `runAutoJurnalScheduler`. `runReminderScheduler` juga ada sebagai fungsi scheduler, tetapi analisis tidak menemukan pemanggilan `newTrigger` untuknya; jangan mengasumsikan ia sudah terpasang.

## Rollback

Sebelum mengganti deployment, simpan versi Apps Script saat ini dan backup spreadsheet. Jika hasil staging/live bermasalah, kembalikan deployment ke versi sebelumnya, atau pulihkan isi dua file dari commit acuan lalu buat versi deployment yang sesuai. Mengembalikan kode tidak membatalkan perubahan data atau email yang sudah terkirim. Jangan menghapus data historis sebagai bagian dari rollback kode.

Untuk GitHub manual, paket sumber menggantikan dua monolit root dengan `src` dan build pipeline. `dist/` diabaikan oleh git dan bisa dibuat ulang; ZIP tetap menyertakan hasil build sebagai kemudahan deployment manual. Workflow GitHub Actions akan mengunggah output build sebagai artifact ketika dijalankan setelah push pengguna.
