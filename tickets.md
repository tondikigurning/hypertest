# Tiket: Login, role, dan user management

Dokumen ini memecah fitur menjadi tiket berurutan untuk satu AI agent. Kerjakan tiket dan checkbox dari atas ke bawah dalam satu rangkaian kerja. Tandai checkbox setiap langkah segera setelah selesai, lalu lanjutkan langsung ke checkbox berikutnya hingga seluruh tiket dan verifikasi akhir selesai. Jangan berhenti untuk meminta persetujuan di antara tiket. Keputusan produk yang diperlukan sudah tercatat di bawah. Jika detail teknis kecil belum ditentukan, ikuti pola repository dan pilih implementasi yang paling aman.

## Keputusan produk yang sudah disetujui

- Engineer masuk melalui GitHub OAuth. Setiap akun GitHub yang berhasil login otomatis menjadi Engineer; tidak ada sign-up terpisah.
- Viewer masuk dengan username dan password. Hanya Engineer yang dapat membuat Viewer. Tidak ada opsi sign-up Viewer pada `/auth/login`.
- User management menampilkan Engineer dan Viewer. Engineer dapat melihat semua akun, tetapi hanya mengelola Viewer: membuat, menonaktifkan/menghapus akses, dan mengatur ulang password. Engineer tidak dapat mengubah atau menghapus akun Engineer lain.
- Saat membuat atau mereset Viewer, Engineer menetapkan password sementara. Viewer wajib menggantinya saat login pertama. Password hanya disimpan sebagai hash yang kuat dan tidak pernah dapat dibaca kembali.
- Q-Rex melakukan operasi branch dan pull request menggunakan otorisasi GitHub milik Engineer yang sedang login. Hak akses repository tetap ditentukan GitHub. Pertahankan repository dan target branch yang dikonfigurasi oleh alur saat ini.
- Environment mengikuti konfigurasi dan kebutuhan skenario automation. Tidak ada CRUD environment, secret Project, atau halaman pengaturan repository baru.
- Semua role dapat memilih Environment dan mengisi Variables dari navigasi yang ada. Preferensi environment dan nilai Variables nonrahasia disimpan per akun di `localStorage`. Password/token hanya disimpan di memori selama dibutuhkan, tidak di Web Storage, percakapan Q-Rex, log, atau evidence; hapus setelah logout dan setelah penggunaan yang sesuai.
- Engineer dan Viewer berbagi akses baca ke katalog, PRD, hasil run, evidence, dan daftar PR. Keduanya dapat menjalankan skenario pada target branch. Hanya Engineer yang dapat memakai Q-Rex untuk authoring, membuat draft, dan membuat/menerbitkan PR.
- Fitur login dan role adalah untuk target produk Automation Workspace. Repository saat ini menjalankan preview lokal loopback; implementasi tidak boleh mengubahnya menjadi layanan publik atau mengklaim fitur hosted sudah tersedia.

## Aturan pengerjaan agent

- Sebelum mengubah kode, baca `README.md`, `docs/automation/README.md`, `docs/PRD.md`, `docs/SPEC.md`, `AGENTS.md`, serta source, pemanggil, migrasi, dan test yang relevan. Periksa skenario BDD terkait; skenario `e2e/tests/bdd/features/auth`, `iam`, dan `user-management` adalah untuk aplikasi Converge, bukan login Automation Workspace. Jangan mengubahnya kecuali ada alasan produk yang terbukti.
- Ikuti arsitektur dan batas keamanan di `AGENTS.md`. Jangan menyentuh perubahan workspace lain yang sudah ada. Jangan deploy, push, membuat PR eksternal, menjalankan skenario BDD terhadap tenant/live data, atau mengubah kredensial akun.
- Tambahkan verifikasi otomatis yang sesuai dengan pola yang sudah ada di repo untuk aturan autentikasi, otorisasi, sesi, dan Q-Rex. Gunakan provider GitHub palsu atau fixture lokal; jangan bergantung pada OAuth sungguhan agar test berjalan.
- Jalankan pemeriksaan yang diwajibkan repository pada akhir pekerjaan: `pnpm exec biome check src server vite.config.ts drizzle.config.ts`, `pnpm typecheck`, dan `pnpm build`. Jalankan test lokal yang dibuat/terpengaruh. Jangan menganggap BDD selesai hanya karena build berhasil.
- Jika credential OAuth sungguhan tidak tersedia, tetap selesaikan implementasi, mock tests, konfigurasi contoh, dan dokumentasi. Catat variabel konfigurasi yang perlu diisi untuk menjalankan alur OAuth sungguhan; jangan berhenti menunggu credential.

## Urutan tiket

### TKT-001 — Selaraskan dokumen produk dan batas preview

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Jadikan requirement terbaru konsisten dengan dokumen produk sebelum implementasi.

**Pekerjaan:**

- [x] Perbarui bagian pengguna, login, role, user management, Variables, environment, dan integrasi GitHub di `docs/PRD.md` dan `docs/SPEC.md` agar mencerminkan keputusan produk di atas.
- [x] Hapus requirement lama yang menyatakan Engineer mengelola environment dan secret Project atau mengubah koneksi repository dari UI.
- [x] Tegaskan batas local preview di dokumentasi: tetap loopback, identitas lokal yang ada bukan autentikasi, dan ketersediaan kode OAuth tidak berarti produk sudah di-host atau aman untuk akses publik.
- [x] Pertahankan perbedaan antara kebutuhan hosted target dan perilaku preview yang benar-benar tersedia.

- [x] **Selesai jika:** Tidak ada konflik antara keputusan di tiket ini, PRD, SPEC, dan README; tidak ada klaim bahwa preview lokal telah menjadi layanan hosted.

### TKT-002 — Model data identitas, role, kredensial, dan sesi

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Menyiapkan penyimpanan persisten yang mendukung dua cara login serta pencabutan akses.

**Pekerjaan:**

- [x] Telusuri skema Drizzle, koneksi database, dan pola migrasi yang dipakai. Tambahkan migrasi untuk pengguna, identitas GitHub berdasarkan ID stabil GitHub, akun Viewer berbasis username, role, status akun, flag wajib ganti password, sesi server, serta kredensial OAuth terenkripsi yang dibutuhkan Q-Rex.
- [x] Pastikan username dinormalisasi dan unik. Akun GitHub dan Viewer tidak boleh digabung hanya karena username atau email kebetulan sama.
- [x] Simpan password Viewer dengan algoritme password hashing modern yang terpelihara (Argon2id bila kompatibel dengan stack); jangan pernah menyimpan password mentah atau hash yang dapat dibalik.
- [x] Sesi harus dapat kedaluwarsa dan dicabut di server, termasuk setelah logout, reset password, atau penonaktifan Viewer. Simpan token sesi dalam bentuk yang tidak dapat digunakan langsung jika database bocor.
- [x] Ikuti strategi enkripsi rahasia server yang ada bila sesuai; OAuth access/refresh token tidak boleh disimpan mentah.

- [x] **Selesai jika:** Migrasi dapat diterapkan dan skema mendukung identitas Engineer GitHub, akun Viewer, sesi yang dapat dicabut, dan token GitHub terenkripsi tanpa mengubah data preview lama secara diam-diam.

### TKT-003 — Layanan autentikasi dan sesi aman

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Menyediakan API autentikasi tunggal yang dapat dipakai kedua role.

**Pekerjaan:**

- [x] Implementasikan alur GitHub App OAuth dengan validasi `state`, proteksi CSRF, callback yang terikat pada konfigurasi, validasi respons identitas GitHub, dan penanganan pembatalan/kegagalan.
- [x] Pada login GitHub pertama, buat Engineer otomatis; pada login berikutnya, hubungkan ke identitas GitHub yang sama menggunakan ID stabil, bukan username/email.
- [x] Implementasikan login Viewer dengan username/password, rotasi sesi setelah autentikasi, logout, endpoint sesi pengguna saat ini, batas percobaan login, dan respons error yang tidak membocorkan apakah username terdaftar.
- [x] Gunakan cookie sesi `HttpOnly`, `Secure` pada HTTPS, `SameSite` yang sesuai, masa berlaku terbatas, dan proteksi CSRF untuk request yang mengubah data. Jangan menerima identitas/role dari header browser sebagai autentikasi.
- [x] Sediakan konfigurasi OAuth melalui environment dan dokumentasikan nama variabel serta callback lokal/hosted yang diperlukan. Nilai rahasia jangan masuk ke log atau respons API.

- [x] **Selesai jika:** Alur kedua tipe login, logout, sesi kedaluwarsa, OAuth gagal, dan Viewer yang harus mengganti password teruji dengan provider GitHub palsu dan fixture lokal.

### TKT-004 — Pengelolaan Viewer oleh Engineer

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Memberi Engineer cara membuat dan mengelola akun Viewer.

**Pekerjaan:**

- [x] Tambahkan endpoint terproteksi Engineer untuk melihat daftar anggota, membuat Viewer dengan username dan password awal, mengatur password baru, dan menonaktifkan/mencabut akses Viewer.
- [x] Tampilkan Engineer dan Viewer pada daftar; endpoint mutasi harus menolak perubahan, reset, atau penghapusan Engineer, termasuk request yang dimanipulasi.
- [x] Wajibkan perubahan password Viewer pada login pertama dan setelah reset. Setelah password berubah, cabut sesi lama akun tersebut.
- [x] Saat Viewer dinonaktifkan, tolak login baru dan cabut semua sesi aktif. Pertahankan catatan yang diperlukan untuk relasi/audit tanpa mempertahankan akses aktif.
- [x] Jangan sediakan pendaftaran Viewer publik atau aksi sign-up pada endpoint maupun UI login.

- [x] **Selesai jika:** Engineer dapat membuat dan mencabut Viewer; Viewer tidak dapat mengelola anggota; tidak ada jalur untuk memodifikasi/menghapus Engineer; semua aturan diverifikasi di server.

### TKT-005 — Otorisasi server untuk seluruh API dan data Q-Rex

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Menegakkan batas role pada data dan aksi, bukan hanya menyembunyikan tombol.

**Pekerjaan:**

- [x] Buat middleware/helper autentikasi dan pemeriksaan izin yang terpusat, lalu pasang pada router dan handler yang relevan.
- [x] Izinkan kedua role membaca katalog, PRD, hasil, evidence, dan daftar PR; izinkan keduanya menjalankan skenario yang didukung pada target branch.
- [x] Batasi Q-Rex authoring, pembuatan/pengelolaan draft, perubahan PRD, dan penerbitan PR untuk Engineer. Terapkan aturan berdasarkan aksi HTTP dan resource sehingga endpoint baca Q-Rex yang diperlukan untuk daftar PR tidak terkunci keliru.
- [x] Kaitkan provider credential, sesi, draft, percakapan, penggunaan model, dan data pribadi lain dengan principal autentikasi di server. Jangan percaya ID user dari client untuk menentukan pemilik resource.
- [x] Pastikan unauthenticated mendapat `401`, role yang tidak berhak mendapat `403`, serta request lintas user tidak dapat membaca atau mengubah resource privat.
- [x] Pertahankan pembatasan loopback untuk runner lokal dan penanganan request/origin yang sudah ada.

- [x] **Selesai jika:** Matriks izin diuji pada setiap kelompok route; bypass dengan mengganti body, query, header, atau ID resource ditolak; batas loopback tetap terjaga.

### TKT-006 — Login, logout, dan tampilan sesuai role

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Menambahkan antarmuka masuk yang jelas dan membatasi aksi UI sesuai role.

**Pekerjaan:**

- [x] Tambahkan `/auth/login` berisi tombol GitHub untuk Engineer serta form username/password untuk Viewer. Tidak ada link atau form sign-up.
- [x] Tambahkan pemulihan sesi saat app dimuat, logout, state loading/error, redirect setelah login, dan alur wajib ganti password untuk Viewer.
- [x] Tampilkan halaman/aksi bersama sesuai role. Viewer dapat membaca katalog, PRD, hasil, evidence, daftar PR, menjalankan skenario, serta memakai Environment dan Variables.
- [x] Sembunyikan aksi Q-Rex authoring, draft, dan pembuatan/penerbitan PR bagi Viewer. Ingat bahwa server tetap sumber otorisasi utama.
- [x] Tampilkan identitas login dan role dengan jelas serta sediakan logout yang membersihkan state sensitif dari memori.

- [x] **Selesai jika:** Alur UI kedua jenis login dan logout berjalan; refresh memulihkan sesi dengan benar; Viewer tidak melihat aksi Engineer; state tidak autentikasi dan error dapat dipahami.

### TKT-007 — Halaman user management

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Menyediakan antarmuka Engineer untuk mengelola Viewer.

**Pekerjaan:**

- [x] Tambahkan halaman/entri navigasi user management yang hanya tersedia untuk Engineer.
- [x] Tampilkan daftar Engineer dan Viewer beserta username/identitas yang aman, role, dan status akun.
- [x] Sediakan pembuatan Viewer, reset password, dan pencabutan/penonaktifan Viewer. Password awal/reset hanya ditampilkan saat ditetapkan dan tidak pernah dapat dibaca kembali.
- [x] Tangani loading, daftar kosong, error, konfirmasi aksi pencabutan, dan hasil sukses/gagal dengan kontrol aksesibel.
- [x] Jangan menambahkan aksi edit role atau hapus pada baris Engineer.

- [x] **Selesai jika:** Semua aksi pada UI menggunakan API terproteksi dan keadaan loading/kosong/error/sukses tercakup dalam verifikasi.

### TKT-008 — Environment dan Variables per akun

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Menjaga Environment dan Variables tetap tersedia bagi semua role, tanpa mengubahnya menjadi pengaturan Project.

**Pekerjaan:**

- [x] Pertahankan pemilihan environment dan panel Variables yang ada; jangan menambahkan CRUD environment atau secret Project.
- [x] Simpan pilihan environment dan nilai Variables nonrahasia di `localStorage` dengan key yang dipisahkan menurut principal agar akun berbeda di browser yang sama tidak saling memakai preferensi.
- [x] Simpan nilai rahasia hanya di state memori selama tab aktif dan diperlukan. Jangan tulis ke `localStorage`, `sessionStorage`, database, chat/model prompt, log, telemetry, atau evidence. Bersihkan setelah logout dan setelah operasi selesai bila aman.
- [x] Kirim nilai hanya ke endpoint run atau eksplorasi yang memang memerlukannya. Pertahankan validasi variabel yang diturunkan dari konfigurasi/skema automation, bukan daftar environment yang dikelola user.
- [x] Verifikasi interaksi saat pergantian akun, logout, refresh, dan run gagal agar nilai rahasia tidak muncul kembali atau tertinggal di akun lain.

- [x] **Selesai jika:** Kedua role dapat memakai kontrol yang sama; nilai nonrahasia terisolasi per akun; nilai rahasia tidak persisten dan tidak bocor melalui error/log.

### TKT-009 — Integrasi identitas GitHub dengan Q-Rex dan pembuatan PR

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Membuat PR atas nama Engineer yang sedang login dan memastikan izin GitHub yang benar dipakai.

**Pekerjaan:**

- [x] Telusuri seluruh alur Q-Rex dari sesi/draft sampai branch push, pembuatan PR, refresh status, dan History PR. Pertahankan repository dan target branch yang dipakai alur sekarang.
- [x] Tambahkan adapter GitHub server-side yang memakai token user OAuth milik Engineer aktif untuk akses repository dan PR. Gunakan izin sekecil mungkin yang mendukung operasi tersebut.
- [x] Enkripsi token saat disimpan; tangani expiry, refresh/revocation, repository tidak dapat diakses, dan scope yang kurang dengan pesan yang dapat ditindaklanjuti serta alur reconnect.
- [x] Jangan kirim token ke browser, prompt/tool model, file workspace, command line/log, atau percakapan. Jangan fallback diam-diam ke akun `gh` lokal/shared saat ada sesi user yang terautentikasi.
- [x] Ikat draft dan operasi PR pada Engineer pemiliknya. Viewer boleh melihat PR yang diizinkan tetapi tidak dapat membuat branch atau PR.
- [x] Pertahankan integrasi GitHub CLI yang hanya digunakan preview lokal jika diperlukan; dokumentasikan dengan tegas bahwa jalur itu bukan identitas hosted per-user.

- [x] **Selesai jika:** Dengan mock GitHub, Q-Rex membuat branch/PR menggunakan identitas Engineer yang sesuai; token per user tidak tertukar atau terekspos; Viewer tidak dapat menerbitkan; kegagalan otorisasi ditangani.

### TKT-010 — Verifikasi akhir, dokumentasi operasional, dan konsistensi

- [x] Tandai tiket ini selesai setelah semua langkah dan kriteria selesai di bawah sudah terpenuhi.

**Tujuan:** Memastikan seluruh alur dan batas keamanan konsisten setelah tiket implementasi selesai.

**Pekerjaan:**

- [x] Audit semua route API dan aksi UI untuk mencari endpoint yang terlewat, penggunaan identitas dummy sebagai autentikasi, pemakaian token bersama, kebocoran secret, serta akun Viewer/Engineer yang dapat saling mengambil alih.
- [x] Verifikasi kasus login OAuth pertama/berulang, login Viewer, password awal dan reset, perubahan password wajib, logout, sesi kedaluwarsa/dicabut, role API/UI, pergantian akun, token GitHub kedaluwarsa/revoke, dan pembuatan PR.
- [x] Pastikan migrasi baru dapat diterapkan dari database yang sudah ada dan instruksi environment OAuth/password hashing/session tercantum pada README atau dokumentasi operasional yang tepat.
- [x] Perbarui status tiket ini hanya setelah pekerjaan dan pemeriksaan terkait benar-benar selesai. Catat pemeriksaan yang dijalankan serta keterbatasan kredensial OAuth sungguhan bila belum tersedia.

- [x] **Selesai jika:** Test lokal yang relevan, Biome, typecheck, dan build lulus; dokumentasi sesuai implementasi; tidak ada perubahan generated catalog atau skenario tenant yang tidak diperlukan; preview tetap loopback.

## Catatan verifikasi TKT-005–TKT-010

- `pnpm.cmd db:migrate` berhasil pada database lokal yang tersedia.
- 84 test lokal autentikasi dan Q-Rex serta 14 test frontend, katalog, dan runner lulus. Browser dengan API fixture memverifikasi login Viewer, Variables, logout, pengelolaan Viewer, pergantian akun lintas tab, dan isolasi evidence draft.
- `pnpm.cmd exec biome check src server vite.config.ts drizzle.config.ts`, `pnpm.cmd typecheck`, dan `pnpm.cmd build` berhasil. Biome melaporkan 19 peringatan dan build memperingatkan ukuran bundle.
- OAuth dan pembuatan PR GitHub diuji dengan provider mock; kredensial GitHub sungguhan belum digunakan. Tidak ada BDD tenant yang dijalankan. Preview tetap loopback.