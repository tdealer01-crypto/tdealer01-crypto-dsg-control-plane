import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface GovernanceConstructProps {
  config: DSGConfig;
}

export class GovernanceConstruct extends Construct {
  constructor(scope: Construct, id: string, props: GovernanceConstructProps) {
    super(scope, id);
  }
}
