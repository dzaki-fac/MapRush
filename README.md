# MapRush 🌍

Web game multiplayer **1v1** bertema negara dengan tiga mode: **World Conquest**, **Country Hunt**, dan **Continent Rush**. Semua mode memakai satu peta dunia, satu alur room, dan satu source of truth di server. Pemenang ditentukan saat timer habis.

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS**
- **WebSocket** real-time (`ws`) — state game sepenuhnya di server
- Tanpa login, tanpa akun, tanpa database
- Peta dunia SVG via **react-simple-maps** + **world-atlas**
- Data negara via **world-countries** (nama resmi, alias, kode ISO)

---

## 1. Mode permainan

Tiga mode dapat dipilih di lobby sebelum room dibuat. Host juga bisa menggantinya di ruang tunggu sebelum game dimulai; setelah itu mode terkunci dan rematch memakai mode yang sama.

| Mode | Cara main | Skor | Durasi |
|---|---|---|---|
| World Conquest | Ketik nama negara, klaim wilayah di peta | +1 / negara benar | 90 dtk |
| Country Hunt | Klik lokasi negara yang diminta sistem | +5 benar, -1 salah (min. 0) | 90 dtk |
| Continent Rush | Ketik negara dari benua aktif | +1 / negara benar | 120 dtk, benua berganti tiap 20 dtk |

Satu room bisa diisi **2–8 pemain**. Host mengatur kapasitas di ruang tunggu; game mulai setelah minimal 2 pemain bergabung. Tiap pemain memakai warna berbeda di peta, skor dihitung per pemain, dan pemenang ditentukan dari skor tertinggi (skor sama = seri). Host yang keluar otomatis digantikan pemain lain yang masih terhubung.

Semua mode memakai **Mode Bebas (free-for-all)**: kedua pemain bisa mengetik jawaban kapan saja selama timer masih berjalan.

**Alasan:**
- Paling sederhana dan stabil untuk MVP — tidak ada sinkronisasi giliran, tidak ada timeout per-giliran, tidak ada screenshots "turn indicator" yang harus dikelola.
- Tidak ada waktu terbuang menunggu lawan, jadi game terasa lebih cepat dan seru.
- Server tinggal memproses pesan secara berurutan (single-threaded event loop), sehingga race condition seperti "dua pemain menebak negara sama bersamaan" terselesaikan secara alami: yang pertama sampai menang, yang kedua dapat `Negara sudah dipakai`.

Konsekuensinya: **tidak ada indikator giliran** di UI (sesuai permintaan, indikator hanya dipakai jika mode turn-based). Jika nanti ingin mode turn-based, titik perubahannya kecil: tambahkan `turnPlayerId` + `turnEndsAt` di `RoomState` dan validasi di `gameEngine.applyGuess`.

### Country Hunt & Continent Rush

- **Country Hunt** — server memilih target secara acak dari negara yang punya geometri di peta 110m, mengirim `questionId` ke kedua pemain, dan hanya memproses klik dengan `questionId` aktif. Klik benar memberi +5, salah -1 dengan batas bawah 0, lalu target langsung berganti. Negative race diatasi dengan urutan penerimaan event di server.
- **Continent Rush** — enam benua diacak per match dan berganti tiap 20 detik oleh server timer. Validasi memakai klasifikasi benua eksplisit dari dataset (`continent-codes.ts`), alias tetap didukung, dan negara yang sudah diklaim tetap terkunci walau benua berganti. Peta menampilkan highlight benua aktif, negara di luar benua diredupkan, warna pemain tetap dominan.
- **Countdown 3 detik** — setelah host menekan *Mulai game* (atau saat memulai solo), server mengirim status `countdown` sebelum `playing`. Jawaban yang diketik saat countdown diabaikan. Hitung mundurnya berasal dari server, jadi kedua pemain melihat angka yang sama.
- **Single player** — tab **Solo** di lobby membuat room dengan `mode: "solo"` dan langsung masuk countdown. Aturan, validasi, dan timer sama seperti 1v1; hanya saja tidak ada lawan. Layar hasil menampilkan "Selesai" dan jumlah negara yang berhasil disebut.
- **Nickname tersimpan** — nickname disimpan di cookie (`maprush.nickname`, 1 tahun, `SameSite=Lax`), jadi tidak perlu diketik ulang di lobby maupun saat membuka link undangan.
- **Peta bisa di-zoom** — scroll/drag pada peta, atau tombol `+` / `−` / reset di pojok kanan bawah. Zoom 1×–8×, berlaku di semua mode (termasuk Country Hunt saat mengklik target).

---

## 2. Struktur folder

```
MapRush/
├── scripts/
│   ├── copy-geography.mjs      # copy TopoJSON world-atlas -> public/ (dijalankan postinstall)
│   ├── smoke-test.mjs          # test alur multiplayer end-to-end (2 client WS)
│   ├── check-names.mjs         # cek normalisasi & alias negara
│   ├── check-engine.mjs        # cek logika skor/hasil/rematch
│   ├── check-modes.mjs         # pengujian ketiga mode
│   └── generate-mode-data.mjs  # generate kode negara clickable + peta benua
├── public/
│   └── geographies/
│       └── countries-110m.json # peta dunia (digenerate otomatis saat npm install)
├── server/                     # LOGIC SERVER (source of truth)
│   ├── index.ts                # entry WS server mandiri untuk development (:8080)
│   ├── gameServer.ts           # routing pesan, broadcast, timer, disconnect (dipakai dua transport)
│   ├── gameStore.ts            # abstraksi RoomStore + implementasi InMemoryRoomStore
│   ├── gameEngine.ts           # logika umum: create/join/start/finish/rematch
│   ├── country-validator.ts    # pencarian negara + klasifikasi benua
│   └── modes/                  # LOGIA PER MODE (terpisah, tanpa if-else besar)
│       ├── types.ts            # kontrak AnswerOutcome / TickResult / GameModeHandler
│       ├── index.ts            # dispatcher berdasarkan room.gameType
│       ├── world-conquest.ts
│       ├── country-hunt.ts
│       └── continent-rush.ts
├── src/
│   ├── app/
│   │   ├── api/ws/route.ts     # WebSocket native Vercel (/api/ws via upgradeWebSocket)
│   │   ├── layout.tsx          # provider global
│   │   ├── page.tsx            # halaman lobby
│   │   ├── globals.css         # Tailwind + styling peta
│   │   └── room/[code]/page.tsx# router: waiting -> playing -> finished
│   ├── components/
│   │   ├── Lobby.tsx           # nickname, create room, join room
│   │   ├── Room.tsx            # kode room, daftar pemain, tombol Start (host)
│   │   ├── Countdown.tsx       # hitung mundur 3 detik dari state server
│   │   ├── Game.tsx            # router layar game sesuai gameType
│   │   ├── games/              # WorldConquestGame, CountryHuntGame, ContinentRushGame
│   │   │   └── MapFrame, ScoreList, GameExtras (komponen bersama)
│   │   ├── WorldMap.tsx        # peta SVG dinamis (klik, feedback, highlight benua)
│   │   ├── Result.tsx          # pemenang, skor, rematch, kembali ke lobby
│   │   ├── NoticeBanner.tsx    # notifikasi benar/salah/duplikat/error
│   │   └── ui/                 # Button, Input, Panel (reusable)
│   ├── context/
│   │   └── GameContext.tsx     # satu koneksi WS + state client + action
│   ├── lib/
│   │   ├── countries.ts        # DAFTAR & pencarian negara (data, bukan logika game)
│   │   ├── normalize.ts        # helper normalisasi nama
│   │   ├── session.ts          # simpan playerId di sessionStorage (reconnect)
│   │   ├── nicknameCookie.ts   # simpan nickname di cookie (1 tahun)
│   │   ├── socketUrl.ts        # tentukan URL WS (dev/prod)
│   │   └── clipboard.ts
│   ├── data/                   # data statis hasil generate (commit ke repo)
│   │   ├── continent-codes.ts  # ccn3 -> benua (klasifikasi eksplisit)
│   │   └── map-country-codes.ts# ccn3 yang punya geometri clickable
│   ├── lib/game-modes.ts       # metadata mode untuk UI lobby & room
│   ├── shared/                 # TIPE & KONSTANTA dipakai client DAN server
│   │   ├── types.ts            # RoomState, GameType, HuntState, RushState, dll
│   │   ├── protocol.ts         # tipe pesan client <-> server
│   │   └── constants.ts        # warna pemain, durasi & aturan skor tiap mode
│   └── types/
│       └── world-countries.d.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
├── vercel.json
└── .env.example
```

**Pemisahan penting:** data negara (`src/lib/countries.ts`) terpisah dari logika game (`server/gameEngine.ts`). Engine hanya memanggil `findCountryByGuess()` dan tidak tahu dari mana datanya berasal.

---

## 3. Arsitektur real-time

```
Browser A ─┐                       ┌─ development: server/index.ts (:8080)
           ├── WebSocket ────────> ┤
Browser B ─┘                       └─ Vercel: /api/ws (upgradeWebSocket)
                                          │
                              GameServer + in-memory RoomStore
                                          │
                              broadcast STATE ke semua pemain di room
                              NOTICE khusus ke pemain yang mengirim jawaban
```

State yang disimpan server per room (`RoomState`): `code`, `mode` (`duel`/`solo`), `ownerId`, `players`, `status` (`waiting`/`countdown`/`playing`/`finished`), `usedCountries`, `remainingMs`, `endsAt`, `durationMs`, `countdownMs`, `countdownEndsAt`, `result`, `createdAt`.

Client **tidak pernah** menentukan benar/salah/skor — semua divolidasi server. Client tinggal merender `STATE`.

### Protokol (ringkas)

| Client → Server | Server → Client |
|---|---|
| `CREATE_ROOM`, `JOIN_ROOM`, `RECONNECT` | `JOINED` (playerId + room) |
| `START_GAME`, `REMATCH` | `STATE` (room state terbaru) |
| `SUBMIT_GUESS`, `LEAVE_ROOM` | `NOTICE` (correct/invalid/duplicate), `ERROR` |

---

## 4. Validasi negara & normalisasi

- Sumber data: paket `world-countries` — negara UN member + entitas berdaulat tambahan (Taiwan, Kosovo, Palestine, Vatican).
- Normalisasi (`src/lib/normalize.ts`): lowercase, buang diakritik (`Côte` → `cote`), `&` → `and`, buang tanda baca, rapikan spasi.
- Alias bawaan `altSpellings` + alias custom: `USA`/`U.S.A.` → United States, `UK` → United Kingdom, `UAE`, `DRC`, `Türkiye`, `the Netherlands`, dll.
- Pewarnaan peta mencocokkan `ccn3` (ISO numeric) dengan `geo.id` dari TopoJSON (keduanya dibuat `String(Number(...))`).

Contoh: `indonesia`, `Indonesia`, `INDONESIA` → semua jadi satu negara yang sama.

---

## 5. Jalankan secara lokal

**Butuh Node.js ≥ 20.9.**

```bash
# 1. install dependency (postinstall otomatis copy peta ke public/geographies)
npm install

# 2. jalankan Web server + WebSocket server sekaligus
npm run dev
```

- Frontend: http://localhost:3000
- WebSocket: ws://localhost:8080 (terset otomatis saat port 3000)

Buka **dua tab/ browser** (atau dua jendela incognito):
1. Tab A: isi nickname → **Buat Room** → dapat kode room.
2. Tab B: buka langsung `http://localhost:3000/room/<KODE>` → cukup isi nickname → **Gabung room**.
3. Host (Tab A) tekan **Mulai Game**.
4. Coba ketik `indonesia` di A, lalu `INDONESIA` di B (harus muncul "Negara sudah dipakai").

### Undang lewat link

Di ruang tunggu ada dua tombol: salin **kode room** dan salin **tautan undangan**
(`https://<domain>/room/<KODE>`). Siapa pun yang membuka tautan itu akan disambar
halaman "Bergabung ke room" dan hanya perlu mengisi nickname. Kode room dari
URL tetap bisa dipakai lewat tab **Gabung room** di lobby.

### Script lain

```bash
npm run dev:web       # hanya Next.js
npm run dev:server    # hanya WebSocket server (tsx watch)
npm run typecheck     # cek TypeScript
npm run build         # build produksi frontend
npm run server        # jalankan WS server mode produksi

# Test (WS server harus sudah jalan untuk smoke-test)
npm run test:smoke   # 3 mode, 2 client WS — create/join/countdown/jawaban/sinkronisasi
npm run test:modes   # unit test aturan tiap mode
npm run test:engine  # test engine umum & rematch
npm run test:names   # normalisasi & alias negara
npm run generate:mode-data  # regenerasi data benua/negara clickable
```

### Pengujian yang tercakup

- Country Hunt: +5 benar, -1 salah, skor minimum 0, hanya jawaban pertama yang menang, target tidak diulang, jawaban dengan `questionId` lama diabaikan.
- Continent Rush: negara benua aktif diterima, negara benua lain ditolak, klaim ganda ditolak, pergantian benua mengikuti timer server.
- World Conquest: regresi +1, duplikat, dan negara tidak valid.
- Waktu habis menghentikan timer dan pemenang/seri dihitung dari skor server. Rematch tetap memakai mode yang sama.

---

## 6. Deploy ke Vercel (satu tempat, tanpa server tambahan)

Vercel Functions sekarang mendukung WebSocket native (GA, semua plan, butuh **Fluid compute** — aktif-default untuk project dibuat setelah 23 April 2025). Jadi cukup deploy Next.js saja.

### 6a. Langkah deploy

1. Push repo ke GitHub.
2. Di Vercel: **Add New → Project**, import `dzaki-fac/MapRush`. Framework terdeteksi **Next.js**.
3. **Tidak perlu** environment variable. Koneksi dibuat otomatis ke `wss://<domain-anda>/api/ws` pada origin yang sama.
4. Deploy. Script `postinstall` otomatis menyalin peta ke `public/geographies`.
5. Cek: status di kanan atas harus **Terhubung**. Coba buka dua tab, buat room, lalu gabung.

### 6b. Cara kerjanya

- `src/app/api/ws/route.ts` memakai `upgradeWebSocket()` dari `@vercel/functions` untuk menerima koneksi di `/api/ws`.
- Handler-nya memakai class `GameServer` yang **sama** dengan WS server mandiri untuk development — jadi tidak ada duplikasi logika game.
- Saat development lokal (`npm run dev`), client tetap tersambung ke `ws://localhost:8080` lewat server mandiri (`server/index.ts`). `upgradeWebSocket()` hanya jalan di platform Vercel.
- `NEXT_PUBLIC_WS_URL` opsional, berguna kalau nanti ingin mengarahkan ke WS server eksternal. Jika diisi, **harus `wss://`** dan perlu redeploy (nilai `NEXT_PUBLIC_*` di-inline saat build).

### 6c. Troubleshooting

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| Status tetap **Menghubungkan** / **Terputus** | Function `/api/ws` error saat upgrade | Buka **Function Logs** di Vercel, cek stack trace |
| `WebSocket handshake failed` | Fluid compute nonaktif (project lama) | Settings → Functions → aktifkan Fluid compute, lalu redeploy |
| Koneksi putus sekitar 5 menit | Batas durasi Function | Normal — client sudah auto-reconnect; game hanya 90 detik |
| Pemain tidak melihat pemain lain | Dua koneksi masuk ke **instance Function berbeda** | Lihat catatan state di bawah |

---

## 7. Keterbatasan & rencana upgrade

**State masih in-memory per instance.** Satu koneksi WebSocket di-pin ke satu instance Function. Fluid compute membolehkan satu instance menangani banyak koneksi, tetapi koneksi baru **tidak dijamin** masuk ke instance yang sama. Untuk traffic rendah (1 room, 2 pemain) ini biasanya aman, tapi bukan jaminan. Konsekuensinya:
- Jika kedua pemain mendarat di instance berbeda, mereka tidak akan saling melihat.
- Setelah redeploy, koneksi lama tetap di instance lama sampai ditutup.

**Solusi untuk scale ( Upgrade berikutnya):**
- Ganti `InMemoryRoomStore` dengan Redis (Vercel Marketplace / Upstash) — interface `RoomStore` sudah disiapkan supaya perubahannya lokal.
- Tambahkan **Redis Pub/Sub** dengan `roomCode` sebagai channel supaya broadcast menjangkau instance lain.
- Pertimbangkan **WebSocket hibernation** / managed realtime (Pusher, Ably, PartyKit, Durable Objects) bila butuh koneksi lama dan multi-region yang deterministik.
- Tambahkan rate limiting per pemain, validasi origin, reconnect token, dan monitoring.

---

## 8. Catatan pengembangan lanjutan

- UI siap diperluas: komponen di `src/components/ui` reusable, tema sudah terpusat di `tailwind.config.ts` + `globals.css`.
- Mode turn-based bisa ditambahkan dengan mengubah `RoomState` (lihat bagian 1).
- Kata "negara" saat ini mencakup UN member + beberapa entitas berdaulat; aturan daftar bisa diubah di satu tempat (`src/lib/countries.ts`).
- Peta 110m tidak menggambarkan negara mikro (mis. Monaco) — negara tetap bisa ditebak & skor tetap bertambah, hanya saja tidak ada area untuk diwarnai. Untuk peta lebih detail, ganti file TopoJSON di `public/geographies` dengan versi 50m dari `world-atlas`.
