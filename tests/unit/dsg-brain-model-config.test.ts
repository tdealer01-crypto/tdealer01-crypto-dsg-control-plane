import { describe, it, expect } from "vitest";
import {
  buildDsgBrainModelConfig,
  isValidDsgBrainModelConfig,
} from "../../lib/dsg/brain/model-config";

describe("DSG Brain Model Config", () => {
  it("uses DSG_BRAIN_MODEL when available", () => {
    const env = {
      DSG_BRAIN_MODEL: "claude-sonnet-4-5-20251001",
      ANTHROPIC_API_KEY: "sk-ant-test",
    };
    const config = buildDsgBrainModelConfig(env as unknown as NodeJS.ProcessEnv);
    expect(config.model).toBe("claude-sonnet-4-5-20251001");
    expect(config.provider).toBe("anthropic");
    expect(config.configured).toBe(true);
  });

  it("falls back to DSG_DADBOT_MODEL when DSG_BRAIN_MODEL is missing", () => {
    const env = {
      DSG_DADBOT_MODEL: "claude-opus-4-5-20251001",
      ANTHROPIC_API_KEY: "sk-ant-test",
    };
    const config = buildDsgBrainModelConfig(env as unknown as NodeJS.ProcessEnv);
    expect(config.model).toBe("claude-opus-4-5-20251001");
    expect(config.configured).toBe(true);
  });

  it("falls back to default model when both env vars are missing", () => {
    const env = {
      ANTHROPIC_API_KEY: "sk-ant-test",
    };
    const config = buildDsgBrainModelConfig(env as unknown as NodeJS.ProcessEnv);
    expect(config.model).toBe("claude-haiku-4-5-20251001");
    expect(config.configured).toBe(true);
  });

  it("never exposes the API key value", () => {
    const env = {
      ANTHROPIC_API_KEY: "sk-ant-secret-12345",
    };
    const config = buildDsgBrainModelConfig(env as unknown as NodeJS.ProcessEnv);
    expect(config).not.toHaveProperty("apiKey");
    expect(JSON.stringify(config)).not.toContain("sk-ant-secret");
  });

  it("reports configured=false when ANTHROPIC_API_KEY is missing", () => {
    const env = {};
    const config = buildDsgBrainModelConfig(env as unknown as NodeJS.ProcessEnv);
    expect(config.configured).toBe(false);
    expect(config.provider).toBe("anthropic");
  });

  it("validates correct config shape", () => {
    expect(
      isValidDsgBrainModelConfig({
        provider: "anthropic",
        model: "claude-test",
        configured: true,
      })
    ).toBe(true);
  });

  it("rejects invalid config shapes", () => {
    expect(isValidDsgBrainModelConfig(null)).toBe(false);
    expect(isValidDsgBrainModelConfig({})).toBe(false);
    expect(
      isValidDsgBrainModelConfig({
        provider: "openai",
        model: "gpt-4",
        configured: true,
      })
    ).toBe(false);
  });
});
