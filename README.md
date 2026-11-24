# Pluckk Real-Time Indent & 5:00 AM Mandi Procurement Engine

A fast, lightweight, and real-time order allocation app built specifically for **Pluckk's fresh fruits & vegetables supply chain**.

---

## 🔐 Role-Based Access Control (RBAC)

The application features automated role assignment based on email domain:

- **Admin Access (Pluckk Official)**:
  - Any email ending in **`@pluckk.in`** or **`@pluckk.co.in`** (e.g. `procurement@pluckk.in`, `ops@pluckk.co.in`).
  - **Capabilities**: Upload 12:30 AM Indents (CSV/JSON), monitor live fill-rate metrics, view all active suppliers, broadcast emergency SOS alerts, trigger 5 AM simulations, and export morning Purchase Orders (PO).
- **Restricted Access (Vendor / Supplier Portal)**:
  - **Any other email** (e.g. `ramesh.traders@gmail.com`, `suresh.agro@yahoo.com`).
  - **Capabilities**: Strict **1-to-1 channel**. Suppliers only see Pluckk's open demand. They cannot see competitor bids or rates. They can claim full/partial stock, and report morning shortages at 5:00 AM.

---

## 🥬 The Problem Solved

1. **Nightly Indent (12:30 AM)**: Pluckk generates an indent with SKU codes and target quantities (e.g., Potato 150 kg, Onion 120 kg).
2. **1-to-1 Supplier Communication**: Pluckk sees the overall fulfillment progress (many-to-one), while each vendor sees only their 1-to-1 allocation channel.
3. **Dynamic Demand Pool & Race-Condition Protection**:
   - If **Vendor A** confirms 70 kg of a 100 kg requirement, the remaining requirement immediately drops to **30 kg** across all other suppliers' mobile screens via WebSockets.
   - When **Vendor B** takes the remaining 30 kg, the SKU status changes to **Fulfilled (Closed)** and the item locks, preventing other vendors from buying excess stock at the mandi.
4. **The 5:00 AM Mandi Twist**:
   - If a supplier arrives at the mandi at 5:00 AM and reports they cannot supply or have a shortfall (e.g., 70 kg dropped to 0 kg due to APMC quality/rain issues):
   - The engine **instantly reopens** the 70 kg demand to backup suppliers.
   - Triggers an **Urgent 5:00 AM Shortfall Alert** on the Pluckk Command Center and dispatches SOS notifications.

---

## ⚡ Tech Stack (100% Free, Fast & Optimized)

- **Backend**: Node.js + Express (v5) + **Socket.io** (sub-millisecond live WebSocket sync) + `multer` & `csv-parser`.
- **Frontend**: **Vite + React 19** + **Tailwind CSS v4** + **Lucide Icons**.
- **Database**:
  - **Built-in Embedded Persistent Store** (`server/data/db.json`): Pre-configured, zero-setup, persists users, indents, and audit logs to disk. Perfect for instant zero-cost hosting.
  - *Optional MongoDB / PostgreSQL*: Can be connected if horizontal multi-instance scaling is required (see below).

---

## 🚀 How to Run Locally

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Run the application
npm start
```
Then open your browser at:
👉 **`http://localhost:4000`**

---

## 🌐 How to Host This Website Live (Free Options)

### Option 1: Render.com (Recommended - 1-Click Free Hosting)
1. Push this repo to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New > Web Service**.
3. Select your GitHub repository: `https://github.com/mahindrooom/Order_Management-`.
4. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Click **Deploy Web Service**. Render will give you a live HTTPS URL with WebSockets enabled!

### Option 2: Railway.app / Fly.io / VPS
Simply run `npm run build && npm start`. The server serves both the Socket.io API and the compiled React frontend from a single port.

---

## 🗄️ Database Setup Guide

### 1. Built-in Database (Default - No Setup Required)
The app comes with an embedded JSON database located at `server/data/db.json`. It auto-creates users, preserves vendor sessions, and saves indent allocations automatically. You do **not** need to install or pay for any database to run live.

### 2. Optional: Upgrading to MongoDB (If deploying on distributed clusters)
If you run multiple container instances behind a load balancer, you can plug in MongoDB or PostgreSQL:
1. Install mongoose: `npm install mongoose`
2. Add `MONGODB_URI` environment variable.
3. The schema maps 1-to-1 with our existing `db.js` models (`User`, `Indent`, `Allocation`).
