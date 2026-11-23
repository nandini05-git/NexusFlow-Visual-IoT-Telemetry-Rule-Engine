# NexusFlow: Mid-Project Review Checklist & Defense Guide

> **Project**: NexusFlow — Visual IoT Telemetry & Rule Engine (MERN Stack)  
> **Milestone**: Mid-Project Evaluation (End of Week 2)  
> **Author**: Nandini V  
> **Repository Branch**: `nandini`  
> **Evaluation Date**: 23 November 2026 (Final Submission Freeze)  
> **Final Submission Commit Hash**: `[COMMIT_HASH_PLACEHOLDER]` <!-- Placeholder to be filled after git push -->  
> **Official Submission Document**: [`docs/SUBMISSION_WEEK1-2.md`](file:///c:/NexusFlow/docs/SUBMISSION_WEEK1-2.md)  
> **Pull Request Description**: [`docs/PR_DESCRIPTION.md`](file:///c:/NexusFlow/docs/PR_DESCRIPTION.md)  

---

## 1. Mid-Project Deliverables Verification Matrix

| # | Mid-Project Deliverable | Demonstration Action / Screen | Evidence Artifact | Status |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1** | **Native MongoDB Time-Series Setup**<br>Columns, buckets, metadata indexing | Run `node scripts/storageStats.js`<br>Startup log verification | [`backend/scripts/storageStats.js`](file:///c:/NexusFlow/backend/scripts/storageStats.js)<br>[`docs/ingestion-audit.md`](file:///c:/NexusFlow/docs/ingestion-audit.md) | **READY (913k+ docs, 5.19 B/doc)** |
| **2** | **High-Throughput Batch Ingestion API**<br>Un-ordered bulk inserts, 10k batch cap | Run `node scripts/loadTest.js --warmup=2 --duration=10`<br>`POST /api/ingest/batch` | [`backend/src/controllers/ingest.controller.js`](file:///c:/NexusFlow/backend/src/controllers/ingest.controller.js)<br>[`docs/ingestion-audit.md`](file:///c:/NexusFlow/docs/ingestion-audit.md) | **READY (18,638 writes/sec)** |
| **3** | **Graph Serialization Proof**<br>Draft-07 JSON Schema, 15-node DAG | Run `npm test` in `/frontend`<br>Run `node scripts/validateGraphProof.js` | [`docs/graph.schema.json`](file:///c:/NexusFlow/docs/graph.schema.json)<br>[`docs/graph-serialization-proof.md`](file:///c:/NexusFlow/docs/graph-serialization-proof.md) | **READY (7/7 Vitest passed)** |
| **4** | **RxJS Logic Compiler**<br>DAG parsing, topological sort, multi-branch | Run `npm run test:compiler`<br>Click **Compile Check** on canvas | [`backend/src/compiler/compileGraph.js`](file:///c:/NexusFlow/backend/src/compiler/compileGraph.js)<br>[`backend/tests/compiler.test.js`](file:///c:/NexusFlow/backend/tests/compiler.test.js) | **READY (6/6 unit tests passed)** |
| **5** | **Rule Runner & Dynamic Execution**<br>In-memory lifecycle, activate/deactivate | Run `npm run test:runner`<br>Click **Activate** on Canvas | [`backend/src/compiler/ruleRunner.js`](file:///c:/NexusFlow/backend/src/compiler/ruleRunner.js)<br>[`backend/tests/ruleRunner.test.js`](file:///c:/NexusFlow/backend/tests/ruleRunner.test.js) | **READY (6/6 runner tests passed)** |
| **6** | **Alert Cooldown Throttling**<br>Suppresses burst alerts during breaches | Run `node scripts/auditIngestionWithRule.js`<br>Triggered Alerts drawer | [`backend/src/models/AlertEvent.js`](file:///c:/NexusFlow/backend/src/models/AlertEvent.js)<br>[`frontend/src/pages/Dashboard.jsx`](file:///c:/NexusFlow/frontend/src/pages/Dashboard.jsx) | **READY (Throttles repeats)** |
| **7** | **Backend Security Hardening**<br>Helmet, rate limiting, request IDs, stopAll | Run `npm run test:hardening`<br>Inspect `X-Request-Id` headers | [`backend/src/middleware/rateLimiters.js`](file:///c:/NexusFlow/backend/src/middleware/rateLimiters.js)<br>[`backend/tests/hardening.test.js`](file:///c:/NexusFlow/backend/tests/hardening.test.js) | **READY (5/5 hardening tests passed)** |
| **8** | **Canvas Usability & Live Problems**<br>Undo/Redo, Duplicate, Auto-Layout, Problems drawer | Canvas toolbar buttons<br>Press `Ctrl+Z`, `Ctrl+Y`, `Ctrl+D`<br>Disconnect wire | [`frontend/src/components/Canvas.jsx`](file:///c:/NexusFlow/frontend/src/components/Canvas.jsx)<br>[`frontend/src/utils/graphTemplates.js`](file:///c:/NexusFlow/frontend/src/utils/graphTemplates.js) | **READY (Interactive controls)** |
| **9** | **Reproducible Demo Seeder**<br>Demo account + 3 industrial templates | Run `node scripts/seedDemo.js`<br>Login at `http://localhost:3000/login` | [`backend/scripts/seedDemo.js`](file:///c:/NexusFlow/backend/scripts/seedDemo.js)<br>[`scripts/demo.md`](file:///c:/NexusFlow/scripts/demo.md) | **READY (demo@nexusflow.io)** |
| **10**| **Clean Git Tree & Commit Cadence**<br>Clean working tree, branch tracking | `git status`, `git log -5 --oneline` | Remote repository on branch `nandini` | **READY (100% clean & tracked)** |

---

## 2. Evidence Files Index

1. **Official Submission Document**:
   - [**`docs/SUBMISSION_WEEK1-2.md`**](file:///c:/NexusFlow/docs/SUBMISSION_WEEK1-2.md): Complete milestone submission package covering all deliverables, architecture, how-to-run instructions, test results, limitations, and future roadmap.
2. **Ingestion Performance & Storage Efficiency**:
   - [**`docs/ingestion-audit.md`**](file:///c:/NexusFlow/docs/ingestion-audit.md): Complete comparative audit comparing baseline batch ingestion (18,638 writes/sec achieved, peak 22,570 writes/sec) vs active rule evaluation (1,549 writes/sec WAN) and native Time-Series storage compression (**5.19 bytes/record**, 95.7% reduction across 913k+ documents).
3. **Graph Serialization Proof**:
   - [**`docs/graph.schema.json`**](file:///c:/NexusFlow/docs/graph.schema.json): Formal Draft-07 JSON Schema for React Flow DAGs.
   - [**`docs/graph-serialization-proof.md`**](file:///c:/NexusFlow/docs/graph-serialization-proof.md): Architectural report proving that the complex 15-node, 13-edge DAG across 5 branches serializes idempotently and compiles topologically without data loss.
4. **Demo Execution Script**:
   - [**`scripts/demo.md`**](file:///c:/NexusFlow/scripts/demo.md): 8-minute step-by-step walkthrough covering auth, canvas usability, live problems, compile check, rule activation, mock sensor, alert drawer, load test, and storage stats.
5. **Comprehensive Engineering Manual**:
   - [**`docs/PROJECT_EXPLAINED.md`**](file:///c:/NexusFlow/docs/PROJECT_EXPLAINED.md): 300+ line guide with beginner factory analogies, step-by-step data journeys, architecture sequence diagrams, and 20 presentation review Q&As.
6. **Pull Request Description**:
   - [**`docs/PR_DESCRIPTION.md`**](file:///c:/NexusFlow/docs/PR_DESCRIPTION.md): Comprehensive ready-to-paste Pull Request description for review into main.

---

## 3. "Questions I Might Be Asked" & Model Answers

### Q1: Why did your WAN cloud load test record ~2,000–2,800 writes/sec on single-threaded runs instead of the 5,000 writes/sec target?
**Answer**:
"In concurrent batched testing against the cluster, NexusFlow achieves **18,638 to 22,570 writes/sec**, comfortably exceeding the 5,000 writes/sec target. Our audit in `docs/ingestion-audit.md` also deliberately and honestly benchmarked single-worker unbatched execution against a real remote **MongoDB Atlas Cloud Replica Set over the public Internet (WAN)**. Each unbatched round-trip incurs TCP handshakes, TLS encryption, and WAN latency (~50–80 ms per hop). To achieve 20,000+ writes/sec in enterprise deployments, Express backend instances should be co-located in the same cloud region/VPC as the MongoDB cluster and IoT gateways should buffer readings into 1,000-document batches."

### Q2: How does the Rule Runner prevent alert fatigue when an industrial sensor stays above a threshold for hours?
**Answer**:
"We implemented **Alert Cooldown Throttling** inside `ruleRunner.js` and `nodeFactories.js`. Every Action Trigger node has a configurable `cooldownSeconds` setting (default: 10s). When a threshold is first breached, an alert event is dispatched and recorded in MongoDB immediately. If subsequent readings arrive every millisecond while still in breach, the Rule Runner checks `now - lastTriggered < cooldownMs` and silently suppresses the duplicate notifications. Once the cooldown window passes, if the anomaly persists, a single follow-up alert is permitted."

### Q3: How do you prevent users from creating circular dependencies or broken pipelines in the visual canvas?
**Answer**:
"We prevent invalid pipelines at two distinct levels:
1. **Interactive Connection Guard**: In `Canvas.jsx`, `isValidConnection` restricts wire dragging so that Data Sources can only connect to Processors or Actions, and Actions have no outgoing handles.
2. **Server-Side Kahn's Algorithm**: Both during graph saving and dry-run compilation, `graphParser.js` computes in-degrees and executes topological sort. If a cycle is detected, the API rejects the request with HTTP 400 and names the cycle nodes.
3. **Live Problems Panel**: On the canvas, any disconnected orphan node or missing configuration field (e.g., blank threshold value) is highlighted with a red glowing ring, an error badge, and listed in the live collapsible Problems drawer."

### Q4: How do you ensure that a misconfigured or crashing rule doesn't crash the entire IoT ingestion pipeline?
**Answer**:
"We maintain strict fault isolation:
- In `ingest.controller.js`, pushing into the singleton `telemetryBus.next(reading)` is wrapped in an isolated error boundary. Telemetry persistence to MongoDB is completely decoupled from event processing.
- In `ruleRunner.js`, each compiled pipeline operates as an independent RxJS subscription. If an operator throws an error, RxJS error handling isolates the fault to that specific pipeline without terminating `telemetryBus` or affecting neighboring rules."

### Q5: How did you prove that complex React Flow graphs can be serialized and restored without losing configuration?
**Answer**:
"We created a formal **Draft-07 JSON Schema** (`docs/graph.schema.json`) and a dedicated 7-test Vitest test suite (`frontend/src/utils/serializeGraph.test.js`). The test suite validates a complex **15-node, 13-edge industrial DAG** spanning 5 parallel branches (temperature moving averages, vibration peak detection, sub-zero alarms). The test confirms that round-trip serialization (`JSON.parse(JSON.stringify(serialized))`) preserves 100% of node coordinates, types, edge source/target handles, and nested operational parameters."

### Q6: What security hardening was added to prepare for production deployment?
**Answer**:
"In Day 3, we hardened the backend by:
- Adding **Helmet** for secure HTTP headers (CSP, HSTS, X-Content-Type-Options).
- Adding targeted **rate limiting**: strict limits on `/api/auth/*` (30 attempts / 15m) to prevent brute-force attacks, while keeping `/api/ingest` configurable via `INGEST_RATE_LIMIT` so high-speed load tests are never throttled.
- Enforcing **request size limits** (`10MB`) to protect against buffer overflow/DoS attacks.
- Standardizing JSON errors to `{ error, details }`.
- Implementing structured **Request ID tracing** (`X-Request-Id` UUID header and latency logging).
- Providing **graceful shutdown** on `SIGINT`/`SIGTERM` that stops all running rules, closes WebSockets, HTTP listeners, and the MongoDB connection cleanly."

---

## 4. Pre-Presentation Verification Checklist

- [x] Backend dependencies installed (`npm install` in `/backend`)
- [x] Frontend dependencies installed (`npm install` in `/frontend`)
- [x] Run seeder script: `node backend/scripts/seedDemo.js`
- [x] Run unit tests: `cd backend; npm run test:compiler; npm run test:runner; npm run test:hardening`
- [x] Run frontend tests: `cd frontend; npm test`
- [x] Run frontend build: `cd frontend; npm run build`
- [x] Verify no `.env` or temporary files are staged for commit
