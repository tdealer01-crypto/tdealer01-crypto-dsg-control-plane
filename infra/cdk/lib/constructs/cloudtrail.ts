import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface CloudTrailConstructProps {
  config: DSGConfig;
}

export class CloudTrailConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CloudTrailConstructProps) {
    super(scope, id);
  }
}
