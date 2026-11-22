# NexusFlow: Graph Serialization Proof & Schema Compliance Report

> **Mid-Project Review Evidence**  
> **Prepared for**: Infotact Solutions Mid-Project Evaluation  
> **Topic**: React Flow Graph Serialization, Topology Integrity, and JSON Schema Compliance  
> **Date**: 22 November 2026  
> **Author**: Nandini V  
> **Repository Branch**: `nandini`  

---

## Executive Summary

A core architectural guarantee of NexusFlow is that visual Directed Acyclic Graphs (DAGs) created on the React Flow canvas can be **losslessly serialized into standardized JSON**, validated against an industry-standard **JSON Schema**, and compiled by the backend **Logic Compiler** into executable **RxJS reactive event streams**.

This report proves:
1. **Schema Compliance**: Serialized graph payloads strictly conform to [**`docs/graph.schema.json`**](file:///c:/NexusFlow/docs/graph.schema.json).
2. **Complex Topology Support**: Multi-branching pipelines with multiple inputs (14+ nodes, 5 distinct branches) serialize and compile without data loss.
3. **Round-Trip Idempotency**: `serialize -> deserialize -> serialize` produces an identical JSON structure.
4. **Resilience & Validation**: Malformed topologies (cyclic dependencies, orphan nodes, missing sources/sinks) are intercepted with descriptive error messages.

---

## 1. JSON Schema Architecture (`docs/graph.schema.json`)

The serialization format adheres to the Draft-07 JSON Schema specification:

```
{
  "version": "1.0.0",
  "exportedAt": "ISO-8601 Timestamp",
  "metadata": {
    "generator": "NexusFlow Visual IoT Rule Engine",
    "nodeCount": <integer>,
    "edgeCount": <integer>
  },
  "nodes": [
    {
      "id": "<string>",
      "type": "dataSource | mathOperation | actionTrigger",
      "position": { "x": <number>, "y": <number> },
      "data": { ... }
    }
  ],
  "edges": [
    {
      "id": "<string>",
      "source": "<sourceNodeId>",
      "target": "<targetNodeId>",
      "sourceHandle": "output | null",
      "targetHandle": "input | null"
    }
  ]
}
```

---

## 2. Comprehensive Test Matrix & Validation Results

The graph serialization test suite covers 5 exhaustive categories:

| Test Case | Description | Target Behavior | Result |
| :--- | :--- | :--- | :---: |
| **Test 1: Linear Pipeline** | 3-node graph (Turbine Temp $\rightarrow$ Threshold $\rightarrow$ SMS) | Correct metadata, version, positions, and valid DAG | **PASS** |
| **Test 2: Complex 15-Node DAG** | 2 Sources, 8 Math Processors, 5 Action Sinks, 5 Branches | High-order branching, multi-sink topology, zero orphans | **PASS** |
| **Test 3: Node Type Coverage** | All variants: Threshold, Moving Avg, Sum, Min, Max, SMS, Webhook | Preserves operational parameters across all types | **PASS** |
| **Test 4a: Cycle Detection** | Circular loop: Node A $\rightarrow$ Node B $\rightarrow$ Node A | Intercepts cycle and raises descriptive error | **PASS** |
| **Test 4b: Orphan Detection** | Disconnected processor node without inputs/outputs | Detects floating node and reports exact label | **PASS** |
| **Test 4c: Source/Sink Guard** | Missing Data Source or missing Action Trigger | Enforces pipeline entry and exit requirements | **PASS** |
| **Test 5: Round-Trip Idempotency**| `serialize -> deserialize -> serialize` | Re-hydrated nodes and edges match byte-for-byte | **PASS** |

---

## 3. Complex Industrial Telemetry Graph (15 Nodes, 5 Branches)

The following serialized JSON represents an industrial multi-sensor turbine safety system:
- **Source 1 (`src-temp`)**: Feeds Branch A (Emergency $> 90^\circ\text{C}$ SMS), Branch B (5-Sample Moving Average $\rightarrow$ Warning Webhook), and Branch C (10-Sample Min Window $\rightarrow$ Freezing Alert).
- **Source 2 (`src-vib`)**: Feeds Branch D (5-Sample Peak Window $\rightarrow$ Vibration Webhook) and Branch E (Cumulative Energy Sum $\rightarrow$ Audit Log Webhook).

```json
{
  "version": "1.0.0",
  "exportedAt": "2026-11-18T22:45:00.000Z",
  "metadata": {
    "generator": "NexusFlow Visual IoT Rule Engine",
    "nodeCount": 15,
    "edgeCount": 13
  },
  "nodes": [
    {
      "id": "src-temp",
      "type": "dataSource",
      "position": { "x": 0, "y": 100 },
      "data": { "label": "Turbine Temp", "deviceId": "turbine-01", "sensorType": "temperature" }
    },
    {
      "id": "src-vib",
      "type": "dataSource",
      "position": { "x": 0, "y": 400 },
      "data": { "label": "Turbine Vibration", "deviceId": "turbine-01", "sensorType": "vibration" }
    },
    {
      "id": "math-crit-thresh",
      "type": "mathOperation",
      "position": { "x": 250, "y": 50 },
      "data": { "label": "Critical > 90", "operation": "threshold", "operator": ">", "thresholdValue": 90 }
    },
    {
      "id": "act-sms-crit",
      "type": "actionTrigger",
      "position": { "x": 500, "y": 50 },
      "data": { "label": "Critical SMS", "actionType": "sms_alert", "target": "+19998887777", "cooldownSeconds": 10 }
    },
    {
      "id": "math-temp-ma",
      "type": "mathOperation",
      "position": { "x": 250, "y": 150 },
      "data": { "label": "5-Sample MA", "operation": "moving_average", "windowSize": 5 }
    },
    {
      "id": "math-warn-thresh",
      "type": "mathOperation",
      "position": { "x": 500, "y": 150 },
      "data": { "label": "Warning > 80", "operation": "threshold", "operator": ">", "thresholdValue": 80 }
    },
    {
      "id": "act-webhook-warn",
      "type": "actionTrigger",
      "position": { "x": 750, "y": 150 },
      "data": { "label": "Warning Webhook", "actionType": "webhook", "target": "https://api.iot/warning" }
    },
    {
      "id": "math-temp-min",
      "type": "mathOperation",
      "position": { "x": 250, "y": 250 },
      "data": { "label": "Min Temp Window", "operation": "min", "windowSize": 10 }
    },
    {
      "id": "math-freeze-thresh",
      "type": "mathOperation",
      "position": { "x": 500, "y": 250 },
      "data": { "label": "Freeze < 15", "operation": "threshold", "operator": "<", "thresholdValue": 15 }
    },
    {
      "id": "act-freeze-sms",
      "type": "actionTrigger",
      "position": { "x": 750, "y": 250 },
      "data": { "label": "Freeze Alert", "actionType": "sms_alert", "target": "+15554443333" }
    },
    {
      "id": "math-vib-max",
      "type": "mathOperation",
      "position": { "x": 250, "y": 380 },
      "data": { "label": "Peak Vibration", "operation": "max", "windowSize": 5 }
    },
    {
      "id": "math-vib-thresh",
      "type": "mathOperation",
      "position": { "x": 500, "y": 380 },
      "data": { "label": "Vib Alarm > 15", "operation": "threshold", "operator": ">", "thresholdValue": 15 }
    },
    {
      "id": "act-vib-webhook",
      "type": "actionTrigger",
      "position": { "x": 750, "y": 380 },
      "data": { "label": "Vib Webhook", "actionType": "webhook", "target": "https://api.iot/vibration" }
    },
    {
      "id": "math-vib-sum",
      "type": "mathOperation",
      "position": { "x": 250, "y": 480 },
      "data": { "label": "Energy Sum", "operation": "sum", "windowSize": 10 }
    },
    {
      "id": "act-vib-log",
      "type": "actionTrigger",
      "position": { "x": 500, "y": 480 },
      "data": { "label": "Audit Log Webhook", "actionType": "webhook", "target": "https://api.iot/audit" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "src-temp", "target": "math-crit-thresh" },
    { "id": "e2", "source": "math-crit-thresh", "target": "act-sms-crit" },
    { "id": "e3", "source": "src-temp", "target": "math-temp-ma" },
    { "id": "e4", "source": "math-temp-ma", "target": "math-warn-thresh" },
    { "id": "e5", "source": "math-warn-thresh", "target": "act-webhook-warn" },
    { "id": "e6", "source": "src-temp", "target": "math-temp-min" },
    { "id": "e7", "source": "math-temp-min", "target": "math-freeze-thresh" },
    { "id": "e8", "source": "math-freeze-thresh", "target": "act-freeze-sms" },
    { "id": "e9", "source": "src-vib", "target": "math-vib-max" },
    { "id": "e10", "source": "math-vib-max", "target": "math-vib-thresh" },
    { "id": "e11", "source": "math-vib-thresh", "target": "act-vib-webhook" },
    { "id": "e12", "source": "src-vib", "target": "math-vib-sum" },
    { "id": "e13", "source": "math-vib-sum", "target": "act-vib-log" }
  ]
}
```

---

## 4. Backend Compiler Verification Output

When passed to `node scripts/validateGraphProof.js`, the Logic Compiler output proves full topological resolution:

```text
===============================================================
   NexusFlow Graph Serialization & Schema Verification Proof
===============================================================

[Step 1] Loaded JSON Schema: NexusFlowRuleGraph (http://json-schema.org/draft-07/schema#)
[Step 2] Built Complex Graph: 15 Nodes, 13 Edges, 5 Branches

[Step 3] Verifying JSON Payload against Schema Properties:
 -> SCHEMA COMPLIANCE: 100% VALID! All required nodes, edges, positions, and typed data conform.

[Step 4] Compiling Graph via Logic Compiler:
 -> COMPILATION SUCCESS: Generated executable multi-branch RxJS pipeline.
 -> Pipeline Node Count: 15
 -> Pipeline Edge Count: 13
 -> Data Sources: [src-temp, src-vib]
 -> Action Triggers: [act-sms-crit, act-vib-log, act-webhook-warn, act-freeze-sms, act-vib-webhook]
 -> Topological Order: [src-temp -> src-vib -> math-crit-thresh -> math-temp-ma -> math-temp-min -> math-vib-max -> math-vib-sum -> act-sms-crit -> math-warn-thresh -> math-freeze-thresh -> math-vib-thresh -> act-vib-log -> act-webhook-warn -> act-freeze-sms -> act-vib-webhook]

===============================================================
   GRAPH SERIALIZATION & SCHEMA PROOF VERIFIED SUCCESSFULLY!
===============================================================
```

---

## Conclusion

The visual DAG model in NexusFlow provides complete mathematical and schema rigor. Graphs are:
- Validated on the client before network transmission.
- Verified against a standardized JSON Schema on persistence.
- Verified on the backend using Kahn's algorithm for acyclicity.
- Compiled into multi-branched reactive RxJS execution streams with zero impedance mismatch.
