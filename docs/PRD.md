# PRD — Automation Workspace

*Nama kerja produk · Versi 0.1 (draft) · 9 November 2026 · Disusun dari sesi wawancara dengan product owner*

## 1. Ringkasan

Automation Workspace adalah aplikasi web internal bagi FE Test Engineer dan QA Engineer di Hyperscal untuk **membuat, menjalankan, dan memelihara automation test Playwright BDD** dengan bantuan **AI Agent**. Agent menjalankan workflow skill yang sudah ada (`write-e2e-scenarios`, `write-e2e-code`, `ask-qa`) dan satu skill baru (`write-prd`), memakai API key AI milik pengguna sendiri (BYOK).

Produk ini hidup di **repo terpisah** dari aplikasi FE yang dites, sehingga agent tidak bisa membaca source FE. Pengetahuan tentang aplikasi target datang dari **PRD per sub-module** (di-upload atau dihasilkan agent lewat eksplorasi `playwright-cli`) dan dari eksplorasi UI langsung.

Aplikasi target pertama adalah **Converge** (`converge.<env>.hyperscal.com`, env `dev`, `stt`, `stt1`, `pp`).

## 2. Latar Belakang dan Masalah

- Workflow testing sudah agentic, tetapi berjalan di harness CLI. Hanya orang yang paham CLI dan skill yang bisa memakainya, dan tidak ada tampilan terpusat untuk scenario, hasil run, dan evidence.
- Scenario catalog saat ini berupa file Markdown yang ditulis reporter ke repo. Catalog tidak membedakan env, perubahan Last Run membuat PR berisik, dan evidence di-upload manual ke Google Drive.
- Skill saat ini bergantung pada source FE (menelusuri route dan memverifikasi locator dari source). Di repo baru, source FE tidak tersedia.
- Agent terikat ke satu harness dan provider; tim ingin bebas memilih provider lewat API key sendiri.

## 3. Tujuan, Non-Goals, dan Metrik

**Tujuan**

- G1. Engineer dapat menjalankan seluruh workflow PRD → scenario → code → run → PR dari browser, tanpa CLI.
- G2. Catalog scenario tersimpan di DB, dibedakan per env, dan selalu diturunkan dari source code di repo.
- G3. Hasil dan evidence terbaru per scenario dan env dapat ditelusuri.
- G4. Perubahan test melalui draft privat yang berakhir sebagai PR GitHub.
- G5. Agent provider-agnostic lewat BYOK.

**Non-goals (MVP)**

- Unit/integration test (Vitest), CI, dan pengembangan Automation app lama.
- Manajemen banyak Project lewat UI (skema data sudah siap, UI belum).
- Login memakai plan subscription, notifikasi Slack, dan ekspor ke Google Drive.
- Menggantikan review PR manusia di GitHub.

**Metrik keberhasilan**

- M1. Waktu dari PRD sub-module sampai PR test siap review.
- M2. Proporsi kategori flow yang memiliki setidaknya satu scenario `passed` pada hasil terbaru per environment, dihitung dari tag `@flow:` di file `.feature`. Angka ini hanya mencakup kategori yang sudah ditulis dan bukan bukti cakupan bisnis penuh.
- M3. Rasio scenario berstatus `passed` dari scenario yang memiliki hasil terbaru per environment.
- Target numerik ditetapkan setelah baseline 4 minggu pertama.

## 4. Pengguna dan Peran

Dua peran per Project:

- **Engineer**: akses penuh. Membuat draft, memakai agent, meng-upload atau membuat PRD, menjalankan test, membuat PR, serta mengelola env dan secret, anggota Project, dan koneksi repo. Jadwal dan notifikasi ditunda ke fase berikutnya. Secret bersifat write-only.
- **Viewer**: hanya melihat catalog, hasil run, evidence, dan PRD, serta menjalankan scenario pada branch target. Tidak bisa memakai agent, membuat draft, atau membuat PR.
- **Sistem (scheduler, fase berikutnya)**: jika fitur jadwal ditambahkan, menjalankan run terjadwal dengan identitas sistem.

Izin tulis ke repo tetap dibatasi izin GitHub milik pengguna.

## 5. Glosarium

- **Project**: satu repo test + satu aplikasi target + kumpulan env dan anggota. MVP: satu Project (Converge); jadwal ditunda.
- **Environment (env)**: target eksekusi (nama, base URL, variabel/secret). Dinamis per Project.
- **Branch target**: branch yang menjadi basis dan tujuan PR (default `development`).
- **Draft**: branch kerja per pengguna (di-checkout dari branch target) + sesi chat + workspace sandbox. Privat sampai finalize.
- **Catalog**: daftar scenario dari `.feature`, dikelompokkan ke kategori flow dari tag `@flow:`, plus status per env dari hasil run.
- **Run lokal**: satu eksekusi test dari checkout yang sedang terbuka, pada satu env. Preview menyimpan hasil dan evidence terbaru per scenario/env.
- **Hasil resmi**: hasil hosted untuk versi scenario yang saat ini ada di branch target. Jika merge menambah atau mengubah scenario, statusnya `not run` sampai scenario itu dijalankan di hosted. Hasil dari preview lokal tidak disalin sebagai hasil resmi.
- **Evidence**: screenshot, video, dan file bukti lain yang dihasilkan runner, disimpan di object storage privat.
- **PRD (target)**: dokumen Markdown per sub-module di repo yang menjelaskan perilaku aplikasi target.
- **Skill**: folder instruksi di `.agents/skills/` yang dimuat agent.

## 6. Prinsip Desain

1. Source code adalah sumber kebenaran. Catalog di DB hanya turunan dan bisa dibangun ulang dari repo.
2. Draft privat; perubahan baru terlihat orang lain setelah PR.
3. Skill tetap menjadi otoritas proses. App menyediakan runtime, UI, dan pagar teknis, bukan mengubah semantik skill.
4. Hasil yang jujur: status hasil scenario adalah passed, failed, atau skipped. Status eksekusi dan upload evidence ditampilkan terpisah. Data hasil hanya mewakili run terbaru.
5. Secret dan API key tidak pernah masuk konteks LLM atau log.
6. Provider-agnostic: tidak ada ketergantungan pada satu vendor model.

## 7. Alur Kerja Utama

1. Engineer membuat **draft** baru (branch dari branch target) dan membuka sesi chat.
2. **PRD**: upload PRD (dikonversi ke Markdown) atau minta `write-prd` menghasilkannya lewat wawancara dan eksplorasi. Hasil di `docs/prd/<module>/<submodule>.md`.
3. **Scenario**: `write-e2e-scenarios` menemukan dan mengonfirmasi daftar flow, menulis scenario dengan tag `@flow:` ke `.feature`, lalu berhenti di gerbang review. Catalog menampilkan flow sebagai kategori yang bisa di-collapse.
4. **Code**: setelah approve, `write-e2e-code` menulis steps, POM, COM, fixture, dan mock, lalu menjalankan test di env yang dipilih.
5. **Run**: Engineer atau Viewer menjalankan scenario; hasil dan evidence masuk ke DB dan R2.
6. **Finalize**: draft disinkronkan dengan branch target, lalu dibuat PR. Draft dilepas dan PR tercatat di History PR.
7. **Setelah merge**: webhook GitHub memicu parse ulang catalog resmi. Scenario definition baru atau berubah menjadi `not run` pada setiap env sampai dijalankan di hosted; hasil lokal tidak dipindahkan.

## 8. Kebutuhan Fungsional

### 8.1 Project dan koneksi repo

- FR-1. Menghubungkan Project ke repo GitHub lewat GitHub App dan memilih branch target.
- FR-2. Impor awal: parse semua `.feature` di branch target ke catalog (tanpa riwayat run).
- FR-3. Scaffold repo baru (lihat Lampiran A) dengan skill default.
- FR-4. Kelola anggota Project (Engineer atau Viewer).

### 8.2 Environment dan secret

- FR-5. CRUD env per Project: nama, base URL, variabel, secret.
- FR-6. Secret terenkripsi at rest, write-only, tidak pernah ditampilkan ulang, dan dimasking di log dan trace.
- FR-7. Secret env disuntikkan ke worker atau sandbox sebagai environment variable saat run atau eksplorasi; model tidak melihat nilainya.
- FR-8. Env dapat ditandai *protected* sebagai penanda visual dan pencatatan audit (tidak memblokir akses pada MVP).

### 8.3 Catalog

- FR-9. The scenario explorer uses module and feature navigation, a scenario list, and a detail panel for the selected scenario. The list groups scenarios by collapsible `@flow:` category. Each row shows the title, ID or an unavailable-ID label, compact metadata (type, priority, and tags), execution availability, and the latest status for the selected environment. The detail panel shows category, type, latest status and run time, duration, expected result when distinct from the steps, Gherkin steps, example outcomes for scenario outlines, available evidence, and run actions. The list does not need to display every detail field as a column.
- FR-10. The explorer supports cross-feature search by ID, title, feature, module, category, and tag; filtering by tag, flow, priority, type, and status; and sorting by source order, ID, flow, tag, title, type, priority, status, or last-run time. Environment is selected as a global context and determines the displayed status and results; it is not a separate catalog filter.
- FR-11. Catalog resmi mengikuti branch target dan di-parse ulang saat PR di-merge atau sync manual. Scenario definition baru atau berubah dikenali dari source feature dan identitas scenario yang stabil; jangan menganggap ID saja unik. Statusnya menjadi `not run` pada setiap env dan referensi evidence terbarunya dihapus. Jika pencocokan identitas ambigu, jangan gunakan hasil lama. Scenario yang tidak berubah mempertahankan hasil hosted terakhirnya.
- FR-12. Catalog draft di-parse dari workspace draft dan hanya terlihat pemilik draft.
- FR-13. Kelompokkan scenario berdasarkan kategori dari tag `@flow:` di dalam `.feature`; tiap kategori dapat di-collapse dan tidak memerlukan file registry terpisah.
- FR-14. Ekspor catalog ke Markdown atau CSV atas permintaan.

### 8.4 Run dan evidence (perilaku preview lokal saat ini)

- FR-15. Preview lokal menerima pilihan satu scenario, satu feature, atau satu kategori `@flow:` di dalam feature, pada satu env per run. Filter tag hanya menyaring katalog dan bukan target run.
- FR-16. Run lokal mengeksekusi checkout yang sedang terbuka dan hanya memperbarui hasil lokal. Hasil lokal tidak disalin ke hosted. Setelah merge, scenario baru atau berubah di hosted berstatus `not run` sampai dijalankan di hosted; referensi evidence lama dilepas agar tidak tampak berasal dari isi scenario terbaru. Scenario yang tidak berubah mempertahankan hasil hosted terakhirnya.
- FR-17. Tampilan run menunjukkan tahap, status scenario dan langkah, serta preview browser seperti preview saat ini. Posisi antrean, worker container, dan antrean tahan restart belum diperlukan dan ditunda.
- FR-18. MVP tidak mengulang scenario secara otomatis; status hasil per scenario hanya `passed`, `failed`, atau `skipped`. Retry terjadwal belum termasuk cakupan dan dibahas kembali bersama fitur jadwal.
- FR-19. Simpan satu hasil terbaru per scenario dan env (status `passed`, `failed`, atau `skipped`, durasi, waktu eksekusi, run ID, dan referensi evidence). Scenario `not run` adalah state katalog saat belum ada hasil hosted untuk definition terbaru, bukan status hasil run. Hasil run sebelumnya tidak disimpan sebagai riwayat. Commit SHA dan trigger bukan bagian dari result contract MVP.
- FR-20. Simpan evidence terbaru di bucket privat Cloudflare R2 lewat abstraksi S3 dan berikan akses melalui signed URL. UI menampilkan screenshot/video dan tautan unduhan untuk file evidence; viewer trace tidak termasuk MVP.
- FR-21. Preview lokal hanya mengizinkan satu run aktif per proses API, berlaku untuk semua env. Batas konkurensi terkonfigurasi per env dan koordinasi lintas instance ditunda.
- FR-22. Run aktif dapat dibatalkan sebelum upload evidence selesai dengan menghentikan proses Playwright, baik di local maupun hosted, lalu ditampilkan sebagai `cancelled`. Scenario yang sedang berjalan mungkin terputus. Run yang dibatalkan tidak menyimpan hasil apa pun dari run tersebut; hasil terbaru sebelumnya tetap ada untuk scenario yang dipilih.
- FR-23. Simpan satu set evidence terbaru per scenario dan env. Saat evidence baru berhasil diunggah, ganti evidence sebelumnya. MVP tidak menyimpan riwayat run dan tidak memakai kebijakan retensi berbasis waktu.

### 8.5 Jadwal dan notifikasi

Fitur jadwal ditunda dan belum tersedia di preview lokal. Kebutuhan berikut dicatat untuk fase setelah MVP:

- FR-24. Jadwal cron per Project: pilih env, target (tag, flow, atau sub-module), dan branch target.
- FR-25. Run terjadwal memakai identitas sistem dan memperbarui catalog resmi.
- FR-26. Notifikasi email saat run terjadwal gagal; penerima diatur per jadwal.

### 8.6 AI Agent dan skill

- FR-27. Agent loop buatan sendiri di atas Vercel AI SDK (TypeScript), dengan abstraksi multi-provider.
- FR-28. Sandbox container per sesi draft: workspace hasil clone draft, `playwright-cli`, dan akses jaringan terbatas ke env target dan GitHub.
- FR-29. Tool agent: baca, tulis, dan edit file; git; `playwright-cli`; jalankan test; `ask_user` (pertanyaan interaktif); tampilkan diff.
- FR-30. Skill dimuat dari `.agents/skills/` pada ref draft; perubahan skill ikut alur draft → PR.
- FR-31. Gerbang skill (wawancara, konfirmasi flow, approve scenario, izin data-safety) tampil sebagai widget di chat + panel diff; agent berhenti sampai pengguna menjawab. Diam atau instruksi lanjut yang umum bukan persetujuan.
- FR-32. Format pertanyaan mengikuti skill: satu pertanyaan per giliran, opsi bernomor, satu rekomendasi, dan fallback teks bebas.
- FR-33. Riwayat percakapan dan keputusan per draft tersimpan dan dapat dilanjutkan.
- FR-34. Penggunaan token ditampilkan per sesi dan per pengguna.
- FR-35. Batas sumber daya sandbox (CPU, memori, waktu, jumlah langkah agent) dan penghentian sesi idle.

### 8.7 BYOK

- FR-36. Setiap Engineer menyimpan API key per provider di setelan akun: OpenAI, Anthropic, Google, dan endpoint OpenAI-compatible (misalnya OpenRouter).
- FR-37. Key terenkripsi, hanya dipakai backend untuk memanggil provider, dan tidak pernah masuk sandbox atau konteks model.
- FR-38. Pemilihan model per sesi, dengan daftar model yang sudah diuji tool-calling-nya.
- FR-39. Lapisan auth berbentuk adapter sehingga login plan (misalnya Sign in with ChatGPT) dapat ditambahkan di fase berikutnya.

### 8.8 Draft, sinkronisasi, dan PR

- FR-40. Satu pengguna dapat memiliki banyak draft; satu draft = satu branch `draft/<user>/<slug>-<id>`.
- FR-41. Draft hanya tampil di daftar pemilik; tidak tampil bagi pengguna lain di app.
- FR-42. Sebelum finalize, app menyinkronkan draft dengan branch target. Konflik ditampilkan dan diselesaikan agent atau manual di GitHub.
- FR-43. Finalize membuat PR dari branch draft ke branch target atas nama pengguna; judul dan deskripsi diambil dari ringkasan perubahan (ID scenario dan kategori flow).
- FR-44. Setelah finalize, draft dilepas dan PR tercatat di menu **History PR** (status open, merged, atau closed disinkronkan lewat webhook, dengan tautan ke GitHub).
- FR-45. Draft tidak aktif diarsipkan setelah 30 hari (branch tetap ada).

### 8.9 Skill baru: write-prd

- FR-46. **Jalur upload**: PDF, DOCX, Markdown, atau teks dikonversi ke Markdown mengikuti template PRD, lalu ditinjau pengguna.
- FR-47. **Jalur eksplorasi**: wawancara singkat + eksplorasi `playwright-cli` per sub-module. Tiap butir diberi label sumber: `spec` (dari dokumen atau pengguna), `observed` (teramati, belum divalidasi), atau `assumed`.
- FR-48. Gerbang review: butir `observed` baru menjadi `validated` setelah Engineer menyetujui. PRD tidak menyimpulkan niat bisnis dari perilaku UI saja.
- FR-49. Output: `docs/prd/<module>/<submodule>.md` dengan front matter (module, submodule, status, sumber, env dan tanggal eksplorasi terakhir).
- FR-50. Template PRD sub-module memetakan topik wawancara konteks `write-e2e-scenarios` (tujuan dan kebutuhan, flow bisnis dan happy path smoke, aturan validasi dan pesan, akses atau role, data dan mutasi, known issue dan di luar cakupan) agar skill scenario dapat memakai ulang jawaban dan tidak menanyakannya lagi.

### 8.10 Akses dan audit

- FR-51. Login dengan GitHub (GitHub App OAuth); identitas yang sama dipakai untuk commit dan PR.
- FR-52. Agent dan semua peran boleh bekerja di semua env; pengamanan data bergantung pada aturan data-safety di skill (record milik E2E, izin sebelum menyentuh seed data).
- FR-53. Audit log: siapa, kapan, env mana, dan aksi apa untuk aksi agent yang berinteraksi dengan env, run, perubahan secret, dan PR.

## 9. Adaptasi Skill

Skill tetap di repo test dan perlu disesuaikan karena source FE tidak tersedia dan cakupan MVP hanya E2E:

- **write-e2e-scenarios**: ganti penelusuran route dari source (`_protected+/...`) dengan PRD + eksplorasi UI; module dan sub-module ditentukan dari PRD atau navigasi UI; wawancara memakai ulang jawaban dari PRD; konvensi ID (`TEN_<CODE>_<FLG>_E2E_NNN`) menjadi prefix yang dikonfigurasi per Project. Gerbang dan format pertanyaan tetap.
- **write-e2e-code**: verifikasi locator hanya lewat snapshot `playwright-cli` (tanpa membaca source FE); perintah run mengikuti repo baru; langkah catalog Markdown dan laporan agregat unit test dihapus; hasil run keluar sebagai result contract untuk diingest app.
- **ask-qa**: dipangkas menjadi panduan workflow E2E (PRD → scenario → code → run → PR); bagian Automation app lama, Vitest, dan CI dihapus.
- **write-prd**: skill baru (bagian 8.9).
- **Perlu ditinjau**: baris *Entity options input* di tiap skill; rujukan ke `write-unit-tests`, `testing-operations.md`, `source-map.md`, dan skill `playwright-cli` beserta references-nya (harus ada di repo baru atau dihapus dari rujukan).
- Struktur folder `bdd/` (components, features, fixtures, pages, setup, steps, utils) dibawa dari repo lama.

## 10. Model Data Konseptual

Semua tabel berkunci `project_id` agar siap multi-Project.

- `projects`, `project_members` (role: engineer atau viewer), `users` (identitas GitHub).
- `environments`, `environment_variables` (nilai terenkripsi, write-only).
- `user_ai_credentials` (provider, key terenkripsi) dan `ai_usage`.
- `drafts` (branch, base\_ref, status: active, finalized, archived, owner), `draft_sessions`, dan `messages`.
- `flows` dan `scenarios` (scenario\_id, flow\_id, judul, tag, prioritas, langkah, source\_path, ref, commit\_sha). Catalog resmi = ref branch target; catalog draft di-cache per draft + SHA.
- `prds` (index: module, submodule, status, path, commit\_sha).
- `latest_results` (satu baris per scenario dan env: run ID, status passed/failed/skipped, waktu eksekusi, durasi, dan status/referensi evidence). Tidak ada tabel riwayat run pada MVP.
- Objek evidence terbaru di R2 (kunci, jenis, ukuran) dengan prefix terpisah per env dan scenario; upload terbaru mengganti set sebelumnya. Tidak ada retensi berbasis waktu pada MVP.
- `pull_requests` (draft, nomor PR, status, url) dan `audit_log`.
- Status resmi per scenario per env = hasil hosted terbaru untuk definition scenario yang saat ini ada pada branch target, atau `not run` bila definition itu belum pernah dijalankan hosted.

## 11. Arsitektur dan Deployment (target hosted; belum diterapkan pada preview lokal)

**Stack**: TypeScript end-to-end. Next.js (UI + API), Postgres, Redis dengan BullMQ, worker Node, dan Playwright dalam container.

**Monorepo**: `apps/web` (UI dan API) dan `apps/worker` (run, sandbox agent, sync). Keduanya terpisah sejak hari pertama.

**Fase bootstrap**: `web` di Vercel sebagai deployment sementara; Postgres dan Redis terkelola; **worker dan sandbox di host container di AWS** (misalnya Fargate atau EC2) dengan IP egress statis jika env target memakai allowlist IP. Alasannya: per November 2026, durasi maksimum Vercel Functions adalah 300 detik (Hobby) atau 800 detik (Pro/Enterprise), dengan durasi hingga 30 menit masih beta, dan ukuran bundle dibatasi 250 MB. Itu tidak cocok untuk run Playwright panjang, loop agent, dan worker antrian yang harus hidup terus.

**Target akhir**: seluruh komponen di AWS (belum final; verifikasi saat implementasi).

**Agent**: Vercel AI SDK (major 7 per Juni 2026; `ToolLoopAgent`, persetujuan tool human-in-the-loop, dukungan MCP). Versi dipin dan dicek ulang saat implementasi. Loop agent berjalan di worker, bukan di fungsi serverless.

**Storage evidence**: Cloudflare R2 lewat abstraksi S3. Dapat dipindah ke self-hosted S3-compatible. Bucket privat dengan signed URL; kunci latest per env dan scenario ditimpa saat ada evidence baru. Tidak ada lifecycle expiry untuk MVP.

**Integrasi GitHub**: GitHub App (login, clone, branch, PR, webhook) di balik abstraksi provider git agar GitLab atau Bitbucket dapat ditambah kemudian.

## 12. Kebutuhan Non-Fungsional

- **Keamanan**: enkripsi secret dan API key at rest (envelope encryption); tidak ada secret di log, trace, atau prompt; sandbox terisolasi antar sesi; egress sandbox dibatasi ke env target, GitHub, dan endpoint yang diperlukan. Karena agent dan semua pengguna boleh di semua env, audit log wajib.
- **Privasi evidence**: screenshot, video, dan file bukti dapat memuat data internal; bucket privat, akses signed URL, dan redaksi nilai secret.
- **Keandalan**: sesi agent dapat dilanjutkan setelah gangguan; pemulihan job dan antrean tahan restart ditunda bersama worker hosted.
- **Performa**: progres run live; UI catalog tetap responsif pada ribuan scenario.
- **Observabilitas**: metrik run, kegagalan agent, dan penggunaan token; metrik kapasitas antrean ditunda.
- **Portabilitas**: tidak terkunci ke satu cloud atau satu provider LLM.

## 13. Cakupan MVP dan Fase 2

**MVP**

- Project Converge (skema multi-Project), koneksi GitHub, env dan secret, anggota (Engineer dan Viewer).
- Catalog dari repo, run dari checkout saat ini pada satu env per permintaan, pilihan scenario/feature/kategori, satu run aktif per proses API, hasil terbaru per scenario/env dengan status passed/failed/skipped, dan evidence terbaru.
- Agent + skill (`ask-qa` dipangkas, `write-prd`, `write-e2e-scenarios`, `write-e2e-code`) dan BYOK API key.
- Draft → sinkronisasi → PR, serta History PR.

**Fase 2**

- Jadwal cron dan notifikasi email, pemilihan tag atau banyak env sekaligus, worker container dan antrean tahan restart, batas konkurensi per env lintas instance, UI multi-Project, login plan (Sign in with ChatGPT), notifikasi Slack, ekspor evidence ke Google Drive, penyebaran perbaikan skill lintas Project, run otomatis setelah merge, dan pagar teknis untuk env protected.

## 14. Risiko dan Mitigasi

- **Subscription tidak bisa dipakai di semua provider.** Anthropic melarang token OAuth plan Free, Pro, dan Max di produk pihak ketiga (kebijakan Februari 2026), sedangkan OpenAI membuka plan usage untuk aplikasi yang memenuhi syarat (September 2026). Mitigasi: MVP memakai API key; adapter auth disiapkan; verifikasi syarat dan kebijakan sebelum fase 2.
- **Kualitas tool-calling berbeda antar model.** Mitigasi: daftar model teruji, evaluasi skill per model, pesan galat yang jelas.
- **Pengamanan data hanya lunak (instruksi skill)** karena agent boleh di semua env. Mitigasi: audit log, penanda env protected, pagar teknis di fase 2.
- **Eksplorasi tanpa source FE** menghasilkan PRD berbasis perilaku teramati. Mitigasi: label `observed` dan gerbang validasi.
- **Konflik antar draft** pada file bersama. Mitigasi: sinkronisasi sebelum finalize dan bantuan agent.
- **Branch draft di GitHub terlihat oleh siapa pun yang punya akses repo** meski tidak tampil di app. Mitigasi: dokumentasikan; pertimbangkan prefix dan kebijakan akses repo.
- **Biaya token dan sandbox.** Mitigasi: batas sumber daya, tampilan penggunaan, timeout idle.
- **Env target kewalahan jika run paralel diperkenalkan.** Mitigasi fase berikutnya: batas konkurensi per env.
- **Kebijakan keamanan perusahaan terhadap R2** belum terverifikasi. Mitigasi: abstraksi S3 memudahkan pindah ke self-hosted.

## 15. Asumsi dan Pertanyaan Terbuka

**Asumsi default (belum dikonfirmasi)**

- Tidak ada riwayat hasil run atau retensi evidence berbasis waktu pada MVP; hanya hasil dan evidence terbaru per scenario/env yang disimpan.
- Pemilihan run lokal terbatas pada scenario, feature, atau kategori dalam feature; satu env dipilih per run.
- Jadwal, notifikasi email, dan retry terjadwal ditunda.
- Preview lokal membatasi satu run aktif per proses API; batas konkurensi hosted per env belum ditentukan.
- Dalam produk hosted, Viewer menjalankan scenario pada branch target. Scenario baru atau berubah setelah merge harus dijalankan ulang di hosted sebelum mendapat hasil; hasil lokal tidak diimpor.
- Draft idle diarsipkan setelah 30 hari.
- Dokumen ini berbahasa Indonesia; UI, source code, skill, dan isi repo berbahasa Inggris.

**Pertanyaan terbuka**

- Nama produk final.
- Target numerik metrik M1 sampai M3 setelah baseline.
- Isi final scaffold repo (konfigurasi Playwright BDD, reporter, MSW) yang berada di luar folder `bdd/` pada repo lama.
- Apakah perubahan shared steps, fixtures, atau POM juga harus mereset hasil scenario yang `.feature`-nya tidak berubah.
- Apakah perlu multi-akun atau role per env (akun untuk skenario penolakan akses) di MVP.
- Aturan penerima email dan jenis kejadian yang memicu notifikasi.
- Kebijakan keamanan Hyperscal untuk evidence di layanan pihak ketiga dan untuk branch draft di GitHub.
- Penyedia dan layanan email untuk notifikasi.

## Lampiran A. Scaffold Repo Test (asumsi)

- `bdd/` dibawa dari repo lama: `components`, `features`, `fixtures`, `pages`, `setup`, `steps`, `utils`.
- Konfigurasi Playwright BDD (`playwright.bdd.config.ts`) dengan baseURL dan kredensial dari env yang disuntikkan app.
- Reporter kustom yang menulis result contract (JSON) untuk diingest app; menggantikan penulisan catalog Markdown.
- `.agents/skills/` berisi skill hasil adaptasi + `playwright-cli` dan referensinya.
- `docs/prd/<module>/<submodule>.md` untuk PRD target; scenario dan kategori flow berada di `<submodule>.feature`.
- MSW untuk scenario `@mock`, `package.json`, dan `tsconfig` minimal.
- Tidak ada `.env.local` di repo; semua nilai env datang dari app.
