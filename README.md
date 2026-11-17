# NexusFlow - Visual IoT Telemetry & Rule Engine

NexusFlow is an enterprise-grade IoT telemetry ingestion pipeline and reactive rule engine built on the **MERN** stack (MongoDB, Express, React, Node.js). It enables engineers to ingest high-frequency IoT sensor telemetry into native MongoDB Time-Series collections, visually model event-driven processing pipelines using an interactive node canvas powered by React Flow, and compile visual Directed Acyclic Graphs (DAGs) into executable **RxJS reactive event streams**.

For a comprehensive beginner-friendly onboarding guide with factory manager analogies and architecture deep-dives, see [**`docs/PROJECT_EXPLAINED.md`**](file:///c:/NexusFlow/docs/PROJECT_EXPLAINED.md).

---

## ⚡ Architecture & Tech Stack

```mermaid
flowchart TD
  subgraph IoT_Layer ["IoT & Hardware Simulation Layer"]
    MockSensor["Mock Sensor (mockSensor.js)"]
    LoadTester["Load Test Runner (loadTest.js)"]
    Hardware["Hardware / Industrial Sensors"]
  end

  subgraph Ingestion_Layer ["Ingestion & Event Bus Layer (Port 5000)"]
    IngestAPI["Ingestion API (/api/ingest, /api/ingest/batch)"]
    AuthMW["JWT Auth & Security (apiKeyAuth)"]
    TelemetryBus["telemetryBus (RxJS Subject Singleton)"]
    QueryAPI["Telemetry Query & Stats (/api/telemetry, /stats)"]
  end

  subgraph Database_Layer ["MongoDB Atlas (Native Time-Series)"]
    TSColl[("telemetries (Time-Series Collection)\nBucket Span: 3600s | Granularity: seconds")]
    UserColl[("users (User Accounts)")]
    GraphColl[("rulegraphs (User Rule DAGs)")]
  end

  subgraph Compiler_Layer ["Logic Compiler Engine (RxJS)"]
    GraphParser["graphParser.js\nDAG Validation & Kahn's Topological Sort"]
    NodeFactories["nodeFactories.js\nRxJS Operators (Filter, Scan, Share)"]
    PipelineAssembler["compileGraph.js\nMulti-Branch Stream Execution"]
  end

  subgraph Frontend_Layer ["React 18 + Vite Frontend Application (Port 3000)"]
    Canvas["Visual React Flow Canvas (DAG Pipeline Builder)"]
    NodePalette["Node Library (Data Sources, Math Ops, Actions)"]
    PersistenceUI["Toolbar (Save to Server, Load Graph, Compile Check)"]
    AuthContext["Auth Context (JWT State & Session)"]
    TelemetryPanel["Live Telemetry & Ingestion Stats Panel"]
  end

  MockSensor -->|"POST /api/ingest"| IngestAPI
  LoadTester -->|"POST /api/ingest/batch (10k/batch)"| IngestAPI
  Hardware -.->|"HTTP REST / x-api-key"| IngestAPI

  IngestAPI -->|"insertMany (ordered: false)"| TSColl
  IngestAPI -->|"next(saved)"| TelemetryBus
  TelemetryBus -->|"Live Telemetry Stream"| Compiler_Layer

  Canvas -->|"Save / Update Graph"| GraphColl
  Canvas -->|"POST /api/graphs/:id/compile"| Compiler_Layer
  Compiler_Layer -->|"Topological Order & Validation"| Canvas
  AuthContext -->|"Bearer Token"| AuthMW
  AuthMW --> QueryAPI
  QueryAPI -->|"Aggregation Pipeline"| TSColl
  QueryAPI -->|"Auto-Refresh 5s"| TelemetryPanel
```

- **Backend**:
  - **Runtime**: Node.js (ES Modules)
  - **Framework**: Express.js
  - **Database**: MongoDB with verified native **Time-Series Collections** (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`)
  - **ODM & Indexing**: Mongoose with compound indexing on `metadata.deviceId` and `timestamp`
  - **Reactive Stream Engine**: RxJS (`rxjs`) for DAG compilation, branching via `share()`, and pipeline operators (`filter`, `scan`, `map`, `tap`)
  - **Authentication**: JWT (`jsonwebtoken`) & password hashing with `bcryptjs`
  - **Validation**: Server-side DAG validation (Kahn's topological sort, cycle detection, orphan detection)
  - **Security**: Optional `x-api-key` ingestion gate via `INGEST_API_KEY`
  - **Real-Time Communication**: WebSockets (`ws`)
- **Frontend**:
  - **Framework**: React 18 + Vite
  - **Routing**: `react-router-dom` v7
  - **State & Auth**: React Context API (`AuthContext`) with persistent JWT sessions in `localStorage`
  - **Canvas & Flow Builder**: `@xyflow/react` (React Flow) with custom nodes, interactive controls, and DAG connection validation
  - **Node Library**: Categorized palette (Data Sources, Math Operations, Action Triggers) with inline configuration editing
  - **Graph Persistence**: Graph Name toolbar, Save to Server, Load Graph dropdown, Compile Check modal, and JSON export
  - **HTTP Client**: Axios with automatic Bearer token interceptor
  - **Icons & Styling**: Lucide React + Cyberpunk/Industrial IoT Dark Navy Aesthetic

---

## 📁 Repository Structure

```
NexusFlow/
├── .gitignore                      # Git ignore rules for Node, Vite, logs & env
├── README.md                       # Comprehensive documentation & roadmap
├── docs/                           # Project documentation & audit reports
│   ├── PROJECT_EXPLAINED.md        # Beginner guide, architecture, data flow & 10 review Q&As
│   ├── week1-ingestion-report.md   # Benchmarks (10k+ writes/sec, 7 bytes/doc audit)
│   └── week1-summary.md            # Week 1 summary, screenshot checklist & transition
├── backend/                        # Node.js + Express backend service
│   ├── .env.example                # Example environment configuration (PORT, MONGO_URI, JWT, INGEST_API_KEY)
│   ├── package.json                # Backend dependencies and scripts
│   ├── server.js                   # Server bootstrap with HTTP & WebSocket server
│   ├── tests/
│   │   └── compiler.test.js        # Unit test suite for RxJS logic compiler (6/6 passing)
│   ├── scripts/
│   │   ├── loadTest.js             # High-throughput batched ingestion load test runner
│   │   ├── mockSensor.js           # Simulated IoT turbine sensor generator
│   │   ├── storageStats.js         # Time-series storage footprint inspector ($collStats)
│   │   ├── testAuth.js             # Automated auth test suite
│   │   ├── testIngest.js           # Automated ingestion and query test suite
│   │   └── testWeek2Compiler.js    # Automated graph persistence & compiler integration suite
│   └── src/
│       ├── app.js                  # Express application setup and routing
│       ├── compiler/               # RxJS Logic Compiler Engine
│       │   ├── telemetryBus.js      # Singleton RxJS Subject event highway
│       │   ├── graphParser.js       # DAG validator, cycle detector & Kahn's topological sort
│       │   ├── nodeFactories.js     # RxJS operators (Filter, Scan, Share, Actions)
│       │   └── compileGraph.js      # Pipeline wiring with multi-branching (.pipe(share()))
│       ├── config/
│       │   └── db.js               # MongoDB connection lifecycle & time-series startup verification
│       ├── controllers/
│       │   ├── auth.controller.js  # Register, Login, and Me profile handlers
│       │   ├── ingest.controller.js# Ingest, query & stats aggregation handlers
│       │   └── graph.controller.js # Protected graph CRUD & dry-run compile handlers
│       ├── middleware/
│       │   ├── apiKeyAuth.js       # Optional x-api-key header ingestion verification
│       │   ├── auth.js             # JWT verification & req.user attachment
│       │   └── errorHandler.js     # Centralized error handler & 404 handler
│       ├── models/
│       │   ├── Telemetry.js        # MongoDB Time-Series Mongoose schema with compound indexes
│       │   ├── User.js             # User account schema with password hashing
│       │   └── RuleGraph.js        # Rule graph schema for React Flow DAG persistence
│       └── routes/
│           ├── auth.routes.js      # Auth endpoints (/register, /login, /me)
│           ├── ingest.routes.js    # Ingestion & protected telemetry endpoints
│           └── graph.routes.js     # Protected rule graph CRUD & compile endpoints
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
        │   ├── client.js           # Axios client with Bearer token interceptor
        │   └── graphs.js           # Graph CRUD & compilation API service
        ├── context/
        │   └── AuthContext.jsx     # Global authentication provider & hook
        ├── utils/
        │   └── serializeGraph.js   # Graph JSON serializer and topology validator (DAG / orphans)
        ├── components/
        │   ├── Navbar.jsx          # Public navigation bar with auth CTA
        │   ├── Footer.jsx          # Platform footer with links & status
        │   ├── ProtectedRoute.jsx  # Route guard redirecting to /login
        │   ├── Canvas.jsx          # Interactive React Flow workspace with persistence & compile UI
        │   ├── Sidebar.jsx         # Draggable categorized node palette (Data Sources, Math, Actions)
        │   └── nodes/
        │       ├── nodeRegistry.js       # Central node type map, categories & default configs
        │       ├── DataSourceNode.jsx    # Custom node (Turbine, Temperature, Custom Device)
        │       ├── MathOperationNode.jsx # Custom node (Threshold, Moving Average, Sum, Min, Max)
        │       └── ActionTriggerNode.jsx # Custom node (SMS Alert, REST Webhook)
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
MONGO_URI=mongodb://localhost:27017/nexusflow # or MongoDB Atlas Replica Set URI
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

## 🚀 Setup & Execution Guide (2 Terminals)

### Terminal 1 — Start Backend Server
```powershell
cd backend
npm run dev
```
*(Runs on `http://localhost:5000`)*

### Terminal 2 — Start Frontend Application
```powershell
cd frontend
npm run dev
```
*(Runs on `http://localhost:3000`)*

---

## 🛠️ NPM Scripts Reference

### Backend Scripts (`/backend`)
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `nodemon server.js` | Starts backend development server with auto-reload |
| `npm start` | `node server.js` | Starts backend production server |
| `npm test` | `testAuth && testIngest && testGraph && compiler.test` | Runs full automated test suite (Auth, Ingest, Graph API & Compiler) |
| `npm run test:compiler`| `node --test tests/compiler.test.js` | Unit tests for RxJS logic compiler (valid, cycles, orphans, thresholds, MA, branches) |
| `npm run test:graph` | `node scripts/testWeek2Compiler.js` | Integration test for graph CRUD, cycle rejection & dry-run compile |
| `npm run test:auth` | `node scripts/testAuth.js` | Validates registration, login, JWT token, and profile routes |
| `npm run test:ingest` | `node scripts/testIngest.js` | Validates single/batch ingestion, caps, error handling & stats |
| `npm run mock` | `node scripts/mockSensor.js` | Generates simulated turbine temperature telemetry every 1,000ms |
| `npm run loadtest` | `node scripts/loadTest.js` | Stress tests ingestion velocity (supports `--duration`, `--batch-size`) |
| `npm run storage:stats`| `node scripts/storageStats.js`| Inspects MongoDB Time-Series storage size and bytes/record |

### Frontend Scripts (`/frontend`)
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts Vite React development server on port 3000 |
| `npm run build` | `vite build` | Compiles production assets into `dist/` |
| `npm run preview` | `vite preview` | Previews production build locally |

---

## 📡 REST API & WebSocket Reference

### Authentication Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account (hashes password, rejects duplicate email with 409) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials & issue JWT token |
| `GET` | `/api/auth/me` | **Bearer Token** | Retrieve currently authenticated user profile |

### Telemetry & Ingestion Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Service health status & DB connectivity |
| `POST` | `/api/ingest` | Public (IoT) | Ingest single telemetry reading & pipe to `telemetryBus` |
| `POST` | `/api/ingest/batch` | Public (IoT) | High-throughput batch ingestion (`ordered: false`, max 10,000) & pipe to `telemetryBus` |
| `GET` | `/api/telemetry` | **Bearer Token** | Query recent readings (deviceId, sensorType, from, to, limit 1-1000) |
| `GET` | `/api/telemetry/stats` | **Bearer Token** | Aggregation pipeline returning count, min, max, avg over N minutes |
| `WS` | `ws://localhost:5000` | Public | Real-time WebSocket event stream |

### Rule Graph Persistence & Logic Compiler Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/graphs` | **Bearer Token** | Save new rule graph (validates DAG, rejects cycles/orphans) |
| `GET` | `/api/graphs` | **Bearer Token** | List all rule graphs owned by the authenticated user |
| `GET` | `/api/graphs/:id` | **Bearer Token** | Retrieve a specific rule graph by ID |
| `PUT` | `/api/graphs/:id` | **Bearer Token** | Update rule graph name, description, or JSON topology |
| `DELETE` | `/api/graphs/:id` | **Bearer Token** | Delete a saved rule graph |
| `POST` | `/api/graphs/:id/compile`| **Bearer Token** | Dry-run compile saved graph into executable RxJS streams |
| `POST` | `/api/graphs/compile` | **Bearer Token** | Dry-run compile current unsaved canvas graph payload |

---

## 🗺️ 4-Week Implementation Roadmap

### **Week 1: Core Foundation & Telemetry Ingestion**
- [x] **Time-Series Ingestion Architecture (Complete & Audited)**
  - Native MongoDB Time-Series collection verified on startup (`timeField: "timestamp"`, `metaField: "metadata"`, `granularity: "seconds"`).
  - High-performance compound indexes on `{ 'metadata.deviceId': 1, timestamp: -1 }`.
  - Express ingestion REST APIs (`/api/health`, `/api/ingest`, `/api/ingest/batch`, `/api/telemetry`, `/api/telemetry/stats`).
  - Cap batch ingestion at 10,000 documents with un-ordered bulk writes.
  - JWT authentication flow (`/register`, `/login`, `/me`) and protected query endpoints.
  - Load test runner achieving **10,172 writes/sec** (`scripts/loadTest.js`).
  - Storage footprint inspector demonstrating **7.05 bytes/doc** (`scripts/storageStats.js`).
  - Interactive React Flow canvas with custom nodes, toolbar, and portable graph JSON serialization.

### **Week 2: Logic Compiler & Node Library** *(starts 17 Nov)*
- [x] **Logic Compiler Foundation (RxJS)**:
  - Installed `rxjs` and built `backend/src/compiler/`.
  - `telemetryBus.js`: Singleton RxJS `Subject` receiving every ingested reading.
  - `graphParser.js`: Server-side DAG validation, cycle detection, orphan detection, and Kahn's topological sort.
  - `nodeFactories.js`: Stream operators for Data Sources, Math Operations (Threshold, Moving Average, Sum, Min, Max), and Action Trigger stubs.
  - `compileGraph.js`: Pipeline assembler supporting branching via `.pipe(share())` with lifecycle controller (`start`, `stop`, `metadata`).
  - Unit test suite (`tests/compiler.test.js`) verifying valid compilation, cycle rejection, orphan rejection, threshold triggers, moving averages, and independent branching.
- [x] **Graph Persistence & Dry-Run Compiler API**:
  - `RuleGraph` Mongoose model scoped to authenticated user with status (`draft` \| `active`).
  - Scoped CRUD routes (`POST /api/graphs`, `GET /api/graphs`, `GET /api/graphs/:id`, `PUT /api/graphs/:id`, `DELETE /api/graphs/:id`).
  - Dry-run compilation endpoints (`POST /api/graphs/:id/compile` and `POST /api/graphs/compile`).
  - Integration test suite (`scripts/testWeek2Compiler.js`) passing all 10 tests.
- [x] **Node Library & Canvas Persistence UI**:
  - `nodeRegistry.js` mapping React Flow types to custom nodes with categories and default presets.
  - Custom UI nodes: Turbine Sensor, Temperature Sensor, Custom Device, Threshold Filter, Moving Average, Sum Accumulator, Min Tracker, Max Tracker, SMS Alert, REST Webhook.
  - Canvas toolbar additions: Rule Name input, Save/Update to Server, Load Graph dropdown, Compile Check button with success/error modal, and toast alerts.

### **Week 3: Live Rule Execution & Real-Time Dashboards**
- [ ] **In-Memory Rule Execution**: Connect incoming WebSocket telemetry to dynamically compiled RxJS pipelines to evaluate thresholds in memory.
- [ ] **Live Visual Dashboards**: Real-time charts subscribing to WebSocket streams.

### **Week 4: Webhooks, Actuator Alerting & Production Hardening**
- [ ] **Outbound Action Webhooks**: Automated dispatching to external APIs and real SMS services when rules trigger.
- [ ] **Visual Wire Feedback**: Canvas connection wires pulsating when data passes through.
- [ ] **Final Deployment**: Docker containerization and end-to-end integration polish.
