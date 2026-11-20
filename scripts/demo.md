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
   node scripts/loadTest.js --duration=10 --warmup=2 --batch-size=1000 --concurrency=4
   ```
2. **Review Terminal Output**:
   ```text
   ================================================================
                      LOAD TEST RESULTS REPORT
   ================================================================
    Total Telemetry Sent:    228,000 documents
    Total Batches Sent:      228 successful (0 failed)
    Actual Duration:         10.10 seconds
    Achieved Throughput:     22,570 writes/sec
    Average Batch Latency:   173 ms
    50th Percentile (p50):   152 ms
    95th Percentile (p95):   340 ms
   ----------------------------------------------------------------
    STATUS: PASS (Exceeded target 5,000 writes/sec requirement)
   ================================================================
   ```
   - Point out:
     - Warm-up phase completed smoothly.
     - 0 failures across hundreds of thousands of records.
     - Median batch latency (**p50: 152 ms**) and 95th percentile latency (**p95: 340 ms**).
     - Achieved **22,570 writes/sec**, comfortably exceeding the 5,000 writes/sec target.

---

### Step 8: Time-Series Storage Footprint Audit & Conclusion (7:30 - 8:30)
1. **Inspect Columnar Time-Series Buckets**:
   ```powershell
   cd backend
   npm run storage:stats
   ```
2. **Review Output**:
   ```text
   ================================================================
          NexusFlow Time-Series Storage Audit & Efficiency
   ================================================================
    Total Telemetry Records:     555,353 documents
    Underlying Storage Buckets:  662 buckets
    Storage Size (On Disk):      2.875 MB
    Index Size:                  0.520 MB
   ----------------------------------------------------------------
    Avg On-Disk Bytes / Record:  5.43 bytes
    Conventional MongoDB Size:   ~63.56 MB (at ~120 bytes/doc)
    Storage Space Reduction:     ~95.5% savings via native bucket compression
   ================================================================
   ```
3. **Conclude with Key Metric**:
   - **555,000+ real records** stored in **5.43 bytes per document** on disk.
   - Conventional MongoDB requires ~120 bytes/doc (~63 MB). NexusFlow's columnar compression achieves a **95.5% storage reduction**.

---

### Step 9: Automated End-to-End Smoke Test (8:30 - 9:30)
1. **Run Automated Smoke Script**:
   ```powershell
   cd backend
   npm run smoke
   ```
2. **Show Evaluators the Instant 11-Step Verification**:
   - Health check, demo auth, DAG creation, dry-run compile, dynamic activation, non-matching rejection, matching breach alert, dynamic deactivation, suppression verification, and cleanup.
   - All 11 steps execute and print `[PASS]`.

---

## "If Something Fails" Fallback & Troubleshooting Matrix

| Issue Encountered During Demo | Root Cause | Immediate Fallback Action |
| :--- | :--- | :--- |
| **Port 5000 Already In Use** | A background node process from earlier was not stopped. | Run `netstat -ano \| findstr :5000` to find the PID, then `taskkill /F /PID <PID>`, or change `PORT=5001` in `.env` and `VITE_API_URL=http://localhost:5001`. |
| **MongoDB Connection Timeout** | Wi-Fi dropped or Atlas IP whitelist expired. | Verify Internet connection. In MongoDB Atlas Network Access, ensure current IP or `0.0.0.0/0` is allowed. The server will reconnect automatically. |
| **Login Session Expired / 401** | JWT expired or storage cleared. | Click Login, re-authenticate with `demo@nexusflow.io` / `DemoUser2026!`. Token auto-refreshes for 7 days. |
| **Canvas Nodes Messy or Off-Screen** | Dragging moved nodes outside visible viewport. | Click the **Fit View** icon in the React Flow controls or toolbar, then click **Auto-Layout** to instantly restore clean hierarchy. |
| **No Alerts Appearing in Drawer** | The active rule is in `DRAFT` status or sensor readings are below threshold. | Check the status badge on the canvas: ensure it is green (`ACTIVE`). In `mockSensor.js`, manually send a breach reading via curl or invoke `npm run smoke`. |
| **Accidental Node Deletion** | Evaluator or presenter pressed Delete on a needed node. | Press `Ctrl+Z` (Undo). The entire canvas state, node positions, and connections are restored from history stack. |
| **Evaluator Asks to Reset to Clean Slate** | Need a clean demo slate. | Run `cd backend; node scripts/seedDemo.js`. It idempotently cleans previous demo graphs and re-provisions default templates. |

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
| **Run E2E Smoke Test** | `cd backend; npm run smoke` |
| **Run Code Quality Linting** | `cd backend; npm run lint` (and `cd frontend; npm run lint`) |
| **Auto-Format Code (Prettier)** | `cd backend; npm run format` (and `cd frontend; npm run format`) |
| **Re-seed Demo Data** | `cd backend; node scripts/seedDemo.js` |
