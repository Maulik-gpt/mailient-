/**
 * Intent Classifier (F1)
 *
 * Classifies the incoming user message into one of seven intent buckets so the
 * loop can decide whether to invoke the 5-VA dispatch reflex (tools) or just
 * answer conversationally. This kills the "Who are you?" → calendar tool
 * dispatch bug.
 *
 * Implementation: regex-based heuristic — zero LLM cost, sub-millisecond, and
 * fully deterministic. The plan called for a 50ms LLM hop but for these
 * obvious cases a regex catches them with higher reliability and no API cost.
 *
 * The intent string is also surfaced in the system prompt as `[INTENT: …]`
 * so the LLM can lean on it when planning.
 */

export type Intent =
  | 'smalltalk'
  | 'identity'
  | 'capability'
  | 'query'
  | 'command'
  | 'agent_creation'
  | 'follow_up';

const IDENTITY_PATTERNS: RegExp[] = [
  /^\s*who\s+(?:are|r)\s+(?:you|u)\s*\??\s*$/i,
  /^\s*what\s+(?:are|r)\s+(?:you|u)\s*\??\s*$/i,
  /^\s*(?:are|r)\s+(?:you|u)\s+(?:an?\s+)?(?:ai|bot|human|chatgpt|claude|gpt|robot)\s*\??\s*$/i,
  /^\s*(?:what'?s|whats)\s+your\s+name\s*\??\s*$/i,
  /^\s*introduce\s+yourself\s*\.?\s*$/i,
  /^\s*tell\s+me\s+about\s+yourself\s*\.?\s*$/i,
];

const SMALLTALK_PATTERNS: RegExp[] = [
  /^\s*(?:hi|hey|hello|yo|sup|hiya|howdy|gm|good\s+morning|good\s+afternoon|good\s+evening|good\s+night)[\s!.,?]*$/i,
  /^\s*(?:how\s+are\s+you|how'?s\s+it\s+going|how\s+goes\s+it|hru|wassup|what'?s\s+up)\s*\??\s*$/i,
  /^\s*(?:thanks|thank\s+you|thx|ty|cheers|appreciated)[\s!.,?]*$/i,
  /^\s*(?:bye|goodbye|cya|see\s+you|later|gn|good\s+night)[\s!.,?]*$/i,
  /^\s*(?:cool|nice|great|awesome|ok|okay|got\s+it|alright|sounds\s+good|sure|yes|yep|yeah|no|nope)[\s!.,?]*$/i,
  /^\s*(?:lol|haha|hehe|lmao|rofl|omg|wow)[\s!.,?]*$/i,
];

const CAPABILITY_PATTERNS: RegExp[] = [
  /\bwhat\s+can\s+you\s+do\b/i,
  /\bwhat\s+do\s+you\s+do\b/i,
  /\bhow\s+(?:can|do)\s+you\s+(?:help|work)\b/i,
  /\b(?:what|which)\s+(?:tools|integrations|apps|features|skills|capabilities)\s+(?:do\s+you\s+have|are\s+(?:there|available))\b/i,
  /\b(?:can|could)\s+you\s+(?:also|even)?\s*(?:do|handle|manage)\b.{0,40}\?/i,
  /\bdo\s+you\s+(?:support|integrate\s+with|have\s+access\s+to)\b/i,
  /\bwhat\s+are\s+your\s+(?:capabilities|features|skills)\b/i,
];

const AGENT_CREATION_PATTERNS: RegExp[] = [
  /\b(?:create|set\s*up|setup|build|make|register|schedule|configure)\b.{0,40}\b(?:agent|bot|automation|cron|job|background|recurring|daily|hourly|weekly)\b/i,
  /\b(?:agent|automation|bot)\b.{0,30}\b(?:every\s+day|each\s+morning|daily|hourly|weekly|on\s+a\s+schedule)\b/i,
  /\b(?:run|do|check|process)\b.{0,30}\b(?:every|each)\s+(?:morning|day|hour|week|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(?:set\s*up|setup|build)\s+(?:a|an)\s+(?:daily|hourly|weekly|morning|evening|nightly)\b/i,
];

const COMMAND_PATTERNS: RegExp[] = [
  /^\s*(?:draft|send|reply|respond|write|compose|create|schedule|book|cancel|delete|archive|label|post|dm|message|forward|search|find|look\s*up|fetch|get|read|show|list|summarize|summarise|analyze|analyse|prepare|generate|build|make|update|edit)\b/i,
  /\bplease\s+(?:draft|send|reply|respond|write|compose|create|schedule|book|cancel|delete|archive|label|post|dm|message|forward|search|find|look\s*up|fetch|get|read|show|list|summarize|summarise)\b/i,
  /\bcan\s+you\s+(?:draft|send|reply|respond|write|compose|create|schedule|book|cancel|delete|archive|label|post|dm|message|forward|search|find|look\s*up|fetch|get|read|show|list|summarize|summarise)\b/i,
];

const FOLLOW_UP_PATTERNS: RegExp[] = [
  /^\s*(?:yes|yep|yeah|yup|sure|ok|okay|go\s+ahead|do\s+it|sounds\s+good|confirm|confirmed|approve|approved|proceed|continue)[\s!.,?]*$/i,
  /^\s*(?:no|nope|cancel|stop|abort|nevermind|never\s+mind|skip)[\s!.,?]*$/i,
  /^\s*(?:and|also|then)\b.{0,80}$/i,
];

const QUERY_PATTERNS: RegExp[] = [
  /^\s*(?:what|when|where|who|how|why|which|whose)\b/i,
  /\?$/,
  /\b(?:any|got|have)\s+(?:emails|meetings|messages|tasks|deals|updates)\b/i,
  /\b(?:what'?s|whats)\s+(?:on|in|going)\b/i,
];

/**
 * Classify a user message into one intent bucket.
 *
 * Order matters: more specific patterns checked first. Default falls through
 * to `command` because if a message isn't smalltalk/identity/capability/
 * query/follow_up and contains substantive text, treat it as an actionable
 * order (the safer side for a productivity agent).
 */
export function classifyUserIntent(message: string, hasOpenConfirmation = false): Intent {
  const trimmed = (message || '').trim();
  if (!trimmed) return 'smalltalk';

  // Very short messages while a confirmation is pending → follow_up.
  if (hasOpenConfirmation && trimmed.length < 30) {
    return 'follow_up';
  }

  if (IDENTITY_PATTERNS.some(re => re.test(trimmed))) return 'identity';
  if (CAPABILITY_PATTERNS.some(re => re.test(trimmed))) return 'capability';
  if (AGENT_CREATION_PATTERNS.some(re => re.test(trimmed))) return 'agent_creation';
  if (SMALLTALK_PATTERNS.some(re => re.test(trimmed))) return 'smalltalk';
  if (FOLLOW_UP_PATTERNS.some(re => re.test(trimmed)) && trimmed.length < 60) return 'follow_up';
  if (COMMAND_PATTERNS.some(re => re.test(trimmed))) return 'command';
  if (QUERY_PATTERNS.some(re => re.test(trimmed))) return 'query';

  return 'command';
}

/**
 * Intents that should bypass the tool layer entirely — the LLM answers
 * conversationally with zero tool dispatch. Stops "Who are you?" from
 * triggering a calendar tool call.
 */
export function shouldSuppressTools(intent: Intent): boolean {
  return intent === 'smalltalk' || intent === 'identity' || intent === 'capability';
}

/**
 * One-line context hint injected into the system prompt so the LLM reads
 * the classification on every turn.
 */
export function intentSystemHint(intent: Intent): string {
  const hints: Record<Intent, string> = {
    smalltalk: 'User is making small talk. Reply conversationally in ONE short sentence. Do NOT call any tools. Do NOT mention integrations or capabilities unless asked.',
    identity: 'User is asking who/what you are. Reply in ONE sentence: "I\'m Arcus, your AI chief of staff — I work across your Gmail, Calendar, Notion and Slack." Do NOT call any tools.',
    capability: 'User is asking what you can do. Reply in 2-3 short sentences listing your top capabilities (read/draft email, schedule, log to Notion, search the web, remember context, run background agents). Do NOT call any tools — this is a capability question, not an execution request.',
    query: 'User is asking a question that likely needs data. Use the dispatch reflex — fetch from the relevant VAs in parallel.',
    command: 'User gave a direct order. Execute it directly with the right tool. Do NOT ask "should I proceed?" — they already told you to.',
    agent_creation: 'User wants to create a scheduled/background agent. Use the create_scheduled_agent two-stage flow. Do NOT execute the agent\'s work yourself.',
    follow_up: 'User is replying to your previous turn — likely confirming, cancelling, or adding detail. Read the prior context before acting.',
  };
  return `[INTENT: ${intent}] ${hints[intent]}`;
}
