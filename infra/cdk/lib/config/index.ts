/**
 * Configuration Loader
 *
 * Load environment-specific configurations
 */

import { DSGConfig } from './types';
import { devConfig } from './dev';
import { stagingConfig } from './staging';
import { prodConfig } from './prod';

export { DSGConfig, EnvironmentType } from './types';

export function getConfig(environment?: string): DSGConfig {
  const env = environment || process.env.ENVIRONMENT || 'dev';

  switch (env) {
    case 'prod':
      return prodConfig;
    case 'staging':
      return stagingConfig;
    case 'dev':
    default:
      return devConfig;
  }
}

export function loadAllConfigs(): {
  dev: DSGConfig;
  staging: DSGConfig;
  prod: DSGConfig;
} {
  return {
    dev: devConfig,
    staging: stagingConfig,
    prod: prodConfig,
  };
}
