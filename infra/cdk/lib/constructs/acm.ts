import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface ACMConstructProps {
  config: DSGConfig;
  hostedZone?: route53.IHostedZone;
}

/**
 * AWS Certificate Manager (ACM) Construct
 *
 * SSL/TLS certificate management with auto-renewal.
 * Supports multiple domains and subdomains.
 * Integrated with Route53 for DNS validation.
 */
export class ACMConstruct extends Construct {
  public readonly certificate: acm.Certificate | null = null;
  public readonly wildcardCertificate: acm.Certificate | null = null;

  constructor(scope: Construct, id: string, props: ACMConstructProps) {
    super(scope, id);

    const { config, hostedZone } = props;

    // Create certificate if domain is configured
    if (config.domain?.name && hostedZone) {
      // Primary domain certificate
      this.certificate = new acm.Certificate(this, 'Certificate', {
        domainName: config.domain.name,
        subjectAlternativeNames: [
          `*.${config.domain.name}`,
          `dsg-one.${config.domain.name}`,
          `api.${config.domain.name}`,
          `dashboard.${config.domain.name}`,
        ],
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });

      cdk.Tags.of(this.certificate).add('Environment', config.environment);
      cdk.Tags.of(this.certificate).add('Component', 'ACM');
    }

    cdk.Tags.of(this).add('Component', 'ACM');
    cdk.Tags.of(this).add('Phase', '4-Operations');
  }
}
