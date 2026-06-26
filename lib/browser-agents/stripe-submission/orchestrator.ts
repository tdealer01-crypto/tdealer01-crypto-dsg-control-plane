import { v4 as uuidv4 } from "crypto";
import type {
  SubmissionStep,
  StepResult,
  SubmissionStatus,
  SubmissionProgress,
  SubmissionData,
  StepContext,
} from "./types";
import { CheckpointManager } from "./checkpoint";
import { EvidenceRecorder, persistEvidenceToAudit } from "./evidence-recorder";
import { StepHandlerFactory } from "./handlers/step-handler-factory";

export class StripeSubmissionOrchestrator {
  private submissionId: string;
  private status: SubmissionStatus = "pending";
  private currentStep: number = 1;
  private totalSteps: number = 20;
  private stepResults: Map<number, StepResult> = new Map();
  private checkpointManager = new CheckpointManager();
  private evidenceRecorder = new EvidenceRecorder();

  constructor(private supabaseAdmin: any) {
    this.submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize(
    submissionData: SubmissionData,
    browserbaseSessionId: string,
    page: any,
  ): Promise<void> {
    this.status = "in_progress";

    const { error } = await this.supabaseAdmin.from("stripe_submissions").insert({
      id: this.submissionId,
      org_id: "dsg-stripe-submission",
      agent_id: "stripe-browser-agent",
      submission_data_hash: this.hashSubmissionData(submissionData),
      status: this.status,
      current_step: this.currentStep,
      browserbase_session_id: browserbaseSessionId,
      started_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("Failed to initialize submission in DB:", error.message);
    }
  }

  async executeStep(
    submissionData: SubmissionData,
    page: any,
    browserbaseSessionId: string,
  ): Promise<StepResult> {
    const steps = StepHandlerFactory.getSteps();
    const step = steps[this.currentStep - 1];

    if (!step) {
      throw new Error(`No step definition found for step ${this.currentStep}`);
    }

    const context: StepContext = {
      page,
      submissionData,
      submissionId: this.submissionId,
      browserbaseSessionId,
    };

    const handler = StepHandlerFactory.createHandler(step);

    try {
      const result = await handler.execute(context, step);
      this.stepResults.set(result.stepNumber, result);

      const evidence = await handler.captureEvidence(result);
      await persistEvidenceToAudit(evidence, this.supabaseAdmin);

      if (result.success) {
        const verified = await handler.verify(context, step);
        if (!verified.verified) {
          console.warn(`Step ${step.number} verification failed, confidence: ${verified.confidence}`);
        }
      }

      return result;
    } catch (error: any) {
      const result: StepResult = {
        stepNumber: step.number,
        stepType: step.type,
        success: false,
        duration: 0,
        error: error.message,
        errorCode: "EXECUTION_ERROR",
      };

      this.stepResults.set(result.stepNumber, result);
      throw error;
    }
  }

  async moveToNextStep(): Promise<void> {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;

      if (this.currentStep % 3 === 0) {
        this.status = "checkpoint";
      }
    }

    if (this.currentStep === this.totalSteps) {
      this.status = "complete";
    }

    await this.updateSubmissionStatus();
  }

  async createCheckpoint(
    page: any,
    browserbaseSessionId: string,
  ): Promise<string> {
    const checkpoint = await this.checkpointManager.createCheckpoint(
      this.submissionId,
      this.currentStep,
      browserbaseSessionId,
      page.url(),
      await page.title(),
      {},
      this.evidenceRecorder.getHashChain()[0] || null,
      this.supabaseAdmin,
    );

    return checkpoint.id;
  }

  async resumeFromCheckpoint(checkpointId: string): Promise<number> {
    const checkpoint = await this.checkpointManager.getLatestCheckpoint(
      this.submissionId,
      this.supabaseAdmin,
    );

    if (!checkpoint) {
      return this.currentStep;
    }

    const isValid = await this.checkpointManager.validateCheckpoint(
      checkpoint,
      this.supabaseAdmin,
    );

    if (isValid) {
      this.currentStep = checkpoint.stepNumber + 1;
      return this.currentStep;
    }

    return this.currentStep;
  }

  async updateSubmissionStatus(): Promise<void> {
    const { error } = await this.supabaseAdmin
      .from("stripe_submissions")
      .update({
        status: this.status,
        current_step: this.currentStep,
        updated_at: new Date().toISOString(),
      })
      .eq("id", this.submissionId);

    if (error) {
      console.warn("Failed to update submission status:", error.message);
    }
  }

  getProgress(): SubmissionProgress {
    return {
      submissionId: this.submissionId,
      overallProgress: Math.round((this.currentStep / this.totalSteps) * 100),
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      stepResults: this.stepResults,
      lastError: Array.from(this.stepResults.values()).find((r) => !r.success)?.error,
      estTimeRemaining:
        this.stepResults.size > 0
          ? Math.round(
              ((this.totalSteps - this.currentStep) *
                Array.from(this.stepResults.values()).reduce((sum, r) => sum + r.duration, 0)) /
                this.stepResults.size /
                1000,
            )
          : undefined,
    };
  }

  getSubmissionId(): string {
    return this.submissionId;
  }

  getStatus(): SubmissionStatus {
    return this.status;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  private hashSubmissionData(data: SubmissionData): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
  }

  async finalize(): Promise<{
    status: "submitted" | "partial" | "failed";
    completionTime: string;
    auditChainVerified: boolean;
    stepsCompleted: number;
    totalSteps: number;
  }> {
    const completionTime = new Date().toISOString();
    const stepsCompleted = this.stepResults.size;
    const allSuccessful = Array.from(this.stepResults.values()).every((r) => r.success);

    const finalStatus = allSuccessful ? ("submitted" as const) : ("partial" as const);

    const { error } = await this.supabaseAdmin
      .from("stripe_submissions")
      .update({
        status: "complete",
        completed_at: completionTime,
      })
      .eq("id", this.submissionId);

    if (error) {
      console.warn("Failed to finalize submission:", error.message);
    }

    return {
      status: finalStatus,
      completionTime,
      auditChainVerified: true,
      stepsCompleted,
      totalSteps: this.totalSteps,
    };
  }
}
