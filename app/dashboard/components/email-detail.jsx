import { ArrowLeft, Star, Clock, MessageSquare, TrendingUp, Mail, User, Calendar, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";

// Import the working decoder from email-list component
const decodeHtmlEntities = (text) => {
  if (!text) return text;

  const entityMap = {
    '&apos;': "'",
    '&#x27;': "'",
    '&#34;': '"',
    '&#x22;': '"',
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

  // Replace all HTML entities
  Object.entries(entityMap).forEach(([entity, replacement]) => {
    decodedText = decodedText.replace(new RegExp(entity, 'g'), replacement);
  });

  return decodedText;
};

const getBadgeColor = (badge) => {
  switch (badge) {
    case "Investor": return "hsl(217 91% 60%)";
    case "Customer": return "hsl(142 71% 45%)";
    case "Team": return "hsl(48 96% 53%)";
    default: return "hsl(217 91% 60%)";
  }
};

const getRelationshipColor = (score) => {
  if (score >= 90) return "hsl(142 71% 45%)";
  if (score >= 75) return "hsl(48 96% 53%)";
  return "hsl(0 84% 60%)";
};

export default function EmailDetail({ email, thread, onClose, onStarToggle, onArchive, onDelete, onReply, onReplyAll, onForward, isLoading, fullMessageContent, messageLoading }) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9" />
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-9" />
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="mb-6 pb-6 border-b border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Skeleton className="h-6 w-full mb-2" />
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/50">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select an email to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold truncate">{email.subject}</h1>
            <p className="text-sm text-muted-foreground">From {email.sender}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStarToggle(email.id)}
            className="h-9 w-9"
          >
            <Star
              className={`h-4 w-4 ${email.isStarred ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </Button>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Email Header */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">{email.subject}</h2>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{email.sender}</span>
                  </div>
                  <Badge
                    style={{ backgroundColor: getBadgeColor(email.badge) }}
                    className="border-0 text-xs font-medium text-white"
                  >
                    {email.badge}
                  </Badge>
                  {email.isUnread && (
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{email.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(email.date || email.time).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Score */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: getRelationshipColor(email.relationshipScore) }} />
                <span>Relationship:</span>
                <span style={{ color: getRelationshipColor(email.relationshipScore) }} className="font-medium">
                  {email.relationshipScore}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Last: {email.lastContact}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{email.emailCount} emails</span>
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div style={{
            maxWidth: 'none',
            color: 'inherit',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            {messageLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading email content...</span>
                </div>
              </div>
            ) : fullMessageContent ? (
              <div
                style={{
                  color: 'inherit',
                  lineHeight: '1.625',
                  margin: '0',
                  padding: '0'
                }}
                dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(fullMessageContent) }}
              />
            ) : (
              <div style={{
                color: 'rgb(148 163 184)',
                fontStyle: 'italic'
              }}>
                {decodeHtmlEntities(email.preview) || 'No content available'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between p-6 border-t border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onReply(email)}>
            Reply
          </Button>
          <Button variant="outline" size="sm" onClick={() => onReplyAll(email)}>
            Reply All
          </Button>
          <Button variant="outline" size="sm" onClick={() => onForward(email)}>
            Forward
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onArchive([email.id])}>
            Archive
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete([email.id])}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}