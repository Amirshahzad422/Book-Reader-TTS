const MIN_TEXT_LENGTH = 10;
let pdfjsPromise: Promise<any> | null = null;

// Use a more reliable import method for serverless environments
// This function ensures pdfjs-dist is loaded correctly in both dev and production
async function loadPdfjs(): Promise<any> {
  try {
    // Use dynamic import with explicit path resolution
    // Try the legacy build which is more compatible with serverless environments
    const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // pdfjs-dist exports its API directly, not as default
    return pdfjsModule;
  } catch (error) {
    // Fallback: try the main build
    try {
      const pdfjsModule = await import('pdfjs-dist');
      return pdfjsModule;
    } catch (fallbackError) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load pdfjs-dist. Please ensure pdfjs-dist is installed and bundled correctly. Details: ${errorMessage}`
      );
    }
  }
}

export function normalizeExtracted(text: string): string {
  text = text
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');

  for (let i = 0; i < 3; i++) {
    const before = text;
    text = text
      .replace(/([\u0600-\u06FF])[\t]+([\u0600-\u06FF])/g, '$1$2')
      .replace(/([\u0600-\u06FF])[\u00A0]+([\u0600-\u06FF])/g, '$1$2')
      .replace(/([\u0600-\u06FF])[\u2000-\u200A]+([\u0600-\u06FF])/g, '$1$2');
    if (text === before) break;
  }

  text = text
    .split(/\r?\n/)
    .map((line) => {
      const arabicCount = (line.match(/[\u0600-\u06FF]/g) || []).length;
      const letterCount = (line.match(/[\p{L}]/gu) || []).length || 1;
      const ratio = arabicCount / letterCount;
      if (ratio >= 0.6) {
        const tokens = line.split(/\s+/).filter(Boolean);
        return tokens.reverse().join(' ');
      }
      return line;
    })
    .join('\n');

  return text.trim();
}

export async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  if (!pdfjsPromise) {
    pdfjsPromise = loadPdfjs();
  }

  let pdfjsLib: any;
  try {
    pdfjsLib = await pdfjsPromise;
  } catch (error) {
    pdfjsPromise = null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load pdfjs-dist. Please reinstall the dependency. Details: ${errorMessage}`
    );
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item?.str ?? '');
    const pageText = strings.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (pageText) {
      fullText += (fullText ? '\n\n' : '') + pageText;
    }
  }

  const normalized = normalizeExtracted(fullText);
  if (normalized.length < MIN_TEXT_LENGTH) {
    throw new Error('Could not extract readable text from PDF. Provide a selectable-text PDF.');
  }

  return normalized;
}

