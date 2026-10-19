# Collectible Stories

A responsive public gallery for collectibles and the stories behind them.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI
- Database: SQLite
- Image storage: local `backend/uploads/` directory (good for local development)

## Requirements
- Python 3.10+
- Node.js 20+ and npm

## 1. Start the backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file by copying `.env.example`, then change `ADMIN_TOKEN` to a long random secret.

```bash
uvicorn app.main:app --reload
```

API: http://127.0.0.1:8000  
Interactive API docs: http://127.0.0.1:8000/docs

## 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

## 3. Add collectibles

The public gallery and detail view are available without signing in. To add an item, use the **Add collectible** button and enter the admin token configured in `backend/.env`. The token is sent only to the API for create requests.

For local development, the token prompt is intentionally simple. Before a real public launch, replace this with proper owner authentication (for example, secure session cookies and a password-reset flow). Never commit `.env` or share the admin token.

## API overview
- `GET /api/collectibles` — public gallery (titles and thumbnails)
- `GET /api/collectibles/{id}` — public detail
- `POST /api/collectibles` — create (requires `X-Admin-Token`)
- `DELETE /api/collectibles/{id}` — delete (requires `X-Admin-Token`)
- `GET /uploads/{filename}` — uploaded image

## Important deployment note
This starter stores images on the server's local disk. Many hosting platforms use ephemeral filesystems, so uploads may disappear on redeploy and may not be shared across multiple instances. For production, use persistent storage or object storage (such as S3-compatible storage) and a managed database if needed. Set `CORS_ORIGINS` to your exact deployed frontend origin. Deploy the API and frontend separately, and set `VITE_API_BASE_URL` to the API's public URL.

## Project structure
```text
collectible-stories/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── uploads/
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts
    │   ├── main.tsx
    │   └── styles.css
    ├── .env.example
    ├── index.html
    ├── package.json
    └── vite.config.ts
```
