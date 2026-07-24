export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { MLModelManager } from "@/lib/dsg/dashboard/ml-model-manager";

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
    const is_significant = searchParams.get("is_significant");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_ml_model_drift")
      .select("*")
      .eq("org_id", org_id)
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (model_id) {
      query = query.eq("model_id", model_id);
    }

    if (is_significant !== null) {
      query = query.eq("is_significant", is_significant === "true");
    }

    const { data: drifts, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const driftsByType = (drifts || []).reduce((acc: any, d: any) => {
      if (!acc[d.drift_type]) acc[d.drift_type] = 0;
      acc[d.drift_type]++;
      return acc;
    }, {});

    const actionCounts = (drifts || []).reduce((acc: any, d: any) => {
      if (!acc[d.action_recommended]) acc[d.action_recommended] = 0;
      acc[d.action_recommended]++;
      return acc;
    }, {});

    return NextResponse.json({
      total: drifts?.length || 0,
      drifts: drifts || [],
      summary: {
        by_type: driftsByType,
        by_action: actionCounts,
        significant_count: drifts?.filter((d: any) => d.is_significant).length || 0,
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

    const { org_id, model_id, time_window_hours = 24 } = body;

    if (!org_id || !model_id) {
      return NextResponse.json(
        { error: "org_id and model_id are required" },
        { status: 400 }
      );
    }

    const timeWindowMs = time_window_hours * 60 * 60 * 1000;
    const startTime = new Date(Date.now() - timeWindowMs).toISOString();

    const { data: predictions, error: predError } = await (supabase as any)
      .from("dsg_ml_predictions")
      .select("*")
      .eq("org_id", org_id)
      .eq("model_id", model_id)
      .gte("created_at", startTime)
      .order("created_at", { ascending: true });

    if (predError) {
      return NextResponse.json(
        { error: `Error fetching predictions: ${predError.message}` },
        { status: 500 }
      );
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        status: "no_data",
        message: `No predictions found for the specified time window (${time_window_hours} hours)`,
        drift_detected: false,
      });
    }

    const avgConfidence =
      predictions.reduce((sum: number, p: any) => sum + p.confidence_score, 0) /
      predictions.length;
    const avgLatency =
      predictions.reduce((sum: number, p: any) => sum + p.inference_time_ms, 0) /
      predictions.length;

    const baseline = { avgConfidence: 0.75, avgLatency: 50 };
    const confidenceDrift = Math.abs(avgConfidence - baseline.avgConfidence) / baseline.avgConfidence;
    const latencyDrift = Math.abs(avgLatency - baseline.avgLatency) / baseline.avgLatency;

    const driftDetected = confidenceDrift > 0.15 || latencyDrift > 0.25;

    if (driftDetected) {
      const driftType =
        confidenceDrift > 0.15
          ? "prediction_drift"
          : latencyDrift > 0.25
            ? "performance_drift"
            : "data_drift";
      const driftScore = Math.max(confidenceDrift, latencyDrift);
      const isSignificant = driftScore > 0.2;

      const { error: driftError } = await (supabase as any)
        .from("dsg_ml_model_drift")
        .insert({
          org_id,
          model_id,
          drift_type: driftType,
          drift_score: Math.min(driftScore, 1),
          is_significant: isSignificant,
          monitored_metric:
            driftType === "prediction_drift" ? "avg_confidence" : "avg_latency",
          previous_value:
            driftType === "prediction_drift" ? baseline.avgConfidence : baseline.avgLatency,
          current_value: driftType === "prediction_drift" ? avgConfidence : avgLatency,
          change_percent: driftScore * 100,
          action_recommended: isSignificant ? "retrain" : "monitor",
          confidence_in_action: Math.min(driftScore, 1),
        });

      if (driftError) {
        console.error("Error storing drift detection:", driftError);
      }
    }

    return NextResponse.json({
      status: driftDetected ? "drift_detected" : "normal",
      drift_type: driftDetected
        ? confidenceDrift > 0.15
          ? "prediction_drift"
          : "performance_drift"
        : null,
      metrics: {
        predictions_analyzed: predictions.length,
        confidence: {
          baseline: parseFloat(baseline.avgConfidence.toFixed(3)),
          current: parseFloat(avgConfidence.toFixed(3)),
          drift_percent: parseFloat((confidenceDrift * 100).toFixed(1)),
        },
        latency: {
          baseline: parseFloat(baseline.avgLatency.toFixed(1)),
          current: parseFloat(avgLatency.toFixed(1)),
          drift_percent: parseFloat((latencyDrift * 100).toFixed(1)),
        },
      },
      recommendation: driftDetected
        ? Math.max(confidenceDrift, latencyDrift) > 0.2
          ? "retrain"
          : "monitor"
        : "none",
      created_at: new Date().toISOString(),
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
