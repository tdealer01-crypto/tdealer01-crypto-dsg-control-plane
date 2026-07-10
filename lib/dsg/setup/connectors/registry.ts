import type { Connector } from './interface';

class ConnectorRegistry {
  private connectors = new Map<string, Connector>();

  registerIfAbsent(connector: Connector): void {
    if (!this.connectors.has(connector.id)) {
      this.connectors.set(connector.id, connector);
    }
  }

  get(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  getByKind(kind: 'oauth' | 'api-key' | 'webhook'): Connector[] {
    return Array.from(this.connectors.values()).filter((c) => c.kind === kind);
  }

  all(): Connector[] {
    return Array.from(this.connectors.values());
  }

  list(): Array<{ id: string; name: string; kind: string }> {
    return this.all().map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
    }));
  }
}

export const connectorRegistry = new ConnectorRegistry();
