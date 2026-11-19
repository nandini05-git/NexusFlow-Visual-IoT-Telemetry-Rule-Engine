# NexusFlow: 8-Minute Mid-Project Review Demo Script

> **Purpose**: A concise, step-by-step presentation script designed for the Infotact Solutions Mid-Project Review. Demonstrates end-to-end telemetry ingestion, visual rule modeling, RxJS stream execution, alert cooldowns, and performance benchmarks.

---

## Demo Overview & Timeline (8 Minutes Total)

| Minute | Phase | Core Action | Key Takeaway for Evaluators |
| :---: | :--- | :--- | :--- |
| **0:00 - 1:00** | **1. Setup & Auth** | Seed demo data, start servers, log in | Clean JWT authentication & idempotent demo state |
| **1:00 - 2:30** | **2. Canvas & DAG UX** | Load Template 1, test Undo/Redo & Auto-Layout | Visual flowchart builder with topological validation |
| **2:30 - 3:30** | **3. Live Validation** | Break link & show Problems panel + red highlights | Real-time DAG acyclicity & orphan detection |
| **3:30 - 4:30** | **4. Compile & Activate** | Compile Check modal, click Activate | Dynamic RxJS compilation & in-memory subscription |
| **4:30 - 5:30** | **5. Live Ingestion & Alerts** | Run `mockSensor.js`, show live alerts drawer | Cooldown suppression throttles alert storms |
| **5:30 - 6:30** | **6. Serialization Proof** | Inspect JSON & show 15-node DAG schema compliance | Portable, declarative DAG architecture |
| **6:30 - 7:30** | **7. Load Test Benchmark** | Run `loadTest.js` with warmup and p50/p95 latency | Honest, sustained throughput & sub-second latency |
| **7:30 - 8:00** | **8. Storage Audit & Q&A** | Run `storageStats.js` and conclude | 7.39 bytes/doc (93.8% space reduction on Atlas) |

---

## Step-by-Step Execution Guide

### Step 1: Initialize Demo Data & Start Services (0:00 - 1:00)
1. **Seed Demo Environment**:
   ```powershell
   cd backend
   node scripts/seedDemo.js
   ```
   *Point out*: "Notice that our database seeder is completely idempotent. It created a pre-configured demo account (`demo@nexusflow.io` / `DemoUser2026!`) and seeded three production-grade rule templates into MongoDB Atlas."

2. **Start Backend & Frontend** (in two terminals):
   - Terminal 1: `cd backend; npm run dev` (Port 5000)
   - Terminal 2: `cd frontend; npm run dev` (Port 3000)

3. **Log In to Web Dashboard**:
   - Navigate to `http://localhost:3000/login`.
   - Log in with `demo@nexusflow.io` / `DemoUser2026!`.
   - Highlight: Protected route redirects seamlessly to the IoT Canvas Dashboard.

---

### Step 2: Visual Canvas & Usability Features (1:00 - 2:30)
1. **Load Pre-Built Template**:
   - In the Canvas top toolbar, open the **Templates** dropdown and select `⚡ Turbine Overheat Sentinel`.
   - The canvas populates with 4 nodes: `Turbine-01 (Temp)` $\rightarrow$ `Rolling Average (5s)` $\rightarrow$ `Critical Heat Filter (>85°C)` $\rightarrow$ `Emergency Cooling SMS`.
2. **Demonstrate Usability Tools**:
   - **Duplicate Node**: Click on the Threshold node and press `Ctrl+D` (or click **Duplicate**). A cloned node appears offset by 40px.
   - **Undo**: Click the **Undo** button in the toolbar (or press `Ctrl+Z`). The duplicated node disappears.
   - **Redo**: Click **Redo** (or press `Ctrl+Y`). The node reappears. Press `Delete` to remove it.
   - **Auto-Layout**: Drag nodes into messy positions. Click **Auto-Layout**. The canvas cleanly organizes the nodes in topological layers from left to right.
   - **Fit View**: Click **Fit View** to smoothly center the DAG in the viewport.
   - **Shortcuts Modal**: Click **Shortcuts** (`?`) to show the evaluator the built-in keyboard cheat sheet.

---

### Step 3: Live "Problems" Panel & Error Highlighting (2:30 - 3:30)
1. **Simulate a Broken Graph**:
   - Click the connecting wire between the Threshold node and SMS Alert node, then press `Delete`.
   - **Observe**:
     - The Threshold node output is now disconnected (orphan).
     - The SMS Alert node has no incoming source.
     - Look at the bottom footer: the **Problems Panel** automatically turns amber: `Problems (2)`.
     - Expand the Problems drawer: it displays:
       - `[Math Processor 'Critical Heat Filter'] output is disconnected.`
       - `[Action Trigger 'Emergency Cooling SMS'] has no incoming rule trigger connected.`
2. **Fix the Connection**:
   - Drag a wire from the Threshold output handle to the SMS Alert input handle.
   - **Observe**: The Problems drawer instantaneously turns green: `0 Problems - DAG topology verified & ready for execution`.

---

### Step 4: Logic Compilation & Rule Activation (3:30 - 4:30)
1. **Dry-Run Compile Check**:
   - Click the **Compile Check** button in the toolbar.
   - The compilation modal pops up displaying the topological assembly:
     - `Topological Order: [src-temp-1 -> math-ma-1 -> math-thresh-1 -> act-sms-1]`
     - RxJS pipelines configured with `.pipe(share())`.
2. **Activate Rule**:
   - Click **Save to Server** (or `Ctrl+S`).
   - Click **Activate**.
   - Notice the status badge switches from `DRAFT` (slate) to `ACTIVE` (pulsing green).
   - *Explain*: "The graph is now subscribed to `telemetryBus` in Node.js memory. Any incoming telemetry matching `turbine-01` temperature will be evaluated through this live pipeline."

---

### Step 5: Live Hardware Telemetry & Alert Cooldown (4:30 - 5:30)
1. **Open Triggered Alerts Drawer**:
   - Click the **Triggered Alerts** button in the dashboard navigation bar. A drawer opens on the right, actively polling `/api/alerts` every 5 seconds.
2. **Start Simulated Hardware Generator**:
   - Open a third terminal:
     ```powershell
     cd backend
     npm run mock
     ```
   - Simulated sensor begins emitting turbine temperatures (fluctuating between 70°C and 94°C).
3. **Observe Alert Throttling**:
   - When temperature spikes past 85°C, an alert immediately appears in the drawer:
     `CRITICAL: Turbine-01 temperature 88.4°C exceeds 85°C limit!`
   - Point out: Even though the sensor continues emitting readings above 85°C every 1,000ms, our **10-second cooldown suppression** prevents alert spam, protecting emergency notification channels from flooding.

---

### Step 6: Graph Serialization & Schema Proof (5:30 - 6:30)
1. **Inspect Serialized JSON**:
   - Click **JSON** in the toolbar.
   - Show the clean JSON schema: version, metadata, coordinates, and typed node configurations.
2. **Load Complex 15-Node DAG**:
   - In the Templates dropdown, select `⚡ Complex 15-Node Industrial Monitoring DAG`.
   - Click **Auto-Layout** and **Fit View**.
   - *Explain*: "This 15-node, 13-edge graph has 5 independent branches (temperature, vibration, acoustic peak tracking). It is validated by our 7-test Vitest suite against Draft-07 JSON Schema."

---

### Step 7: High-Throughput Ingestion Load Test (6:30 - 7:30)
1. **Execute High-Speed Batch Load Test**:
   ```powershell
   cd backend
   node scripts/loadTest.js --duration=5 --warmup=2 --batch-size=500 --concurrency=6
   ```
2. **Review Terminal Output**:
   - Point out:
     - Warm-up phase completed.
     - 0 failures across thousands of records.
     - Median batch latency (**p50**) and 95th percentile latency (**p95**).
     - WAN cloud throughput sustained at **1,500 – 2,800 writes/sec** to MongoDB Atlas cloud.

---

### Step 8: Time-Series Storage Footprint Audit & Conclusion (7:30 - 8:00)
1. **Inspect Columnar Time-Series Buckets**:
   ```powershell
   cd backend
   npm run storage:stats
   ```
2. **Conclude with Key Metric**:
   - **300,000+ real records** stored in **7.39 bytes per document** on disk.
   - Conventional MongoDB requires ~120 bytes/doc (~36 MB). NexusFlow's columnar compression achieves a **93.8% storage reduction**.

---

## Quick Reference Commands

| Action | Command |
| :--- | :--- |
| **Run All Backend Tests** | `cd backend; npm test` |
| **Run Logic Compiler Unit Tests** | `cd backend; npm run test:compiler` |
| **Run Rule Runner Unit Tests** | `cd backend; npm run test:runner` |
| **Run Security Hardening Tests** | `cd backend; npm run test:hardening` |
| **Run Frontend Vitest Tests** | `cd frontend; npm test` |
| **Build Frontend Production Bundle** | `cd frontend; npm run build` |
| **Re-seed Demo Data** | `cd backend; node scripts/seedDemo.js` |
