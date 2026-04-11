/**
 * VoiceProfiler
 * Extracts structured signal data from user's sent emails to mimic their voice.
 * Performance-focused: uses regex and stats for most signals.
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
    
    let lowercaseCount = 0;
    let totalChars = 0;
    let alphabeticChars = 0;
    let ellipsesCount = 0;
    let exclamationCount = 0;
    let noPeriodsCount = 0;
    let totalBody = "";

    const greetings = [];
    const signOffs = [];
    const sampleCount = emailBodies.length;

    emailBodies.forEach(body => {
      const trimmed = body.trim();
      if (!trimmed) return;
      totalBody += " " + trimmed;

      // Sentence stats
      const sentenceArray = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
      totalSentences += sentenceArray.length || 1;
      
      const words = trimmed.split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;

      // Character style
      const chars = trimmed.split('');
      totalChars += chars.length;
      chars.forEach(c => {
        if (/[a-zA-Z]/.test(c)) {
          alphabeticChars++;
          if (c === c.toLowerCase()) lowercaseCount++;
        }
      });

      if (trimmed.includes('...')) ellipsesCount++;
      if (trimmed.includes('!')) exclamationCount++;
      
      const lines = trimmed.split('\n').filter(l => l.trim());
      const linesEndedWithPeriod = lines.filter(l => l.trim().endsWith('.')).length;
      if (linesEndedWithPeriod === 0) noPeriodsCount++;

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

      // Greetings & Sign-offs
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        if (firstLine.length < 25 && /^(hi|hello|hey|dear|yo|gm)/i.test(firstLine)) {
            greetings.push(firstLine);
        }
        
        const lastLine = lines[lines.length - 1].trim();
        if (lastLine.length < 25 && !/[.!?]$/.test(lastLine)) {
            if (!/^(thanks|best|regards|cheers|sent from|talk soon)/i.test(lastLine) && lines.length > 1) {
                const penultimateLine = lines[lines.length - 2].trim();
                if (/^(thanks|best|regards|cheers|talk soon|sincerely|warmly)/i.test(penultimateLine)) {
                    signOffs.push(penultimateLine);
                } else {
                    signOffs.push(lastLine);
                }
            } else {
                signOffs.push(lastLine);
            }
        }
      }
    });

    const avgSentenceLength = totalSentences > 0 ? Math.round(totalWords / totalSentences) : 0;
    
    return {
      avgSentenceLength,
      emojis: {
        frequency: emojiCount / (totalWords || 1),
        top: Array.from(emojiMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0])
      },
      vibe: {
        exclamatory: exclamationCount / sampleCount > 0.3,
        formal: !totalBody.includes("I'm") && !totalBody.includes("don't"),
        lowercaseHeavy: lowercaseCount / (alphabeticChars || 1) > 0.85
      },
      stats: {
        lowercasePercent: Math.round((lowercaseCount / (alphabeticChars || 1)) * 100),
        noGreetingPercent: Math.round((sampleCount - greetings.length) / sampleCount * 100),
        noSignOffPercent: Math.round((sampleCount - signOffs.length) / sampleCount * 100),
        noPeriodsPercent: Math.round((noPeriodsCount / sampleCount) * 100)
      },
      patterns: {
        greetings: [...new Set(greetings)].slice(0, 3),
        signOffs: [...new Set(signOffs)].slice(0, 3)
      },
      fillers: Array.from(fillerWordMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(f => f[0]),
      replyLength: (totalWords / sampleCount) > 60 ? 'detailed' : 'concise'
    };
  }

  /**
   * Generates a compact system prompt block from signals
   */
  static generatePromptFragment(signals, fuzzyVibe = {}) {
    if (!signals) return "";

    const { avgSentenceLength, vibe, emojis, fillers, patterns, replyLength } = signals;
    const { tone = "professional", slang = "none" } = fuzzyVibe;

    return `
User Voice Profile (Mimic this style precisely):
- Avg sentence length: ${avgSentenceLength} words
- Tone: ${tone}, ${vibe.lowercaseHeavy ? 'lowercase-heavy' : 'standard casing'}
- Punctuation: ${vibe.noPeriodsPercent > 50 ? 'minimal, often omits periods' : 'standard'}
- Emojis: ${emojis.frequency > 0 ? `${emojis.top.join(' ')}` : 'never uses'}
- Common fillers/slang: ${[...fillers, ...(slang !== 'none' ? [slang] : [])].join(', ')}
- Greeting patterns: ${patterns.greetings.length > 0 ? patterns.greetings.join(' or ') : 'none'}
- Sign-off patterns: ${patterns.signOffs.length > 0 ? patterns.signOffs.join(' or ') : 'none'}
- Length preference: ${replyLength}
    `.trim();
  }
}
