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
- G3. Setiap run per env menyimpan hasil dan evidence yang dapat ditelusuri.
- G4. Perubahan test melalui draft privat yang berakhir sebagai PR GitHub.
- G5. Agent provider-agnostic lewat BYOK.

**Non-goals (MVP)**

- Unit/integration test (Vitest), CI, dan pengembangan Automation app lama.
- Manajemen banyak Project lewat UI (skema data sudah siap, UI belum).
- Login memakai plan subscription, notifikasi Slack, dan ekspor ke Google Drive.
- Menggantikan review PR manusia di GitHub.

**Metrik keberhasilan**

- M1. Waktu dari PRD sub-module sampai PR test siap review.
- M2. Cakupan flow terverifikasi per sub-module (flow berstatus `verified` dibanding flow terdaftar di `.flows.md`). Angka ini bukan bukti cakupan bisnis penuh.
- M3. Stabilitas run: pass rate dan flaky rate per env per periode.
- Target numerik ditetapkan setelah baseline 4 minggu pertama.

## 4. Pengguna dan Peran

Dua peran per Project:

- **Engineer**: akses penuh. Membuat draft, memakai agent, meng-upload atau membuat PRD, menjalankan test, membuat PR, serta mengelola env dan secret, anggota Project, koneksi repo, jadwal, dan notifikasi. Secret bersifat write-only.
- **Viewer**: hanya melihat catalog, hasil run, evidence, dan PRD, serta menjalankan scenario pada branch target. Tidak bisa memakai agent, membuat draft, atau membuat PR.
- **Sistem (scheduler)**: menjalankan run terjadwal dengan identitas sistem.

Izin tulis ke repo tetap dibatasi izin GitHub milik pengguna.

## 5. Glosarium

- **Project**: satu repo test + satu aplikasi target + kumpulan env, anggota, dan jadwal. MVP: satu Project (Converge).
- **Environment (env)**: target eksekusi (nama, base URL, variabel/secret). Dinamis per Project.
- **Branch target**: branch yang menjadi basis dan tujuan PR (default `development`).
- **Draft**: branch kerja per pengguna (di-checkout dari branch target) + sesi chat + workspace sandbox. Privat sampai finalize.
- **Catalog**: daftar scenario dan flow hasil parse `.feature` dan `.flows.md`, plus status per env dari hasil run.
- **Run**: satu eksekusi test pada satu env dan satu ref (commit), dengan hasil per scenario.
- **Evidence**: trace, screenshot, video, dan log run di object storage.
- **PRD (target)**: dokumen Markdown per sub-module di repo yang menjelaskan perilaku aplikasi target.
- **Skill**: folder instruksi di `.agents/skills/` yang dimuat agent.

## 6. Prinsip Desain

1. Source code adalah sumber kebenaran. Catalog di DB hanya turunan dan bisa dibangun ulang dari repo.
2. Draft privat; perubahan baru terlihat orang lain setelah PR.
3. Skill tetap menjadi otoritas proses. App menyediakan runtime, UI, dan pagar teknis, bukan mengubah semantik skill.
4. Hasil yang jujur: bedakan passed, failed, flaky, skipped, not run, dan blocked. Hasil lama bukan bukti kondisi sekarang.
5. Secret dan API key tidak pernah masuk konteks LLM atau log.
6. Provider-agnostic: tidak ada ketergantungan pada satu vendor model.

## 7. Alur Kerja Utama

1. Engineer membuat **draft** baru (branch dari branch target) dan membuka sesi chat.
2. **PRD**: upload PRD (dikonversi ke Markdown) atau minta `write-prd` menghasilkannya lewat wawancara dan eksplorasi. Hasil di `docs/prd/<module>/<submodule>.md`.
3. **Scenario**: `write-e2e-scenarios` menemukan flow, mengonfirmasi daftar flow, menulis `.feature` dan `.flows.md`, lalu berhenti di gerbang review.
4. **Code**: setelah approve, `write-e2e-code` menulis steps, POM, COM, fixture, dan mock, lalu menjalankan test di env yang dipilih.
5. **Run**: Engineer atau Viewer menjalankan scenario; hasil dan evidence masuk ke DB dan R2.
6. **Finalize**: draft disinkronkan dengan branch target, lalu dibuat PR. Draft dilepas dan PR tercatat di History PR.
7. **Setelah merge**: webhook GitHub memicu parse ulang catalog resmi.

## 8. Kebutuhan Fungsional

### 8.1 Project dan koneksi repo

- FR-1. Menghubungkan Project ke repo GitHub lewat GitHub App dan memilih branch target.
- FR-2. Impor awal: parse semua `.feature` dan `.flows.md` di branch target ke catalog (tanpa riwayat run).
- FR-3. Scaffold repo baru (lihat Lampiran A) dengan skill default.
- FR-4. Kelola anggota Project (Engineer atau Viewer).

### 8.2 Environment dan secret

- FR-5. CRUD env per Project: nama, base URL, variabel, secret.
- FR-6. Secret terenkripsi at rest, write-only, tidak pernah ditampilkan ulang, dan dimasking di log dan trace.
- FR-7. Secret env disuntikkan ke worker atau sandbox sebagai environment variable saat run atau eksplorasi; model tidak melihat nilainya.
- FR-8. Env dapat ditandai *protected* sebagai penanda visual dan pencatatan audit (tidak memblokir akses pada MVP).

### 8.3 Catalog

- FR-9. Daftar scenario dengan kolom: ID, tipe, kategori atau flow, tag, judul, expect, langkah Gherkin, prioritas, status per env, last run per env, durasi, dan tautan evidence.
- FR-10. Filter, sort, dan cari berdasarkan flow, tag (`@smoke`, `@regression`, `@priority`), status, dan env.
- FR-11. Catalog resmi mengikuti branch target; di-parse ulang saat PR di-merge (webhook) dan bisa di-sync manual.
- FR-12. Catalog draft di-parse dari workspace draft dan hanya terlihat pemilik draft.
- FR-13. Tampilan registry flow (`.flows.md`) dengan status `pending`, `written`, `approved`, `implemented`, `verified`, `fixme`, `legacy`, `obsolete`.
- FR-14. Ekspor catalog ke Markdown atau CSV atas permintaan.

### 8.4 Run dan evidence

- FR-15. Memilih target run: scenario, flow, tag, atau sub-module; pada satu atau banyak env sekaligus.
- FR-16. Run di branch target menghasilkan hasil resmi (memperbarui catalog); run di draft bersifat privat dan tidak mengubah catalog resmi.
- FR-17. Eksekusi oleh worker container Playwright lewat antrian job, dengan log live dan status per scenario.
- FR-18. Kebijakan retry: 0 untuk run manual dan draft, 1 untuk run terjadwal. Scenario yang lolos setelah retry berstatus **flaky**.
- FR-19. Hasil per scenario memakai result contract bersama (status, durasi, error, evidence, env, commit SHA, trigger).
- FR-20. Evidence di Cloudflare R2 (lewat abstraksi S3), diakses lewat signed URL, dengan viewer trace.
- FR-21. Batas konkurensi per env agar env target tidak terbebani (dapat dikonfigurasi).
- FR-22. Run dapat dibatalkan; hasil parsial tetap tersimpan dengan status yang jelas.
- FR-23. Retensi evidence: 30 hari (run gagal 90 hari); riwayat hasil di DB permanen.

### 8.5 Jadwal dan notifikasi

- FR-24. Jadwal cron per Project: pilih env, target (tag, flow, atau sub-module), dan branch target.
- FR-25. Run terjadwal memakai identitas sistem dan memperbarui catalog resmi.
- FR-26. Notifikasi email saat run terjadwal gagal atau ada scenario flaky; penerima diatur per jadwal.

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
- FR-43. Finalize membuat PR dari branch draft ke branch target atas nama pengguna; judul dan deskripsi diambil dari ringkasan perubahan (ID scenario, flow, status registry).
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
- `runs` (env, ref, commit\_sha, trigger: manual, draft, atau schedule, retry policy, status, pemicu) dan `run_results` (scenario\_id, status: passed, failed, flaky, skipped, blocked, durasi, error, evidence).
- `evidence` (kunci R2, jenis, ukuran), `schedules`, dan `notification_rules`.
- `pull_requests` (draft, nomor PR, status, url) dan `audit_log`.
- Status resmi per scenario per env = hasil run resmi terbaru pada branch target.

## 11. Arsitektur dan Deployment

**Stack**: TypeScript end-to-end. Next.js (UI + API), Postgres, Redis dengan BullMQ, worker Node, dan Playwright dalam container.

**Monorepo**: `apps/web` (UI dan API) dan `apps/worker` (run, sandbox agent, sync). Keduanya terpisah sejak hari pertama.

**Fase bootstrap**: `web` di Vercel sebagai deployment sementara; Postgres dan Redis terkelola; **worker dan sandbox di host container di AWS** (misalnya Fargate atau EC2) dengan IP egress statis jika env target memakai allowlist IP. Alasannya: per November 2026, durasi maksimum Vercel Functions adalah 300 detik (Hobby) atau 800 detik (Pro/Enterprise), dengan durasi hingga 30 menit masih beta, dan ukuran bundle dibatasi 250 MB. Itu tidak cocok untuk run Playwright panjang, loop agent, dan worker antrian yang harus hidup terus.

**Target akhir**: seluruh komponen di AWS (belum final; verifikasi saat implementasi).

**Agent**: Vercel AI SDK (major 7 per Juni 2026; `ToolLoopAgent`, persetujuan tool human-in-the-loop, dukungan MCP). Versi dipin dan dicek ulang saat implementasi. Loop agent berjalan di worker, bukan di fungsi serverless.

**Storage evidence**: Cloudflare R2 lewat abstraksi S3 (per Oktober 2026: $0,015 per GB-bulan, tanpa biaya egress, free tier 10 GB). Dapat dipindah ke self-hosted S3-compatible. Bucket privat dengan signed URL.

**Integrasi GitHub**: GitHub App (login, clone, branch, PR, webhook) di balik abstraksi provider git agar GitLab atau Bitbucket dapat ditambah kemudian.

## 12. Kebutuhan Non-Fungsional

- **Keamanan**: enkripsi secret dan API key at rest (envelope encryption); tidak ada secret di log, trace, atau prompt; sandbox terisolasi antar sesi; egress sandbox dibatasi ke env target, GitHub, dan endpoint yang diperlukan. Karena agent dan semua pengguna boleh di semua env, audit log wajib.
- **Privasi evidence**: screenshot dan trace dapat memuat data internal; bucket privat, retensi otomatis, redaksi nilai secret.
- **Keandalan**: job idempoten; antrian tahan restart worker; sesi agent dapat dilanjutkan setelah gangguan.
- **Performa**: log run live dengan latensi rendah; UI catalog tetap responsif pada ribuan scenario.
- **Observabilitas**: metrik run, kegagalan agent, penggunaan token, dan kapasitas antrian.
- **Portabilitas**: tidak terkunci ke satu cloud atau satu provider LLM.

## 13. Cakupan MVP dan Fase 2

**MVP**

- Project Converge (skema multi-Project), koneksi GitHub, env dan secret, anggota (Engineer dan Viewer).
- Catalog dari repo, run per env (termasuk banyak env sekaligus), evidence di R2, dan status flaky.
- Jadwal cron dan notifikasi email.
- Agent + skill (`ask-qa` dipangkas, `write-prd`, `write-e2e-scenarios`, `write-e2e-code`) dan BYOK API key.
- Draft → sinkronisasi → PR, serta History PR.

**Fase 2**

- UI multi-Project, login plan (Sign in with ChatGPT), notifikasi Slack, ekspor evidence ke Google Drive, penyebaran perbaikan skill lintas Project, run otomatis setelah merge, dan pagar teknis untuk env protected.

## 14. Risiko dan Mitigasi

- **Subscription tidak bisa dipakai di semua provider.** Anthropic melarang token OAuth plan Free, Pro, dan Max di produk pihak ketiga (kebijakan Februari 2026), sedangkan OpenAI membuka plan usage untuk aplikasi yang memenuhi syarat (September 2026). Mitigasi: MVP memakai API key; adapter auth disiapkan; verifikasi syarat dan kebijakan sebelum fase 2.
- **Kualitas tool-calling berbeda antar model.** Mitigasi: daftar model teruji, evaluasi skill per model, pesan galat yang jelas.
- **Pengamanan data hanya lunak (instruksi skill)** karena agent boleh di semua env. Mitigasi: audit log, penanda env protected, pagar teknis di fase 2.
- **Eksplorasi tanpa source FE** menghasilkan PRD berbasis perilaku teramati. Mitigasi: label `observed` dan gerbang validasi.
- **Konflik antar draft** pada file bersama. Mitigasi: sinkronisasi sebelum finalize dan bantuan agent.
- **Branch draft di GitHub terlihat oleh siapa pun yang punya akses repo** meski tidak tampil di app. Mitigasi: dokumentasikan; pertimbangkan prefix dan kebijakan akses repo.
- **Biaya token dan sandbox.** Mitigasi: batas sumber daya, tampilan penggunaan, timeout idle.
- **Env target kewalahan oleh run paralel.** Mitigasi: batas konkurensi per env.
- **Kebijakan keamanan perusahaan terhadap R2** belum terverifikasi. Mitigasi: abstraksi S3 memudahkan pindah ke self-hosted.

## 15. Asumsi dan Pertanyaan Terbuka

**Asumsi default (belum dikonfirmasi)**

- Retensi evidence 30 hari (run gagal 90 hari); riwayat hasil permanen.
- Pemilihan run per scenario, flow, tag, atau sub-module.
- Email dikirim saat run terjadwal gagal atau flaky, ke penerima per jadwal.
- Batas sumber daya sandbox dan konkurensi per env memakai default yang dapat dikonfigurasi.
- Viewer menjalankan scenario di branch target (hasilnya resmi) dan tidak memakai agent.
- Draft idle diarsipkan setelah 30 hari.
- Dokumen ini berbahasa Indonesia; UI, source code, skill, dan isi repo berbahasa Inggris.

**Pertanyaan terbuka**

- Nama produk final.
- Target numerik metrik M1 sampai M3 setelah baseline.
- Isi final scaffold repo (konfigurasi Playwright BDD, reporter, MSW) yang berada di luar folder `bdd/` pada repo lama.
- Apakah perlu multi-akun atau role per env (akun untuk skenario penolakan akses) di MVP.
- Aturan penerima email dan jenis kejadian yang memicu notifikasi.
- Kebijakan keamanan Hyperscal untuk evidence di layanan pihak ketiga dan untuk branch draft di GitHub.
- Penyedia dan layanan email untuk notifikasi.

## Lampiran A. Scaffold Repo Test (asumsi)

- `bdd/` dibawa dari repo lama: `components`, `features`, `fixtures`, `pages`, `setup`, `steps`, `utils`.
- Konfigurasi Playwright BDD (`playwright.bdd.config.ts`) dengan baseURL dan kredensial dari env yang disuntikkan app.
- Reporter kustom yang menulis result contract (JSON) untuk diingest app; menggantikan penulisan catalog Markdown.
- `.agents/skills/` berisi skill hasil adaptasi + `playwright-cli` dan referensinya.
- `docs/prd/<module>/<submodule>.md` untuk PRD target; `<submodule>.flows.md` bersebelahan dengan `.feature`.
- MSW untuk scenario `@mock`, `package.json`, dan `tsconfig` minimal.
- Tidak ada `.env.local` di repo; semua nilai env datang dari app.
