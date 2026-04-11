/**
 * VoiceProfiler
 * Extracts structured signal data from user's sent emails to mimic their voice.
 * Performance-focused: uses regex and stats for most signals, one LLM call for the vibe.
 */
export class VoiceProfiler {
  /**
   * Extracts signals from a collection of email bodies
   * @param {string[]} emailBodies - Array of cleaned email body strings
   * @returns {Object} Structured voice signals
   */
  static extractSignals(emailBodies) {
    if (!emailBodies || emailBodies.length === 0) return null;

    let totalWords = 0;
    let totalSentences = 0;
    let emojiCount = 0;
    const emojiMap = new Map();
    const fillerWordMap = new Map();
    const fillers = ["tbh", "lmk", "just", "super", "actually", "basically", "literally", "totally", "kind of", "sort of", "maybe", "probably"];
    
    let lowercaseOnlyCount = 0;
    let ellipsesCount = 0;
    let exclamationCount = 0;
    let noPeriodsCount = 0;

    const greetings = [];
    const signOffs = [];

    emailBodies.forEach(body => {
      const trimmed = body.trim();
      if (!trimmed) return;

      // Sentence stats
      const sentenceArray = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
      totalSentences += sentenceArray.length;
      
      const words = trimmed.split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;

      // Character style
      if (trimmed === trimmed.toLowerCase()) lowercaseOnlyCount++;
      if (trimmed.includes('...')) ellipsesCount++;
      if (trimmed.includes('!')) exclamationCount++;
      if (!trimmed.includes('.')) noPeriodsCount++;

      // Emojis (Simple regex)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      const foundEmojis = trimmed.match(emojiRegex);
      if (foundEmojis) {
        emojiCount += foundEmojis.length;
        foundEmojis.forEach(e => emojiMap.set(e, (emojiMap.get(e) || 0) + 1));
      }

      // Fillers
      fillers.forEach(f => {
        const count = (trimmed.match(new RegExp(`\\b${f}\\b`, 'gi')) || []).length;
        if (count > 0) fillerWordMap.set(f, (fillerWordMap.get(f) || 0) + count);
      });

      // Greetings & Sign-offs (line-based extraction)
      const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine.length < 25 && /^(hi|hello|hey|dear|yo|gm)/i.test(firstLine)) {
            greetings.push(firstLine);
        }
        
        const lastLine = lines[lines.length - 1];
        if (lastLine.length < 25 && !/[.!?]$/.test(lastLine)) {
            // Likely a sign-off if it's short and doesn't end with punctuation
            if (!/^(thanks|best|regards|cheers|sent from|talk soon)/i.test(lastLine) && lines.length > 1) {
                // Check if the penultimate line was a sign-off
                const penultimateLine = lines[lines.length - 2];
                if (/^(thanks|best|regards|cheers|talk soon|sincerely|warmly)/i.test(penultimateLine)) {
                    signOffs.push(penultimateLine);
                }
            } else {
                signOffs.push(lastLine);
            }
        }
      }
    });

    const sampleSize = emailBodies.length;
    const avgSentenceLength = totalSentences > 0 ? Math.round(totalWords / totalSentences) : 0;
    
    const topEmojis = Array.from(emojiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    const commonFillers = Array.from(fillerWordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(f => f[0]);

    return {
      avgSentenceLength,
      vibe: {
        lowercaseHeavy: (lowercaseOnlyCount / sampleSize) > 0.4,
        ellipsesFrequent: (ellipsesCount / sampleSize) > 0.2,
        exclamatory: (exclamationCount / sampleSize) > 0.3,
        minimalPunctuation: (noPeriodsCount / sampleSize) > 0.3
      },
      emojis: {
        frequency: (emojiCount / sampleSize).toFixed(2),
        top: topEmojis
      },
      fillers: commonFillers,
      patterns: {
        greetings: [...new Set(greetings)].slice(0, 3),
        signOffs: [...new Set(signOffs)].slice(0, 3)
      },
      replyLength: (totalWords / sampleSize) > 60 ? 'detailed' : 'concise'
    };
  }

  /**
   * Generates a compact system prompt block from signals
   * @param {Object} signals - The signals extracted by extractSignals
   * @param {Object} fuzzyVibe - Tone/Slang from LLM
   * @returns {string} System prompt fragment
   */
  static generatePromptFragment(signals, fuzzyVibe = {}) {
    if (!signals) return "";

    const { avgSentenceLength, vibe, emojis, fillers, patterns, replyLength } = signals;
    const { tone = "professional", slang = "none" } = fuzzyVibe;

    return `
User Voice Profile (Mimic this style precisely):
- Avg sentence length: ${avgSentenceLength} words
- Tone: ${tone}, ${vibe.lowercaseHeavy ? 'lowercase-heavy' : 'standard casing'}
- Punctuation: ${vibe.minimalPunctuation ? 'minimal, often omits periods' : 'standard'} ${vibe.ellipsesFrequent ? ', likes using ellipses (...)' : ''}
- Emojis: ${emojis.frequency > 0 ? `${emojis.top.join(' ')} (freq: ${emojis.frequency})` : 'never uses'}
- Common fillers/slang: ${[...fillers, ...(slang !== 'none' ? [slang] : [])].join(', ')}
- Greeting patterns: ${patterns.greetings.length > 0 ? patterns.greetings.join(' or ') : 'none'}
- Sign-off patterns: ${patterns.signOffs.length > 0 ? patterns.signOffs.join(' or ') : 'none'}
- Length preference: ${replyLength}
    `.trim();
  }
}
