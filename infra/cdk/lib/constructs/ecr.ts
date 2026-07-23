import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface ECRConstructProps {
  config: DSGConfig;
}

export class ECRConstruct extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: ECRConstructProps) {
    super(scope, id);
    const { config } = props;

    this.repository = new ecr.Repository(this, 'EcrRepository', {
      repositoryName: `dsg-one-${config.environment}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
    });
  }
}
