import { Subject } from 'rxjs';

/**
 * Singleton RxJS Subject representing the live internal telemetry event bus.
 * Ingestion endpoints (POST /api/ingest and POST /api/ingest/batch) emit
 * newly validated & saved readings to this bus.
 *
 * Rule graph pipelines compile and subscribe to this bus to react in real-time.
 */
export const telemetryBus = new Subject();

export default telemetryBus;
