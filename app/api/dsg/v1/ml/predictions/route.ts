export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

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
    const model_id = searchParams.get("model_id");
    const anomaly_id = searchParams.get("anomaly_id");
    const prediction_type = searchParams.get("prediction_type");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_ml_predictions")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (model_id) {
      query = query.eq("model_id", model_id);
    }

    if (anomaly_id) {
      query = query.eq("anomaly_id", anomaly_id);
    }

    if (prediction_type) {
      query = query.eq("prediction_type", prediction_type);
    }

    const { data: predictions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const confidenceStats = (predictions || []).reduce(
      (acc: any, p: any) => ({
        total: acc.total + 1,
        sum: acc.sum + p.confidence_score,
        min: Math.min(acc.min, p.confidence_score),
        max: Math.max(acc.max, p.confidence_score),
      }),
      { total: 0, sum: 0, min: 1, max: 0 }
    );

    const confidenceAvg =
      confidenceStats.total > 0 ? confidenceStats.sum / confidenceStats.total : 0;

    const driftCount = (predictions || []).filter((p: any) => p.model_drift_detected).length;

    return NextResponse.json({
      total: predictions?.length || 0,
      predictions: predictions || [],
      statistics: {
        confidence_avg: parseFloat(confidenceAvg.toFixed(3)),
        confidence_min: parseFloat(confidenceStats.min.toFixed(3)),
        confidence_max: parseFloat(confidenceStats.max.toFixed(3)),
        drift_detected_count: driftCount,
        drift_percentage:
          predictions && predictions.length > 0
            ? ((driftCount / predictions.length) * 100).toFixed(1) + "%"
            : "0%",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      org_id,
      workspace_id,
      model_id,
      anomaly_id,
      input_data,
      prediction_type = "anomaly_score",
      predicted_value,
      predicted_class,
      confidence_score,
      inference_time_ms,
      inference_method = "real_time",
      actual_value,
      explanation,
      contributing_features,
    } = body;

    if (!org_id || !workspace_id || !model_id || !input_data || confidence_score === undefined || inference_time_ms === undefined) {
      return NextResponse.json(
        {
          error:
            "org_id, workspace_id, model_id, input_data, confidence_score, and inference_time_ms are required",
        },
        { status: 400 }
      );
    }

    if (confidence_score < 0 || confidence_score > 1) {
      return NextResponse.json(
        { error: "confidence_score must be between 0 and 1" },
        { status: 400 }
      );
    }

    const { data: stored, error } = await (supabase as any)
      .from("dsg_ml_predictions")
      .insert({
        org_id,
        workspace_id,
        model_id,
        anomaly_id: anomaly_id || null,
        input_data,
        prediction_type,
        predicted_value: predicted_value || null,
        predicted_class: predicted_class || null,
        confidence_score,
        inference_time_ms,
        inference_method,
        actual_value: actual_value || null,
        prediction_correct: actual_value !== undefined ? predicted_value === actual_value : null,
        model_drift_detected: false,
        explanation: explanation || null,
        contributing_features: contributing_features || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to store prediction: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prediction_id: stored.id,
      model_id: stored.model_id,
      confidence_score: stored.confidence_score,
      inference_time_ms: stored.inference_time_ms,
      created_at: stored.created_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
