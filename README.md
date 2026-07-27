# Private Chat (WhatsApp-style, for two people)

A private, real-time messaging + voice/video calling app built for exactly 2 users.
One-command deploy on any Node.js host (Railway, Render, Fly.io, VPS, or a Raspberry Pi at home).

## ✨ Features

- 💬 Real-time text messaging via Socket.IO
- ✉️ Sent / Delivered / Read receipts with double-tick WhatsApp status
- 📎 Attachments: images, videos, PDFs, files up to 50 MB
- 🎙️ Voice notes: in-browser recording (MediaRecorder, webm audio)
- 📞 Voice + Video calls via WebRTC (5 Google STUN servers, full ICE signaling)
- 😊 Message reactions (emoji), replies, edit, delete, forward, copy
- 👤 Profiles with avatar upload, custom "About" status
- 🟢 Online / last-seen presence
- ⌨️ Typing indicators
- 🔔 Browser notifications + in-app WebAudio sounds (no asset files needed)
- 📱 Fully responsive: switches to sidebar↔chat full-screen on mobile
- 🌗 Dark / light theme toggle with glassmorphism UI
- 🔐 JWT auth with httpOnly refresh cookies + in-memory access tokens + silent auto-refresh
- 🛡️ Helmet, CORS lockdown in production, rate limiting, input validation, bcrypt hashing

## 🏗️ Tech Stack

| Part      | Stack                                              |
|-----------|----------------------------------------------------|
| Frontend  | React 19 + Vite + Tailwind CSS 3                   |
| Backend   | Node.js + Express 4 + Socket.IO 4                  |
| Database  | SQLite (Prisma) — zero-config for fast deploy      |
| Files     | Local disk (`server/uploads/`), 50 MB limit         |

Designed for 2 users only. Registration is capped at 2 accounts via the API.

---

## 🚀 Quick Start (5 minutes)

```bash
git clone <your-repo-url>
cd whatsapp-clone
npm run install:all
cp server/.env.example server/.env   # then edit JWT secrets
npm run prisma:setup                 # creates SQLite DB + generates Prisma client
npm run start:prod                   # builds client + starts server in prod
```

Then open **http://localhost:5001** in two different browsers/devices → register → chat.

---

## 📋 Scripts (from project root)

| Command                 | What it does                                                      |
|-------------------------|-------------------------------------------------------------------|
| `npm run install:all`   | `npm install` in both `server/` and `client/`                     |
| `npm run setup`         | Installs everything + runs Prisma generate + db push             |
| `npm run prisma:setup`  | Runs Prisma generate + db push for SQLite (idempotent)           |
| `npm run build`         | Vite production build (`client/dist/`)                            |
| `npm start`             | **Production**: serves built client + API on `PORT` (default 5001) |
| `npm run start:prod`    | Build first, then start (handy for VPS/Raspberry Pi)              |
| `npm run dev`           | **Development**: server (5001) + client vite (5173) concurrently  |
| `npm run prisma:studio` | GUI to browse your SQLite database                                |

### Development (hot reload)
```bash
npm run install:all
cp server/.env.example server/.env
npm run prisma:setup
npm run dev
```

Frontend auto-connects to backend via Vite proxy. Open **http://localhost:5173**.

---

## ☁️ Deployment Guides

### Railway / Render / Fly.io / any Node host

1. Push the whole repo to your git host (**`/uploads` is gitignored**).
2. **Build Command** — paste exactly this into the platform's Build Command field:
   ```bash
   npm install && npx prisma generate && npx prisma db push --schema server/prisma/schema.prisma && (cd client && npm install && npm run build)
   ```
   *(Shortcut on platforms where Root Directory = repo root: if you'd rather use scripts, use `npm run install:all && npm run prisma:setup && npm run build`)*
3. **Start Command** — paste exactly this into the platform's Start Command field:
   ```bash
   npm start
   ```
4. Required environment variables (in server's `.env` or host dashboard — Neon Postgres example shown):
   ```env
   NODE_ENV=production
   PORT=5001
   DATABASE_URL="postgresql://neondb_owner:PASS@ep-xx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   JWT_ACCESS_SECRET=make_sure_this_is_a_long_random_string_≥32chars
   JWT_REFRESH_SECRET=make_sure_this_is_a_DIFFERENT_long_random_string
   CLIENT_ORIGIN=https://your-app.example.com   ← for CORS lockdown, comma-separate multiple
   ```
5. If you use PostgreSQL (Neon/Supabase/Render Postgres) you do **not** need a persistent volume — the DB lives in the cloud. You only need a volume mounted at `server/uploads/` so user attachments (images/voice notes/PDFs) survive redeploys.
6. HTTPS must be enabled on your host (required for camera/mic on real devices + notifications + WebRTC).

### Raspberry Pi / Home VPS behind nginx

```bash
cd /opt && git clone <repo> private-chat
cd private-chat
npm run setup
cp server/.env.example server/.env && nano server/.env   # set strong JWT secrets
# Optional: use postgres instead of SQLite — update DATABASE_URL
```

`/etc/systemd/system/private-chat.service`:
```ini
[Unit]
Description=Private Chat
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/private-chat
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now private-chat
```

Nginx reverse proxy + LetsEncrypt Certbot:
```nginx
server {
  server_name chat.example.com;
  listen 443 ssl http2;
  # ssl_certificate / ssl_certificate_key added by certbot

  client_max_body_size 60M;

  location / {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600;
  }
}
```

⚠️ **WebRTC calls (voice/video)** require HTTPS, `localhost`, or a direct LAN IP to work in browsers.
Notifications and audio recording also require **HTTPS on any non-localhost domain**.

### Cloudflare Tunnel (for public preview on your laptop)

```bash
cloudflared tunnel --url http://localhost:5001
```

Open the provided URL on any device to use the app from anywhere with HTTPS.

---

## 🔑 Environment Variables (`server/.env`)

| Variable                | Default                | Purpose                                                        |
|-------------------------|------------------------|----------------------------------------------------------------|
| `PORT`                  | `5001`                 | Web server HTTP port                                           |
| `NODE_ENV`              | `development`          | `production` → static client serving + CORS lockdown + no morgan |
| `DATABASE_URL`          | `file:./dev.db`        | Prisma SQLite (absolute path via `file:` recommended)         |
| `JWT_ACCESS_SECRET`     | **required**           | Signing secret for 15-min access tokens                       |
| `JWT_REFRESH_SECRET`    | **required**           | Separate signing secret for refresh tokens                    |
| `JWT_ACCESS_TTL_MINUTES`| `15`                   | How long access tokens live                                   |
| `JWT_REFRESH_TTL_DAYS`  | `30`                   | How long refresh cookies live (Remember = 90 days, else 30)   |
| `MAX_USERS`             | `2`                    | Max accounts that can register (recommended to keep at 2)    |
| `CLIENT_ORIGIN`         | *(dev: any)*           | **Production** comma-separated allowlist (CORS origin). e.g. `https://a.example.com,https://b.example.com` |

---

## 🗂️ Project Structure

```
whatsapp-clone/
├── package.json            # Root: install/build/dev/start scripts, concurrently
├── README.md               # This file
├── .gitignore
│
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma   # SQLite schema: User, Message, Reaction, Call
│   ├── uploads/            # Multer stores attachment files here (gitignored)
│   └── src/
│       ├── index.js        # HTTP server + Socket.IO attach
│       ├── app.js          # Express: helmet/cors/compression, routes, static client
│       ├── config/db.js
│       ├── utils/jwt.js
│       ├── middleware/     # requireAuth, validators, rateLimiters, errorHandler
│       ├── controllers/    # auth, users, messages, upload
│       ├── routes/
│       └── sockets/index.js
│
└── client/
    ├── package.json
    ├── vite.config.js      # Vite dev proxy to localhost:5001
    ├── tailwind.config.js  # WhatsApp color palette + animations
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── context/        # AuthContext, SocketContext, ThemeContext
        ├── pages/          # Login, Register, ChatHome
        ├── components/     # ChatSidebar, ChatHeader, MessageList, MessageBubble,
        │                   # MessageInput, VoiceRecorder, CallModal, MediaViewerModal,
        │                   # ProfileModal, ProtectedRoute
        ├── services/api.js # Axios instance + silent 401 token refresh
        └── utils/          # sounds, notifications, webrtc
```

---

## 🔌 API Endpoints

| Method | Path                          | Auth | Purpose                                        |
|--------|-------------------------------|------|------------------------------------------------|
| POST   | `/api/auth/register`          | no   | Register (capped at `MAX_USERS`)               |
| POST   | `/api/auth/login`             | no   | Returns access token, sets refresh cookie      |
| POST   | `/api/auth/refresh`           | no   | Uses refresh cookie → new access token         |
| POST   | `/api/auth/logout`            | yes  | Clears refresh cookie + DB                     |
| GET    | `/api/users/partner`          | yes  | Gets the *other* user in the pair              |
| PATCH  | `/api/users/me`               | yes  | Update own name / about / avatar               |
| GET    | `/api/messages`               | yes  | Full message history since `chatClearedAt`     |
| POST   | `/api/messages`               | yes  | Send a new message                             |
| PATCH  | `/api/messages/:id`           | yes  | Edit own message                               |
| DELETE | `/api/messages/:id`           | yes  | Delete own message (soft delete)               |
| POST   | `/api/messages/:id/reaction`  | yes  | Toggle emoji reaction on a message             |
| POST   | `/api/messages/read`          | yes  | Bulk mark all unread as READ                   |
| POST   | `/api/messages/clear`         | yes  | Set `chatClearedAt` (per-user soft clear)      |
| POST   | `/api/upload`                 | yes  | Multer upload → returns `{ mediaUrl, type }`   |
| GET    | `/api/health`                 | no   | `{ status: 'ok' }`                             |

---

## 🧠 WebRTC / Calling Flow

Calls use WebRTC with signaling relayed via Socket.IO (`call:invite`, `call:answer`, `call:reject`, `call:end`, `call:signal`). No media touches the server — everything is peer-to-peer using Google's public STUNs. Users must be reachable via STUN (most home networks work). If WebRTC fails for some NAT setups, you would layer in a TURN server and add its URLs to `client/src/utils/webrtc.js`.

---

## 🔒 Security Notes for Production

- Never deploy without setting both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to **separate**, long, random values (≥ 32 chars each).
- Always enable HTTPS; otherwise browser notifications, mic/camera access, and service-worker installs are blocked by security policies.
- Set `CLIENT_ORIGIN` in production so only allowed domains can hit your API via CORS.
- SQLite is fine for 2 users with light traffic. If you grow, swap `DATABASE_URL` for Postgres and update `prisma/schema.prisma` provider to `postgresql`, then re-run `prisma:setup`.
- Keep `MAX_USERS=2`. Registration lock is enforced in both `auth.controller.register` AND Prisma count query.
