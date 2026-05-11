import { DatabaseTelemetryClient } from '@/components/dsg/telemetry/DatabaseTelemetryClient';
import { getDsgDatabaseTelemetrySnapshot } from '@/lib/dsg/telemetry/database-telemetry';

export const dynamic = 'force-dynamic';

export default function DsgActionLayerPage() {
  return <DatabaseTelemetryClient initialTelemetry={getDsgDatabaseTelemetrySnapshot()} />;
}
