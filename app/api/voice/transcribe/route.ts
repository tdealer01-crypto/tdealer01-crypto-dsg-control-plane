/**
 * POST /api/voice/transcribe - Convert audio to text
 * Accepts audio file and returns transcription using configured STT provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { VoiceService } from '@/lib/voice/voice-service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();

    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('session_id') as string;
    const language = formData.get('language') as string | undefined;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

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

    // Read audio file as buffer
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBufferNode = Buffer.from(audioBuffer);

    // Initialize voice service with environment config
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

    // Transcribe audio
    const result = await voiceService.speechToText({
      audio: audioBufferNode,
      format: (audioFile.type.split('/')[1] || 'mp3') as any,
      language: language || 'en',
    });

    // Store voice message in database
    const { error: storeError } = await (supabase as any)
      .from('voice_messages')
      .insert([
        {
          session_id: sessionId,
          message_type: 'audio',
          direction: 'inbound',
          text_content: result.text,
          audio_metadata: {
            provider: process.env.VOICE_STT_PROVIDER || 'deepgram',
            duration: result.duration || result.duration_ms,
            confidence: result.confidence,
            language: language || 'en',
          },
        },
      ]);

    if (storeError) {
      console.warn('Failed to store voice message:', storeError);
      // Don't fail the response if storage fails
    }

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      duration: result.duration,
      language: language || 'en',
    });
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to transcribe audio',
      },
      { status: 500 }
    );
  }
}
