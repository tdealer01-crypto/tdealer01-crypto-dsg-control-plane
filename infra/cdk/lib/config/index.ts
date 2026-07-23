import { DSGConfig, EnvironmentType } from './types';
import { devConfig } from './dev';
import { stagingConfig } from './staging';
import { prodConfig } from './prod';

const configs: Record<EnvironmentType, DSGConfig> = {
  dev: devConfig,
  staging: stagingConfig,
  prod: prodConfig,
};

export function getConfig(env: EnvironmentType): DSGConfig {
  const config = configs[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return config;
}

export { DSGConfig, EnvironmentType };
export * from './types';
