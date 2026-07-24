import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface AutoScalingConstructProps {
  config: DSGConfig;
}

export class AutoScalingConstruct extends Construct {
  constructor(scope: Construct, id: string, props: AutoScalingConstructProps) {
    super(scope, id);
  }
}
