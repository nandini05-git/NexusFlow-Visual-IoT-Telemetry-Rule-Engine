# NexusFlow - Visual IoT Telemetry & Rule Engine

NexusFlow is an enterprise-grade IoT telemetry ingestion pipeline and reactive rule engine built on the **MERN** stack (MongoDB, Express, React, Node.js). It enables engineers to ingest high-frequency IoT sensor telemetry into MongoDB Time-Series collections and visually model event-driven processing pipelines using an interactive node canvas powered by React Flow.

---

## ⚡ Architecture & Tech Stack

- **Backend**:
  - **Runtime**: Node.js (ES Modules)
  - **Framework**: Express.js
  - **Database**: MongoDB with native **Time-Series Collections** (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`)
  - **ODM**: Mongoose
  - **Real-Time Communication**: WebSockets (`ws`)
  - **Utilities**: CORS, Dotenv, Centralized Error Handling, Input Validation
- **Frontend**:
  - **Framework**: React 18 + Vite
  - **Canvas & Flow Builder**: `@xyflow/react` (React Flow)
  - **State & HTTP**: Axios with environment-configured client
  - **Icons & Styling**: Lucide React + Custom Dark-Themed IoT Dashboard UI

---

## 📁 Repository Structure

```
NexusFlow/
├── .gitignore                      # Git ignore rules for Node, Vite, logs & env
├── README.md                       # Comprehensive documentation & roadmap
├── backend/                        # Node.js + Express backend service
│   ├── .env.example                # Example environment configuration
│   ├── package.json                # Backend dependencies and scripts
│   ├── server.js                   # Server bootstrap with HTTP & WebSocket server
│   ├── scripts/
│   │   └── mockSensor.js           # Simulated IoT turbine sensor generator
│   └── src/
│       ├── app.js                  # Express application setup and routing
│       ├── config/
│       │   └── db.js               # MongoDB connection lifecycle & state
│       ├── controllers/
│       │   └── ingest.controller.js# Health check, single/batch ingest & query
│       ├── middleware/
│       │   └── errorHandler.js     # Centralized error handler & 404 handler
│       ├── models/
│       │   └── Telemetry.js        # MongoDB Time-Series Mongoose schema
│       └── routes/
│           └── ingest.routes.js    # Ingestion and telemetry API endpoints
└── frontend/                       # React + Vite frontend client
    ├── .env.example                # Example frontend environment variables
    ├── index.html                  # HTML entry point
    ├── package.json                # Frontend dependencies and scripts
    ├── vite.config.js              # Vite bundler configuration & backend proxy
    └── src/
        ├── main.jsx                # React DOM mount point
        ├── App.jsx                 # Main application layout & health status badge
        ├── index.css               # Styling for canvas, nodes, and status badge
        ├── api/
        │   └── client.js           # Axios HTTP client configured via VITE_API_URL
        └── components/
            ├── Canvas.jsx          # React Flow canvas with custom nodes & DND
            └── Sidebar.jsx         # Draggable node palette (Source, Math, Action)
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
- **Node.js**: v18.x or higher (tested on Node v24)
- **MongoDB**: v5.0+ (required for native Time-Series collection support) or MongoDB Atlas cluster URI

---

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MongoDB connection string:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/nexusflow
   ```
   *(Note: If using MongoDB Atlas, supply your `mongodb+srv://...` connection URI).*

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the backend:
   - **Development mode (with nodemon):**
     ```bash
     npm run dev
     ```
   - **Production mode:**
     ```bash
     npm start
     ```

5. Simulate live IoT device telemetry:
   In a separate terminal:
   ```bash
   cd backend
   npm run mock
   ```
   *Sends fluctuating turbine temperature readings to `POST /api/ingest` every 1,000ms.*

---

### 2. Frontend Setup

1. Open a terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Defaults to `VITE_API_URL=http://localhost:5000`)*

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
   *Runs at `http://localhost:3000`.*

5. Build for production:
   ```bash
   npm run build
   ```

---

## 📡 REST API & WebSocket Reference

| Method | Endpoint | Description | Sample Request / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status & DB connectivity | N/A |
| `POST` | `/api/ingest` | Ingest a single telemetry metric | `{"deviceId": "turbine-01", "sensorType": "temperature", "value": 74.2, "unit": "°C"}` |
| `POST` | `/api/ingest/batch` | High-throughput batch ingestion (`ordered: false`) | `[{"deviceId": "turbine-01", "sensorType": "temperature", "value": 75.1}, ...]` |
| `GET` | `/api/telemetry` | Query recent readings (newest first) | `?deviceId=turbine-01&limit=50` |
| `WS` | `ws://localhost:5000` | Real-time WebSocket event stream | N/A |

### Telemetry Time-Series Document Schema
```json
{
  "timestamp": "2026-11-10T16:35:00.000Z",
  "metadata": {
    "deviceId": "turbine-01",
    "sensorType": "temperature",
    "unit": "°C"
  },
  "value": 78.45
}
```

---

## 🗺️ 4-Week Implementation Roadmap

### **Week 1: Core Foundation & Telemetry Ingestion**
- [x] **Day 1: Project Initialization & Time-Series Pipeline**
  - MERN stack architecture scaffolded (`/backend` and `/frontend`).
  - MongoDB Time-Series schema configured with `granularity: seconds`.
  - Express ingestion REST APIs (`/api/health`, `/api/ingest`, `/api/ingest/batch`, `/api/telemetry`).
  - React Flow interactive canvas with drag-and-drop node palette.
  - Backend status indicator badge proving frontend-backend health integration.
  - IoT Turbine mock sensor simulation script (`npm run mock`).
- [ ] **Day 2**: WebSocket live telemetry streaming & dynamic node value binding.
- [ ] **Day 3**: Custom node property inspector and parameter configuration drawer.
- [ ] **Day 4**: Edge condition routers and logic branching nodes.
- [ ] **Day 5**: Canvas graph serialization and MongoDB persistence for custom rule graphs.

### **Week 2: Rule Engine Core & Stream Processing**
- [ ] **Day 6**: Rule evaluation engine supporting arithmetic and threshold comparisons.
- [ ] **Day 7**: Sliding time-window aggregations (Min, Max, Mean, Moving Average).
- [ ] **Day 8**: Multi-sensor correlation engine (e.g., Temperature AND Pressure thresholds).
- [ ] **Day 9**: Graph cycle validation and topological execution ordering.
- [ ] **Day 10**: Unit testing suite with Mocha/Jest for rule engine logic.

### **Week 3: Action Triggers, Notifications & Actuators**
- [ ] **Day 11**: Webhook action dispatcher with retry backoff.
- [ ] **Day 12**: Incident alert generation and audit log persistence.
- [ ] **Day 13**: Simulated actuator feedback loop (e.g. trigger turbine cooling valve).
- [ ] **Day 14**: Dead-letter queue (DLQ) for unprocessable or corrupt telemetry.
- [ ] **Day 15**: Rate-limiting and token-bucket protection on ingestion endpoints.

### **Week 4: Real-Time Analytics, Hardening & Deployment**
- [ ] **Day 16**: Live Recharts telemetry charts embedded in dashboard drawer.
- [ ] **Day 17**: End-to-end load testing (1,000 readings/sec ingestion bench).
- [ ] **Day 18**: Multi-stage Docker containerization (`Dockerfile` and `docker-compose.yml`).
- [ ] **Day 19**: CI/CD pipeline setup with automated linting and tests.
- [ ] **Day 20**: Final polish, demo documentation, and architecture diagrams.
