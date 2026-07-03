/**
 * GET /api/voice/stream - WebSocket/SSE endpoint for real-time voice streaming
 * Handles bidirectional audio streaming with transcription
 * Using Server-Sent Events for real-time updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { VoiceService } from '@/lib/voice/voice-service';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel hobby plan caps serverless maxDuration at 300s

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await (supabase as any)
      .from('gateway_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Create SSE stream response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'connected', session_id: sessionId })}\n\n`
            )
          );

          // Initialize voice service
          const voiceService = new VoiceService({
            stt_provider: (process.env.VOICE_STT_PROVIDER || 'deepgram') as any,
            tts_provider: (process.env.VOICE_TTS_PROVIDER || 'elevenlabs') as any,
            deepgram_api_key: process.env.DEEPGRAM_API_KEY || '',
            assembly_api_key: process.env.ASSEMBLY_API_KEY || '',
            openai_api_key: process.env.OPENAI_API_KEY || '',
            google_api_key: process.env.GOOGLE_API_KEY || '',
            elevenlabs_api_key: process.env.ELEVENLABS_API_KEY || '',
            elevenlabs_voice_id: process.env.ELEVENLABS_VOICE_ID || 'default',
            wake_word_provider: (process.env.WAKE_WORD_PROVIDER || 'picovoice') as any,
            picovoice_access_key: process.env.PICOVOICE_ACCESS_KEY || '',
          });

          // Listen for voice messages in gateway_events
          // Poll database for new messages (in production, use real WebSocket)
          const pollInterval = setInterval(async () => {
            try {
              // Get recent messages for this session
              const { data: messages, error } = await (supabase as any)
                .from('voice_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: false })
                .limit(10);

              if (!error && messages && messages.length > 0) {
                messages.forEach((msg) => {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: 'message', data: msg })}\n\n`
                    )
                  );
                });
              }
            } catch (err) {
              console.error('Stream poll error:', err);
            }
          }, 3000); // Poll every 3 seconds

          // Handle request abort
          request.signal.addEventListener('abort', () => {
            clearInterval(pollInterval);
            controller.close();
          });

          // Send keepalive pings
          const keepaliveInterval = setInterval(() => {
            controller.enqueue(encoder.encode(`:keepalive\n\n`));
          }, 30000); // Every 30 seconds

          // Cleanup on stream close
          return () => {
            clearInterval(pollInterval);
            clearInterval(keepaliveInterval);
          };
        } catch (error) {
          console.error('Stream start error:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return handleApiError('/api/voice/stream GET', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { session_id, audio_chunk, format = 'opus' } = body;

    if (!session_id || !audio_chunk) {
      return NextResponse.json(
        { error: 'Session ID and audio chunk are required' },
        { status: 400 }
      );
    }

    // Verify session exists
    const { data: session, error: sessionError } = await (supabase as any)
      .from('gateway_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Initialize voice service
    const voiceService = new VoiceService({
      stt_provider: (process.env.VOICE_STT_PROVIDER || 'deepgram') as any,
      tts_provider: (process.env.VOICE_TTS_PROVIDER || 'elevenlabs') as any,
      deepgram_api_key: process.env.DEEPGRAM_API_KEY || '',
      assembly_api_key: process.env.ASSEMBLY_API_KEY || '',
      openai_api_key: process.env.OPENAI_API_KEY || '',
      google_api_key: process.env.GOOGLE_API_KEY || '',
      elevenlabs_api_key: process.env.ELEVENLABS_API_KEY || '',
      elevenlabs_voice_id: process.env.ELEVENLABS_VOICE_ID || 'default',
      wake_word_provider: (process.env.WAKE_WORD_PROVIDER || 'picovoice') as any,
      picovoice_access_key: process.env.PICOVOICE_ACCESS_KEY || '',
    });

    // Decode audio chunk (assuming base64 or raw buffer)
    let audioBuffer: Buffer;
    if (typeof audio_chunk === 'string') {
      audioBuffer = Buffer.from(audio_chunk, 'base64');
    } else {
      audioBuffer = Buffer.from(audio_chunk);
    }

    // Transcribe audio chunk
    const result = await voiceService.speechToText({
      audio: audioBuffer,
      format: format as any,
      language: 'en',
    });

    // Store message
    await (supabase as any).from('voice_messages').insert([
      {
        session_id: session_id,
        message_type: 'audio',
        direction: 'inbound',
        text_content: result.text,
        audio_metadata: {
          provider: process.env.VOICE_STT_PROVIDER || 'deepgram',
          duration: result.duration,
          confidence: result.confidence,
          format,
        },
      },
    ]);

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      duration: result.duration,
    });
  } catch (error) {
    return handleApiError('/api/voice/stream POST', error);
  }
}
