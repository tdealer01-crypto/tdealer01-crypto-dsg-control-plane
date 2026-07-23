import * as cdk from 'aws-cdk-lib';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName, createBucketName } from '../utils';

export interface CloudTrailConstructProps {
  config: DSGConfig;
  encryptionKey: kms.Key;
}

export class CloudTrailConstruct extends Construct {
  public readonly trail: cloudtrail.Trail;
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: CloudTrailConstructProps) {
    super(scope, id);

    const { config, encryptionKey } = props;

    // S3 Bucket for CloudTrail logs
    this.bucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: createBucketName(config.env, 'cloudtrail'),
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(Math.max(config.observability.cloudTrailRetentionDays, 92)),
        },
      ],
    });

    // CloudTrail
    this.trail = new cloudtrail.Trail(this, 'Trail', {
      bucket: this.bucket,
      isMultiRegionTrail: config.features.multiRegion,
      includeGlobalServiceEvents: true,
      enableFileValidation: true,
      sendToCloudWatchLogs: true,
      s3KeyPrefix: `cloudtrail-logs/${config.env}`,
      trailName: createResourceName(config.env, 'trail'),
    });

    // CloudTrail is configured to log all API and management events
    // Advanced event selectors (S3, Lambda) can be configured via AWS Console or additional constructs

    // Outputs
    new cdk.CfnOutput(this, 'CloudTrailBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket for CloudTrail logs',
    });

    new cdk.CfnOutput(this, 'CloudTrailName', {
      value: createResourceName(config.env, 'trail'),
      description: 'CloudTrail name',
    });

    cdk.Tags.of(this).add('Component', 'CloudTrail');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
