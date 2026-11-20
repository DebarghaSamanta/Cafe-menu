# ☕ The Artisan Café — Digital QR Ordering & Management System

> A modern, full-stack table-side digital ordering, kitchen management, and verified customer feedback system inspired by European specialty coffee sanctuaries.

---

## 🌟 Key Highlights

### 📱 Customer Experience (Dine-In Table QR & Web Catalogue)
- **Zero-Friction QR Ordering**: Guests scan a handcrafted wooden/brass table plaque to open the live table menu with no app download required.
- **Bespoke Customizations**: Tailor roast extractions, milk choices (oat, almond, soy, whole), sweetness levels, and gourmet add-ons.
- **Pre-Paid & Flexible Settlement**: Instant checkout with UPI QR, Card simulation, or Counter Cash settlement with real-time tax calculation (5% GST).
- **Live 5-Stage Order Tracker**: Multi-milestone progress timeline (*Placed* ➔ *Paid* ➔ *Kitchen Confirmed* ➔ *Preparing* ➔ *Ready to Serve*) auto-polling every 4 seconds.
- **Instant Tax Invoices**: Downloadable, printable tax invoices with detailed itemized breakdown.
- **Verified Guest Reviews**: Only customers who complete payment at their table can submit star ratings and comments, preventing spam or unverified reviews.

### 🛡️ Admin & Operational Management Portal
- **Real-Time Order Dashboard**: Live order dispatch, audio/visual stage alerts, and order lifecycle management.
- **Menu & Stock Management**: Real-time stock counts, instant availability toggles, price updates, and category filtering.
- **Table & Standee Management**: Dynamic table provisioning, secure QR token generation, and printable standee preview modal.
- **Guest Feedback Moderation**: Dedicated admin portal to monitor table ratings, approve/hide reviews, and select featured reviews for the landing page.
- **Automated Inventory Restorer**: Background async worker (runs every 60s) that automatically cancels abandoned unpaid orders older than 30 minutes and restores inventory stock.

---

## 🏗️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router 7, Lucide Icons, Axios, QRCode |
| **Backend** | Python 3.11+, FastAPI, Uvicorn (ASGI), Pydantic v2, PyMongo, Python-JOSE (JWT) |
| **Database** | MongoDB Atlas (Cloud Replica Set) |
| **Styling** | Custom European Artisan Design System (Matte Espresso, Warm Sand, Terracotta) |
| **Email/SMTP** | SMTP TLS dispatch for OTP authentication and verification |

---

## 📂 Project Structure

```
cafe-menu/
├── cafe_backend/
│   ├── app/
│   │   ├── config.py              # Pydantic environment settings
│   │   ├── main.py                # FastAPI app initialization, CORS, lifespan worker
│   │   ├── security.py            # Password hashing, JWT token creation, admin auth
│   │   ├── db/
│   │   │   └── mongodb.py         # MongoDB connection & index configurations
│   │   ├── routers/
│   │   │   ├── admin.py           # Admin root router & auth protection
│   │   │   ├── admin_dashboard.py # Sales & order metrics API
│   │   │   ├── admin_menu.py      # Admin menu CRUD & inventory management
│   │   │   ├── admin_orders.py    # Admin order status management
│   │   │   ├── admin_reviews.py   # Admin review moderation & approval
│   │   │   ├── admin_tables.py    # Table provisioning & QR generation
│   │   │   ├── auth.py            # Admin/staff authentication & OTP login
│   │   │   ├── menu.py            # Public menu listing & category filters
│   │   │   ├── orders.py          # Customer order placement & payment settlement
│   │   │   ├── reviews.py         # Public reviews & post-payment review submission
│   │   │   └── tables.py          # Table token verification & context resolution
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   └── services/              # Business logic (invoicing, OTP, order lifecycle)
│   ├── scripts/                   # Seeding scripts (seed.py, seed_reviews.py, create_admin.py)
│   └── requirements.txt           # Python backend dependencies
│
└── cafe_frontend/
    ├── public/
    │   └── favicon.svg            # Custom Artisan Café coffee cup crest
    ├── src/
    │   ├── components/            # Reusable UI (Cart, Modals, ArtisanLogo, TableHeader)
    │   ├── contexts/              # AuthContext for staff/admin session management
    │   ├── pages/
    │   │   ├── LandingPage.jsx    # Home showcase, signature cards, customer reviews
    │   │   ├── MenuPage.jsx       # Customer dine-in menu, cart, payments, reviews
    │   │   ├── LoginPage.jsx      # Admin & staff secure authentication
    │   │   └── admin/             # Dashboard, Menu, Inventory, Orders, Tables, Reviews
    │   ├── services/              # API clients (api.js, adminApi.js)
    │   └── App.jsx                # Route definitions & guards
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & npm
- **MongoDB Atlas** connection string

---

### 1. Backend Setup

1. Navigate to the backend folder:
   ```powershell
   cd cafe_backend
   ```
2. Activate your virtual environment:
   ```powershell
   # Windows PowerShell
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Create and configure `.env` (refer to `.env.example`):
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=cafe0
   MONGODB_DB_NAME=cafe_db
   QR_BASE_URL=http://localhost:5173/menu
   JWT_SECRET_KEY=your-secure-random-secret-key-here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=artisian.cafe.support@gmail.com
   SMTP_PASSWORD=your_16_char_google_app_password
   EMAILS_FROM=The Artisan Café <artisian.cafe.support@gmail.com>
   ```
5. Seed initial data (tables, sample items, and reviews):
   ```powershell
   python -m scripts.seed
   python -m scripts.seed_reviews
   ```
6. Start the FastAPI development server:
   ```powershell
   uvicorn app.main:app --reload
   ```
   *Backend runs on `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).*

---

### 2. Frontend Setup

1. Open a new terminal and navigate to `cafe_frontend`:
   ```powershell
   cd cafe_frontend
   ```
2. Install npm dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite dev server:
   ```powershell
   npm run dev
   ```
   *Frontend opens at `http://localhost:5173`.*

---

## 🔒 Security & Verified Review Flow

1. **Table Isolation**: Each physical table has a unique cryptographic QR token hashed in MongoDB.
2. **Review Integrity**: 
   - Browsing `/menu?explore=true` hides all review forms to prevent random online spam.
   - Customers seated at tables only unlock the review section **after** payment status is verified as `PAID`.
3. **Role-Based Access Control**:
   - Customer endpoints are public or scoped to table tokens.
   - Admin routes (`/api/admin/*`) require valid JWT bearer tokens with administrative privileges.

---

## 📜 License
Created for **The Artisan Café**. All rights reserved.
