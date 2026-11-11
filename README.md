# NexusFlow - Visual IoT Telemetry & Rule Engine

NexusFlow is an enterprise-grade IoT telemetry ingestion pipeline and reactive rule engine built on the **MERN** stack (MongoDB, Express, React, Node.js). It enables engineers to ingest high-frequency IoT sensor telemetry into MongoDB Time-Series collections and visually model event-driven processing pipelines using an interactive node canvas powered by React Flow.

---

## ⚡ Architecture & Tech Stack

- **Backend**:
  - **Runtime**: Node.js (ES Modules)
  - **Framework**: Express.js
  - **Database**: MongoDB with native **Time-Series Collections** (`timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }`)
  - **ODM**: Mongoose
  - **Authentication**: JWT (`jsonwebtoken`) & password hashing with `bcryptjs`
  - **Validation**: `express-validator` for structured schema and request validation
  - **Real-Time Communication**: WebSockets (`ws`)
  - **Utilities**: CORS, Dotenv, Centralized Error Handling
- **Frontend**:
  - **Framework**: React 18 + Vite
  - **Routing**: `react-router-dom` v7
  - **State & Auth**: React Context API (`AuthContext`) with persistent JWT sessions in `localStorage`
  - **Canvas & Flow Builder**: `@xyflow/react` (React Flow)
  - **HTTP Client**: Axios with automatic Bearer token interceptor
  - **Icons & Styling**: Lucide React + Custom Dark Navy IoT Aesthetic

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
│   │   ├── mockSensor.js           # Simulated IoT turbine sensor generator
│   │   └── testAuth.js             # Automated auth and route test suite
│   └── src/
│       ├── app.js                  # Express application setup and routing
│       ├── config/
│       │   └── db.js               # MongoDB connection lifecycle & state
│       ├── controllers/
│       │   ├── auth.controller.js  # Register, Login, and Me profile handlers
│       │   └── ingest.controller.js# Health check, single/batch ingest & query
│       ├── middleware/
│       │   ├── auth.js             # JWT verification & req.user attachment
│       │   └── errorHandler.js     # Centralized error handler & 404 handler
│       ├── models/
│       │   ├── Telemetry.js        # MongoDB Time-Series Mongoose schema
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
        ├── index.css               # Styling for landing, auth, canvas & dashboard
        ├── api/
        │   └── client.js           # Axios client with Bearer token interceptor
        ├── context/
        │   └── AuthContext.jsx     # Global authentication provider & hook
        ├── components/
        │   ├── Navbar.jsx          # Public navigation bar with auth CTA
        │   ├── Footer.jsx          # Platform footer with links & status
        │   ├── ProtectedRoute.jsx  # Route guard redirecting to /login
        │   ├── Canvas.jsx          # React Flow canvas with custom nodes & DND
        │   └── Sidebar.jsx         # Draggable node palette (Source, Math, Action)
        └── pages/
            ├── Landing.jsx         # Marketing landing page (Hero, Features, Steps)
            ├── Register.jsx        # Engineer signup page with form validation
            ├── Login.jsx           # Engineer signin page with JWT authentication
            └── Dashboard.jsx       # Protected IoT rule canvas & telemetry workspace
```

---

## 🔐 Environment Variables

### Backend (`/backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nexusflow # or MongoDB Atlas URI
JWT_SECRET=your_jwt_secret_key_production_random_string_2026
JWT_EXPIRES_IN=7d
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

5. Run automated auth verification tests:
   ```bash
   npm run test:auth
   ```

6. Simulate live IoT device telemetry:
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

## 🌐 Application Pages & Routes

| Path | Page Component | Access | Description |
| :--- | :--- | :--- | :--- |
| `/` | `Landing.jsx` | Public | Hero section, interactive canvas preview, features grid, 3-step workflow, and platform footer. |
| `/register` | `Register.jsx` | Public | Account creation with full name, email, password validation (min 8 chars), password toggles, and duplicate rejection. |
| `/login` | `Login.jsx` | Public | Secure credential authentication, token storage, and redirection to the protected dashboard. |
| `/dashboard` | `Dashboard.jsx` | **Protected** | Interactive React Flow canvas, node palette sidebar, live telemetry inspection drawer, user profile tag, and logout action. |

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
| `POST` | `/api/ingest` | Public (IoT) | Ingest single telemetry reading | `{"deviceId": "turbine-01", "sensorType": "temperature", "value": 74.2, "unit": "°C"}` |
| `POST` | `/api/ingest/batch` | Public (IoT) | High-throughput batch ingestion (`ordered: false`) | `[{"deviceId": "turbine-01", "sensorType": "temperature", "value": 75.1}, ...]` |
| `GET` | `/api/telemetry` | **Bearer Token** | Query recent readings (newest first) | Header: `Authorization: Bearer <token>`, `?deviceId=turbine-01&limit=50` |
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
