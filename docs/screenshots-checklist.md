# NexusFlow: Final Project Review Screenshots Checklist

> **Purpose**: A checklist of visual proof and system screenshots to capture and include in the Final Project Review evaluation presentation.  
> **Official Submission Package**: [`docs/FINAL_REPORT.md`](file:///c:/NexusFlow/docs/FINAL_REPORT.md)  
> **Evaluation Date**: 27 November 2026  

---

## Required Presentation Screenshots

| # | Screenshot Target | Where to Capture | Description & Visual Evidence to Show | Checkbox |
| :-: | :--- | :--- | :--- | :-: |
| **01** | **Landing Page** | `http://localhost:3000/` | Full landing page showing hero headline ("Build IoT Telemetry Rules Visually With Zero Code"), MERN tech badges, 4 core feature cards, and 3-step workflow diagram. | [ ] |
| **02** | **Register Page** | `http://localhost:3000/register` | Engineer registration card with clean inputs, validation error indicators, and direct navigation link to Sign In. | [ ] |
| **03** | **Login Page** | `http://localhost:3000/login` | Sign-in interface with pre-filled or demo credentials, password visibility toggle, and secure JWT authentication. | [ ] |
| **04** | **Dashboard & Blank Canvas** | `http://localhost:3000/dashboard` | Main interactive workspace: sidebar node palette (Data Sources, Math Operations, Action Triggers), empty React Flow canvas, MiniMap, Controls, and top action toolbar. | [ ] |
| **05** | **Template Loaded (Turbine Sentinel)** | Canvas with Template | `⚡ Turbine Overheat Sentinel` template loaded onto canvas: 4 connected nodes with animated cyan wires and topological left-to-right auto-layout. | [ ] |
| **06** | **Topological Compile Success** | Compile Modal on Canvas | Click **Compile Check**: modal showing dry-run compilation success, topological order `[src-temp-1 -> math-ma-1 -> math-thresh-1 -> act-sms-1]`, and hot multicasting status. | [ ] |
| **07** | **Compile Error & Cycle Detection** | Canvas / Problems Panel | Disconnect wire or construct circular loop: red glowing border on violating node, error badge callout, and amber Problems Panel showing exact node IDs. | [ ] |
| **08** | **Active Rule Status** | Canvas Top Toolbar | Click **Activate**: toolbar badge transitioning from slate `DRAFT` to pulsing green `ACTIVE`, demonstrating live subscription to the backend `telemetryBus`. | [ ] |
| **09** | **Triggered Alerts Panel** | Dashboard Right Drawer | Click **Triggered Alerts**: drawer displaying live `AlertEvent` cards with timestamps, target recipients (`+1 (555) 019-2834`), breach values, and cooldown indicators. | [ ] |
| **10** | **Serialized Graph JSON** | JSON Modal / Raw Export | Click **JSON** in toolbar: previewing formal Draft-07 JSON Schema export with node coordinates, version `1.0.0`, and typed operational parameters. | [ ] |
| **11** | **High-Throughput Load Test** | Terminal Execution | Terminal output of `node scripts/loadTest.js` demonstrating **7,605 writes/sec sustained over WAN** (peak bursts **21,000 - 22,570 writes/sec**), 0 failures across 114,000+ documents, and `p50` (408ms)/`p95` (1,772ms) latencies. | [ ] |
| **12** | **Time-Series Storage Audit** | Terminal Execution | Terminal output of `npm run storage:stats` showing **1,034,360 records**, **6.89 bytes/record on disk**, and **~94.3% storage reduction** on MongoDB Atlas. | [ ] |
| **13** | **Live Wire Glow on Canvas** | Active Canvas with Telemetry | Real-time animated cyan glowing wires with moving dash particles connecting Data Source to Math and Action nodes while mock telemetry streams. | [ ] |
| **14** | **Outbound Deliveries Drawer** | Dashboard Right Drawer | Click **Deliveries**: drawer displaying execution logs, status filter chips, retry counts, HTTP response codes, and payload inspector. | [ ] |
| **15** | **SSRF Firewall Defense** | Deliveries Diagnostic Form | Attempting dispatch to `http://127.0.0.1:27017` in the test form: instant rejection badge showing `SSRF Blocked: Hostname points to internal host`. | [ ] |

---

## Step-by-Step Capture Guide

1. **Start System**:
   ```powershell
   cd backend; npm run dev
   cd frontend; npm run dev
   ```
2. **Seed Demo Graphs**:
   ```powershell
   cd backend; node scripts/seedDemo.js
   ```
3. **Capture UI Screens** (01 - 10) in browser at `1920x1080` or laptop resolution using native screenshot tool (`Win + Shift + S`).
4. **Capture Terminal Screens** (11 - 12):
   - Terminal 1: `cd backend; node scripts/loadTest.js --duration=10 --warmup=2 --batch-size=1000 --concurrency=4`
   - Terminal 2: `cd backend; npm run storage:stats`
5. **Organize**: Save images to `docs/screenshots/` (or evaluation presentation slides).
