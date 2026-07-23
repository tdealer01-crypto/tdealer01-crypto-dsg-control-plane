import { EnvironmentType } from '../config';

const PROJECT_NAME = 'dsg-one';

export function createResourceName(env: EnvironmentType, component: string, suffix?: string): string {
  const parts = [PROJECT_NAME, env, component];
  if (suffix) {
    parts.push(suffix);
  }
  return parts.join('-');
}

export function createLogGroupName(env: EnvironmentType, component: string): string {
  return `/aws/${PROJECT_NAME}/${env}/${component}`;
}

export function createBucketName(env: EnvironmentType, purpose: string): string {
  return `${PROJECT_NAME}-${env}-${purpose}-${generateRandomId()}`.toLowerCase();
}

export function createTableName(env: EnvironmentType, entity: string): string {
  return `${PROJECT_NAME}_${env}_${entity}`;
}

export function createPolicyName(env: EnvironmentType, component: string): string {
  return `${PROJECT_NAME}-${env}-${component}-policy`;
}

export function createRoleName(env: EnvironmentType, component: string): string {
  return `${PROJECT_NAME}-${env}-${component}-role`;
}

function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 8);
}
