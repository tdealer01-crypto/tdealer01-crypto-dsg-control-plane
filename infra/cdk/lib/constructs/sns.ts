import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface SNSConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

/**
 * SNS (Simple Notification Service) Construct
 *
 * Centralized alerting and notifications for governance events.
 * Topics for alerts, incidents, compliance events, billing alerts.
 * Email, SMS, Slack integration (via Lambda).
 */
export class SNSConstruct extends Construct {
  public readonly alertTopic: sns.Topic;
  public readonly incidentTopic: sns.Topic;
  public readonly complianceTopic: sns.Topic;
  public readonly billingTopic: sns.Topic;
  public readonly snsRole: iam.Role;

  constructor(scope: Construct, id: string, props: SNSConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;

    // IAM Role for SNS operations
    this.snsRole = new iam.Role(this, 'SNSPublishRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for publishing to SNS topics',
    });

    // Alert Topic - general system alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${config.resourcePrefix}-alerts`,
      masterKey: encryptionKey,
      displayName: 'DSG ONE System Alerts',
    });

    // Incident Topic - critical incidents
    this.incidentTopic = new sns.Topic(this, 'IncidentTopic', {
      topicName: `${config.resourcePrefix}-incidents`,
      masterKey: encryptionKey,
      displayName: 'DSG ONE Incidents',
    });

    // Compliance Topic - compliance events and audit trail changes
    this.complianceTopic = new sns.Topic(this, 'ComplianceTopic', {
      topicName: `${config.resourcePrefix}-compliance`,
      masterKey: encryptionKey,
      displayName: 'DSG ONE Compliance Events',
    });

    // Billing Topic - cost and budget alerts
    this.billingTopic = new sns.Topic(this, 'BillingTopic', {
      topicName: `${config.resourcePrefix}-billing`,
      masterKey: encryptionKey,
      displayName: 'DSG ONE Billing Alerts',
    });

    // Grant publish permissions to role
    this.alertTopic.grantPublish(this.snsRole);
    this.incidentTopic.grantPublish(this.snsRole);
    this.complianceTopic.grantPublish(this.snsRole);
    this.billingTopic.grantPublish(this.snsRole);

    // Add email subscriptions if configured
    if (config.notifications?.alertEmails?.length) {
      config.notifications.alertEmails.forEach((email) => {
        this.alertTopic.addSubscription(
          new subscriptions.EmailSubscription(email, { json: false })
        );
      });
    }

    if (config.notifications?.incidentEmails?.length) {
      config.notifications.incidentEmails.forEach((email) => {
        this.incidentTopic.addSubscription(
          new subscriptions.EmailSubscription(email, { json: false })
        );
      });
    }

    cdk.Tags.of(this).add('Component', 'Notifications');
    cdk.Tags.of(this).add('Phase', '4-Operations');
  }
}
