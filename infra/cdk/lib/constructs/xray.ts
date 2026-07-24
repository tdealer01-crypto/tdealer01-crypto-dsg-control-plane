import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DSGConfig } from '../config';

export interface XRayConstructProps {
  config: DSGConfig;
}

export class XRayConstruct extends Construct {
  constructor(scope: Construct, id: string, props: XRayConstructProps) {
    super(scope, id);
  }
}
