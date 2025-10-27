import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define the OpenAI voice type
type OpenAIVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar' | 'fable' | 'onyx' | 'nova';

// Multiple API keys for rotation (same as main route)
const API_KEYS = [
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3,
].filter(Boolean);

export async function POST(request: NextRequest) {
  try {
    // Check if we have any API keys
    if (API_KEYS.length === 0) {
      return NextResponse.json({ 
        error: 'No OpenAI API keys configured.' 
      }, { status: 500 });
    }

    const { text, voice } = await request.json();

    if (!text || !voice) {
      return NextResponse.json({ 
        error: 'Text and voice are required' 
      }, { status: 400 });
    }

    // Validate voice option
    const validVoices: OpenAIVoice[] = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
    if (!validVoices.includes(voice as OpenAIVoice)) {
      return NextResponse.json({ 
        error: 'Invalid voice option' 
      }, { status: 400 });
    }

    console.log(`Generating voice preview for: ${voice}`);

    // Try each API key until one works
    let lastError = null;
    
    for (let i = 0; i < API_KEYS.length; i++) {
      const apiKey = API_KEYS[i];
      console.log(`Trying API key ${i + 1}/${API_KEYS.length} for voice preview`);
      
      try {
        const openai = new OpenAI({
          apiKey: apiKey,
        });

        // Generate short preview audio
        const mp3 = await openai.audio.speech.create({
          model: "tts-1", // Use faster model for previews
          voice: voice as OpenAIVoice,
          input: text,
          speed: 1.0, // Normal speed for previews
          response_format: "mp3",
        });

        // Convert to buffer
        const audioBuffer = Buffer.from(await mp3.arrayBuffer());

        console.log(`✅ Voice preview generated successfully with API key ${i + 1}: ${audioBuffer.length} bytes`);

        // Return audio file
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600', // Cache previews for 1 hour
          },
        });

      } catch (keyError) {
        console.error(`❌ API key ${i + 1} failed for voice preview:`, keyError);
        lastError = keyError;
        
        // If this is a quota error, try the next key
        if (keyError instanceof Error && 
            (keyError.message.includes('quota') || 
             keyError.message.includes('429') || 
             keyError.message.includes('insufficient_quota'))) {
          console.log(`API key ${i + 1} quota exceeded, trying next key for preview...`);
          continue;
        }
        
        // If it's not a quota error, break and return the error
        throw keyError;
      }
    }

    // If we get here, all API keys failed
    console.error('❌ All API keys failed for voice preview');
    throw lastError || new Error('All API keys have exceeded their quota');

  } catch (error) {
    console.error('Error generating voice preview:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Quota and rate limiting
      if (errorMessage.includes('quota') || 
          errorMessage.includes('rate limit') || 
          errorMessage.includes('too many requests') ||
          errorMessage.includes('insufficient_quota') ||
          errorMessage.includes('all api keys have exceeded') ||
          errorMessage.includes('429')) {
        return NextResponse.json({ 
          error: 'Voice preview unavailable due to API quota limits. The main conversion will still work with billing setup.' 
        }, { status: 429 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to generate voice preview. Please try the main conversion instead.' 
    }, { status: 500 });
  }
}
