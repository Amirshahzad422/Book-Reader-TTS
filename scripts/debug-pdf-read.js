const fs = require('fs');
const path = require('path');

function normalizeExtracted(text) {
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

async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = new Uint8Array(buffer);
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item?.str ?? '');
    const pageText = strings.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (pageText) {
      fullText += (fullText ? '\n\n' : '') + pageText;
    }
  }

  const normalized = normalizeExtracted(fullText);
  if (normalized.length < 10) {
    throw new Error('Extracted text too short or PDF may be image-based.');
  }
  return normalized;
}

async function main() {
  const target = path.resolve(process.cwd(), 'Untitled document.pdf');
  try {
    const text = await extractText(target);
    console.log('OK length', text.length);
    console.log(text.slice(0, 400));
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  }
}

main();

