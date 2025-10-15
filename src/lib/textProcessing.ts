export interface TextChunk {
  text: string;
  page: number;
  length: number;
}

export function cleanAndProcessText(rawText: string): string {
  let text = rawText;
  
  // Remove excessive whitespace and normalize
  text = text
    .replace(/\s+/g, ' ')           // Multiple spaces to single space
    .replace(/\n+/g, ' ')           // Multiple newlines to space
    .replace(/\r+/g, ' ')           // Carriage returns to space
    .replace(/\t+/g, ' ')           // Tabs to space
    .trim();

  // Remove common PDF artifacts
  text = text
    .replace(/\f/g, ' ')            // Form feed characters
    .replace(/[\u0000-\u001F]/g, ' ') // Control characters
    .replace(/\u00A0/g, ' ')        // Non-breaking spaces
    .replace(/\u2022/g, '• ')       // Bullet points
    .replace(/\u2013/g, '-')        // En dash
    .replace(/\u2014/g, '--')       // Em dash
    .replace(/\u201C|\u201D/g, '"') // Smart quotes
    .replace(/\u2018|\u2019/g, "'") // Smart apostrophes

  // Clean up punctuation for better speech
  text = text
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure space after sentence endings
    .replace(/([,;:])\s*/g, '$1 ')          // Ensure space after commas, semicolons, colons
    .replace(/\s+([.!?,:;])/g, '$1')        // Remove space before punctuation
    .replace(/\.{3,}/g, '...')              // Normalize ellipsis
    .replace(/\s+/g, ' ')                   // Final cleanup of multiple spaces

  return text;
}

export function splitTextIntoChunks(text: string, maxChunkSize: number = 4000): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  // Try to split by paragraphs first
  const paragraphs = text.split(/\.\s+(?=[A-Z])/);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const cleanParagraph = paragraph.trim();
    
    // If adding this paragraph would exceed the limit, start a new chunk
    if (currentChunk.length + cleanParagraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        page: chunkIndex + 1,
        length: currentChunk.length
      });
      currentChunk = cleanParagraph;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + cleanParagraph;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      page: chunkIndex + 1,
      length: currentChunk.length
    });
  }
  
  // If we still have chunks that are too large, split them by sentences
  const finalChunks: TextChunk[] = [];
  
  for (const chunk of chunks) {
    if (chunk.length <= maxChunkSize) {
      finalChunks.push(chunk);
    } else {
      // Split large chunks by sentences
      const sentences = chunk.text.split(/(?<=[.!?])\s+/);
      let subChunk = '';
      let subChunkIndex = chunk.page;
      
      for (const sentence of sentences) {
        if (subChunk.length + sentence.length > maxChunkSize && subChunk.length > 0) {
          finalChunks.push({
            text: subChunk.trim(),
            page: subChunkIndex,
            length: subChunk.length
          });
          subChunk = sentence;
          subChunkIndex++;
        } else {
          subChunk += (subChunk ? ' ' : '') + sentence;
        }
      }
      
      if (subChunk.trim()) {
        finalChunks.push({
          text: subChunk.trim(),
          page: subChunkIndex,
          length: subChunk.length
        });
      }
    }
  }
  
  return finalChunks;
}

export function optimizeTextForSpeech(text: string): string {
  let optimized = text;
  
  // Add natural pauses and breathing for human-like speech rhythm
  optimized = optimized
    .replace(/([.!?])\s+/g, '$1... ')      // Natural pause after sentences
    .replace(/([,:;])\s+/g, '$1, ')        // Brief pause after commas
    .replace(/\n\n+/g, '... ')             // Convert paragraph breaks to pauses
    .replace(/\n+/g, ' ')                  // Convert line breaks to spaces
    
  // Handle numbers and abbreviations for natural pronunciation
  optimized = optimized
    .replace(/\b(\d+)%/g, '$1 percent')
    .replace(/\b(\d+)\s*°C/g, '$1 degrees Celsius')
    .replace(/\b(\d+)\s*°F/g, '$1 degrees Fahrenheit')
    .replace(/\b(\d{4})\b/g, (match) => {
      // Handle years naturally (e.g., 2024 -> "twenty twenty-four")
      const year = parseInt(match);
      if (year >= 1900 && year <= 2099) {
        return match; // Let TTS handle years naturally
      }
      return match;
    })
    .replace(/\bDr\./g, 'Doctor')
    .replace(/\bMr\./g, 'Mister')
    .replace(/\bMrs\./g, 'Missus')
    .replace(/\bMs\./g, 'Miss')
    .replace(/\bProf\./g, 'Professor')
    .replace(/\betc\./g, 'etcetera')
    .replace(/\bi\.e\./g, 'that is')
    .replace(/\be\.g\./g, 'for example')
    .replace(/\bvs\./g, 'versus')
    .replace(/\bw\/\b/g, 'with')
    .replace(/\bw\/o\b/g, 'without')
    .replace(/\b&\b/g, 'and')
    .replace(/\bU\.S\./g, 'United States')
    .replace(/\bU\.K\./g, 'United Kingdom')
    .replace(/\bCEO\b/g, 'C E O')
    .replace(/\bAPI\b/g, 'A P I')
    .replace(/\bAI\b/g, 'A I')
    .replace(/\bPDF\b/g, 'P D F')
    .replace(/\bURL\b/g, 'U R L')
    .replace(/\bHTML\b/g, 'H T M L')
    .replace(/\bCSS\b/g, 'C S S')
    .replace(/\bJS\b/g, 'JavaScript')
    
  // Add natural emphasis and intonation cues
  optimized = optimized
    .replace(/\*\*(.*?)\*\*/g, '$1')       // Remove markdown bold but keep emphasis
    .replace(/\*(.*?)\*/g, '$1')           // Remove markdown italic
    .replace(/`(.*?)`/g, '$1')             // Remove code formatting
    .replace(/\[(.*?)\]/g, '$1')           // Remove brackets but keep content
    .replace(/\((.*?)\)/g, ', $1,')        // Convert parentheses to natural pauses
    
  // Clean up multiple spaces and normalize punctuation
  optimized = optimized
    .replace(/\s+/g, ' ')                  // Multiple spaces to single space
    .replace(/\.{3,}/g, '...')             // Normalize ellipsis
    .replace(/([.!?])\s*([.!?])+/g, '$1')  // Remove duplicate punctuation
    .replace(/,\s*,+/g, ',')               // Remove duplicate commas
    
  return optimized.trim();
}
