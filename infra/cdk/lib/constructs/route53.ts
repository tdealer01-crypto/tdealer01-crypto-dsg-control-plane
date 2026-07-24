import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface Route53ConstructProps {
  config: DSGConfig;
}

/**
 * Route53 Construct
 *
 * DNS management and multi-region routing.
 * Health checks, failover policies, geolocation routing.
 * Supports zero-downtime deployments and disaster recovery.
 */
export class Route53Construct extends Construct {
  public readonly hostedZone?: route53.IHostedZone;
  public readonly healthChecks: route53.CfnHealthCheck[] = [];
  public readonly dnsRole: iam.Role;

  constructor(scope: Construct, id: string, props: Route53ConstructProps) {
    super(scope, id);

    const { config } = props;

    // IAM Role for Route53 operations
    this.dnsRole = new iam.Role(this, 'Route53Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Route53 DNS management',
    });

    // Create hosted zone (if domain is configured and in production)
    if (config.domain?.name && config.environment === 'prod') {
      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: config.domain.name,
      });

      // Grant permissions
      this.hostedZone.grantDelegation(this.dnsRole);

      // Create health checks for primary and secondary regions
      const primaryHealthCheck = new route53.CfnHealthCheck(
        this,
        'PrimaryHealthCheck',
        {
          healthCheckConfig: {
            type: 'HTTPS',
            resourcePath: '/api/health',
            fullyQualifiedDomainName: `dsg-one-primary.${config.domain.name}`,
            port: 443,
            requestInterval: 30,
            failureThreshold: 3,
          },
          healthCheckTags: [
            {
              key: 'Name',
              value: `${config.resourcePrefix}-primary-health`,
            },
          ],
        }
      );
      this.healthChecks.push(primaryHealthCheck);

      // Failover health check
      const secondaryHealthCheck = new route53.CfnHealthCheck(
        this,
        'SecondaryHealthCheck',
        {
          healthCheckConfig: {
            type: 'HTTPS',
            resourcePath: '/api/health',
            fullyQualifiedDomainName: `dsg-one-secondary.${config.domain.name}`,
            port: 443,
            requestInterval: 30,
            failureThreshold: 3,
          },
          healthCheckTags: [
            {
              key: 'Name',
              value: `${config.resourcePrefix}-secondary-health`,
            },
          ],
        }
      );
      this.healthChecks.push(secondaryHealthCheck);
    }

    // Add tags
    cdk.Tags.of(this).add('Component', 'DNS');
    cdk.Tags.of(this).add('Phase', '4-Operations');
  }
}
