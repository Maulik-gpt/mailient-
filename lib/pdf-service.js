/**
 * Ultra-lightweight PDF text extractor using heuristics
 * Not perfect, but better than nothing for deep context
 */
export function extractTextFromPdf(base64) {
  try {
    const raw = Buffer.from(base64.split(',')[1] || base64, 'base64').toString('latin1');
    
    // Search for PDF text blocks: (text) Tj or (text) TJ
    // This handles uncompressed PDFs or some simple compressions
    const matches = raw.match(/\((.*?)\)\s*T[jJ]/g);
    if (!matches) return '';
    
    let text = matches.map(m => {
      const inner = m.match(/\((.*?)\)/)[1];
      // Basic escape sequence handling
      return inner.replace(/\\([\(\)\\])/g, '$1');
    }).join(' ');
    
    return text.substring(0, 10000); // Limit context
  } catch (e) {
    console.error('PDF extraction failed:', e);
    return '';
  }
}
