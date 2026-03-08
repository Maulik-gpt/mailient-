import { useEffect, useState } from "react";
import { X, Star, Archive, Trash2, Reply, MoreVertical } from "lucide-react";
import { Button } from "../../../components/ui/button";

// Import email content styles
import './email-content-styles.css';

const EmailPreviewSkeleton = () => (
  <div className="animate-pulse p-6 space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <div className="h-6 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
      <div className="h-8 bg-gray-700 rounded w-8"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
      <div className="h-4 bg-gray-700 rounded w-4/5"></div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-700 rounded w-full"></div>
      <div className="h-3 bg-gray-700 rounded w-full"></div>
      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
    </div>
  </div>
);

const formatEmailDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch (error) {
    return 'Unknown';
  }
};

const decodeHtmlEntities = (text) => {
  if (!text) return text;

  const entityMap = {
    '\u0027': "'",
    '&#x27;': "'",
    '&#34;': '"',
    '"': '"',
    '&#8220;': '"',
    '&#8221;': '"',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&#8216;': "'",
    '&#8217;': "'",
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&#8230;': '…',
    '&hellip;': '…',
    '&#8212;': '—',
    '&mdash;': '—',
    '&#8211;': '–',
    '&ndash;': '–',
    '&': '&',
    '<': '<',
    '>': '>',
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };

  let decodedText = text;
  Object.entries(entityMap).forEach(([entity, replacement]) => {
    decodedText = decodedText.replace(new RegExp(entity, 'g'), replacement);
  });

  return decodedText;
};

// Enhanced Email Content Processing Utilities
const extractCleanTextFromHtml = (html) => {
  if (!html) return '';

  try {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove all script and style elements and their content
    const scriptsAndStyles = tempDiv.querySelectorAll('script, style, link, meta');
    scriptsAndStyles.forEach(el => el.remove());

    // Remove hidden elements and tracking pixels more aggressively
    const hiddenElements = tempDiv.querySelectorAll(`
      [style*="display:none"],
      [style*="visibility:hidden"],
      [style*="opacity:0"],
      img[width="1"],
      img[height="1"],
      img[src*="tracking"],
      img[src*="pixel"],
      img[src*="beacon"],
      [class*="preview"],
      [class*="mcnPreviewText"],
      [id*="preview"],
      .mobile-only,
      .m-hide,
      .hidem
    `);
    hiddenElements.forEach(el => el.remove());

    // Remove Outlook conditional comments using text manipulation
    const htmlContent = tempDiv.innerHTML;
    const cleanedHtml = htmlContent
      // Remove Outlook conditional comments and their content
      .replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gs, '')
      // Remove other conditional comments
      .replace(/<!--\[if[^>]*>.*$/gs, '')
      .replace(/<!\[endif\]-->/g, '');
    tempDiv.innerHTML = cleanedHtml;

    // Extract structured content with better formatting
    let text = extractStructuredContent(tempDiv);

    // Enhanced entity decoding
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    text = textarea.value;

    // Clean up the text with better formatting preservation
    text = text
      // Normalize whitespace but preserve paragraph breaks
      .replace(/[ \t]+/g, ' ')
      .replace(/[\u00A0]/g, ' ') // non-breaking space
      // Remove special characters used for formatting
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Clean up line breaks but preserve paragraph structure
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '') // Remove leading/trailing whitespace per line
      // Remove excessive empty lines but keep paragraph breaks
      .replace(/\n{4,}/g, '\n\n')
      // Fix common email template artifacts
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      // Clean up common email template signatures and footers
      .replace(/Sent from my (iPhone|iPad|Android)/gi, '')
      .replace(/Get Outlook for (iOS|Android)/gi, '')
      .replace(/Unsubscribe|Manage preferences/gi, '')
      // Remove tracking links and technical content
      .replace(/https?:\/\/[^\s]+(?:tracking|pixel|beacon|analytics)[^\s]*/gi, '')
      .replace(/\[Image\]/g, '')
      .trim();

    return text;
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    // Fallback: simple regex-based extraction
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
};

// Helper function to extract structured content with better formatting
const extractStructuredContent = (element) => {
  const sections = [];

  // Extract main headings and content sections
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent?.trim();
    if (text && text.length > 3) {
      sections.push(`${'#'.repeat(level)} ${text}\n`);
    }
  });

  // Extract paragraph content
  const paragraphs = element.querySelectorAll('p');
  paragraphs.forEach(p => {
    const text = p.textContent?.trim();
    if (text && text.length > 10) { // Filter out very short paragraphs
      sections.push(`${text}\n\n`);
    }
  });

  // Extract list content with better formatting
  const lists = element.querySelectorAll('ul, ol');
  lists.forEach(list => {
    const items = list.querySelectorAll('li');
    if (items.length > 0) {
      const listText = Array.from(items)
        .map((item, index) => {
          const text = item.textContent?.trim();
          if (text && text.length > 3) {
            return list.tagName === 'OL' ? `${index + 1}. ${text}` : `• ${text}`;
          }
          return '';
        })
        .filter(item => item)
        .join('\n');
      if (listText) {
        sections.push(`${listText}\n\n`);
      }
    }
  });

  // Extract table content in a readable format
  const tables = element.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    if (rows.length > 0 && rows.length <= 10) { // Only process small tables
      const tableText = Array.from(rows)
        .map(row => {
          const cells = row.querySelectorAll('td, th');
          return Array.from(cells)
            .map(cell => cell.textContent?.trim() || '')
            .filter(cell => cell)
            .join(' | ');
        })
        .filter(row => row)
        .join('\n');
      if (tableText) {
        sections.push(`Table:\n${tableText}\n\n`);
      }
    }
  });

  // If we have structured content, return it; otherwise fall back to general text
  if (sections.length > 0) {
    return sections.join('');
  }

  // Fallback to general text content
  return element.textContent || element.innerText || '';
};

// Professional text formatting for newsletter content
const formatNewsletterContent = (text) => {
  if (!text) return text;

  let formatted = text;

  // Add proper spacing for newsletter sections
  formatted = formatted
    // Format section headers (common in newsletters)
    .replace(/^([A-Z][^.!?]*):/gm, '\n📌 $1:')
    // Format feature lists
    .replace(/^•\s*([^.!?]+)$/gm, '✨ $1')
    // Format bullet points
    .replace(/^-\s*([^.!?]+)$/gm, '• $1')
    // Format numbered lists
    .replace(/^(\d+)\.\s*([^.!?]+)$/gm, '$1. $2')
    // Add spacing between sections
    .replace(/\n{3,}/g, '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n')
    // Clean up excessive line breaks
    .replace(/\n{2,}/g, '\n\n')
    // Format URLs to be more readable
    .replace(/(https?:\/\/[^\s]+)/g, '\n🔗 $1\n')
    // Format email addresses
    .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '\n📧 $1')
    // Add proper paragraph indentation for readability
    .replace(/^(?![#•\d+\-\s])(.+)$/gm, '    $1')
    // Clean up the formatting
    .replace(/ {4,}/g, '    ')
    .trim();

  return formatted;
};

const isTemplateHeavyEmail = (html) => {
  if (!html) return true; // Default to text mode for safety

  // Enhanced template markers that indicate heavily styled emails
  const templateMarkers = [
    // Microsoft Outlook conditional comments
    /<!--\[if|<!\[endif\]-->/gi,
    // Mailchimp preview text
    /mcnPreviewText/gi,
    // Outlook-specific classes
    /outlook-group-fix/gi,
    // External style blocks
    /<style[^>]*>.*?<\/style>/gi,
    // Tracking pixels and invisible images
    /<img[^>]*width\s*=\s*["']1["'][^>]*>/gi,
    /<img[^>]*height\s*=\s*["']1["'][^>]*>/gi,
    // Special characters used in email templates
    /͏/g, // Zero-width joiner used in some templates
    /\u200B/g, // Zero-width space
    /\u200C/g, // Zero-width non-joiner
    /\u200D/g, // Zero-width joiner
    /\uFEFF/g, // Zero-width no-break space
    // Mobile-specific classes
    /<div[^>]*class\s*=\s*["'][^"']*mobile/gi,
    /<td[^>]*class\s*=\s*["'][^"']*mobile/gi,
    // Table-based layouts (common in newsletters)
    /<table[^>]*width\s*=\s*["'][0-9]+["'][^>]*>/gi,
    /<table[^>]*cellpadding\s*=\s*["'][0-9]+["'][^>]*>/gi,
    /<table[^>]*cellspacing\s*=\s*["'][0-9]+["'][^>]*>/gi,
    // Email template frameworks
    /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/gi,
    /<meta[^>]*http-equiv\s*=\s*["']X-UA-Compatible["'][^>]*>/gi,
    // Font preloading (common in modern templates)
    /<link[^>]*rel\s*=\s*["']preconnect["'][^>]*href\s*=\s*["'][^"']*fonts/gi,
    // Complex responsive CSS
    /@media[^}]*max-width[^}]*620px/gi,
    /@media[^}]*max-width[^}]*480px/gi,
    // Template-specific IDs and classes
    /id\s*=\s*["'][^"']*MessageViewBody["']/gi,
    /id\s*=\s*["'][^"']*MessageWebViewDiv["']/gi,
    // Gmail and email client specific fixes
    /u\s*\+\s*\.body/gi,
    /ExternalClass/gi,
    // Newsletter-specific patterns
    /class\s*=\s*["'][^"']*(btn|button|cta)[^"']*["']/gi,
    /class\s*=\s*["'][^"']*(header|footer|sidebar)[^"']*["']/gi,
    // Tracking and analytics
    /src\s*=\s*["'][^"']*(tracking|pixel|beacon|analytics)[^"']*["']/gi,
    // Complex nested table structures
    /<td[^>]*>\s*<table[^>]*>\s*<tr[^>]*>\s*<td/gi,
    // Apple Mail specific
    /x-apple-disable-message-reformatting/gi,
    // Format detection meta tags
    /format-detection/gi,
  ];

  let score = 0;
  templateMarkers.forEach(marker => {
    const matches = html.match(marker);
    if (matches) {
      // Weight different markers differently
      const weight = marker.source.includes('mcnPreviewText|outlook-group-fix|ExternalClass') ? 3 :
                   marker.source.includes('tracking|pixel|beacon') ? 2 : 1;
      score += matches.length * weight;
    }
  });

  // Enhanced content analysis
  const cleanContent = html.replace(/<[^>]*>/g, '');
  const contentWords = cleanContent.split(/\s+/).filter(word => word.length > 2).length;
  const htmlLength = html.length;
  const contentRatio = contentWords / htmlLength;

  // Heuristics for template-heavy emails
  if (htmlLength > 15000 && contentWords < 300) score += 15; // Very long but little content
  if (htmlLength > 8000 && contentRatio < 0.02) score += 10; // Low content density
  if (htmlLength > 5000 && contentWords < 100) score += 8; // Medium length, very little content

  // Check for excessive styling vs content
  const styleTagCount = (html.match(/<style[^>]*>/gi) || []).length;
  const scriptTagCount = (html.match(/<script[^>]*>/gi) || []).length;
  const imgTagCount = (html.match(/<img[^>]*>/gi) || []).length;

  if (styleTagCount > 3) score += styleTagCount * 2;
  if (scriptTagCount > 0) score += scriptTagCount * 3;
  if (imgTagCount > 10) score += Math.floor(imgTagCount / 5);

  // Modern email template patterns (like the Framer newsletter)
  if (html.includes('framer.com') || html.includes('Designmodo') || html.includes('Postcards')) {
    score += 10;
  }

  return score > 8; // Lower threshold to catch more template-heavy emails
};

const extractMinimalHtmlContent = (html) => {
  if (!html) return '';

  let cleaned = html;

  // Very aggressive removal of template content
  cleaned = cleaned.replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gs, '');
  cleaned = cleaned.replace(/<!\[if[^>]*>.*?<!\[endif\]>/gs, '');
  cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<link[^>]*>/gi, '');
  cleaned = cleaned.replace(/<meta[^>]*>/gi, '');

  // Remove tracking pixels and invisible elements
  cleaned = cleaned.replace(/<img[^>]*width\s*=\s*["']1["'][^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*height\s*=\s*["']1["'][^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*style\s*=\s*["'][^"']*display:\s*none[^"']*["'][^>]*>/gi, '');

  // Remove template-specific elements
  cleaned = cleaned.replace(/<span[^>]*class\s*=\s*["'][^"']*mcnPreviewText[^"']*["'][^>]*>.*?<\/span>/gi, '');
  cleaned = cleaned.replace(/<div[^>]*class\s*=\s*["'][^"']*(outlook|gmail|yahoo|protonmail)[^"']*["'][^>]*>.*?<\/div>/gi, '');

  // Remove excessive whitespace and special characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/[\u00A0]/g, ' ');
  cleaned = cleaned.replace(/[\u2028\u2029]/g, '\n');
  cleaned = cleaned.replace(/\s*\n\s*\n\s*\n/g, '\n\n');

  return cleaned.trim();
};

// Premium Email Content Renderer Component
const EmailContentRenderer = ({ html, className }) => {
  const [processedContent, setProcessedContent] = useState('');

  useEffect(() => {
    const processEmailContent = async () => {
      if (!html) {
        setProcessedContent('');
        return;
      }

      // Always use enhanced HTML mode for premium experience
      const minimalHtml = extractMinimalHtmlContent(html);
      const wrappedContent = `
        <div class="email-content-wrapper">
          <div class="email-content-body">
            ${minimalHtml}
          </div>
        </div>
      `;
      setProcessedContent(wrappedContent);
    };

    processEmailContent();
  }, [html]);

  if (!processedContent) {
    return <div className="text-gray-400 italic p-4">Loading email content...</div>;
  }

  return (
    <div className="email-content-container">
      <div
        className={`email-content ${className || ''}`}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
};

// Clean up email content for better display (legacy function)
const cleanEmailContent = (html) => {
  if (!html) return html;

  let cleaned = html;

  // Remove email tracking pixels and invisible images
  cleaned = cleaned.replace(/<img[^>]*width\s*=\s*["']1["'][^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*height\s*=\s*["']1["'][^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*style\s*=\s*["'][^"']*display:\s*none[^"']*["'][^>]*>/gi, '');
  cleaned = cleaned.replace(/<img[^>]*src\s*=\s*["'][^"']*(tracking|pixel|beacon)[^"']*["'][^>]*>/gi, '');

  // Remove hidden divs and spans
  cleaned = cleaned.replace(/<div[^>]*style\s*=\s*["'][^"']*display:\s*none[^"']*["'][^>]*>.*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<span[^>]*style\s*=\s*["'][^"']*display:\s*none[^"']*["'][^>]*>.*?<\/span>/gi, '');

  // Remove Outlook-specific conditional comments
  cleaned = cleaned.replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gs, '');

  // Remove Mailchimp preview text
  cleaned = cleaned.replace(/<span[^>]*class\s*=\s*["'][^"']*mcnPreviewText[^"']*["'][^>]*>.*?<\/span>/gi, '');

  // Clean up excessive whitespace and line breaks
  cleaned = cleaned.replace(/\s*\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/>\s+</g, '><');

  return cleaned;
};

export default function EmailPreviewPane({
  email,
  isLoading,
  onClose,
  onStarToggle,
  onArchive,
  onDelete,
  onReply
}) {
  if (!email) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8" style={{ backgroundColor: '#1a1a1a' }}>
        <div>
          <div className="h-20 w-20 rounded-full flex items-center justify-center mb-8 mx-auto" style={{ backgroundColor: '#2a2a2a' }}>
            <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No email selected</h3>
          <p className="text-gray-400">Select an email from the list to view its content here.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full" style={{ backgroundColor: '#1a1a1a' }}>
        <EmailPreviewSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#3a3a3a' }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">
              {email.subject || 'No Subject'}
            </h2>
            <p className="text-sm text-gray-400 truncate">
              from {email.sender} • {formatEmailDate(email.date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            onClick={() => onReply(email)}
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 hidden sm:flex"
          >
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>

          <button
            onClick={() => onStarToggle(email.id)}
            className={`p-2 rounded-lg transition-colors ${
              email.isStarred
                ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title={email.isStarred ? 'Remove star' : 'Add star'}
          >
            <Star className={`h-5 w-5 ${email.isStarred ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => onArchive([email.id])}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Archive email"
          >
            <Archive className="h-5 w-5" />
          </button>

          <button
            onClick={() => onDelete([email.id])}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Delete email"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Email Header Info */}
          <div className="mb-6 pb-4 border-b" style={{ borderColor: '#3a3a3a' }}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  {email.subject || 'No Subject'}
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white font-medium">{email.sender}</span>
                    <span className="text-gray-500">{'<'}{email.email}{'>'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">To:</span>
                    <span className="text-gray-300">{email.to || 'me'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-gray-300">{formatEmailDate(email.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div className="prose prose-invert max-w-none">
            {email.body ? (
              <EmailContentRenderer
                html={email.body}
                className="text-gray-200 leading-relaxed"
              />
            ) : email.snippet ? (
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {decodeHtmlEntities(email.snippet)}
              </div>
            ) : (
              <div className="text-gray-400 italic">
                Loading email content...
              </div>
            )}
          </div>

          {/* Email Metadata Footer */}
          <div className="mt-8 pt-4 border-t" style={{ borderColor: '#3a3a3a' }}>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="text-gray-500">↗</span>
                  <span>Relationship: {email.relationshipScore}%</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-gray-500">✉</span>
                  <span>{email.emailCount} emails</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  email.badge === 'Investor' ? 'bg-gray-600 text-white' :
                  email.badge === 'Customer' ? 'bg-gray-500 text-white' :
                  email.badge === 'Team' ? 'bg-gray-700 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {email.badge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}