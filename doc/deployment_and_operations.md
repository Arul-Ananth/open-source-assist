# Deployment & Operations Guide

This guide covers setting up the environment, launching Qdrant Server, seeding sample data, and executing automated tests.

---

## 1. Prerequisites

* **Python 3.12+**
* **`uv` package manager**: Installed via `curl -LsSf https://astral.sh/uv/install.sh` or PowerShell `irm https://astral.sh/uv/install.ps1 | iex`
* **Docker** (for local Qdrant Server) OR access to **Qdrant Cloud**

---

## 2. Environment Setup

1. Clone repository and navigate to root:
   ```bash
   cd open-source-assist
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Install all dependencies using `uv`:
   ```bash
   uv sync
   ```

---

## 3. Starting Qdrant Server

### Option A: Local Docker (Default & Recommended)
Use the included `docker-compose.yml`:
```bash
docker compose up -d
```
* **REST API**: `http://localhost:6333`
* **Web Dashboard**: `http://localhost:6333/dashboard`
* **gRPC Port**: `http://localhost:6334`

To stop:
```bash
docker compose down
```

### Option B: Native Windows Executable (No Docker)
1. Download `qdrant-x86_64-pc-windows-msvc.zip` from [Qdrant Releases](https://github.com/qdrant/qdrant/releases).
2. Extract and launch:
   ```powershell
   .\qdrant.exe
   ```

### Option C: Qdrant Cloud (Managed Production)
1. Create a free cluster on [cloud.qdrant.io](https://cloud.qdrant.io).
2. Update your `.env` file:
   ```env
   QDRANT_URL=https://<your-cluster-id>.cloud.qdrant.io:6333
   QDRANT_API_KEY=your-secret-qdrant-cloud-key
   ```

---

## 4. Seeding Sample Repositories

To populate your Qdrant Server with initial representative repositories (FastAPI, Starlette, Flask, Tokio, Qdrant, etc.):

```bash
uv run python -m backend.scripts.seed_sample_data
```

**Expected output**:
```text
Connecting to Qdrant...
Ingesting 6 sample repositories...
Successfully indexed 6 repositories into collection 'open_source_repositories' in 245.12ms.
```

---

## 5. Starting the FastAPI Backend

Run the server with Uvicorn (hot-reload enabled for development):
```bash
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

* **Interactive API Docs (Swagger UI)**: `http://localhost:8000/docs`
* **Alternative API Docs (ReDoc)**: `http://localhost:8000/redoc`
* **Health Check**: `http://localhost:8000/health`

---

## 6. Running Automated Tests

Run the full automated test suite using `uv`:
```bash
uv run pytest backend/tests
```

To run with verbose output:
```bash
uv run pytest backend/tests -v
```

All 7 unit and integration tests run in ~2–3 seconds without requiring external background daemons.

