import { createHash } from "crypto";
import type { Checkpoint } from "./types";

export class CheckpointManager {
  async createCheckpoint(
    submissionId: string,
    stepNumber: number,
    browserbaseSessionId: string,
    pageUrl: string,
    pageTitle: string,
    formData: Record<string, any> | undefined,
    previousHash: string | null,
    supabaseAdmin: any,
  ): Promise<Checkpoint> {
    const checkpointId = `ckpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const checkpointContent = JSON.stringify({
      stepNumber,
      pageUrl,
      formData: formData ? JSON.stringify(formData) : null,
      previousHash,
    });

    const checkpointHash = createHash("sha256").update(checkpointContent).digest("hex");

    const checkpoint: Checkpoint = {
      id: checkpointId,
      submissionId,
      stepNumber,
      browserbaseSessionId,
      pageUrl,
      pageTitle,
      formData,
      previousHash,
      checkpointHash,
      timestamp,
    };

    // Persist checkpoint
    const { error } = await supabaseAdmin.from("stripe_submission_checkpoints").insert({
      id: checkpointId,
      submission_id: submissionId,
      step_number: stepNumber,
      browserbase_session_id: browserbaseSessionId,
      page_url: pageUrl,
      page_title: pageTitle,
      form_data: formData || {},
      previous_hash: previousHash,
      checkpoint_hash: checkpointHash,
      created_at: timestamp,
    });

    if (error) {
      console.warn("Failed to persist checkpoint:", error.message);
    }

    return checkpoint;
  }

  async getLatestCheckpoint(submissionId: string, supabaseAdmin: any): Promise<Checkpoint | null> {
    const { data, error } = await supabaseAdmin
      .from("stripe_submission_checkpoints")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      submissionId: data.submission_id,
      stepNumber: data.step_number,
      browserbaseSessionId: data.browserbase_session_id,
      pageUrl: data.page_url,
      pageTitle: data.page_title,
      formData: data.form_data,
      previousHash: data.previous_hash,
      checkpointHash: data.checkpoint_hash,
      timestamp: data.created_at,
    };
  }

  async validateCheckpoint(checkpoint: Checkpoint, supabaseAdmin: any): Promise<boolean> {
    if (!checkpoint || !checkpoint.checkpointHash) {
      return false;
    }

    const content = JSON.stringify({
      stepNumber: checkpoint.stepNumber,
      pageUrl: checkpoint.pageUrl,
      formData: checkpoint.formData ? JSON.stringify(checkpoint.formData) : null,
      previousHash: checkpoint.previousHash,
    });

    const recomputedHash = createHash("sha256").update(content).digest("hex");
    return recomputedHash === checkpoint.checkpointHash;
  }

  async pruneOldCheckpoints(submissionId: string, maxAge: number, supabaseAdmin: any): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAge).toISOString();

    await supabaseAdmin
      .from("stripe_submission_checkpoints")
      .delete()
      .eq("submission_id", submissionId)
      .lt("created_at", cutoffTime);
  }
}
