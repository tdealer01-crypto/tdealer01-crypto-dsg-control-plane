import { DSGConfig } from '../config';

export function createTags(config: DSGConfig, additionalTags?: Record<string, string>): Record<string, string> {
  return {
    ...config.tags,
    ...additionalTags,
  };
}

export function applyTags(scope: any, config: DSGConfig, additionalTags?: Record<string, string>) {
  const tags = createTags(config, additionalTags);
  Object.entries(tags).forEach(([key, value]) => {
    scope.node.addMetadata('tags', { [key]: value });
  });
}
