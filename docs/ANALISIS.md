# Analisis codebase dan keputusan refactoring

## Dasar pemeriksaan

Snapshot: commit `d6a04ffab16e4be26feb2e5fc9f78a89df93335b` pada branch `main`. Repositori awal hanya memuat `Code.gs` (30.363 baris, 1.398.719 byte) dan `Index.html` (22.461 baris, 1.225.231 byte). Pemeriksaan meliputi parsing seluruh JavaScript, inventaris semua fungsi server, penelusuran pemanggilan langsung antarfitur, RPC frontend, konfigurasi sheet, jalur login, pemulihan password, navigasi, JTM, transportasi, honorarium, dan trigger. Data spreadsheet, deployment aktif, identitas eksekusi web app, izin OAuth, serta hasil produksi tidak tersedia.

Teridentifikasi 343 deklarasi fungsi server, 155 nama endpoint RPC literal di frontend, 34 route termasuk alias, dan 35 pemanggilan pendefinisian skema sheet pada sumber. Angka skema merupakan definisi statis pada kode, bukan bukti keberadaan sheet di akun pengguna. `docs/code-map.json` dapat dibuat ulang dengan `npm run analyze`; `function-inventory.json` mencatat lokasi fungsi pada snapshot lama untuk penelusuran historis.

## Arsitektur dan alur aktual

1. `doGet` menyiapkan template `Index` dan memasukkan konfigurasi server. HTML memuat Tailwind CDN, Google Fonts, html2pdf, dan SheetJS.
2. Bootstrap frontend memulihkan state dari localStorage, mendaftarkan listener, lalu memuat halaman. `loadPage` meminta HTML dengan `google.script.run.getPageContent`, menyisipkannya ke container, memperbarui navigasi, lalu menjalankan initializer fitur.
3. Login memeriksa password pada spreadsheet pengguna eksternal. Profil dan role tetap berasal dari sheet `Users` lokal. Keberhasilan login membuat token UUID dan record `Sessions` dengan kedaluwarsa 24 jam.
4. RPC fitur memverifikasi sesi dan menerapkan aturan hak akses masing-masing. Role utama admin/guru dilengkapi konteks operasional piket/panitia; visibilitas menu hanya salah satu lapisan UI, bukan batas keamanan server.
5. `getData` mengubah header menjadi lowercase/underscore, menormalisasi tanggal dan jam, lalu memetakan setiap baris menjadi objek. Banyak operasi tulis masih bergantung pada posisi kolom.
6. `_getDataSnapshot` membangun akses lazy ke data dan indeks per user/schedule. Cache berasal dari variabel global dalam eksekusi; jangan mengasumsikannya sebagai cache terdistribusi lintas request. TTL dalam kode 300.000 ms.
7. Jurnal dan konfirmasi kehadiran menghasilkan/mengubah log untuk perhitungan JTM. Pengganti, ujian, acara, hari libur, serta penyesuaian JTM memengaruhi hasil di dashboard dan honorarium.
8. Finalisasi honorarium menyimpan snapshot ke `Honor_History`, membuat identitas transaksi/slip, dan mencoba mengirim notifikasi email. Hasil historis perlu dibedakan dari proyeksi/live calculation.

## Peta domain dan keterkaitan

| Domain | Data utama | Ketergantungan penting |
| --- | --- | --- |
| Auth dan profil | Users lokal, Users eksternal, Sessions, Script Properties | Email OTP, pemulihan, profil guru |
| Jadwal dan jurnal | Schedules, Teaching_Logs, Subjects | Kalender, konfirmasi hadir, pengganti, absensi siswa |
| Piket dan upacara | Picket_Schedules, Ceremony_Schedules, Substitutes | Kehadiran harian, jurnal/log, notifikasi |
| Absensi siswa | Student_Attendance | Kelas/config, piket/panitia, validasi jurnal/BAP |
| Ujian | Exam_Periods/Sessions/Rooms/Supervisors/Committee/BAP | Konfirmasi panitia, pengawas, penggantian, JTM, absensi siswa |
| Kehadiran harian | Daily_Attendance, Attendance_Leaves, Attendance_Sched_Templates | Jam datang/pulang, izin, agenda KBM/ujian, transportasi |
| Acara | Event_Definitions/Attendance/Journals | Hak tulis, jurnal selesai, JTM, hari transportasi |
| Penyesuaian JTM | JTM_Adjustments, JTM_Reallocations | KBM/ujian/piket, log kredit, konservasi total JTM |
| Honorarium | Honor_History, Allowances, Config | Semua sumber JTM, bonus libur, transportasi, snapshot historis |
| Administrasi | Config, Academic_Calendar, Announcements, blokir | Hampir semua domain, mode maintenance, scheduler |

Nama sheet lengkap dan daftar kolom yang terdeteksi tersedia di `code-map.json`. Tidak ada perubahan skema yang dijalankan.

## Aturan penting yang dipertahankan

- Penyesuaian JTM harus bilangan bulat dari nol sampai JTM terjadwal; pengurangan memerlukan alasan, dengan batas 500 karakter. Alokasi tambahan wajib positif, tidak boleh ke guru asal atau admin, dan total penyesuaian serta alokasi tidak boleh melampaui JTM terjadwal. Otorisasi dan hari pelaksanaan diperiksa terpisah.
- Definisi acara memerlukan nama, rentang jam valid dengan selesai setelah mulai, serta JTM integer 1–99. `_computeEventJtm` hanya memasukkan record yang jurnalnya sudah ditandai selesai.
- Transportasi harian menghitung jarak × tarif × proporsi durasi hadir terhadap durasi jadwal; proporsi kehadiran dibatasi maksimum 100%. Perhitungan bulanan mempertimbangkan izin, kalender, blokir, serta hari acara melalui fungsi terkait.
- Pembulatan transportasi memakai ambang sisa 333,34 dan 666,67 per ribuan. Perilaku floating point lama dipertahankan: masukan 1.333,34 menghasilkan 1.000 karena pengurangan floating point; 1.333,35 menghasilkan 1.500. Ini temuan yang perlu keputusan tersendiri, bukan pembenaran aturan bisnisnya.
- Pada finalisasi, total JTM menggabungkan log kegiatan, bonus, dan JTM acara; honor = total JTM × tarif dasar + tunjangan + transportasi yang dibulatkan. Jalur live, history, dan recap memiliki implementasi berbeda sehingga tidak aman menggabungkannya tanpa fixture data lebih luas.

## Masalah struktur sebelum perubahan

Template halaman, modal, CSS, pengolahan data, otorisasi, kalkulasi, dan notifikasi bercampur pada dua file. Pencarian dan peninjauan perubahan sulit; menambah halaman memerlukan pembaruan switch server, pemetaan state frontend, dan rangkaian initializer. Tidak tersedia package manifest, lockfile, build, pengujian, dokumentasi, atau CI. Ketergantungan global dan nama fungsi yang dipakai inline handler membatasi perubahan penamaan sembarang.

## Perubahan yang telah diterapkan

- Pemisahan modul menurut domain pada backend dan frontend, termasuk aturan transportasi/JTM, akses data, auth, notifications, dan operasi setiap fitur.
- Pemindahan 34 return halaman ke factory terpisah. Factory menggunakan akhiran underscore untuk tidak menambah endpoint browser publik.
- `build.config.json` menjadi sumber registrasi halaman: id route, factory server, state navigasi, daftar initializer frontend, dan delay opsional. Alias absensi siswa, initializer berurutan untuk acara, serta delay pengumuman 30 ms dipertahankan.
- Dispatcher server memakai pemeriksaan own-property agar nama seperti `constructor`, `toString`, dan `__proto__` mengikuti fallback yang semula.
- Build deterministik menghasilkan dua file runtime dengan urutan sumber eksplisit. Tidak ada transformasi template yang mengubah escaping/interpolasi, dan tidak ada minifikasi yang mengganti global handler.
- Penambahan parser check, deteksi file yang belum terdaftar, pemeriksaan endpoint RPC, baseline kesetaraan, aturan domain, laporan statis, lockfile, dan workflow CI.

Sengaja tetap menggunakan bundling satu scope untuk menjaga lexical binding, fungsi hoisted, listener awal, serta kompatibilitas inline handler. Modularisasi ini mempermudah navigasi sumber dan pengembangan berikutnya, tetapi belum menghilangkan coupling runtime. Tidak ada klaim setiap fitur sudah plug-and-play.

## Temuan lama yang perlu ditangani berikutnya

| Prioritas | Bukti lokasi/fungsi | Implikasi dan tindak lanjut |
| --- | --- | --- |
| Tinggi | `auth/external-users.js`: `_extGetPassword_`, `_extSetPassword_`; `auth/session.js`: `loginUser` | Password dibaca/disimpan sebagai string langsung. Migrasi kredensial membutuhkan rancangan verifier dan kompatibilitas seluruh aplikasi pemakai spreadsheet eksternal. |
| Tinggi | `core/database.js`: `getData`, `getSheet`; `web/entry.js`: `doGet` | Helper data belum dibatasi sebagai API privat dan tidak memverifikasi token. `doGet` memasukkan semua pasangan Config ke browser. Dampak akses aktual bergantung pada pengaturan deployment, tetapi permukaan ini perlu diaudit dan dikurangi. |
| Tinggi | `exports/pdf.js`: `savePdfToDrive` | Fungsi tidak menerima token dan membagikan hasil sebagai anyone-with-link. Evaluasi otorisasi, pembatasan ukuran, serta kebutuhan berbagi publik. |
| Tinggi | `honorarium/service.js`: `_processHonorariumFinalization` | Pemeriksaan periode sudah ada diikuti penulisan batch tanpa lock pada fungsi ini. Eksekusi manual dan trigger bersamaan berpotensi berlomba; perlu lock serta idempotency berdasarkan periode/user. |
| Sedang | `core/database.js`: `getData`, `getSheet` | Kegagalan baca dikembalikan sebagai array kosong dan sheet hilang dibuat otomatis. Salah nama/izin dapat terlihat seperti data kosong; pisahkan lookup read-only, create, dan error terstruktur. |
| Sedang | `core/format.js`: `generateId` | ID berbasis milidetik berpotensi bentrok pada penulisan cepat. Migrasi UUID membutuhkan verifikasi format yang digunakan frontend dan referensi lama. |
| Sedang | `auth/session.js`: `verifySession`; `auth/recovery.js` | Validasi expiry menggunakan perbandingan Date tanpa pemeriksaan eksplisit invalid-date; konsumsi reset token memakai read/delete terpisah. Tambahkan pengujian sesi rusak dan konkurensi token sebelum perubahan. |
| Sedang | `src/client/ceremony/confirmation.js` dan `src/client/substitutes/actions.js` | Nama `openSubModalCeremony` dideklarasikan lebih dari sekali pada kode lama; definisi terakhir tetap menang karena urutan bundling dipertahankan. Konsolidasikan setelah uji dialog pengganti. |
| Sedang | `transport/rules.js`: `_applyThreePointRounding` | Efek floating point pada ambang nominal dapat berbeda dari harapan desimal; tetapkan pembulatan fixed-point dengan persetujuan aturan honorarium. |
| Sedang | `src/views/Index.html`, `web/entry.js` | CDN runtime dan kebijakan ALLOWALL masih dipertahankan. Penentuan pin dependensi, kebutuhan iframe, sanitasi seluruh jalur innerHTML, dan allowlist config perlu audit terpisah. |

Dokumentasi resmi Apps Script menjelaskan bahwa fungsi berakhiran underscore privat terhadap `google.script.run`, sementara awalan underscore saja tidak memberi jaminan tersebut: https://developers.google.com/apps-script/guides/html/communication#private_functions. Banyak helper lama hanya berawalan underscore. Mengganti semua nama secara otomatis akan berisiko pada pemanggil dinamis/trigger; perubahan itu belum dilakukan.

## Batas verifikasi

51 pengujian lokal lolos: deklarasi server yang dipertahankan, urutan statement browser selain router, HTML shell/CSS, golden render 34 route dan fallback, error renderer, state dan initializer setiap halaman, build deterministik, transportasi, validasi/otorisasi/konservasi JTM, acara, sesi, serialisasi data, dan invalidasi snapshot. Pemeriksaan statis memastikan 175 sumber terdaftar dan endpoint RPC literal tersedia.

Golden hash dibandingkan terhadap snapshot awal, bukan terhadap hasil build yang dibuat ulang sebagai baseline. Pengujian karakterisasi tidak membuktikan kode awal bebas bug. Node VM memakai stub Apps Script; ini bukan uji V8 Apps Script live, Gmail/MailApp, Drive, trigger, concurrent requests, UI browser mobile, atau seluruh kombinasi perhitungan honorarium dengan data sekolah. Tidak ada angka performa atau coverage persentase yang diklaim. Workflow CI disiapkan tetapi belum dijalankan di GitHub.
