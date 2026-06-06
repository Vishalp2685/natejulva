# Natejulva - Premium Matrimonial Platform

Natejulva is a state-of-the-art matrimonial application designed to facilitate meaningful connections with verified profiles, featuring premium search, real-time messaging, compatibility matching, and subscription management.

## 🚀 Project Overview

The project is built as a decoupled web application:
- **Backend**: Python / Django REST Framework (DRF) with PostgreSQL database storage.
- **Frontend**: React / TypeScript / Vite styled with a custom high-end premium design system (burgundy, gold, and warm neutral colors).

---

## 📁 Repository Structure

```
natejulva/
├── backend/                   # Django REST API application
│   ├── accounts/              # User management, authentication, and OTP systems
│   ├── profiles/              # User profiles, matching, messaging, and likes
│   ├── backend/               # Main settings and routing configuration
│   └── manage.py              # Django CLI utility
├── frontend/                  # React + TypeScript single-page application
│   ├── src/
│   │   ├── components/        # Reusable visual components (Header, Footer, etc.)
│   │   ├── context/           # React context providers (Auth, AdminAuth, etc.)
│   │   ├── pages/             # App page components (Dashboard, ProfileEdit, etc.)
│   │   └── App.tsx            # Main routes and application entrypoint
│   ├── package.json           # Node.js dependencies and scripts
│   └── vite.config.ts         # Vite configuration
└── .env.template              # Local environment variable template
```

---

## 🛠️ Tech Stack & Requirements

### Backend Requirements
- Python 3.10+
- Django 5.2.14+
- Django REST Framework (DRF)
- PostgreSQL
- `psycopg2-binary`
- `django-cors-headers`
- `python-dotenv`

### Frontend Requirements
- Node.js 18+
- React 18+
- TypeScript
- Vite
- Lucide React (for icons)

---

## ⚙️ Setup Instructions

### 1. Backend Setup

1. Create a Python virtual environment:
   ```bash
   python -m venv .venv
   ```
2. Activate the virtual environment:
   - **Windows (PowerShell)**: `.venv\Scripts\Activate.ps1`
   - **macOS/Linux**: `source .venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Copy the `.env.template` to `.env` in the `backend/backend` folder and populate the settings:
   ```env
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DJANGO_SECRET_KEY=your_secret_key
   DJANGO_DEBUG=True
   ```
5. Apply database migrations:
   ```bash
   python backend/manage.py migrate
   ```
6. Start the development server:
   ```bash
   python backend/manage.py runserver
   ```

### 2. Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🔑 Key Features

### 👤 Authentication & Verification
- Mobile-number based registration.
- OTP Verification (utilizes Django caching for verification tokens, with a mock fallback of `123456` for local testing).
- Dual portal: Client dashboard and secure Admin management panel.

### 💖 Matches, Chat & Recommendations
- Profiles have 100% completeness checking.
- Connect invites and mutual matching.
- Real-time private chat for connected couples.
- **Weighted Recommendation Engine**: Calculates match percentages using dynamic priority weights:
  - **Critical (Weight 3)**: Religion and Location (City/Hometown) compatibility.
  - **Important (Weight 2)**: Caste, Working Status, Annual Salary, and Age range preferences (Preferred Min/Max Age).
  - **General (Weight 1)**: Height, Occupation, Family Type, and Blood Group.

### ⚡ Caching Architecture
- **Backend Caching**: Recommendations are cached per user using Django's caching framework (`LocMemCache`) for a 5-minute TTL. The cache is automatically invalidated when the user updates their profile, changes partner preferences, sends a like, or unmatches a connection.
- **Frontend Caching**: A custom React `CacheProvider` with a `cachedFetch` utility interceptor manages client-side caching of GET requests (profile, preferences, recommendations, and search results). 
  - To prevent flashing loading states and eliminate flicker when switching pages or tabs, components synchronously read from the cache during state initialization and user actions (e.g., clicking on connection/request sub-tabs), resolving layout states instantaneously.
  - The cache is automatically invalidated on mutation requests (POST/PUT/DELETE) via `cachedFetch` (including likes and unmatches), ensuring consistent and fresh data updates.

### 📖 API Documentation
The Django backend dynamically generates OpenAPI 3.0 schemas using `drf-spectacular`. Interactive documentations can be accessed at:
- **Swagger UI**: [http://localhost:8000/api/docs/swagger/](http://localhost:8000/api/docs/swagger/)
- **ReDoc**: [http://localhost:8000/api/docs/redoc/](http://localhost:8000/api/docs/redoc/)
- **OpenAPI Schema (Raw)**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

---

*This README file will be kept updated with all new feature additions and architectural changes.*
