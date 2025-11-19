export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdfBuffer } from '@/lib/pdfTextExtractor';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    if (!file) return NextResponse.json({ ok: false, error: 'No PDF file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const text = await extractTextFromPdfBuffer(arrayBuffer);

    const dominantLanguage = detectLanguage(text);
    const sample = text.slice(0, 600);

    return NextResponse.json({
      ok: true,
      length: text.length,
      dominantLanguage,
      sample,
      extractor: 'pdfjs-dist',
    });
  } catch (e: any) {
    console.error('Test-read failed:', e);
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Failed to read PDF',
    }, { status: 500 });
  }
}
