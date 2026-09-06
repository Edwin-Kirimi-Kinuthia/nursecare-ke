# Self-Hosting CareBora on a Hetzner CX22 (~$5/month)

Runs the whole platform — Next.js app **+ PostGIS-enabled PostgreSQL + automatic
HTTPS** — on one small VPS with Docker. Video (LiveKit), payments (M-Pesa Daraja
or Jenga), email (Resend), SMS (Africa's Talking) and AI (Hugging Face) stay on
their own services, exactly like the Vercel deployment. PostGIS backs the
proximity ranking used by the pharmacy marketplace, ambulance dispatch, and lab
search — the bundled Postgres image already includes it, nothing extra to install.

**You'll need:** the Hetzner box, your domain (e.g. `app.carebora.co.ke`), and the
secret values from your existing `.env` / Vercel (JWT secret, LiveKit, M-Pesa or
Jenga, HF, Resend, Africa's Talking).

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
# ── Database (local PostGIS-enabled Postgres container) ──
DB_PASSWORD=change-me-to-a-long-random-string
DATABASE_URL=postgres://carebora:change-me-to-a-long-random-string@db:5432/carebora

# ── Auth (generate: openssl rand -base64 48) ──
JWT_SECRET=change-me-to-a-long-random-string

# ── Public URLs (your domain) ──
APP_URL=https://app.carebora.co.ke
NEXT_PUBLIC_APP_URL=https://app.carebora.co.ke
NEXT_PUBLIC_API_URL=https://app.carebora.co.ke/api/v1

# ── LiveKit (video) ──
LIVEKIT_URL=wss://...livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# ── Payments — pick ONE gateway family ──
# mpesa_daraja is the default. `jenga` is the fallback, `till` needs no creds.
PAYMENTS_MODE=mpesa_daraja        # mpesa_daraja | jenga | till
NEXT_PUBLIC_PAYMENTS_MODE=mpesa_daraja
PLATFORM_FEE_PERCENT=10

# M-Pesa Daraja (primary) — start on sandbox, flip MPESA_ENV to go live.
# The Daraja portal shows "N/A" for a sandbox app's Shortcode and Passkey — they
# aren't issued per app; every sandbox app uses the published test pair below.
# Only the test MSISDN 254708374149 accepts a push, and no money actually moves.
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://app.carebora.co.ke/api/v1/payments/mpesa/callback

# Jenga (Equity/Finserve) — only if PAYMENTS_MODE=jenga
JENGA_ENV=uat
JENGA_API_KEY=...
JENGA_MERCHANT_CODE=...
JENGA_CONSUMER_SECRET=...
JENGA_PRIVATE_KEY_B64=...
JENGA_CALLBACK_URL=https://app.carebora.co.ke/api/v1/payments/jenga/callback
JENGA_PGW_TOKEN=...

# Till mode (no gateway creds needed) — only if PAYMENTS_MODE=till
NEXT_PUBLIC_MPESA_TILL_NUMBER=...
NEXT_PUBLIC_MPESA_TILL_NAME=...

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
# Apply every migration (including the PostGIS geog-sync triggers that back
# proximity ranking for the pharmacy marketplace, ambulance dispatch, and lab
# search). Do NOT use `prisma db push` here — it only pushes the Prisma-visible
# schema and silently skips the raw-SQL trigger migrations.
docker compose -f docker-compose.prod.yml exec web \
  npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

# Seed providers, drugs, vendor pharmacies/ambulance operator/lab, demo accounts, etc.
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
  npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
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

- **Going live with M-Pesa (sandbox → production):** this is an env-only change — no code edit, no redeploy of anything but the web container. Set `MPESA_ENV=production`, swap `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_PASSKEY` for your production Daraja app's values, set `MPESA_SHORTCODE` to your real paybill/till (instead of the sandbox `174379`), point `MPESA_CALLBACK_URL` at your public HTTPS callback, then `docker compose -f docker-compose.prod.yml up -d web`. Verify with one small real payment and check the ledger entries.
- **Falling back to Jenga:** if Daraja go-live stalls, set `PAYMENTS_MODE=jenga` + `NEXT_PUBLIC_PAYMENTS_MODE=jenga`, `JENGA_ENV=production`, and fill in the Jenga credentials (API key, merchant code, consumer secret, RSA private key, PGW token) from developer.jengahq.io, then `docker compose -f docker-compose.prod.yml up -d web`. No Daraja or Till creds are needed in this mode. Payments already taken through Daraja are unaffected — each `Payment` row records the gateway that processed it.
- **Emergency stopgap:** `PAYMENTS_MODE=till` needs no gateway credentials at all — patients enter the M-Pesa code from a normal Buy Goods payment and an admin verifies it in the dashboard.
- **Prefer a managed DB?** Skip the `db` service and point `DATABASE_URL` at your free Neon connection string instead — the app doesn't care.
- **Memory:** 4 GB is comfortable. If you ever downsize to 2 GB, add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` (and add it to `/etc/fstab`).
- **Cost:** ~€5/mo for the CX22 (no EU VAT for Kenyan customers) + your domain. Everything else runs on free tiers at low volume; SMS is pay-as-you-go.
