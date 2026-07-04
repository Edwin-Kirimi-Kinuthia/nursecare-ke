# Self-Hosting CareBora on a Hetzner CX22 (~$5/month)

Runs the whole platform — Next.js app **+ PostgreSQL + automatic HTTPS** — on one
small VPS with Docker. Video (LiveKit), payments (M-Pesa), email (Resend), SMS
(Africa's Talking) and AI (Hugging Face) stay on their own services, exactly like
the Vercel deployment.

**You'll need:** the Hetzner box, your domain (e.g. `app.carebora.co.ke`), and the
secret values from your existing `.env` / Vercel (LiveKit, M-Pesa, HF, Resend,
Africa's Talking).

---

## 1. Create the server

In the [Hetzner Cloud Console](https://console.hetzner.cloud):

1. **New Project → Add Server**
2. Location: **Falkenstein/Nuremberg (EU)** · Image: **Ubuntu 24.04** · Type: **CX22** (2 vCPU / 4 GB)
3. Under **SSH keys**, add your public key (`cat ~/.ssh/id_ed25519.pub` — create one with `ssh-keygen -t ed25519` if needed)
4. Create. Note the server's **IPv4 address**.

## 2. Point your domain at it

At your DNS provider (for `carebora.co.ke`), add an **A record**:

| Type | Name | Value |
|---|---|---|
| A | `app` | `<your-server-IPv4>` |

(Gives you `app.carebora.co.ke`. DNS can take a few minutes to propagate.)

## 3. First login + basic hardening

```bash
ssh root@<server-ip>

# Create a non-root sudo user
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy your SSH key

# Firewall: allow SSH + web only
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

Reconnect as the new user: `ssh deploy@<server-ip>`

## 4. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker   # or log out and back in
docker --version
```

## 5. Get the code

```bash
git clone https://github.com/Edwin-Kirimi-Kinuthia/carebora.git
cd carebora
```

## 6. Configure secrets — `.env`

Create `.env` in the repo root:

```bash
nano .env
```

```dotenv
# ── Database (local Postgres container) ──
DB_PASSWORD=change-me-to-a-long-random-string
DATABASE_URL=postgres://carebora:change-me-to-a-long-random-string@db:5432/carebora

# ── Public URLs (your domain) ──
APP_URL=https://app.carebora.co.ke
MPESA_CALLBACK_URL=https://app.carebora.co.ke/api/v1/payments/mpesa/callback

# ── LiveKit (video) ──
LIVEKIT_URL=wss://...livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# ── M-Pesa Daraja ──
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...

# ── AI (free Hugging Face) ──
HF_API_TOKEN=hf_...
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct

# ── Email + SMS (optional but recommended) ──
RESEND_API_KEY=re_...
AT_API_KEY=atsk_...
AT_USERNAME=sandbox
```

> `DB_PASSWORD` and the password inside `DATABASE_URL` **must match**. Generate one with `openssl rand -hex 24`.

## 7. Set your domain in the Caddyfile

```bash
nano Caddyfile   # replace app.carebora.co.ke with your domain
```

## 8. Build and start everything

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes a few minutes. Check it's up:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
```

## 9. Create the database schema + demo data

```bash
# Create all tables
docker compose -f docker-compose.prod.yml exec web \
  npx prisma db push --schema packages/db/prisma/schema.prisma

# Seed providers, products (with images), demo accounts, etc.
docker compose -f docker-compose.prod.yml exec web \
  npm run db:seed -w @carebora/db
```

## 10. Verify

Caddy will fetch an HTTPS certificate automatically once DNS points at the box. Then:

```bash
curl https://app.carebora.co.ke/api/v1/health
```

Open **https://app.carebora.co.ke** — log in with `admin@carebora.ke` / `Demo1234!`.

---

## Day-2 operations

**Deploy an update** (after you push new code):
```bash
cd carebora
git pull
docker compose -f docker-compose.prod.yml up -d --build web
# if the schema changed:
docker compose -f docker-compose.prod.yml exec web \
  npx prisma db push --schema packages/db/prisma/schema.prisma
```

**Logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f web
```

**Restart / stop:**
```bash
docker compose -f docker-compose.prod.yml restart
docker compose -f docker-compose.prod.yml down          # stop (data persists)
```

**Database backup** (add to `crontab -e` for a daily dump):
```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U carebora carebora | gzip > ~/carebora-$(date +%F).sql.gz
```

**Restore a backup:**
```bash
gunzip -c ~/carebora-YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U carebora carebora
```

---

## Notes

- **Going live with M-Pesa:** set `MPESA_ENV=production` and swap in your production Daraja credentials + a real Paybill/Till, then `docker compose -f docker-compose.prod.yml up -d web`.
- **Prefer a managed DB?** Skip the `db` service and point `DATABASE_URL` at your free Neon connection string instead — the app doesn't care.
- **Memory:** 4 GB is comfortable. If you ever downsize to 2 GB, add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` (and add it to `/etc/fstab`).
- **Cost:** ~€5/mo for the CX22 (no EU VAT for Kenyan customers) + your domain. Everything else runs on free tiers at low volume; SMS is pay-as-you-go.
