/**
 * DSG Brain Model Configuration
 * Server-side only. Never exposes API key values.
 */

export interface DsgBrainModelConfig {
  provider: "anthropic";
  model: string;
  configured: boolean;
}

/**
 * Build DSG Brain model config from environment.
 * Uses existing server-side ANTHROPIC_API_KEY only.
 * Never returns the key value itself.
 */
export function buildDsgBrainModelConfig(
  env: NodeJS.ProcessEnv = process.env
): DsgBrainModelConfig {
  const model =
    env.DSG_BRAIN_MODEL ||
    env.DSG_DADBOT_MODEL ||
    "claude-haiku-4-5-20251001";

  const configured = Boolean(env.ANTHROPIC_API_KEY);

  return {
    provider: "anthropic",
    model,
    configured,
  };
}

/**
 * Type guard to verify a config object is valid DSG Brain config.
 */
export function isValidDsgBrainModelConfig(
  config: unknown
): config is DsgBrainModelConfig {
  if (typeof config !== "object" || config === null) return false;
  const c = config as Record<string, unknown>;
  return (
    c.provider === "anthropic" &&
    typeof c.model === "string" &&
    typeof c.configured === "boolean"
  );
}
