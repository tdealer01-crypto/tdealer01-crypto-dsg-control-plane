import type { StepHandler, SubmissionStep, StepContext, StepResult, VerificationResult, EvidencePayload } from "../types";
import { EvidenceRecorder } from "../evidence-recorder";

export class NavigationHandler implements StepHandler {
  async execute(context: StepContext, step: SubmissionStep): Promise<StepResult> {
    const startTime = Date.now();
    try {
      const url = step.value || "https://dashboard.stripe.com/apps";
      await context.page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      const screenshot = await context.page.screenshot({
        path: `/tmp/stripe-submission-step-${step.number}.png`,
      });

      return {
        stepNumber: step.number,
        stepType: step.type,
        success: true,
        duration: Date.now() - startTime,
        screenshot: {
          path: `/tmp/stripe-submission-step-${step.number}.png`,
          hash: require("crypto").createHash("sha256").update(screenshot).digest("hex"),
        },
      };
    } catch (error: any) {
      return {
        stepNumber: step.number,
        stepType: step.type,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        errorCode: "NAVIGATION_FAILED",
      };
    }
  }

  async verify(context: StepContext, step: SubmissionStep): Promise<VerificationResult> {
    try {
      const currentUrl = context.page.url();
      let verified = false;

      try {
        const url = new URL(currentUrl);
        verified =
          url.hostname === "dashboard.stripe.com" ||
          (step.expectedUrl ? new URL(step.expectedUrl).hostname === url.hostname : false);
      } catch {
        verified = false;
      }

      return {
        verified,
        confidence: verified ? 1.0 : 0.0,
        details: { currentUrl, expectedUrl: step.expectedUrl },
      };
    } catch (error: any) {
      return {
        verified: false,
        confidence: 0.0,
        details: { error: error.message },
        error: error.message,
      };
    }
  }

  async captureEvidence(result: StepResult): Promise<EvidencePayload> {
    const recorder = new EvidenceRecorder();
    return recorder.recordStepEvidence(
      "submission-id",
      result.stepNumber,
      "navigate",
      result,
      "stripe-dashboard",
    );
  }

  getRecoveryStrategy(): string {
    return "Retry navigation with fresh browserbase session";
  }
}

export class FormInteractionHandler implements StepHandler {
  async execute(context: StepContext, step: SubmissionStep): Promise<StepResult> {
    const startTime = Date.now();
    try {
      if (!step.selector) {
        throw new Error("Selector is required for form interaction");
      }

      await context.page.waitForSelector(step.selector, { timeout: 15000 });

      if (step.type === "click") {
        await context.page.click(step.selector);
      } else if (step.type === "fill") {
        if (!step.value) {
          throw new Error("Value is required for fill action");
        }
        const element = context.page.locator(step.selector).first();
        await element.fill("");
        await element.fill(step.value);
      } else if (step.type === "upload") {
        if (!step.value) {
          throw new Error("File path is required for upload action");
        }
        const input = context.page.locator(step.selector).first();
        await input.setInputFiles(step.value);
      }

      if (step.waitForSelector) {
        await context.page.waitForSelector(step.waitForSelector, { timeout: 10000 });
      }

      const screenshot = await context.page.screenshot({
        path: `/tmp/stripe-submission-step-${step.number}.png`,
      });

      return {
        stepNumber: step.number,
        stepType: step.type,
        success: true,
        duration: Date.now() - startTime,
        screenshot: {
          path: `/tmp/stripe-submission-step-${step.number}.png`,
          hash: require("crypto").createHash("sha256").update(screenshot).digest("hex"),
        },
      };
    } catch (error: any) {
      return {
        stepNumber: step.number,
        stepType: step.type,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        errorCode: "FORM_INTERACTION_FAILED",
      };
    }
  }

  async verify(context: StepContext, step: SubmissionStep): Promise<VerificationResult> {
    try {
      if (!step.selector) {
        return { verified: false, confidence: 0.0, details: {}, error: "No selector provided" };
      }

      const element = context.page.locator(step.selector).first();
      const isVisible = await element.isVisible();

      return {
        verified: isVisible,
        confidence: isVisible ? 0.8 : 0.0,
        details: { selector: step.selector, isVisible },
      };
    } catch (error: any) {
      return {
        verified: false,
        confidence: 0.0,
        details: { error: error.message },
        error: error.message,
      };
    }
  }

  async captureEvidence(result: StepResult): Promise<EvidencePayload> {
    const recorder = new EvidenceRecorder();
    return recorder.recordStepEvidence("submission-id", result.stepNumber, "interact", result, "form-element");
  }

  getRecoveryStrategy(): string {
    return "Restore from checkpoint and retry form interaction";
  }
}

export class VerificationHandler implements StepHandler {
  async execute(context: StepContext, step: SubmissionStep): Promise<StepResult> {
    const startTime = Date.now();
    try {
      const screenshot = await context.page.screenshot({
        path: `/tmp/stripe-submission-step-${step.number}.png`,
        fullPage: true,
      });

      const pageContent = await context.page.content();

      return {
        stepNumber: step.number,
        stepType: step.type,
        success: pageContent.includes("success") || pageContent.includes("submitted"),
        duration: Date.now() - startTime,
        screenshot: {
          path: `/tmp/stripe-submission-step-${step.number}.png`,
          hash: require("crypto").createHash("sha256").update(screenshot).digest("hex"),
        },
      };
    } catch (error: any) {
      return {
        stepNumber: step.number,
        stepType: step.type,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        errorCode: "VERIFICATION_FAILED",
      };
    }
  }

  async verify(context: StepContext, step: SubmissionStep): Promise<VerificationResult> {
    try {
      const pageContent = await context.page.content();
      const isSuccess =
        pageContent.includes("success") ||
        pageContent.includes("submitted") ||
        pageContent.includes("confirmation");

      return {
        verified: isSuccess,
        confidence: isSuccess ? 0.95 : 0.0,
        details: { pageTitle: await context.page.title() },
      };
    } catch (error: any) {
      return {
        verified: false,
        confidence: 0.0,
        details: { error: error.message },
        error: error.message,
      };
    }
  }

  async captureEvidence(result: StepResult): Promise<EvidencePayload> {
    const recorder = new EvidenceRecorder();
    return recorder.recordStepEvidence(
      "submission-id",
      result.stepNumber,
      "verify",
      result,
      "submission-completion",
    );
  }

  getRecoveryStrategy(): string {
    return "Check Stripe dashboard API to confirm submission was processed";
  }
}

export class StepHandlerFactory {
  static createHandler(step: SubmissionStep): StepHandler {
    switch (step.type) {
      case "navigate":
        return new NavigationHandler();
      case "click":
      case "fill":
      case "upload":
        return new FormInteractionHandler();
      case "verify":
        return new VerificationHandler();
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  static getSteps(): SubmissionStep[] {
    return [
      {
        number: 1,
        description: "Navigate to Stripe Apps Dashboard",
        type: "navigate",
        value: "https://dashboard.stripe.com/apps",
        expectedUrl: "dashboard.stripe.com",
      },
      {
        number: 2,
        description: "Click 'Create an app' button",
        type: "click",
        selector: "[data-test-id='create-app-button']",
      },
      {
        number: 3,
        description: "Fill app name",
        type: "fill",
        selector: "input[name='name']",
        value: "DSG Governance Gate",
      },
      {
        number: 4,
        description: "Select category",
        type: "click",
        selector: "select[name='category']",
        value: "Risk Management",
      },
      {
        number: 5,
        description: "Fill short description",
        type: "fill",
        selector: "textarea[name='short_description']",
        value: "Displays ALLOW, BLOCK, or REVIEW policy decisions on payment detail views.",
      },
      {
        number: 6,
        description: "Fill long description",
        type: "fill",
        selector: "textarea[name='long_description']",
        value: "DSG Governance Gate displays ALLOW, BLOCK, or REVIEW policy decisions on the Stripe Dashboard payment detail view.",
      },
      {
        number: 7,
        description: "Upload app icon",
        type: "upload",
        selector: "input[name='icon']",
        value: "docs/phase9-stripe-submission/assets/icon-1200x1200.png",
      },
      {
        number: 8,
        description: "Upload screenshot 1",
        type: "upload",
        selector: "input[name='screenshot_1']",
        value: "docs/phase9-stripe-submission/assets/screenshot-1-dashboard-integration.png",
      },
      {
        number: 9,
        description: "Upload screenshot 2",
        type: "upload",
        selector: "input[name='screenshot_2']",
        value: "docs/phase9-stripe-submission/assets/screenshot-2-governance-gate.png",
      },
      {
        number: 10,
        description: "Upload screenshot 3",
        type: "upload",
        selector: "input[name='screenshot_3']",
        value: "docs/phase9-stripe-submission/assets/screenshot-3-audit-trail.png",
      },
      {
        number: 11,
        description: "Configure OAuth redirect URI 1",
        type: "fill",
        selector: "input[name='redirect_uri_1']",
        value: "https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback",
      },
      {
        number: 12,
        description: "Configure OAuth redirect URI 2",
        type: "fill",
        selector: "input[name='redirect_uri_2']",
        value: "https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback",
      },
      {
        number: 13,
        description: "Select charge_read permission",
        type: "click",
        selector: "input[name='permission_charge_read']",
      },
      {
        number: 14,
        description: "Fill webhook endpoint",
        type: "fill",
        selector: "input[name='webhook_endpoint']",
        value: "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events",
      },
      {
        number: 15,
        description: "Enable webhook events",
        type: "click",
        selector: "input[name='webhook_events']",
      },
      {
        number: 16,
        description: "Fill support email",
        type: "fill",
        selector: "input[name='support_email']",
        value: "t.dealer01@dsg.pics",
      },
      {
        number: 17,
        description: "Fill privacy policy URL",
        type: "fill",
        selector: "input[name='privacy_policy']",
        value: "https://dsg.pics/privacy",
      },
      {
        number: 18,
        description: "Fill terms of service URL",
        type: "fill",
        selector: "input[name='terms_of_service']",
        value: "https://dsg.pics/terms",
      },
      {
        number: 19,
        description: "Review submission details",
        type: "verify",
      },
      {
        number: 20,
        description: "Submit for review",
        type: "click",
        selector: "button[data-test-id='submit-app']",
      },
    ];
  }
}
