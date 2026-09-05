# Smart Resort 360 — Autonomous Resort Operations & Guest Experience Platform
**Hackcelestial 3.0 Platform**

Smart Resort 360 is an enterprise autonomous resort management platform featuring 8 coordinated AI agents, real-time telemetry simulation, intelligent guest hyper-personalization, incident ticketing & escalation, automated inventory replenishment, and an Executive Owner cockpit with real-time financial tracking.

---

## 🌟 Key Architecture & Capabilities

1. **8 Multi-Agent Swarm**:
   - **Staffing Agent**: Workload-driven dynamic staff scheduling and zone rebalancing.
   - **Predictive Maintenance Agent**: Sensor health degradation tracking, MTBF failure forecasts, work order auto-dispatch.
   - **Inventory Replenishment Agent**: Stock-out risk monitoring, par-level enforcement, automated PO generation.
   - **Concierge Agent**: Multilingual natural language assistant, booking facilitation, and activity scheduling.
   - **Dynamic Pricing & Yield Agent**: Real-time room rate elasticity optimizer based on demand, weather, and occupancy.
   - **Sentiment & Feedback Agent**: Multi-aspect NLP review sentiment classification and immediate executive escalation.
   - **Personalization Agent**: Occasion-tailored bespoke guest itineraries (weddings, family waterpark, corporate retreats, VIP wellness).
   - **Guest Segmentation Agent**: Unsupervised KMeans clustering (k=7) analyzing RFM profiles, lifetime value, and stay behaviors.

2. **Executive Owner Cockpit (`/owner`)**:
   - High-level decision engine translated into operational business language.
   - One-click operational dispatch & real-time zone risk/workload mitigation.
   - Automated inventory restock approval with PO logging.
   - Weekly consolidated executive performance audit (`/owner/week`).

3. **Interactive Guest Experience Hub (`/guests`)**:
   - AI Occasion Matcher & Booking customizer (Weddings, Family Vacations, Rejuvenation, Group Outings).
   - Instant guest ticketing (Spa, Cab/Speedboat, Dining, Housekeeping, Tech support) with real-time ETA assignment.
   - Real-time guest feedback with auto-escalation for <3★ reviews.
   - In-House resort amenities directory with one-click reservation requests.

---

## 🚀 Quick Start (Local Development)

### 1. Backend (FastAPI + Python 3.11)
```bash
# From repository root
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation available at `http://127.0.0.1:8000/docs`

### 2. Frontend (Next.js 16 + React 19 + TailwindCSS)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🌐 Deployment Instructions

### 1. Backend on Render (Web Service)
1. In [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Connect your GitHub repository: `Spidy003/Hackcelestial2026`.
3. Configure the service settings:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Deploy the service and copy your public Render URL (e.g. `https://hackcelestial2026-api.onrender.com`).

### 2. Frontend on Vercel
1. In [Vercel Dashboard](https://vercel.com/new), click **Import** on `Spidy003/Hackcelestial2026`.
2. Configure project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g. `https://hackcelestial2026-api.onrender.com`)
4. Click **Deploy**.
