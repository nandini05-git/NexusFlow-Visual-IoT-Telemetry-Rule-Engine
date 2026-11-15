# NexusFlow - Visual IoT Telemetry & Rule Engine

NexusFlow is an enterprise-grade IoT telemetry ingestion pipeline and reactive rule engine built on the **MERN** stack (MongoDB, Express, React, Node.js). It enables engineers to ingest high-frequency IoT sensor telemetry into MongoDB Time-Series collections and visually model event-driven processing pipelines using an interactive node canvas powered by React Flow.

---

## ⚡ Architecture & Tech Stack

- **Backend**:
  - **Runtime**: Node.js (ES Modules)
  - **Framework**: Express.js
  - **Database**: MongoDB with verified native **Time-Series Collections** (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`)
  - **ODM & Indexing**: Mongoose with compound indexing on `metadata.deviceId` and `timestamp`
  - **Authentication**: JWT (`jsonwebtoken`) & password hashing with `bcryptjs`
  - **Validation**: `express-validator` for structured schema and request validation
  - **Security**: Optional `x-api-key` ingestion gate via `INGEST_API_KEY`
  - **Real-Time Communication**: WebSockets (`ws`)
  - **Utilities**: CORS, Dotenv, Centralized Error Handling
- **Frontend**:
  - **Framework**: React 18 + Vite
  - **Routing**: `react-router-dom` v7
  - **State & Auth**: React Context API (`AuthContext`) with persistent JWT sessions in `localStorage`
  - **Canvas & Flow Builder**: `@xyflow/react` (React Flow) with custom input/output nodes, interactive controls, and connection validation
  - **Serialization**: Portable JSON graph compiler with acyclicity and orphan node validation
  - **HTTP Client**: Axios with automatic Bearer token interceptor
  - **Icons & Styling**: Lucide React + Custom Dark Navy IoT Aesthetic

---

## 📁 Repository Structure

```
NexusFlow/
├── .gitignore                      # Git ignore rules for Node, Vite, logs & env
├── README.md                       # Comprehensive documentation & roadmap
├── backend/                        # Node.js + Express backend service
│   ├── .env.example                # Example environment configuration (PORT, MONGO_URI, JWT, INGEST_API_KEY)
│   ├── package.json                # Backend dependencies and scripts
│   ├── server.js                   # Server bootstrap with HTTP & WebSocket server
│   ├── scripts/
│   │   ├── loadTest.js             # High-throughput batched ingestion load test runner
│   │   ├── mockSensor.js           # Simulated IoT turbine sensor generator
│   │   └── testAuth.js             # Automated auth and route test suite
│   └── src/
│       ├── app.js                  # Express application setup and routing
│       ├── config/
│       │   └── db.js               # MongoDB connection lifecycle & time-series startup verification
│       ├── controllers/
│       │   ├── auth.controller.js  # Register, Login, and Me profile handlers
│       │   └── ingest.controller.js# Health check, single/batch ingest, telemetry query & stats aggregation
│       ├── middleware/
│       │   ├── apiKeyAuth.js       # Optional x-api-key header ingestion verification
│       │   ├── auth.js             # JWT verification & req.user attachment
│       │   └── errorHandler.js     # Centralized error handler & 404 handler
│       ├── models/
│       │   ├── Telemetry.js        # MongoDB Time-Series Mongoose schema with compound indexes
│       │   └── User.js             # User account schema with password hashing
│       └── routes/
│           ├── auth.routes.js      # Auth endpoints (/register, /login, /me)
│           └── ingest.routes.js    # Ingestion & protected telemetry endpoints
└── frontend/                       # React + Vite frontend client
    ├── .env.example                # Example frontend environment variables
    ├── index.html                  # HTML entry point
    ├── package.json                # Frontend dependencies and scripts
    ├── vite.config.js              # Vite bundler configuration & backend proxy
    └── src/
        ├── main.jsx                # React DOM mount point
        ├── App.jsx                 # App router with protected & public routes
        ├── index.css               # Styling for landing, auth, canvas toolbar, nodes & dashboard
        ├── api/
        │   └── client.js           # Axios client with Bearer token interceptor
        ├── context/
        │   └── AuthContext.jsx     # Global authentication provider & hook
        ├── utils/
        │   └── serializeGraph.js   # Graph JSON serializer and topology validator (DAG / orphans)
        ├── components/
        │   ├── Navbar.jsx          # Public navigation bar with auth CTA
        │   ├── Footer.jsx          # Platform footer with links & status
        │   ├── ProtectedRoute.jsx  # Route guard redirecting to /login
        │   ├── Canvas.jsx          # Interactive React Flow workspace with toolbar & serialization modal
        │   ├── Sidebar.jsx         # Draggable node palette (Source, Math, Action)
        │   └── nodes/
        │       ├── DataSourceNode.jsx    # Custom node (Target device & sensor metric selector)
        │       ├── MathOperationNode.jsx # Custom node (Threshold, Moving Average, Cumulative Sum)
        │       └── ActionTriggerNode.jsx # Custom node (SMS Alert, REST Webhook Dispatcher)
        └── pages/
            ├── Landing.jsx         # Marketing landing page (Hero, Features, Steps)
            ├── Register.jsx        # Engineer signup page with form validation
            ├── Login.jsx           # Engineer signin page with JWT authentication
            └── Dashboard.jsx       # Protected IoT rule canvas & live telemetry inspection panel
```

---

## 🔐 Environment Variables

### Backend (`/backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nexusflow # or MongoDB Atlas URI
JWT_SECRET=your_jwt_secret_key_production_random_string_2026
JWT_EXPIRES_IN=7d

# Optional: Set INGEST_API_KEY to enforce x-api-key header on /api/ingest routes. Leave blank for open IoT ingest.
INGEST_API_KEY=
```

### Frontend (`/frontend/.env`)
```env
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
- **Node.js**: v18.x or higher (tested on Node v24)
- **MongoDB**: v5.0+ (native Time-Series collection support) or MongoDB Atlas cluster

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
   Edit `.env` with your MongoDB connection string and JWT secret.

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

5. Run high-throughput telemetry ingestion load test:
   ```bash
   npm run loadtest
   ```
   *Customizable parameters:*
   ```bash
   npm run loadtest -- --duration=10 --batch-size=1000 --concurrency=6
   ```

6. Run automated auth verification tests:
   ```bash
   npm run test:auth
   ```

7. Simulate live IoT device telemetry:
   ```bash
   npm run mock
   ```

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

## 📊 High-Throughput Load Test Results

The backend includes an automated concurrent stress-testing utility ([`backend/scripts/loadTest.js`](file:///c:/NexusFlow/backend/scripts/loadTest.js)) that generates batched sensor readings and benchmarks MongoDB Time-Series ingestion velocity.

### Benchmark Execution Run
```text
================================================================
      NexusFlow Telemetry Ingestion Load Test Runner
================================================================
 Target Endpoint:     http://localhost:5000/api/ingest/batch
 Batch Size:           1,000 readings / request
 Concurrency:          6 parallel workers
 Target Ingestion:     5,000 writes/sec
----------------------------------------------------------------
 Server Status:       OK (DB: connected)

================================================================
                   LOAD TEST RESULTS REPORT
================================================================
 Total Telemetry Sent:    154,000 documents
 Total Batches Sent:      154 successful (0 failed)
 Actual Duration:         8.49 seconds
 Achieved Throughput:     18,135 writes/sec
 Average Batch Latency:   318 ms
 95th Percentile Latency: 575 ms
----------------------------------------------------------------
 STATUS: PASS (Exceeded target 5,000 writes/sec requirement)
================================================================
```

---

## 🧩 Graph Serialization & Validation Format

The visual canvas compiles React Flow state into portable JSON. The topology validator ensures all rules meet DAG requirements before compiling:
- **At least one Data Source** and **one Action Trigger**.
- **No orphan or disconnected nodes**.
- **No cycles** (enforces Directed Acyclic Graph topology).
- **Strict connection rules**: `Data Source -> Math Operation -> Action Trigger`.

### Serialized Graph Schema Example (`nexusflow-rule-graph.json`)
```json
{
  "version": "1.0.0",
  "exportedAt": "2026-11-15T03:30:00.000Z",
  "metadata": {
    "generator": "NexusFlow Visual IoT Rule Engine",
    "nodeCount": 3,
    "edgeCount": 2
  },
  "nodes": [
    {
      "id": "source-1",
      "type": "dataSource",
      "position": { "x": 60, "y": 150 },
      "data": {
        "label": "Turbine-01 (Temp)",
        "deviceId": "turbine-01",
        "sensorType": "temperature",
        "unit": "°C"
      }
    },
    {
      "id": "math-1",
      "type": "mathOperation",
      "position": { "x": 380, "y": 150 },
      "data": {
        "label": "Threshold Filter",
        "operation": "threshold",
        "operator": ">",
        "thresholdValue": 80.0,
        "windowSize": 5
      }
    },
    {
      "id": "action-1",
      "type": "actionTrigger",
      "position": { "x": 720, "y": 150 },
      "data": {
        "label": "Emergency Cooling",
        "actionType": "sms_alert",
        "target": "+1 (555) 019-2834"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-source1-math1",
      "source": "source-1",
      "target": "math-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "edge-math1-action1",
      "source": "math-1",
      "target": "action-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}
```

---

## 📡 REST API & WebSocket Reference

### Authentication Endpoints
| Method | Endpoint | Access | Description | Payload / Headers |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account (hashes password, rejects duplicate email with 409) | `{"name": "...", "email": "...", "password": "..."}` |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials & issue JWT token | `{"email": "...", "password": "..."}` |
| `GET` | `/api/auth/me` | **Bearer Token** | Retrieve currently authenticated user profile | Header: `Authorization: Bearer <token>` |

### Telemetry & Ingestion Endpoints
| Method | Endpoint | Access | Description | Sample Request / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health status & DB connectivity | N/A |
| `POST` | `/api/ingest` | Public (IoT) | Ingest single telemetry reading (optional API key) | `{"deviceId": "turbine-01", "sensorType": "temperature", "value": 74.2, "unit": "°C"}` |
| `POST` | `/api/ingest/batch` | Public (IoT) | High-throughput batch ingestion (`ordered: false`, max 10,000) | `[{"deviceId": "turbine-01", "sensorType": "temperature", "value": 75.1}, ...]` |
| `GET` | `/api/telemetry` | **Bearer Token** | Query recent readings (deviceId, sensorType, from, to, limit 1-1000) | `?deviceId=turbine-01&sensorType=temperature&from=2026-11-15T00:00:00Z&limit=100` |
| `GET` | `/api/telemetry/stats` | **Bearer Token** | Aggregation pipeline returning count, min, max, avg over N minutes | `?deviceId=turbine-01&minutes=60` |
| `WS` | `ws://localhost:5000` | Public | Real-time WebSocket event stream | N/A |

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
- [x] **Day 2: Web Development Layer & JWT Authentication**
  - Backend authentication system (`bcryptjs`, `jsonwebtoken`, `express-validator`).
  - `User` model with password hashing pre-save hooks and 409 duplicate email protection.
  - Protected API routes via JWT middleware (`/api/auth/me`, `/api/telemetry`).
  - Modern public marketing Landing page (`/`) with Hero, Feature cards, 3-step workflow, and Navbar/Footer.
  - Interactive Registration (`/register`) and Login (`/login`) pages with client-side validation and password show/hide toggles.
  - Global `AuthContext` with persistent JWT session management in `localStorage`.
  - Axios Bearer token interceptor for authenticated API requests.
  - Protected Workspace Dashboard (`/dashboard`) integrating the Day 1 React Flow canvas with user greeting and logout.
- [x] **Day 3: Time-Series Hardening, Load Testing & Interactive Canvas**
  - Verified native MongoDB Time-Series collection on backend startup (`timeseries: true`, `timeField: timestamp`, `metaField: metadata`, `granularity: seconds`).
  - Compound indexing on `{ 'metadata.deviceId': 1, timestamp: -1 }` and sensor metrics.
  - Extended `/api/telemetry` with date range filters (`from`, `to`), sensor type, and limit up to 1000.
  - Aggregation pipeline endpoint `/api/telemetry/stats` computing count, min, max, and avg.
  - Ingestion batch cap (10,000) and optional `x-api-key` header protection (`INGEST_API_KEY`).
  - High-throughput load testing script (`npm run loadtest`) achieving **18,135 writes/sec** against the 5,000 writes/sec target.
  - Fully interactive React Flow canvas with custom nodes (`DataSourceNode`, `MathOperationNode`, `ActionTriggerNode`).
  - Enforced strict connection validation (`Data Source -> Math Operation -> Action Trigger`).
  - Canvas toolbar supporting Save Graph, Export JSON download, Delete Selected, and Clear Canvas.
  - Graph serialization & validation utility (`serializeGraph.js`) verifying sources, sinks, orphan isolation, and DAG acyclicity.
  - Live Recent Telemetry panel and aggregation stats on Dashboard auto-refreshing every 5 seconds.
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
