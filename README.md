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
├── server/                     # WEBSOCKET SERVER (source of truth)
│   ├── index.ts                # wiring koneksi, routing pesan, broadcast, timer, disconnect
│   ├── gameStore.ts            # abstraksi RoomStore + implementasi InMemoryRoomStore
│   └── gameEngine.ts           # logika murni: create/join/start/guess/finish/rematch
├── src/
│   ├── app/
│   │   ├── layout.tsx          # provider global
│   │   ├── page.tsx            # halaman lobby
│   │   ├── globals.css         # Tailwind + styling peta
│   │   └── room/[code]/page.tsx# router: waiting -> playing -> finished
│   ├── components/
│   │   ├── Lobby.tsx           # nickname, create room, join room
│   │   ├── Room.tsx            # kode room, daftar pemain, tombol Start (host)
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
Browser A ─┐
           ├── WebSocket ──> WS Server (in-memory RoomStore = source of truth)
Browser B ─┘                      │
                                  ├── broadcast STATE ke semua pemain di room
                                  └── NOTICE khusus ke pemain yang mengirim jawaban
```

State yang disimpan server per room (`RoomState`): `code`, `ownerId`, `players`, `status`, `usedCountries`, `remainingMs`, `endsAt`, `durationMs`, `result`, `createdAt`.

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
1. Tab A: isi nickname → **Buat Room Baru** → catat kode room.
2. Tab B: isi nickname → **Gabung Room** → masukkan kode.
3. Host (Tab A) tekan **Mulai Game**.
4. Coba ketik `indonesia` di A, lalu `INDONESIA` di B (harus muncul "Negara sudah dipakai").

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

## 6. Deploy ke Vercel

### 6a. Frontend (Next.js) → Vercel

1. Push project ke GitHub/GitLab/Bitbucket.
2. Di Vercel: **Add New → Project**, import repo. Framework terdeteksi sebagai **Next.js**.
3. Tambahkan environment variable:
   - `NEXT_PUBLIC_WS_URL` = `wss://<host-websocket-server-anda>` (tanpa trailing slash).
4. Deploy. `vercel.json` sudah disiapkan (framework = nextjs). Script `postinstall` otomatis menyalin file peta saat build.

### 6b. WebSocket server → host dengan proses panjang

WS server **tidak bisa** dijalankan sebagai Vercel Function (lihat bagian keterbatasan). Deploy ke platform yang mendukung proses Node.js terus-menerus, misalnya:

**Railway** (contoh):
```bash
# buat service baru dari repo yang sama, lalu:
# Build command: npm install
# Start command: npm run server
# Tambahkan env PORT (default 8080) dan expose port tersebut.
```

**Render / Fly.io** juga bisa dengan start command `npm run server`. Pastikan port yang di-expose sesuai `PORT`, lalu isi `NEXT_PUBLIC_WS_URL` di Vercel dengan URL `wss://...`-nya.

> Catatan: gunakan `wss://` (TLS) di produksi. Proxy seperti Railway/Render/Fly biasanya menghentikan TLS di edge dan meneruskan WS ke server.

---

## 7. Keterbatasan Vercel untuk multiplayer & rencana upgrade

**Kenapa WS server tidak di Vercel:**
1. **Function bersifat stateless & ephemereal** — state `in-memory` tidak awet dan tiap request bisa masuk ke instance berbeda. Dua pemain bisa saja tidak bertemu di memori yang sama.
2. **Tidak ada koneksi WebSocket native** pada Vercel Functions — tidak ada upgrade/long-lived connection; Function juga punya batas durasi eksekusi.
3. Timer server (`setInterval`) butuh proses yang hidup terus — tidak mungkin di serverless.

Itulah sebabnya arsitekturnya dipisah: **Next.js di Vercel (UI)** + **WS server sebagai proses mandiri (state + real-time)**. Untuk MVP ini sudah stabil dan murah.

**Upgrade berikutnya (saat butuh scale):**
- Ganti `InMemoryRoomStore` dengan `RedisRoomStore` yang mengimplementasikan interface `RoomStore` yang sama — client/server tidak perlu diubah.
- Tambahkan **Redis Pub/Sub** agar beberapa instance WS server bisa saling broadcast (`room code` sebagai channel).
- Tambahkan rate limiting per player, validasi origin/CORS, reconnect token yang aman, dan monitoring.
- Alternatif fully-managed WebSocket: **PartyKit**, **Pusher**, **Ably**, atau **Cloudflare Durable Objects** — tidak perlu kelola WS server sendiri, tapi ada biaya/API key.

---

## 8. Catatan pengembangan lanjutan

- UI siap diperluas: komponen di `src/components/ui` reusable, tema sudah terpusat di `tailwind.config.ts` + `globals.css`.
- Mode turn-based bisa ditambahkan dengan mengubah `RoomState` (lihat bagian 1).
- Kata "negara" saat ini mencakup UN member + beberapa entitas berdaulat; aturan daftar bisa diubah di satu tempat (`src/lib/countries.ts`).
- Peta 110m tidak menggambarkan negara mikro (mis. Monaco) — negara tetap bisa ditebak & skor tetap bertambah, hanya saja tidak ada area untuk diwarnai. Untuk peta lebih detail, ganti file TopoJSON di `public/geographies` dengan versi 50m dari `world-atlas`.
