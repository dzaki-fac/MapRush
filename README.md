# MapRush 🌍

Web game multiplayer **1v1** bertema tebak/sebut nama negara. Pemain mengetik nama negara, negara yang berhasil disebut berubah warna di peta sesuai pemain, dan skor bertambah. Pemenang ditentukan saat timer habis.

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS**
- **WebSocket** real-time (`ws`) — state game sepenuhnya di server
- Tanpa login, tanpa akun, tanpa database
- Peta dunia SVG via **react-simple-maps** + **world-atlas**
- Data negara via **world-countries** (nama resmi, alias, kode ISO)

---

## 1. Keputusan mode gameplay

Saya memilih **Mode Bebas (free-for-all)**: kedua pemain bisa mengetik jawaban kapan saja selama timer masih berjalan.

**Alasan:**
- Paling sederhana dan stabil untuk MVP — tidak ada sinkronisasi giliran, tidak ada timeout per-giliran, tidak ada screenshots "turn indicator" yang harus dikelola.
- Tidak ada waktu terbuang menunggu lawan, jadi game terasa lebih cepat dan seru.
- Server tinggal memproses pesan secara berurutan (single-threaded event loop), sehingga race condition seperti "dua pemain menebak negara sama bersamaan" terselesaikan secara alami: yang pertama sampai menang, yang kedua dapat `Negara sudah dipakai`.

Konsekuensinya: **tidak ada indikator giliran** di UI (sesuai permintaan, indikator hanya dipakai jika mode turn-based). Jika nanti ingin mode turn-based, titik perubahannya kecil: tambahkan `turnPlayerId` + `turnEndsAt` di `RoomState` dan validasi di `gameEngine.applyGuess`.

### Mode tambahan

- **Countdown 3 detik** — setelah host menekan *Mulai game* (atau saat memulai solo), server mengirim status `countdown` sebelum `playing`. Jawaban yang diketik saat countdown diabaikan. Hitung mundurnya berasal dari server, jadi kedua pemain melihat angka yang sama.
- **Single player** — tab **Solo** di lobby membuat room dengan `mode: "solo"` dan langsung masuk countdown. Aturan, validasi, dan timer sama seperti 1v1; hanya saja tidak ada lawan. Layar hasil menampilkan "Selesai" dan jumlah negara yang berhasil disebut.
- **Nickname tersimpan** — nickname disimpan di cookie (`maprush.nickname`, 1 tahun, `SameSite=Lax`), jadi tidak perlu diketik ulang di lobby maupun saat membuka link undangan.

---

## 2. Struktur folder

```
MapRush/
├── scripts/
│   ├── copy-geography.mjs      # copy TopoJSON world-atlas -> public/ (dijalankan postinstall)
│   ├── smoke-test.mjs          # test alur multiplayer end-to-end (2 client WS)
│   ├── check-names.mjs         # cek normalisasi & alias negara
│   └── check-engine.mjs        # cek logika skor/hasil/rematch
├── public/
│   └── geographies/
│       └── countries-110m.json # peta dunia (digenerate otomatis saat npm install)
├── server/                     # LOGIC SERVER (source of truth)
│   ├── index.ts                # entry WS server mandiri untuk development (:8080)
│   ├── gameServer.ts           # routing pesan, broadcast, timer, disconnect (dipakai dua transport)
│   ├── gameStore.ts            # abstraksi RoomStore + implementasi InMemoryRoomStore
│   └── gameEngine.ts           # logika murni: create/join/start/guess/finish/rematch
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
│   │   ├── Game.tsx            # peta, input, skor, timer, daftar negara
│   │   ├── WorldMap.tsx        # peta SVG dinamis (di-load dynamic, ssr: false)
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
│   ├── shared/                 # TIPE & KONSTANTA dipakai client DAN server
│   │   ├── types.ts            # RoomState, Player, UsedCountry, GameResult
│   │   ├── protocol.ts         # tipe pesan client <-> server
│   │   └── constants.ts        # warna pemain, durasi game
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
node scripts/smoke-test.mjs
npx tsx scripts/check-names.mjs
npx tsx scripts/check-engine.mjs
```

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
