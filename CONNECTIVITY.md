# How frontend talks to backend and database

## Flow

1. **Browser** → opens `http://localhost:5173` (Vite dev server)
2. **Frontend** → calls `fetch('/api/auth/register', ...)` (same origin)
3. **Vite proxy** → forwards `/api` to `http://localhost:5000`
4. **Flask** → handles `POST /api/auth/register`, uses **PostgreSQL** (`studygroupfinder`)

## Run order

1. **Backend (Flask + DB)**  
   ```bash
   cd D:\Testcase\backend
   python app.py
   ```  
   You should see: `[App] Database OK` and `Flask running at http://127.0.0.1:5000`

2. **Frontend (Vite)**  
   ```bash
   cd D:\Testcase\frontend
   npm run dev
   ```  
   Then open **http://localhost:5173**

3. Use **Register** or **Login** on the site. API calls go to `/api/...`, Vite proxies them to the backend.

## If it still fails

- **"Cannot reach backend"** → Backend not running or wrong port. Start `python app.py` in `backend/`.
- **"Backend returned 500"** → See the terminal where `python app.py` is running for the traceback.
- **Database errors** → PostgreSQL must be running; database `studygroupfinder` must exist. Create it: `createdb studygroupfinder` (or via pgAdmin).

## Override database URL

```bash
set DATABASE_URL=postgresql://user:password@localhost:5432/studygroupfinder
python app.py
```
