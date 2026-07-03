/**
 * Data Export - Export monitoring data to CSV, JSON, PDF
 */

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  includeMetadata?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface Alert {
  alert_id: string;
  alert_type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  metadata?: Record<string, any>;
}

interface Execution {
  execution_id: string;
  agent_id: string;
  status: string;
  total_tokens: number;
  total_cost_usd: number;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  timestamp: string;
}

interface Metric {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
  timestamp: string;
}

export class DataExporter {
  static exportAlertsToCsv(alerts: Alert[]): string {
    const headers = [
      'Alert ID',
      'Type',
      'Severity',
      'Status',
      'Title',
      'Message',
      'Created At',
      'Acknowledged At',
      'Resolved At',
    ];

    const rows = alerts.map((alert) => [
      alert.alert_id,
      alert.alert_type,
      alert.severity,
      alert.status,
      alert.title,
      `"${alert.message}"`,
      alert.created_at,
      alert.acknowledged_at || '',
      alert.resolved_at || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csv;
  }

  static exportExecutionsToCsv(executions: Execution[]): string {
    const headers = [
      'Execution ID',
      'Agent ID',
      'Status',
      'Total Tokens',
      'Cost (USD)',
      'Duration (ms)',
      'Start Time',
      'End Time',
      'Timestamp',
    ];

    const rows = executions.map((exec) => [
      exec.execution_id,
      exec.agent_id,
      exec.status,
      exec.total_tokens.toString(),
      exec.total_cost_usd.toFixed(4),
      (exec.duration_ms || 0).toString(),
      exec.start_time,
      exec.end_time || '',
      exec.timestamp,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csv;
  }

  static exportMetricsToCsv(metrics: Metric[]): string {
    const headers = [
      'Total Executions',
      'Successful',
      'Failed',
      'Success Rate (%)',
      'Total Tokens',
      'Total Cost (USD)',
      'Avg Duration (ms)',
      'Timestamp',
    ];

    const rows = metrics.map((metric) => [
      metric.totalExecutions.toString(),
      metric.successfulExecutions.toString(),
      metric.failedExecutions.toString(),
      metric.successRate.toFixed(2),
      metric.totalTokens.toString(),
      metric.totalCost.toFixed(4),
      metric.avgDuration.toFixed(0),
      metric.timestamp,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csv;
  }

  static exportAlertsToJson(alerts: Alert[]): string {
    return JSON.stringify(alerts, null, 2);
  }

  static exportExecutionsToJson(executions: Execution[]): string {
    return JSON.stringify(executions, null, 2);
  }

  static exportMetricsToJson(metrics: Metric[]): string {
    return JSON.stringify(metrics, null, 2);
  }

  static downloadFile(
    content: string,
    filename: string,
    mimeType: string = 'text/plain'
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static generateFilename(
    type: 'alerts' | 'executions' | 'metrics',
    format: 'csv' | 'json' | 'pdf'
  ): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    return `monitoring-${type}-${timestamp}.${format}`;
  }

  static downloadAlerts(alerts: Alert[], format: 'csv' | 'json'): void {
    const filename = this.generateFilename('alerts', format);
    const content =
      format === 'csv'
        ? this.exportAlertsToCsv(alerts)
        : this.exportAlertsToJson(alerts);
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    this.downloadFile(content, filename, mimeType);
  }

  static downloadExecutions(
    executions: Execution[],
    format: 'csv' | 'json'
  ): void {
    const filename = this.generateFilename('executions', format);
    const content =
      format === 'csv'
        ? this.exportExecutionsToCsv(executions)
        : this.exportExecutionsToJson(executions);
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    this.downloadFile(content, filename, mimeType);
  }

  static downloadMetrics(metrics: Metric[], format: 'csv' | 'json'): void {
    const filename = this.generateFilename('metrics', format);
    const content =
      format === 'csv'
        ? this.exportMetricsToCsv(metrics)
        : this.exportMetricsToJson(metrics);
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    this.downloadFile(content, filename, mimeType);
  }
}
