# AWS EC2 Deployment Guide

Complete guide to deploy Open Source Assist on AWS EC2 with a custom domain and HTTPS.

---

## Prerequisites

| Item | Details |
|------|---------|
| **AWS Account** | Free tier eligible (t3.micro) or t3.medium recommended |
| **Domain Name** | From any registrar (Namecheap, GoDaddy, Route 53, etc.) |
| **API Keys** | Gemini API key, GitHub token, SMTP credentials |

---

## Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:
   - **Name**: `open-source-assist`
   - **AMI**: Ubuntu Server 24.04 LTS (or 22.04)
   - **Instance type**: `t3.medium` (2 vCPU, 4 GB RAM) — minimum for embedding model
   - **Key pair**: Create or select an existing `.pem` key
   - **Storage**: 30 GB gp3 (SSD)
   - **Security Group** — allow these inbound rules:

     | Type  | Port | Source    |
     |-------|------|-----------|
     | SSH   | 22   | Your IP   |
     | HTTP  | 80   | 0.0.0.0/0 |
     | HTTPS | 443  | 0.0.0.0/0 |

3. Click **Launch Instance** and note the **Public IPv4** address.

---

## Step 2: Point Your Domain

Go to your domain registrar's DNS settings and create an **A record**:

```
Type: A
Name: @ (or your subdomain, e.g., "app")
Value: <EC2-PUBLIC-IP>
TTL: 300
```

Wait a few minutes for DNS propagation. Verify with:
```bash
nslookup yourdomain.com
```

---

## Step 3: SSH into EC2

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

---

## Step 4: Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/open-source-assist.git
cd open-source-assist
```

---

## Step 5: Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in these critical values:

```env
# Security — CHANGE THESE
POSTGRES_PASSWORD=<strong-random-password>
JWT_SECRET_KEY=<run: openssl rand -hex 32>

# Domain
CORS_ALLOW_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
GITHUB_REDIRECT_URI=https://yourdomain.com/api/v1/auth/github/callback

# API Keys
GEMINI_API_KEY=<your-gemini-key>
GITHUB_TOKEN=<your-github-pat>
GITHUB_CLIENT_ID=<your-oauth-app-client-id>
GITHUB_CLIENT_SECRET=<your-oauth-app-client-secret>

# Email (for OTP/password reset)
SMTP_USERNAME=<your-email@gmail.com>
SMTP_PASSWORD=<gmail-app-password>
MAIL_FROM=<your-email@gmail.com>
```

---

## Step 6: Run the Deployment Script

```bash
sudo bash deploy/setup-ec2.sh
```

The script will:
1. Install Docker, Nginx, and system dependencies
2. Configure the firewall (UFW)
3. Build and start all Docker containers (PostgreSQL, Qdrant, Backend, Frontend)
4. Run database migrations
5. Obtain an SSL certificate from Let's Encrypt
6. Configure Nginx as a reverse proxy with HTTPS

---

## Step 7: Verify

- **Website**: `https://yourdomain.com`
- **API Docs**: `https://yourdomain.com/docs`
- **Health Check**: `https://yourdomain.com/health`

---

## Common Operations

### View logs
```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs backend   # just backend
```

### Restart services
```bash
docker compose -f docker-compose.prod.yml restart
```

### Update to latest code
```bash
sudo bash deploy/update.sh
```

### Rebuild a single service
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Run database migrations manually
```bash
docker compose -f docker-compose.prod.yml exec backend uv run alembic upgrade head
```

### Access PostgreSQL
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d open_source_assist
```

### SSH tunnel for Qdrant dashboard (development)
```bash
ssh -i your-key.pem -L 6333:localhost:6333 ubuntu@<EC2-IP>
# Then open http://localhost:6333/dashboard in your browser
```

---

## Architecture on EC2

```
Internet
   │
   ▼
┌─────────────────────────────────────────────────────┐
│  EC2 Instance (Ubuntu)                              │
│                                                     │
│  ┌──────────────────┐                               │
│  │  Nginx (host)    │  :443 (HTTPS) / :80 (→ 443)  │
│  │  SSL termination │                               │
│  └────────┬─────────┘                               │
│           │ proxy_pass :3000                         │
│           ▼                                         │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │  Frontend (Nginx)│    │  Backend (FastAPI)      │ │
│  │  :3000 → :80     │───▶│  :8000                  │ │
│  │  React SPA       │    │  Uvicorn (2 workers)    │ │
│  └──────────────────┘    └────────┬───────────────┘ │
│                                   │                  │
│                    ┌──────────────┼──────────────┐   │
│                    ▼              ▼              │   │
│              ┌──────────┐  ┌──────────┐         │   │
│              │PostgreSQL│  │  Qdrant  │         │   │
│              │  :5432   │  │  :6333   │         │   │
│              └──────────┘  └──────────┘         │   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Cost Estimate (AWS)

| Resource | Spec | Monthly Cost |
|----------|------|-------------|
| EC2 t3.medium | 2 vCPU, 4 GB RAM | ~$30 |
| EBS (gp3) | 30 GB | ~$2.50 |
| Data transfer | ~50 GB/mo | ~$4.50 |
| **Total** | | **~$37/month** |

> Tip: Use a t3.micro (free tier) for demos with light traffic, but the embedding model may be slow on 1 GB RAM.

---

## Troubleshooting

**Containers won't start?**
```bash
docker compose -f docker-compose.prod.yml logs
```

**SSL certificate issues?**
```bash
sudo certbot renew --dry-run
sudo certbot certificates
```

**Port already in use?**
```bash
sudo lsof -i :3000
sudo lsof -i :8000
```

**Database connection errors?**
Check that `POSTGRES_HOST=postgres` is set in the docker-compose environment (not `localhost`).
