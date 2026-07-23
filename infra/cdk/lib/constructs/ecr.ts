import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';
import { createResourceName } from '../utils';

export interface ECRConstructProps {
  config: DSGConfig;
}

export class ECRConstruct extends Construct {
  public readonly apiRepository: ecr.Repository;
  public readonly workerRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: ECRConstructProps) {
    super(scope, id);

    const { config } = props;

    // API Repository
    this.apiRepository = new ecr.Repository(this, 'APIRepository', {
      repositoryName: createResourceName(config.env, 'api'),
      imageScanOnPush: true,
      encryptionKey: undefined, // Use default KMS key
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: cdk.Duration.days(config.env === 'prod' ? 7 : 3),
        },
        {
          tagStatus: ecr.TagStatus.TAGGED,
          tagPrefixList: ['dev'],
          maxImageCount: 5,
        },
      ],
    });

    // Worker Repository
    this.workerRepository = new ecr.Repository(this, 'WorkerRepository', {
      repositoryName: createResourceName(config.env, 'worker'),
      imageScanOnPush: true,
      encryptionKey: undefined,
      removalPolicy: config.env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: cdk.Duration.days(config.env === 'prod' ? 7 : 3),
        },
      ],
    });

    cdk.Tags.of(this).add('Component', 'ECR');
    cdk.Tags.of(this).add('Environment', config.env);
  }
}
