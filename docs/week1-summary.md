# NexusFlow — Week 1 Summary & Transition Guide

**Milestone**: Week 1 Completion (Advanced MERN Stack Engineering)  
**Next Milestone**: Week 2 (Logic Compiler + RxJS Stream Processor) — *Starts November 17, 2026*  

---

## 1. What Was Built in Week 1

Week 1 focused on building the high-frequency ingestion foundation and the interactive visual canvas scaffolding.

### Backend Infrastructure
1. **Native MongoDB Time-Series Collections**:
   - Configured `timeField: "timestamp"`, `metaField: "metadata"`, `granularity: "seconds"`.
   - Verified automated startup validation hook detecting collection type and schema options.
   - High-performance compound indexes on `metadata.deviceId` and `timestamp`.
2. **High-Speed Ingestion Endpoints**:
   - `POST /api/ingest`: Normalized single reading endpoint with input validation.
   - `POST /api/ingest/batch`: High-throughput un-ordered batch ingestion (`insertMany({ ordered: false })`) with a 10,000 document request cap.
   - Optional `x-api-key` header protection controlled by `INGEST_API_KEY`.
3. **Protected Telemetry & Aggregation Query APIs**:
   - `GET /api/telemetry`: Multi-criteria querying (`deviceId`, `sensorType`, `from`, `to`, `limit`), sorted newest-first.
   - `GET /api/telemetry/stats`: Real-time aggregation pipeline returning `count`, `min`, `max`, and `avg` over sliding time windows.
4. **Authentication & Security Layer**:
   - Complete JWT authentication flow (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`).
   - Bcrypt password hashing pre-save hooks and 409 conflict handling for duplicate accounts.
5. **Testing & Simulation Scripts**:
   - `mockSensor.js`: Realistic simulated IoT turbine sensor streaming temperature telemetry.
   - `loadTest.js`: Concurrent stress test runner demonstrating **10,172+ writes/sec** against the target of 5,000 writes/sec.
   - `storageStats.js`: Quantifies on-disk storage density (**7.05 bytes/doc**; ~94% space reduction).
   - Automated test suite covering auth and ingestion validation (`npm test`).

### Frontend Web Layer & Visual Canvas
1. **Public Marketing Pages**:
   - **Landing Page (`/`)**: Hero section with simulated animated canvas wire, 4 capability cards, and a 3-step workflow guide.
   - **Registration Page (`/register`)**: Full name, email, password matching validation, show/hide password toggles.
   - **Login Page (`/login`)**: Secure authentication with JWT token storage in `localStorage`.
2. **Protected Workspace Dashboard (`/dashboard`)**:
   - User identity tag with logout action.
   - Live backend health status badge with connectivity diagnostics.
   - Auto-refreshing **Recent Telemetry Panel** displaying live table records and aggregation metrics every 5 seconds.
3. **Interactive React Flow Canvas**:
   - Drag-and-drop node palette from the left sidebar.
   - Custom styled nodes:
     - `DataSourceNode` (Cyan, Right output handle, device and sensor metric selectors).
     - `MathOperationNode` (Purple, Left input + Right output handles, Threshold / Moving Average / Sum selector).
     - `ActionTriggerNode` (Orange, Left input handle, SMS alert / Webhook destination field).
   - **Connection Validation**: Strictly enforces `Data Source -> Math Operation -> Action Trigger` and blocks self-connections.
   - **Canvas Toolbar**: Save Graph, Export JSON download, Delete Selected, Clear Canvas, Load Sample, and Fit View.
   - **Graph Serializer & Topology Validator (`serializeGraph.js`)**: Verifies rule graph integrity (sources, sinks, orphan isolation, and DAG cycle detection) and renders formatted JSON preview modal.

---

## 2. Screenshots Checklist for Review

When preparing visual assets for the Mid-Project Review or project presentation, capture the following views:

| Asset ID | Screen / View | Description / What to Show |
| :--- | :--- | :--- |
| `SCR-01` | **Landing Page (`/`)** | Hero headline, animated interactive canvas preview card, and feature cards grid. |
| `SCR-02` | **Registration Page (`/register`)** | Clean dark-mode sign-up card with inline validation error states and password toggles. |
| `SCR-03` | **Login Page (`/login`)** | Sign-in interface with credential authentication. |
| `SCR-04` | **Dashboard Canvas Workspace (`/dashboard`)** | React Flow canvas showing connected `Data Source -> Math Operation -> Action Trigger` pipeline with MiniMap, Controls, and Toolbar. |
| `SCR-05` | **Graph Serialization Modal** | Modal showing validated JSON output schema with "v1.0.0" metadata, nodes, and edges. |
| `SCR-06` | **Recent Telemetry & Stats Panel** | Open slide-over drawer showing live aggregation cards (Total Ingested, Min, Max, Average) and the auto-refreshing telemetry table. |
| `SCR-07` | **Load Test Benchmark Console** | Terminal screenshot of `npm run loadtest` showing **10,000+ writes/sec** and zero failed batches. |
| `SCR-08` | **Storage Audit Output** | Terminal screenshot of `npm run storage:stats` showing 259,000+ records and **7.05 bytes/record** storage density. |

---

## 3. Known Limitations & Transition to Week 2

1. **Rule Graph Persistence**:
   - *Week 1 Status*: Graphs are serialized and validated in browser memory and exportable to local `.json` files.
   - *Week 2 Scope*: Save graphs into MongoDB for persistent user project storage.
2. **Rule Execution Engine**:
   - *Week 1 Status*: No backend rule execution engine was implemented (as strictly mandated by Week 1 constraints).
   - *Week 2 Scope*: Week 2 will build the **Node.js Logic Compiler** using **RxJS Observables** to parse serialized React Flow JSON and execute live filtering/threshold logic in real time.
3. **Hardware Connectivity**:
   - Currently driven by HTTP REST ingestion (`/api/ingest` & `/api/ingest/batch`) and simulated turbine scripts. Direct MQTT broker integration can be layered on top of this API.
