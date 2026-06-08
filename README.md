# ShiftSync

A full-stack shift scheduling web application for small businesses.

## Tech Stack
- **Backend:** Django 4.x + Django REST Framework
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Database:** SQLite (dev) → PostgreSQL (prod)
- **Auth:** Token-based (DRF)
- **Deployment:** Railway/Render (backend) + Vercel (frontend)

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # fill in your values
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env      # fill in your values
npm run dev
```

## Project Structure
```
shiftsync/
├── backend/         # Django REST API
│   ├── shiftsync/   # project settings
│   └── api/         # main app (models, views, serializers)
└── frontend/        # React + Vite
    └── src/
        ├── api/         # axios + API call functions
        ├── context/     # AuthContext
        ├── components/  # reusable UI components
        └── pages/       # route-level pages
```
