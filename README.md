# Kitchen Ledger

Self-hosted recipe library. Import LLM-extracted recipes, browse them by tag, scale servings for
shopping, and follow the steps in a distraction-free Cook Mode.

- `backend/` — Spring Boot 3 + Java 17 + H2 (file mode) + Flyway + JWT auth
- `frontend/` — React + Vite + TypeScript + Tailwind + shadcn/ui

## Prerequisites

Pinned to the local toolchain (no global installs required):

| Tool | Path |
| --- | --- |
| JDK 17 | `C:\Users\bob.zhu\jdk-17.0.19+10` |
| Node 24 | `C:\Users\bob.zhu\node-v24.14.1-win-x64` |
| Maven | `C:\Users\bob.zhu\apache-maven-3.9.16` |

## Running

Development — picks free ports (from 8088 / 5173) and runs both halves in one window:

```powershell
.\start-dev.cmd      # stop with .\stop-dev.ps1
```

Production — one process serves the API and the built UI on a single port:

```powershell
.\build-prod.cmd     # frontend/dist + backend/target/kitchen-ledger-*.jar
.\start-prod.cmd     # stop with .\stop-prod.ps1
```

Single-service alternatives:

```powershell
# backend -> http://localhost:8088
./scripts/run-backend.ps1

# frontend -> http://localhost:5173
./scripts/run-frontend.ps1
```

The first run seeds an admin account from `KL_ADMIN_USERNAME` / `KL_ADMIN_PASSWORD`
(defaults `admin` / `changeit`). Registration is closed: the admin creates all other accounts.
Set `KL_JWT_SECRET` and `KL_ADMIN_PASSWORD` before exposing a prod instance.

To reach the app from a phone on the same LAN, browse to `http://<your-lan-ip>:5173`.

## Data

Everything lives under `backend/data/`:

- `kitchenledger.mv.db` — H2 database file
- `uploads/` — uploaded recipe images

Both are git-ignored. Back them up together.
