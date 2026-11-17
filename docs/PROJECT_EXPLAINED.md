# NexusFlow: Complete Project Guide & Engineering Manual

> **Welcome to NexusFlow!**  
> If you are a college intern or new engineer joining the team, this guide will walk you through the *what*, *why*, and *how* behind NexusFlow. We avoid unnecessary jargon, explain real-world industry context with relatable analogies, trace data step-by-step from raw silicon hardware to modern browser canvases, and prepare you for any presentation or code review.

---

## Table of Contents
1. [What is NexusFlow? The Plain-English Explanation](#1-what-is-nexusflow-the-plain-english-explanation)
2. [High-Level Architecture Overview](#2-high-level-architecture-overview)
3. [Folder & File Guide](#3-folder--file-guide)
4. [The Journey of a Single Sensor Reading (Step-by-Step Data Flow)](#4-the-journey-of-a-single-sensor-reading)
5. [The Logic Compiler Explained (RxJS, DAGs, and Reactive Streams)](#5-the-logic-compiler-explained)
6. [Milestones Roadmap: Week 1 Through Week 4](#6-milestones-roadmap-week-1-through-week-4)
7. [Glossary of Core Engineering Terms](#7-glossary-of-core-engineering-terms)
8. [10 Critical Presentation Questions & Model Answers](#8-10-critical-presentation-questions--model-answers)

---

## 1. What is NexusFlow? The Plain-English Explanation

### The Factory Problem
Imagine you manage a large power plant or modern manufacturing warehouse. On the factory floor, you have 50 heavy industrial gas turbines, hundreds of water pumps, and dozens of air compressors. Each machine produces thousands of readings every second: **temperature**, **vibration**, **oil pressure**, and **electrical current**.

Whenever a turbine begins to overheat beyond $85^\circ\text{C}$, disaster is imminent unless someone shuts off the valve or turns on auxiliary cooling within seconds. 

Traditionally, companies face a frustrating bottleneck:
1. Every time a mechanical engineer wants a new alarm (e.g., *"If turbine 3 vibrates more than 15 mm/s for 5 consecutive readings, send an emergency SMS to Elena and open the relief valve"*), they have to file a ticket with a software engineering team.
2. Software developers must write backend code, test it, deploy it, and restart servers.
3. If the threshold needs to change from $85^\circ\text{C}$ to $90^\circ\text{C}$ the next day, the entire cycle repeats.

### The NexusFlow Solution
**NexusFlow** eliminates this bottleneck by transforming IoT telemetry rules into a **no-code visual drag-and-drop flowchart canvas**. 

Operations engineers can simply:
- Drag a **Turbine Sensor** node onto a web canvas.
- Connect a wire to a **Moving Average** or **Threshold Filter** node.
- Connect a wire to an **SMS Alert** or **REST Webhook** action node.
- Click **Save** and **Compile**.

Under the hood, NexusFlow takes that visual visual graph (a Directed Acyclic Graph, or DAG) and **compiles it into executable reactive event streams** using RxJS in Node.js. When real sensor readings arrive at thousands of writes per second, they are ingested into MongoDB Time-Series collections, simultaneously broadcast over an internal reactive event bus, evaluated against the compiled rule pipelines, and trigger alerts in real time.

---

## 2. High-Level Architecture Overview

The following diagram illustrates how telemetry moves from edge IoT devices to MongoDB, through the Logic Compiler, and into real-time actions and frontend visualizations:

```
+-----------------------------------------------------------------------------------------+
|                                    EDGE IOT HARDWARE                                    |
|   [Turbine 01 Temp]       [Compressor 02 Vibration]         [Pump 03 Flow Rate]          |
|    (mockSensor.js)          (Industrial Hardware)           (Field Telemetry)           |
+-----------------------------------------------------------------------------------------+
                                           |
                                  HTTP POST /api/ingest
                                  HTTP POST /api/ingest/batch (up to 10k/req)
                                           v
+-----------------------------------------------------------------------------------------+
|                                  EXPRESS.JS BACKEND                                     |
|                                                                                         |
|  1. Ingestion Controller (/api/ingest)                                                  |
|     - Validates payload { deviceId, sensorType, value, timestamp }                     |
|     - Optional API-Key verification (x-api-key)                                         |
|                                                                                         |
|       +------------------------------------+------------------------------------+       |
|       |                                    |                                    |       |
|       v                                    v                                    v       |
|  [MongoDB Atlas]                  [RxJS telemetryBus]                  [WebSocket Server]  |
|  Native Time-Series              Singleton Subject                    Real-time push to |
|  - timeField: timestamp           next(reading)                        browser canvas   |
|  - metaField: metadata                                                                  |
|  - granularity: seconds                            |                                    |
|  - 7.05 bytes/doc (~94% compression)               |                                    |
+----------------------------------------------------|------------------------------------+
                                                     |
                                                     v
+-----------------------------------------------------------------------------------------+
|                                 LOGIC COMPILER ENGINE                                   |
|                                                                                         |
|  React Flow JSON Graph (from /api/graphs)                                               |
|       |                                                                                 |
|       v                                                                                 |
|  1. graphParser.js: Validates DAG, detects cycles, Kahn's topological sort              |
|  2. nodeFactories.js: Produces RxJS operators (filter, scan, map, share)                |
|  3. compileGraph.js: Assembles multi-branch streams from telemetryBus                   |
|                                                                                         |
|                                     [telemetryBus]                                      |
|                                            |                                            |
|                                            v                                            |
|                          filter(deviceId === 'turbine-01')                              |
|                                            |                                            |
|                                            v                                            |
|                        scan() / movingAverage(windowSize: 5)                            |
|                                            |                                            |
|                                            v                                            |
|                            filter(temperature > 85.0 °C)                                |
|                                            |                                            |
|                         +------------------+------------------+                         |
|                         |                                     |                         |
|                         v                                     v                         |
|             [Action: SMS Emergency Alert]             [Action: REST Webhook]            |
+-----------------------------------------------------------------------------------------+
                                           ^
                                           | Save & Compile API
                                           |
+-----------------------------------------------------------------------------------------+
|                                REACT + VITE FRONTEND                                    |
|                                                                                         |
|   Landing Page ("/")  •  Auth Pages ("/login", "/register")  •  Protected Dashboard     |
|                                                                                         |
|   Canvas.jsx:                                                                           |
|   - React Flow visual DAG builder with zoom, minimap, pan, and custom handles          |
|   - Node Library Palette (Data Sources, Math Operations, Action Triggers)               |
|   - Graph Toolbar: Save to Server, Load Graph Dropdown, Export JSON, Compile Check      |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Folder & File Guide

### Backend (`/backend`)
| File / Directory | Purpose & Responsibility |
| :--- | :--- |
| `server.js` | Main entry point. Connects to MongoDB, starts HTTP server and WebSocket server on port 5000. |
| `src/app.js` | Express app configuration, CORS setup, JSON parsers, root API discovery index, and route mounts. |
| `src/config/db.js` | MongoDB Mongoose connection manager with replica set clustering and time-series startup verification. |
| `src/models/Telemetry.js` | Native MongoDB Time-Series collection schema (`timeField: "timestamp"`, `metaField: "metadata"`, `granularity: "seconds"`). |
| `src/models/User.js` | User authentication model with bcrypt password hashing and unique lowercase emails. |
| `src/models/RuleGraph.js` | Mongoose schema storing user-created React Flow graphs (`owner`, `name`, `graph: { nodes, edges }`, `status`). |
| `src/middleware/auth.js` | JWT authentication middleware validating `Authorization: Bearer <token>` and attaching `req.user`. |
| `src/middleware/apiKeyAuth.js` | Optional hardware API-key gate for industrial telemetry gateways via `x-api-key`. |
| `src/controllers/auth.controller.js` | Handlers for `/api/auth/register`, `/api/auth/login`, and `/api/auth/me`. |
| `src/controllers/ingest.controller.js` | High-speed ingestion logic (`/api/ingest`, `/api/ingest/batch`), aggregation stats, and piping into `telemetryBus`. |
| `src/controllers/graph.controller.js` | Protected CRUD operations for user rule graphs and dry-run compilation endpoints. |
| `src/compiler/telemetryBus.js` | Singleton RxJS `Subject` that acts as the central event highway for streaming sensor data. |
| `src/compiler/graphParser.js` | Graph validator and topological sorter. Enforces DAG rules, catches orphan nodes, and rejects cycles. |
| `src/compiler/nodeFactories.js` | Factory functions turning React Flow node configs into RxJS pipeable operators (filter, scan, map). |
| `src/compiler/compileGraph.js` | Core logic compiler. Wires topologically sorted nodes into executable multi-branch RxJS pipelines. |
| `tests/compiler.test.js` | Unit tests covering valid compilation, cycle detection, orphan rejection, thresholds, moving averages, and branching. |
| `scripts/loadTest.js` | High-concurrency batch load tester demonstrating write throughput (10,000–18,000 writes/sec). |
| `scripts/mockSensor.js` | Hardware simulator generating realistic turbine sine-wave temperatures, vibration spikes, and pressure drift. |
| `scripts/storageStats.js` | Database inspection utility printing collection compression, document count, and average bytes per doc. |
| `scripts/testWeek2Compiler.js` | Integration test suite verifying end-to-end graph saving, cycle rejection, compilation, and deletion. |

### Frontend (`/frontend`)
| File / Directory | Purpose & Responsibility |
| :--- | :--- |
| `src/main.jsx` | React DOM root mounting `App.jsx` with strict mode. |
| `src/App.jsx` | Application router configuring public landing/auth routes and protected dashboard routes. |
| `src/api/client.js` | Axios HTTP client configured with baseURL and an automatic JWT `Bearer` token request interceptor. |
| `src/api/graphs.js` | Graph persistence API client methods (fetch, create, update, delete, compile). |
| `src/context/AuthContext.jsx` | React context providing global auth state (`user`, `token`, `login`, `register`, `logout`) with localStorage persistence. |
| `src/components/Canvas.jsx` | The interactive React Flow canvas with custom nodes, edge routing, drag-and-drop, graph persistence, and compile checks. |
| `src/components/Sidebar.jsx` | Categorized node palette drawer allowing users to drag Data Sources, Math Operations, and Action Triggers. |
| `src/components/nodes/nodeRegistry.js` | Central node registry mapping React Flow types to UI components and storing metadata & presets. |
| `src/components/nodes/DataSourceNode.jsx` | Custom React Flow UI node for configuring device IDs, sensor metrics, and telemetry streams. |
| `src/components/nodes/MathOperationNode.jsx` | Custom React Flow UI node for configuring thresholds, moving average windows, sums, mins, and maxes. |
| `src/components/nodes/ActionTriggerNode.jsx` | Custom React Flow UI node for configuring SMS emergency alerts and REST webhooks. |
| `src/utils/serializeGraph.js` | Client-side validation and serialization utility converting React Flow canvas states into JSON. |
| `src/pages/Landing.jsx` | Cyberpunk/industrial marketing landing page explaining NexusFlow features and architecture. |
| `src/pages/Dashboard.jsx` | Main application view hosting the Sidebar, Canvas, and live Telemetry stream inspector. |

---

## 4. The Journey of a Single Sensor Reading

Let's trace what happens to a single temperature measurement from the moment it is recorded to the moment an alarm fires:

```
[1. Hardware/Mock]   mockSensor.js generates { deviceId: "turbine-01", sensorType: "temperature", value: 89.4, unit: "°C" }
        |
        v
[2. HTTP Transport]  Sent via POST /api/ingest with JSON payload
        |
        v
[3. Ingestion Layer] ingestSingle() normalizes payload, validates deviceId, sensorType, and numeric value
        |
        +---> [4a. Database Persistence] Saved into native MongoDB Time-Series collection (telemetries)
        |                                Compressed into columnar buckets (~7.05 bytes/doc)
        |
        +---> [4b. WebSocket Broadcast] Emitted via WebSocket server to live UI clients
        |
        +---> [4c. Reactive Event Bus] Piped into singleton RxJS telemetryBus.next(savedDoc)
                    |
                    v
[5. Logic Compiler] Compiled RxJS Pipeline receives the reading from telemetryBus:
                    - Step A (Data Source): Filter checks if reading matches deviceId="turbine-01" AND sensorType="temperature" -> MATCH (Emits)
                    - Step B (Moving Average): Sliding window of 5 computes average: (82.1 + 84.0 + 85.5 + 88.0 + 89.4)/5 = 85.8°C -> (Emits)
                    - Step C (Threshold Filter): Filter checks if 85.8 > 80.0 -> TRUE (Emits)
                    - Step D (Action Sink): Action operator triggers stub:
                            "[ACTION TRIGGERED] Rule: Turbine Sentinel | Action: SMS_ALERT | Target: +1 (555) 019-2834"
```

---

## 5. The Logic Compiler Explained

### What is RxJS and Why Do We Use It?
In web applications, developers frequently deal with single HTTP request-response cycles. But in IoT, hardware telemetry is **continuous data over time**. A single turbine emits readings every 100 milliseconds; 50 turbines emit 500 readings per second.

**RxJS (Reactive Extensions for JavaScript)** is a library for composing asynchronous and event-based programs using **Observables**. Think of RxJS as *"Lodash for events over time"*:
- An **Observable** is an invokable collection of future values or events (like a conveyor belt).
- A **Subject** is a special type of Observable that allows values to be multicasted to many Observers (like a radio tower broadcasting to multiple radios).
- **Operators** (like `filter`, `map`, `scan`, `bufferCount`) are pure functions that transform data moving along the conveyor belt without mutating original data.

### Why Compile React Flow DAGs into RxJS?
React Flow represents a rule graph in memory as a JSON object of **nodes** and **edges**:
```json
{
  "nodes": [
    { "id": "src-1", "type": "dataSource", "data": { "deviceId": "turbine-01", "sensorType": "temperature" } },
    { "id": "math-1", "type": "mathOperation", "data": { "operation": "threshold", "operator": ">", "thresholdValue": 80 } },
    { "id": "act-1", "type": "actionTrigger", "data": { "actionType": "sms_alert", "target": "+1555..." } }
  ],
  "edges": [
    { "source": "src-1", "target": "math-1" },
    { "math-1", "target": "act-1" }
  ]
}
```

A JSON object cannot execute on its own. The **Logic Compiler** bridges this gap:
1. **DAG Parsing & Cycle Detection (`graphParser.js`)**:
   It converts the edges into an adjacency list and in-degree count map. It runs **Kahn's Algorithm** (topological sort). If a user accidentally creates a loop (e.g. Node A $\rightarrow$ Node B $\rightarrow$ Node A), Kahn's algorithm detects that nodes remain in the queue with non-zero in-degrees and rejects the graph with a clear error: *"Cycle detected in rule graph"*.
2. **Operator Synthesis (`nodeFactories.js`)**:
   Each node type is converted into its mathematical RxJS operator:
   - `threshold` becomes `filter((reading) => reading.value > limit)`.
   - `moving_average` becomes `scan((acc, reading) => rollingAverage(acc, reading.value))`.
   - `sms_alert` becomes `tap((reading) => dispatchAlert(reading))`.
3. **Pipeline Assembly & Branching (`compileGraph.js`)**:
   In a visual graph, a single sensor can branch out to multiple destinations (e.g., Branch 1 triggers an emergency SMS if temperature $> 90^\circ\text{C}$, while Branch 2 logs all readings to a webhook).
   To support branching without recalculating upstream math or re-filtering data, the compiler applies `.pipe(share())` on each node's output stream. This multicasts emissions to all downstream branches independently.

---

## 6. Milestones Roadmap: Week 1 Through Week 4

```
+-----------------------------------------------------------------------------------------------+
|  WEEK 1: TIME-SERIES & CANVAS FOUNDATION [COMPLETED]                                          |
|  - MongoDB native Time-Series collection setup (timeField, metaField, granularity)            |
|  - High-throughput Express ingestion API (/api/ingest, /api/ingest/batch)                     |
|  - Load test benchmarking (achieving 10k-18k writes/sec) and storage audit (7.05 bytes/doc)    |
|  - JWT Authentication, Landing Page, and React Flow Canvas scaffolding                        |
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
|  WEEK 2: LOGIC COMPILER & NODE LIBRARY [CURRENT]                                              |
|  - Node.js Logic Compiler using RxJS (parseGraph, compileGraph, nodeFactories)               |
|  - DAG cycle detection and topological sorting via Kahn's algorithm                          |
|  - RuleGraph persistence model and CRUD API (/api/graphs, /api/graphs/:id/compile)            |
|  - Expanded Node Library (Turbine, Temp, Custom Device, Threshold, MA, Sum, Min, Max, Alerts)|
|  - Canvas Persistence & Compiler UI with inline configuration editing                         |
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
|  WEEK 3: REAL-TIME EXECUTION ENGINE & LIVE PREVIEWS [UPCOMING]                                |
|  - Dynamic Graph Execution Manager: running active user rule graphs in memory                 |
|  - Live edge animations on canvas pulsing when telemetry packets pass through                 |
|  - Canvas node value badges displaying real-time stream values in browser                     |
+-----------------------------------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------------------------------+
|  WEEK 4: ALERT DISPATCHERS & PRODUCTION POLISH [FINAL]                                        |
|  - Real SMS delivery via Twilio API integration                                               |
|  - Real Webhook dispatch with retry backoff and HMAC signatures                               |
|  - End-to-end user evaluation, role-based access control, and deployment documentation        |
+-----------------------------------------------------------------------------------------------+
```

---

## 7. Glossary of Core Engineering Terms

* **DAG (Directed Acyclic Graph)**: A mathematical network of nodes connected by directional edges that contains no closed loops. Telemetry flows in one direction (from input sources to output sinks) without ever looping back on itself.
* **Kahn's Algorithm**: An algorithm that computes a topological ordering of a directed graph in $\mathcal{O}(V + E)$ linear time and detects whether the graph contains any cycles.
* **Topological Sort**: A linear ordering of vertices such that for every directed edge $U \rightarrow V$, vertex $U$ comes before vertex $V$ in the ordering.
* **Time-Series Granularity**: A MongoDB configuration option (`seconds`, `minutes`, `hours`) that specifies the expected frequency of events. Setting granularity to `seconds` causes MongoDB to compress consecutive readings from the same device into columnar disk blocks spanning up to one hour.
* **RxJS Observable**: An asynchronous push-based data producer that can emit multiple values over time to subscribed observers.
* **RxJS Subject**: A hybrid Observable and Observer that allows values to be multicasted to multiple listener streams.
* **RxJS `share()` Operator**: An operator that turns a cold unicast observable into a hot multicasted observable, ensuring that downstream branched pipelines share one single upstream execution.
* **JWT (JSON Web Token)**: A compact, URL-safe means of representing claims between two parties, digitally signed using a secret key (HMAC SHA-256) to authenticate API requests without database session lookups.
* **Adjacency Map**: A data structure mapping each node ID to a list of target node IDs to which it connects.
* **In-Degree**: The number of incoming directed edges pointing into a node. Sources have in-degree 0; intermediate nodes have in-degree $\ge 1$.

---

## 8. 10 Critical Presentation Questions & Model Answers

### Q1: Why did you choose MongoDB Time-Series collections instead of standard MongoDB collections?
**Answer:** Standard document collections store each telemetry reading as an isolated document with full BSON key overhead, indexing every record individually. MongoDB native Time-Series collections group consecutive readings from the same `metaField` (`deviceId`) into compressed columnar storage buckets on disk. In our measured benchmark (`storageStats.js`), this reduced disk footprint from over 120 bytes per document to just **7.05 bytes per document**—a **94.1% reduction in disk storage and memory cache usage**, while dramatically boosting range scan performance.

### Q2: Why compile visual graphs into RxJS streams instead of writing recursive JavaScript `if/else` evaluation loops?
**Answer:** High-frequency IoT telemetry arrives asynchronously at thousands of readings per second. Recursive loops or repeated database polling cause severe CPU bottlenecks and event loop lag. RxJS is purpose-built for reactive stream architectures: operators like `filter`, `scan`, and `bufferCount` process readings in memory as pure mathematical pipeline stages with near-zero allocation overhead, naturally supporting sliding windows, debouncing, and multi-branch execution.

### Q3: How do you prevent users from accidentally creating infinite loops in the canvas?
**Answer:** We enforce acyclicity at two levels:
1. **Frontend Connection Rules**: The React Flow canvas only permits connections going forward from Data Sources $\rightarrow$ Math Processors $\rightarrow$ Action Triggers, blocking self-connections and upstream links.
2. **Server-Side Kahn's Algorithm**: Both the graph persistence API (`POST /api/graphs`) and the compiler (`graphParser.js`) build an in-degree map and run Kahn's topological sort. If any cycle is detected, the API rejects the request with HTTP 400 and lists the exact node IDs involved in the cycle.

### Q4: How does branching work when one sensor feeds multiple alert rules?
**Answer:** In `compileGraph.js`, each node's output Observable is augmented with `.pipe(share())`. This converts the stream into a hot multicasted observable. When multiple downstream nodes (such as an emergency SMS alert and a rolling average logger) connect to the same upstream node, both receive the exact same telemetry emission simultaneously without duplicating upstream calculations.

### Q5: What happens if an IoT device sends an invalid or non-numeric sensor reading?
**Answer:** Our ingestion controllers (`ingestSingle` and `ingestBatch`) enforce strict normalization: `deviceId`, `sensorType`, and a valid numeric `value` are required. Malformed payloads are rejected immediately with HTTP 400. In batch ingestion (`insertMany({ ordered: false })`), valid readings are safely inserted while invalid items are quarantined and returned in the response with line-item error details.

### Q6: How do you ensure high throughput during heavy load spikes?
**Answer:** We engineered batch ingestion supporting up to 10,000 readings per request using MongoDB's un-ordered bulk write API (`insertMany({ ordered: false })`). Our load test script (`loadTest.js`) confirmed sustained throughput between **10,000 and 18,000 writes per second** with sub-50ms latencies, well exceeding industrial requirements.

### Q7: Why are rule graphs saved in a `draft` status instead of automatically executing immediately?
**Answer:** Industrial automation requires verification before activation. In Week 2, we introduced the Dry-Run Compiler (`POST /api/graphs/:id/compile`). Engineers can save graphs in `draft` mode, click **Compile Check** to verify topological validity, and inspect metadata. In Week 3, the Execution Manager will promote validated graphs to `active` status to participate in the live execution loop.

### Q8: How does authentication protect sensor telemetry and rule logic?
**Answer:** We implemented stateless JWT authentication (`auth.middleware.js`). All telemetry query endpoints (`GET /api/telemetry`, `/api/telemetry/stats`) and graph persistence routes (`/api/graphs`) require a valid Bearer token. Furthermore, graph CRUD operations are strictly scoped to `req.user._id`, ensuring users cannot inspect or modify rule pipelines belonging to other organizations or accounts.

### Q9: Can NexusFlow handle sliding windows like 5-minute rolling averages?
**Answer:** Yes. Our `nodeFactories.js` implements `moving_average` using RxJS's `scan` operator with a sliding window buffer. As each new telemetry reading arrives, the window shifts, recalculates the rolling mean, and passes the smoothed metric downstream to threshold filters.

### Q10: What are the deliverables for Week 3 and Week 4?
**Answer:** 
- In **Week 3**, we will launch the **Dynamic Execution Manager** that keeps active pipelines running in-memory against live ingestion and adds live animated edge pulses and canvas badge previews over WebSockets.
- In **Week 4**, we will replace the stub action operators with production-ready alert dispatchers (real Twilio SMS delivery and authenticated REST Webhooks) and conduct final end-to-end stress testing.
