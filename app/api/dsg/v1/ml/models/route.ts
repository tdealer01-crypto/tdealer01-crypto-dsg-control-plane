export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MLModelManager } from "@/lib/dsg/dashboard/ml-model-manager";
import { handleApiError } from "@/lib/security/api-error";

let supabaseClient: any = null;

function getSupabaseAdmin() {
  if (!supabaseClient) {
    const { createClient } = require("@supabase/supabase-js");
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return supabaseClient;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get("org_id");
    const model_type = searchParams.get("model_type");
    const is_production = searchParams.get("is_production");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_ml_models")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (model_type) {
      query = query.eq("model_type", model_type);
    }

    if (is_production !== null) {
      query = query.eq("is_production", is_production === "true");
    }

    const { data: models, error } = await query;

    if (error) {
      return handleApiError("api/dsg/v1/ml/models", error);
    }

    const modelsByType = (models || []).reduce((acc: any, m: any) => {
      if (!acc[m.model_type]) acc[m.model_type] = 0;
      acc[m.model_type]++;
      return acc;
    }, {});

    const mlManager = new MLModelManager();
    const modelsWithGrades = (models || []).map((m: any) => {
      const performance = mlManager.assessModelPerformance({
        id: m.id,
        orgId: m.org_id,
        modelName: m.model_name,
        modelVersion: m.model_version,
        modelType: m.model_type,
        modelSource: m.model_source,
        modelPath: m.model_path,
        modelHash: m.model_hash,
        accuracy: m.accuracy,
        precision: m.precision,
        recall: m.recall,
        f1Score: m.f1_score,
        trainingDataSize: m.training_data_size,
        trainingCompletedAt: m.training_completed_at,
        lastRetrainedAt: m.last_retrained_at,
        isActive: m.is_active,
        isProduction: m.is_production,
        confidenceThreshold: m.confidence_threshold,
        supportedInputTypes: m.supported_input_types,
        supportedAnomalyTypes: m.supported_anomaly_types,
        latencyMs: m.latency_ms,
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.updated_at),
        createdBy: m.created_by,
      });

      return {
        ...m,
        performance_grade: performance.grade,
        performance_score: performance.overallScore,
        recommendation: performance.recommendation,
      };
    });

    return NextResponse.json({
      total: models?.length || 0,
      models: modelsWithGrades,
      summary: {
        by_type: modelsByType,
        production_count: models?.filter((m: any) => m.is_production).length || 0,
        active_count: models?.filter((m: any) => m.is_active).length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError("api/dsg/v1/ml/models", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      org_id,
      model_name,
      model_version,
      model_type,
      model_source,
      model_path,
      accuracy,
      precision,
      recall,
      f1_score,
      confidence_threshold = 0.7,
      supported_input_types,
      supported_anomaly_types,
      latency_ms,
    } = body;

    if (!org_id || !model_name || !model_version || !model_type || !model_source) {
      return NextResponse.json(
        {
          error:
            "org_id, model_name, model_version, model_type, and model_source are required",
        },
        { status: 400 }
      );
    }

    if (confidence_threshold < 0 || confidence_threshold > 1) {
      return NextResponse.json(
        { error: "confidence_threshold must be between 0 and 1" },
        { status: 400 }
      );
    }

    const mlManager = new MLModelManager();
    const newModel = mlManager.createModel({
      orgId: org_id,
      modelName: model_name,
      modelVersion: model_version,
      modelType: model_type as "anomaly_detection" | "prediction" | "classification",
      modelSource: model_source as "internal" | "external_api" | "huggingface",
      modelPath: model_path,
      accuracy: accuracy || undefined,
      precision: precision || undefined,
      recall: recall || undefined,
      f1Score: f1_score || undefined,
      confidenceThreshold: confidence_threshold,
      supportedInputTypes: supported_input_types,
      supportedAnomalyTypes: supported_anomaly_types,
      latencyMs: latency_ms,
      isActive: false,
      isProduction: false,
    });

    const validation = mlManager.validateModel(newModel);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.errors.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: stored, error } = await (supabase as any)
      .from("dsg_ml_models")
      .insert({
        org_id,
        model_name,
        model_version,
        model_type,
        model_source,
        model_path: model_path || null,
        model_hash: newModel.modelHash,
        accuracy: accuracy || null,
        precision: precision || null,
        recall: recall || null,
        f1_score: f1_score || null,
        confidence_threshold,
        supported_input_types: supported_input_types || null,
        supported_anomaly_types: supported_anomaly_types || null,
        latency_ms: latency_ms || null,
        is_active: false,
        is_production: false,
      })
      .select()
      .single();

    if (error) {
      return handleApiError("api/dsg/v1/ml/models", error);
    }

    return NextResponse.json({
      model_id: stored.id,
      model_name: stored.model_name,
      model_version: stored.model_version,
      model_type: stored.model_type,
      model_hash: stored.model_hash,
      created_at: stored.created_at,
    });
  } catch (error) {
    return handleApiError("api/dsg/v1/ml/models", error);
  }
}
