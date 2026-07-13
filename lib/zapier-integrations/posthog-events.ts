/**
 * PostHog Event Tracking for Zapier Revenue Automation
 * Captures revenue, quota, and communication events in PostHog
 */

interface PostHogEvent {
  event: string
  properties: Record<string, any>
  timestamp?: string
}

/**
 * Revenue payment event
 */
export function captureRevenuePaymentEvent(data: {
  customer_id: string
  customer_name: string
  amount: number
  currency: string
  payment_method: string
  status: string
  payment_id: string
}): PostHogEvent {
  return {
    event: 'revenue_payment_received',
    properties: {
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      amount: data.amount,
      currency: data.currency,
      payment_method: data.payment_method,
      status: data.status,
      payment_id: data.payment_id,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Service quota alert event
 */
export function captureQuotaAlertEvent(data: {
  customer_id: string
  customer_name: string
  quota_allocated: number
  usage_current: number
  usage_percent: number
  alert_level: string
}): PostHogEvent {
  return {
    event: 'revenue_quota_alert',
    properties: {
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      quota_allocated: data.quota_allocated,
      usage_current: data.usage_current,
      usage_percent: data.usage_percent,
      alert_level: data.alert_level,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Customer email sent event
 */
export function captureCustomerEmailEvent(data: {
  customer_id: string
  customer_name: string
  email: string
  email_type: string
  status: string
}): PostHogEvent {
  return {
    event: 'revenue_customer_email_sent',
    properties: {
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      email: data.email,
      email_type: data.email_type,
      status: data.status,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Service health update event
 */
export function captureServiceHealthEvent(data: {
  customer_id: string
  customer_name: string
  service_type: string
  health_status: string
}): PostHogEvent {
  return {
    event: 'revenue_service_health_update',
    properties: {
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      service_type: data.service_type,
      health_status: data.health_status,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Customer created event
 */
export function captureCustomerCreatedEvent(data: {
  customer_id: string
  customer_name: string
  email: string
  company: string
  country: string
}): PostHogEvent {
  return {
    event: 'revenue_customer_created',
    properties: {
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      email: data.email,
      company: data.company,
      country: data.country,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Subscription renewal event
 */
export function captureRenewalReminderEvent(data: {
  customer_id: string
  customer_name: string
  last_payment_date: string
  next_review_date: string
}): PostHogEvent {
  return {
    event: 'revenue_renewal_reminder',
    properties: {
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      last_payment_date: data.last_payment_date,
      next_review_date: data.next_review_date,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Revenue analytics event (aggregated)
 */
export function captureRevenueAnalyticsEvent(data: {
  total_amount: number
  total_transactions: number
  average_transaction_value: number
  currency: string
  period: string
}): PostHogEvent {
  return {
    event: 'revenue_analytics_snapshot',
    properties: {
      total_amount: data.total_amount,
      total_transactions: data.total_transactions,
      average_transaction_value: data.average_transaction_value,
      currency: data.currency,
      period: data.period,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Service health check event
 */
export function captureServiceHealthCheckEvent(data: {
  total_customers: number
  active_services: number
  critical_alerts: number
  warning_alerts: number
  healthy_services: number
}): PostHogEvent {
  return {
    event: 'revenue_service_health_check',
    properties: {
      total_customers: data.total_customers,
      active_services: data.active_services,
      critical_alerts: data.critical_alerts,
      warning_alerts: data.warning_alerts,
      healthy_services: data.healthy_services,
      timestamp: new Date().toISOString(),
    },
  }
}
