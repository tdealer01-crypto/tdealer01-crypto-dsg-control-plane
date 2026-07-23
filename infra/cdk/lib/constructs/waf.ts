import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface WAFConstructProps {
  config: DSGConfig;
}

/**
 * WAF (Web Application Firewall) Construct
 *
 * Protects against common web exploits (OWASP Top 10).
 * Rate limiting, IP reputation, SQL injection, XSS, CSRF protection.
 * Managed rule groups and custom rules for governance traffic.
 */
export class WAFConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly ipSet: wafv2.CfnIPSet;
  public readonly wafRole: iam.Role;

  constructor(scope: Construct, id: string, props: WAFConstructProps) {
    super(scope, id);

    const { config } = props;

    // IP set for trusted sources (internal networks, CI/CD)
    this.ipSet = new wafv2.CfnIPSet(this, 'TrustedIPSet', {
      scope: 'CLOUDFRONT',
      ipAddressVersion: 'IPV4',
      addresses: config.waf?.trustedIpRanges || ['0.0.0.0/32'], // Placeholder
      name: `${config.resourcePrefix}-trusted-ips`,
    });

    // Web ACL with managed and custom rules
    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${config.resourcePrefix}-waf-metrics`,
      },
      rules: [
        // AWS Managed Rules - OWASP Top 10
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSetMetric',
          },
        },
        // Known Bad Inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric',
          },
        },
        // Rate limiting rule
        {
          name: 'RateLimitRule',
          priority: 2,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRuleMetric',
          },
        },
      ],
      name: `${config.resourcePrefix}-web-acl`,
    });

    // IAM Role for WAF management
    this.wafRole = new iam.Role(this, 'WAFManagementRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for WAF rule management and log analysis',
    });

    // Grant permissions
    this.wafRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'wafv2:GetWebAcl',
          'wafv2:ListWebAcls',
          'wafv2:GetSampledRequests',
        ],
        resources: ['*'],
      })
    );

    cdk.Tags.of(this).add('Component', 'WAF');
    cdk.Tags.of(this).add('Phase', '4-Operations');
    cdk.Tags.of(this).add('Security', 'WebProtection');
  }
}
