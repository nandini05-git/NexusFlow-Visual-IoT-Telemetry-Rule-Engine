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
| **B-01** | **WebSocket Telemetry Stream**<br>Bi-directional real-time telemetry streaming over WebSocket (`ws`) on port 5000 with JWT handshake authentication. | Backend / WebSocket | **M** | Week 3 (Day 1) | High | Planned |
| **B-02** | **In-Memory Live Stream Execution**<br>Route live WebSocket incoming telemetry directly through active RxJS compiled pipelines in memory. | Compiler / Runtime | **M** | Week 3 (Day 2) | High | Planned |
| **B-03** | **Canvas Edge Wire Glow & Particle Animation**<br>Visual pulsing packets and wire highlights on React Flow connection edges when telemetry packets traverse a node. | Frontend / Canvas | **S** | Week 3 (Day 3) | High | Planned |
| **B-04** | **Live Node Value Badges**<br>Compact metric badges on canvas nodes rendering latest evaluated sensor values and rolling averages in real time. | Frontend / Canvas | **S** | Week 3 (Day 3) | High | Planned |
| **B-05** | **Live Recharts Telemetry Dashboard**<br>Interactive real-time line and area charts visualizing incoming sensor metrics with sliding time windows. | Frontend / UI | **M** | Week 3 (Day 4) | High | Planned |
| **B-06** | **UI Stream Throttling & Decimation**<br>Throttle visual chart emissions to 10–20 Hz via RxJS `auditTime`/`sampleTime` to maintain 60 FPS browser rendering under heavy ingest. | Frontend / Performance| **S** | Week 3 (Day 4) | Medium | Planned |
| **B-07** | **Outbound Twilio SMS Dispatcher**<br>Replace mock SMS logging with real Twilio API dispatching with phone number validation and fallback delivery. | Backend / Actions | **S** | Week 4 (Day 1) | High | Planned |
| **B-08** | **Authenticated REST Webhook Dispatcher**<br>Real HTTP webhook dispatcher featuring exponential backoff retries, configurable headers, and HMAC-SHA256 signature verification. | Backend / Actions | **M** | Week 4 (Day 2) | High | Planned |
| **B-09** | **Physical Actuator Command Dispatch**<br>Bi-directional control channel allowing rules to emit reverse hardware actuation commands (e.g., valve shutoff, fan activation). | Backend / IoT | **M** | Week 4 (Day 3) | Medium | Planned |
| **B-10** | **Docker & Production Containerization**<br>`Dockerfile` and `docker-compose.yml` defining production build, environment configuration, and local MongoDB container. | DevOps / Deployment | **S** | Week 4 (Day 4) | High | Planned |
| **B-11** | **Cluster Mode / Multi-Worker Ingestion**<br>PM2 or Node cluster mode scaling Express across multi-core processors to exceed 50,000 writes/sec locally. | Infrastructure | **L** | Post-MVP | Low | Backlog |
| **B-12** | **Refresh Token Rotation & Remember Me**<br>Sliding refresh token cookie flow complementing access JWTs for seamless multi-day industrial sessions. | Security / Auth | **S** | Post-MVP | Medium | Backlog |
| **B-13** | **Multi-Tenant Organization RBAC**<br>Organization tenancy allowing team members to share, fork, and manage collaborative rule graphs with role-based permissions. | Backend / Models | **L** | Post-MVP | Low | Backlog |
| **B-14** | **Custom Sensor Unit Conversion Node**<br>Pre-processing canvas node providing mathematical unit conversion (e.g. Celsius $\leftrightarrow$ Fahrenheit, Bar $\leftrightarrow$ PSI). | Frontend / Nodes | **S** | Post-MVP | Low | Backlog |

---

## 3. Reviewer Action Item Integration

When action items are logged in [`docs/mid-review-feedback.md`](file:///c:/NexusFlow/docs/mid-review-feedback.md), they will be cross-referenced and triaged into this backlog based on sizing and release milestone.
