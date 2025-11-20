import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cleanAndProcessText, optimizeTextForSpeech, splitTextIntoChunks } from '@/lib/textProcessing';
import { extractTextFromPdfBuffer } from '@/lib/pdfTextExtractor';

// Define the OpenAI voice type
type OpenAIVoice = 'alloy' | 'ash' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

// Voice settings interface
interface VoiceSettings {
  instructions?: string;
  speed?: number;
}

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const text = await extractTextFromPdfBuffer(buffer);
    console.log('PDF parsed successfully via pdfjs-dist');
    return text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('PDF extraction failed:', errorMessage);
    throw new Error(
      `PDF text extraction failed. Error: ${errorMessage}. ` +
      `Please ensure the PDF contains selectable text and try again.`
    );
  }
}

// Simple language detection by script ranges (dominant for the whole document)
function detectLanguage(text: string): 'arabic' | 'devanagari' | 'latin' | 'cyrillic' | 'unknown' {
  const counts = { arabic: 0, devanagari: 0, latin: 0, cyrillic: 0 } as Record<string, number>;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0600 && code <= 0x06FF) counts.arabic++;
    else if (code >= 0x0900 && code <= 0x097F) counts.devanagari++;
    else if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) counts.latin++;
    else if (code >= 0x0400 && code <= 0x04FF) counts.cyrillic++;
  }
  const entries = Object.entries(counts) as [keyof typeof counts, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [top, count] = entries[0];
  if (count === 0) return 'unknown';
  return top as any;
}

function langInstruction(lang: ReturnType<typeof detectLanguage>): string | undefined {
  switch (lang) {
    case 'arabic':
      return 'Speak fluent Urdu/Arabic with natural pronunciation and clear enunciation.';
    case 'devanagari':
      return 'Speak fluent Hindi with natural pronunciation and clear enunciation.';
    case 'cyrillic':
      return 'Speak the detected Cyrillic-script language with natural pronunciation and clear enunciation.';
    case 'latin':
      return 'Speak fluent English with clear enunciation and natural pacing.';
    default:
      return undefined;
  }
}

// Use single API key from environment
const API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  // Add at the very start of POST function
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  try {
    // Check if we have an API key
    if (!API_KEY) {
      return NextResponse.json(
        {
          error:
            "No OpenAI API key configured. Please add OPENAI_API_KEY to environment variables.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;
    const inputText = formData.get("text") as string | null;
    const selectedVoice = (formData.get("voice") as string) || "fable";
    const instructions = (formData.get("instructions") as string) || undefined;
    const speedStr = formData.get("speed") as string;
    const speed = speedStr ? parseFloat(speedStr) : 1.0;

    // Get individual settings for detailed logging (kept)
    const emotionalRange =
      (formData.get("emotionalRange") as string) || "Natural";
    const tone = (formData.get("tone") as string) || "Natural";
    const intonation = (formData.get("intonation") as string) || "Natural";
    const customInstructions =
      (formData.get("customInstructions") as string) || undefined;

    // Validate that either PDF or text is provided
    if (!file && !inputText) {
      return NextResponse.json(
        { error: "No PDF file or text provided" },
        { status: 400 }
      );
    }

    if (inputText && inputText.trim().length === 0) {
      return NextResponse.json(
        { error: "Text input is empty" },
        { status: 400 }
      );
    }

    if (inputText && inputText.length > 1000) {
      return NextResponse.json(
        { error: "Text input exceeds 1000 character limit" },
        { status: 400 }
      );
    }

    // Validate voice option
    const validVoices: OpenAIVoice[] = [
      "alloy",
      "ash",
      "coral",
      "echo",
      "fable",
      "onyx",
      "nova",
      "sage",
      "shimmer",
    ];
    const voice = validVoices.includes(selectedVoice as OpenAIVoice)
      ? selectedVoice
      : "fable";

    // LOG ALL PARAMETERS FOR VERIFICATION - DETAILED
    console.log("═══════════════════════════════════════════════════");
    console.log("🎙️  RECEIVED VOICE GENERATION PARAMETERS");
    console.log("═══════════════════════════════════════════════════");
    console.log("🎤 Voice Selection:");
    console.log("   📝 Selected Voice:", selectedVoice);
    console.log("   ✅ Validated Voice:", voice);
    console.log("");
    console.log("⚡ Speed:", speed);
    console.log("");
    console.log("🎭 Combined Instructions:", instructions || "(none)");
    console.log("");
    console.log("📋 Individual Voice Settings:");
    console.log("   - Emotional Range:", emotionalRange);
    console.log("   - Tone:", tone);
    console.log("   - Intonation:", intonation);
    console.log("   - Custom Instructions:", customInstructions || "(none)");
    console.log("");
    console.log("📄 Input Info:");
    if (file) {
      console.log("   - Type: PDF File");
      console.log("   - Name:", file.name);
      console.log("   - Size:", (file.size / 1024).toFixed(2), "KB");
    } else if (inputText) {
      console.log("   - Type: Text Input");
      console.log("   - Length:", inputText.length, "characters");
    }
    console.log("═══════════════════════════════════════════════════");

    try {
      const openai = new OpenAI({
        apiKey: API_KEY,
      });

      // Get text from PDF or use provided text
      let rawText: string;

      if (file) {
        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        // Extract text from PDF
        rawText = await extractTextFromPDF(arrayBuffer);
      } else if (inputText) {
        // Use provided text directly
        rawText = inputText.trim();
      } else {
        return NextResponse.json(
          { error: "No input provided" },
          { status: 400 }
        );
      }

      if (!rawText || rawText.trim().length < 10) {
        const errorMsg = file
          ? "Could not extract readable text from PDF"
          : "Text input is too short (minimum 10 characters)";
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      // Clean and process the text
      let processedText = cleanAndProcessText(rawText);

      // Optimize for speech synthesis
      processedText = optimizeTextForSpeech(processedText);

      console.log(`📄 Total text length: ${processedText.length} characters`);

      // Detect dominant language once for whole document (before chunking)
      const dominantLang = detectLanguage(processedText);
      const perDocLangInstruction = langInstruction(dominantLang);

      // Build comprehensive instructions (single-language directive only)
      let finalInstructions = instructions;
      if (!finalInstructions || !finalInstructions.trim()) {
        const instructionParts: string[] = [];
        if (perDocLangInstruction) instructionParts.push(perDocLangInstruction);
        if (emotionalRange && emotionalRange !== "Natural")
          instructionParts.push(emotionalRange.toLowerCase());
        if (tone && tone !== "Natural")
          instructionParts.push(tone.toLowerCase());
        if (intonation && intonation !== "Natural")
          instructionParts.push(intonation.toLowerCase());
        if (customInstructions) instructionParts.push(customInstructions);
        finalInstructions =
          instructionParts.length > 0
            ? instructionParts.join(". ") + "."
            : undefined;
      } else {
        // Prepend detected language hint to provided instructions
        finalInstructions = perDocLangInstruction
          ? `${perDocLangInstruction} ${finalInstructions}`.trim()
          : finalInstructions.trim();
      }

      console.log(`🈶 Dominant language detected: ${dominantLang}`);

      // Split into chunks if text is longer than 3800 characters (safe margin for 4096 limit)
      const MAX_CHUNK_SIZE = 3800;
      const chunks =
        processedText.length > MAX_CHUNK_SIZE
          ? splitTextIntoChunks(processedText, MAX_CHUNK_SIZE)
          : [{ text: processedText, page: 1, length: processedText.length }];

      console.log(`📦 Number of chunks: ${chunks.length}`);

      // Generate audio for each chunk sequentially
      const audioChunks: Uint8Array[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(
          `\n🎙️  Processing chunk ${i + 1}/${chunks.length} (${
            chunk.length
          } characters)`
        );

        // Generate speech using OpenAI TTS with advanced control
        const speechParams: any = {
          model: "gpt-4o-mini-tts",
          voice: voice as OpenAIVoice,
          input: chunk.text,
          speed: speed, // User-controlled speed
          response_format: "mp3",
        };

        if (finalInstructions && finalInstructions.trim()) {
          speechParams.instructions = finalInstructions;
        }

        // LOG THE FINAL PARAMETERS BEING SENT TO OPENAI
        console.log("═══════════════════════════════════════════════════");
        console.log(
          `🚀 SENDING CHUNK ${i + 1}/${chunks.length} TO OPENAI TTS API:`
        );
        console.log("═══════════════════════════════════════════════════");
        console.log("🤖 Model:", speechParams.model);
        console.log("🎤 Voice:", speechParams.voice);
        console.log("⚡ Speed:", speechParams.speed);
        console.log(
          "📝 Chunk Length:",
          speechParams.input.length,
          "characters"
        );
        if (speechParams.instructions) {
          console.log("📤 Instructions:", speechParams.instructions);
        }
        console.log("═══════════════════════════════════════════════════");

        const mp3 = await openai.audio.speech.create(speechParams);
        const chunkAudio = new Uint8Array(await mp3.arrayBuffer());
        audioChunks.push(chunkAudio);

        console.log(
          `✅ Chunk ${i + 1}/${chunks.length} generated: ${(
            chunkAudio.byteLength / 1024
          ).toFixed(2)} KB`
        );
      }

      // Concatenate all audio chunks into a single file
      // MP3 files can be concatenated by simply appending the raw data
      let finalAudio: Uint8Array;
      if (audioChunks.length === 1) {
        // Single chunk, no need to concatenate
        finalAudio = audioChunks[0];
      } else {
        // Multiple chunks - concatenate MP3 files
        const totalLength = audioChunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        );
        finalAudio = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          finalAudio.set(chunk, offset);
          offset += chunk.length;
        }
        console.log(
          `\n✅ All chunks concatenated: ${chunks.length} chunks, ${(
            finalAudio.byteLength / 1024
          ).toFixed(2)} KB total`
        );
      }

      const audioUint8 = finalAudio;

      console.log("");
      console.log("═══════════════════════════════════════════════════");
      console.log("✅ SUCCESS! Audio Generated with Voice Settings");
      console.log("═══════════════════════════════════════════════════");
      console.log(
        "📊 Total Audio Size:",
        (audioUint8.byteLength / 1024).toFixed(2),
        "KB"
      );
      console.log("📦 Total Chunks:", chunks.length);
      console.log("📝 Total Text Length:", processedText.length, "characters");
      console.log("🎤 Voice Used:", voice);
      console.log("⚡ Speed:", speed);
      console.log("🈶 Document language:", dominantLang);
      if (finalInstructions) {
        console.log("🎭 Voice Style Applied:", finalInstructions);
      } else {
        console.log("🎭 Voice Style: Default voice characteristics");
      }
      console.log("═══════════════════════════════════════════════════");
      console.log("");

      // Return audio file as Uint8Array
      return new NextResponse(audioUint8 as any, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": audioUint8.byteLength.toString(),
          "Content-Disposition": 'attachment; filename="converted-audio.mp3"',
          "Cache-Control": "no-cache",
          "X-Detected-Language": dominantLang || "unknown",
          "X-Text-Length": processedText.length.toString(),
        },
      });
    } catch (error) {
      console.error("❌ API call failed:", error);
      if (error instanceof Error) {
        console.error("API Error Details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("❌ Error converting PDF to audio:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      const errorMessage = error.message.toLowerCase();

      // API Key issues
      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("401")
      ) {
        return NextResponse.json(
          {
            error:
              "OpenAI API key not configured or invalid. Please check your OPENAI_API_KEY in environment variables.",
          },
          { status: 401 }
        );
      }

      // Quota and rate limiting (429 errors)
      if (
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("too many requests") ||
        errorMessage.includes("insufficient_quota") ||
        errorMessage.includes("all api keys have exceeded") ||
        errorMessage.includes("429")
      ) {
        return NextResponse.json(
          {
            error:
              "All OpenAI API keys have exceeded their quota. Solutions: 1) Add billing to your OpenAI accounts at platform.openai.com/account/billing 2) Wait for quota reset 3) Try again later 4) Use smaller PDFs to reduce usage",
          },
          { status: 429 }
        );
      }

      // Billing issues (402 errors)
      if (
        errorMessage.includes("billing") ||
        errorMessage.includes("payment") ||
        errorMessage.includes("402")
      ) {
        return NextResponse.json(
          {
            error:
              "OpenAI API billing issue. Please add a payment method at platform.openai.com/account/billing",
          },
          { status: 402 }
        );
      }

      // Model or service issues
      if (
        errorMessage.includes("model") ||
        errorMessage.includes("service") ||
        errorMessage.includes("503")
      ) {
        return NextResponse.json(
          {
            error:
              "OpenAI service temporarily unavailable. Please try again in a few minutes.",
          },
          { status: 503 }
        );
      }

      // PDF extraction errors (including worker errors)
      if (
        errorMessage.includes("pdf") ||
        errorMessage.includes("extract") ||
        errorMessage.includes("text extraction") ||
        errorMessage.includes("worker") ||
        errorMessage.includes("pdf.worker") ||
        errorMessage.includes("cannot find module")
      ) {
        return NextResponse.json(
          {
            error: `PDF text extraction failed: ${error.message}. Please ensure the PDF contains selectable text.`,
          },
          { status: 400 }
        );
      }

      // Return the actual error message for debugging
      return NextResponse.json(
        {
          error: `Conversion failed: ${error.message}. Please check the server logs for more details.`,
        },
        { status: 500 }
      );
    }

    // Generic error with more details
    const errorString = String(error);
    console.error("Unknown error type:", errorString);
    return NextResponse.json(
      {
        error: `Failed to convert to audio: ${errorString}. Please check your internet connection and try again.`,
      },
      { status: 500 }
    );
  }
}
