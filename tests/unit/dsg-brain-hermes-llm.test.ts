/**
 * Unit tests for Hermes LLM Integration (DSG Brain).
 * Tests plan generation and remediation with mocked Anthropic API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LLMPlanRequest, LLMRemediationRequest } from "../../lib/dsg/brain/hermes-llm";
import type { ConformanceViolation } from "../../lib/dsg/brain/conformance-gate";

// Mock the module before importing
const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

import {
  generatePlanViaLLM,
  remediatePlanViaLLM,
} from "../../lib/dsg/brain/hermes-llm";

describe("Hermes LLM - Plan Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates a plan with valid Anthropic response", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: `
          {
            "steps": [
              {
                "command": "npm run build",
                "args": [],
                "reason": "Build the project before deployment"
              },
              {
                "command": "npm run test",
                "args": [],
                "reason": "Run tests to ensure quality"
              }
            ],
            "summary": "Build and test the project before deployment"
          }
          `,
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const request: LLMPlanRequest = {
      userInput: "Deploy the application",
      allowedCommands: ["npm run build", "npm run test", "npm run deploy"],
      allowedPaths: ["/app", "/dist"],
      policyVersion: "v1.0",
      toolManifestHash: "abc123",
    };

    const response = await generatePlanViaLLM(request);

    expect(response.canonicalPlan).toContain("npm run build");
    expect(response.canonicalPlan).toContain("npm run test");
    expect(response.rationale).toBe("Build and test the project before deployment");
    expect(response.riskTags).toEqual([]);
    expect(mockCreate).toHaveBeenCalledOnce();

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
    expect(callArgs.max_tokens).toBe(2048);
  });

  it("adds risk tags when constraints are empty", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [{ command: "echo", args: ["hello"], reason: "test" }],
            summary: "Test plan",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const request: LLMPlanRequest = {
      userInput: "Test",
      allowedCommands: [],
      allowedPaths: [],
      policyVersion: "v1.0",
      toolManifestHash: "abc123",
    };

    const response = await generatePlanViaLLM(request);

    expect(response.riskTags).toContain("no-commands");
    expect(response.riskTags).toContain("no-paths");
  });

  it("throws error when ANTHROPIC_API_KEY is not set", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const request: LLMPlanRequest = {
        userInput: "Test",
        allowedCommands: ["test"],
        allowedPaths: ["/test"],
        policyVersion: "v1.0",
        toolManifestHash: "abc123",
      };

      await expect(generatePlanViaLLM(request)).rejects.toThrow(
        /ANTHROPIC_API_KEY/
      );
    } finally {
      if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it("handles LLM API errors gracefully", async () => {
    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    const request: LLMPlanRequest = {
      userInput: "Test",
      allowedCommands: ["test"],
      allowedPaths: ["/test"],
      policyVersion: "v1.0",
      toolManifestHash: "abc123",
    };

    await expect(generatePlanViaLLM(request)).rejects.toThrow(
      /LLM plan generation failed/
    );
  });

  it("parses multi-step plans correctly", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [
              {
                command: "git",
                args: ["checkout", "-b", "feature/new"],
                reason: "Create feature branch",
              },
              {
                command: "npm",
                args: ["install"],
                reason: "Install dependencies",
              },
              {
                command: "npm",
                args: ["run", "dev"],
                reason: "Start development server",
              },
            ],
            summary: "Setup and start development",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const request: LLMPlanRequest = {
      userInput: "Start developing a new feature",
      allowedCommands: ["git", "npm"],
      allowedPaths: ["/project"],
      policyVersion: "v1.0",
      toolManifestHash: "abc123",
    };

    const response = await generatePlanViaLLM(request);

    expect(response.canonicalPlan).toContain("git checkout");
    expect(response.canonicalPlan).toContain("npm install");
    expect(response.canonicalPlan).toContain("npm run dev");
  });

  it("accepts optional API key parameter", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [{ command: "echo", args: ["test"], reason: "test" }],
            summary: "Test",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const request: LLMPlanRequest = {
      userInput: "Test",
      allowedCommands: ["echo"],
      allowedPaths: ["/"],
      policyVersion: "v1.0",
      toolManifestHash: "abc123",
    };

    const customApiKey = "sk-custom-key-12345";
    const response = await generatePlanViaLLM(request, customApiKey);

    expect(response.canonicalPlan).toBeTruthy();
    expect(mockCreate).toHaveBeenCalledOnce();
  });
});

describe("Hermes LLM - Plan Remediation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("remediates a plan with conformance violations", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [
              {
                command: "allowed-command",
                args: [],
                reason: "Fixed to use allowed command",
              },
            ],
            summary: "Remediated plan to fix constraint violations",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const violations: ConformanceViolation[] = [
      {
        rule: "allowed-commands",
        expected: ["allowed-command"],
        actual: "forbidden-command",
        message: "Command 'forbidden-command' is not in allowedCommands",
      },
    ];

    const request: LLMRemediationRequest = {
      originalPlan: "forbidden-command arg1 arg2",
      violations,
      allowedCommands: ["allowed-command"],
      allowedPaths: ["/app"],
    };

    const response = await remediatePlanViaLLM(request);

    expect(response.remediatedPlan).toContain("allowed-command");
    expect(response.changeDescription).toContain("Remediated");
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("fixes multiple violations in a plan", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [
              {
                command: "valid-cmd",
                args: ["/allowed/path"],
                reason: "Fixed both command and path",
              },
            ],
            summary: "All violations fixed",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const violations: ConformanceViolation[] = [
      {
        rule: "allowed-commands",
        expected: ["valid-cmd"],
        actual: "invalid-cmd",
        message: "Command not allowed",
      },
      {
        rule: "allowed-paths",
        expected: ["/allowed"],
        actual: "/forbidden",
        message: "Path not allowed",
      },
    ];

    const request: LLMRemediationRequest = {
      originalPlan: "invalid-cmd /forbidden/file",
      violations,
      allowedCommands: ["valid-cmd"],
      allowedPaths: ["/allowed"],
    };

    const response = await remediatePlanViaLLM(request);

    expect(response.remediatedPlan).toContain("valid-cmd");
    expect(response.remediatedPlan).toContain("/allowed");
  });

  it("throws error when ANTHROPIC_API_KEY is not set for remediation", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const request: LLMRemediationRequest = {
        originalPlan: "test",
        violations: [],
        allowedCommands: ["test"],
        allowedPaths: ["/test"],
      };

      await expect(remediatePlanViaLLM(request)).rejects.toThrow(
        /ANTHROPIC_API_KEY/
      );
    } finally {
      if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it("handles remediation API errors gracefully", async () => {
    mockCreate.mockRejectedValue(new Error("Connection timeout"));

    const violations: ConformanceViolation[] = [
      {
        rule: "test-rule",
        expected: "test",
        actual: "actual",
        message: "Test violation",
      },
    ];

    const request: LLMRemediationRequest = {
      originalPlan: "test plan",
      violations,
      allowedCommands: ["test"],
      allowedPaths: ["/test"],
    };

    await expect(remediatePlanViaLLM(request)).rejects.toThrow(
      /LLM remediation failed/
    );
  });

  it("includes violations in remediation prompt", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [{ command: "test", args: [], reason: "test" }],
            summary: "Test",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const violations: ConformanceViolation[] = [
      {
        rule: "test",
        expected: "test",
        actual: "actual",
        message: "Test violation message",
      },
    ];

    const request: LLMRemediationRequest = {
      originalPlan: "original",
      violations,
      allowedCommands: ["cmd1", "cmd2"],
      allowedPaths: ["/path1", "/path2"],
    };

    await remediatePlanViaLLM(request);

    const callArgs = mockCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    expect(userContent).toContain("Test violation message");
    expect(userContent).toContain("cmd1");
    expect(userContent).toContain("/path1");
  });
});

describe("Hermes LLM - Prompt Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds comprehensive system prompts for planning", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [{ command: "test", args: [], reason: "test" }],
            summary: "Test",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const request: LLMPlanRequest = {
      userInput: "Test request",
      allowedCommands: ["cmd"],
      allowedPaths: ["/path"],
      policyVersion: "v1.0",
      toolManifestHash: "hash123",
    };

    await generatePlanViaLLM(request);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("planning agent");
    expect(callArgs.system).toContain("deterministic");
    expect(callArgs.system).toContain("JSON");
  });

  it("includes constraints in user prompts", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            steps: [{ command: "test", args: [], reason: "test" }],
            summary: "Test",
          }),
        },
      ],
    };

    mockCreate.mockResolvedValue(mockResponse);

    const request: LLMPlanRequest = {
      userInput: "My test request",
      allowedCommands: ["npm", "git"],
      allowedPaths: ["/app", "/src"],
      policyVersion: "v2.0",
      toolManifestHash: "toolhash",
    };

    await generatePlanViaLLM(request);

    const callArgs = mockCreate.mock.calls[0][0];
    const userContent = callArgs.messages[0].content;
    expect(userContent).toContain("My test request");
    expect(userContent).toContain("npm");
    expect(userContent).toContain("git");
    expect(userContent).toContain("/app");
    expect(userContent).toContain("/src");
    expect(userContent).toContain("v2.0");
  });
});
