# NexusFlow: Technical Backlog & Feature Roadmap

> **Document**: Technical Backlog & Enhancement Tracking  
> **Project**: NexusFlow — Visual IoT Telemetry & Rule Engine  
> **Maintained By**: Nandini V  
> **Milestone Base**: Post-Mid-Project Review (`week2-mid-review`)

---

## 1. Overview & Sizing Legend

This backlog captures planned improvements, technical enhancements, and deferred capabilities across upcoming project weeks and future post-MVP milestones.

- **S (Small)**: Under 2 hours of focused work; minimal architectural changes.
- **M (Medium)**: 2–6 hours of work; requires cross-cutting component updates or new controllers.
- **L (Large)**: 6+ hours of work; requires architectural refactoring, new database indexes, or significant protocol updates.

---

## 2. Priority Backlog Matrix

| ID | Feature / Enhancement Description | Architectural Area | Size | Target Week | Priority | Status |
| :-: | :--- | :--- | :---: | :---: | :---: | :---: |
| **B-01** | **WebSocket Telemetry Stream**<br>Bi-directional real-time telemetry streaming over WebSocket (`ws`) on port 5000 with JWT handshake authentication. | Backend / WebSocket | **M** | Week 3 | High | **Delivered** |
| **B-02** | **In-Memory Live Stream Execution**<br>Route live incoming telemetry directly through active RxJS compiled pipelines in memory via `telemetryBus`. | Compiler / Runtime | **M** | Week 3 | High | **Delivered** |
| **B-03** | **Canvas Edge Wire Glow & Particle Animation**<br>Visual pulsing packets and animated glowing wires (`GlowEdge`) when telemetry traverses DAG nodes. | Frontend / Canvas | **S** | Week 4 | High | **Delivered** |
| **B-04** | **Live Node Value Badges & Pulse Feedback**<br>Dynamic metric badges on canvas nodes rendering latest evaluated values and live operational state. | Frontend / Canvas | **S** | Week 4 | High | **Delivered** |
| **B-05** | **Live Telemetry & Activity Store**<br>Client-side decoupled state store (`graphActivityStore`) managing live edge and node subscriptions. | Frontend / Store | **M** | Week 3 / 4 | High | **Delivered** |
| **B-06** | **Backend Throttled Activity Tracking**<br>Non-blocking activity taps aggregated and flushed at 5 Hz (200 ms) via `activityTracker` to prevent client saturation. | Backend / Service | **S** | Week 4 | High | **Delivered** |
| **B-07** | **Outbound Action Dispatcher (Mock SMS & Logging)**<br>Production-grade action dispatcher with phone normalization, template rendering, and delivery logging. | Backend / Actions | **S** | Week 4 | High | **Delivered** |
| **B-08** | **Authenticated REST Webhook Dispatcher & SSRF Firewall**<br>HTTP webhook dispatcher with exponential backoff retries, SSRF firewall blocking private ranges, and DeliveryLog audit trail. | Backend / Actions | **M** | Week 4 | High | **Delivered** |
| **B-09** | **Physical Actuator Reverse Control Channel**<br>Bi-directional control channel allowing rules to emit reverse hardware actuation commands (e.g., valve shutoff, fan activation). | Backend / IoT | **M** | Post-MVP | Medium | Backlog |
| **B-10** | **Docker & Production Containerization**<br>`Dockerfile` and `docker-compose.yml` defining production build, multi-stage images, and local MongoDB container. | DevOps / Deployment | **S** | Post-MVP | High | Backlog |
| **B-11** | **Cluster Mode / Multi-Worker Ingestion**<br>PM2 or Node cluster mode scaling Express across multi-core processors to exceed 50,000 writes/sec locally. | Infrastructure | **L** | Post-MVP | Low | Backlog |
| **B-12** | **Refresh Token Rotation & Remember Me**<br>Sliding refresh token cookie flow complementing access JWTs for seamless multi-day industrial sessions. | Security / Auth | **S** | Post-MVP | Medium | Backlog |
| **B-13** | **Multi-Tenant Organization RBAC**<br>Organization tenancy allowing team members to share, fork, and manage collaborative rule graphs with role-based permissions. | Backend / Models | **L** | Post-MVP | Low | Backlog |
| **B-14** | **Custom Sensor Unit Conversion Node**<br>Pre-processing canvas node providing mathematical unit conversion (e.g. Celsius $\leftrightarrow$ Fahrenheit, Bar $\leftrightarrow$ PSI). | Frontend / Nodes | **S** | Post-MVP | Low | Backlog |
| **B-15** | **Live Recharts Telemetry Dashboard**<br>Dedicated real-time analytics page with time-series line and area charts for historical and live sensor telemetry. | Frontend / UI | **M** | Post-MVP | Medium | Backlog |

---

## 3. Reviewer Action Item Integration

When action items are logged in [`docs/mid-review-feedback.md`](file:///c:/NexusFlow/docs/mid-review-feedback.md), they will be cross-referenced and triaged into this backlog based on sizing and release milestone.
