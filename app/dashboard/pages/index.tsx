import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw, LogOut, Search, Star, TrendingUp, Clock, MessageSquare, Settings, Bell, Sparkles, Moon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import GmailSidebar from "../components/gmail-sidebar.jsx";
import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import EmailList from "../components/email-list";

interface Email {
  id: string;
  sender: string;
  email: string;
  subject: string;
  preview: string;
  time: string;
  isUnread: boolean;
  badge: "Investor" | "Customer" | "Team";
  relationshipScore: number;
  lastContact: string;
  emailCount: number;
  isStarred: boolean;
}

interface ApiEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const mapApiEmailToEmail = (apiEmail: ApiEmail): Email => {
  // Parse sender and email from "Name <email@domain.com>" or "email@domain.com"
  const fromMatch = apiEmail.from.match(/^([^<]+)\s*<([^>]+)>$/) || [null, apiEmail.from, apiEmail.from];
  const sender = fromMatch[1]?.trim() || apiEmail.from;
  const email = fromMatch[2]?.trim() || apiEmail.from;

  // Determine badge based on email domain
  const domain = email.split('@')[1]?.toLowerCase() || '';

  // Format time to relative time
  let time = "Unknown";
  try {
    const date = new Date(apiEmail.date);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) time = "Just now";
    else if (diffMins < 60) time = `${diffMins}m ago`;
    else if (diffHours < 24) time = `${diffHours}h ago`;
    else if (diffDays < 7) time = `${diffDays}d ago`;
    else time = date.toLocaleDateString();
  } catch (error) {
    // Keep default time
  }

  return {
    id: apiEmail.id,
    sender,
    email,
    subject: apiEmail.subject,
    preview: apiEmail.snippet,
    time,
    isUnread: false, // API doesn't provide, assume false
    badge: domain.includes('investor') || domain.includes('capital') || domain.includes('ventures') ? "Investor" : domain.includes('company') || domain.includes('ourcompany') ? "Team" : "Customer",
    relationshipScore: 50, // Default score
    lastContact: time,
    emailCount: 1, // Default
    isStarred: false,
  };
};

const mockEmails: Email[] = [
  {
    id: "1",
    sender: "Sarah Chen",
    email: "sarah.chen@acme.com",
    subject: "Q4 Investor Update - Performance Review",
    preview: "Hi team, I hope you're doing well. I wanted to share our Q4 performance metrics and discuss the upcoming board meeting...",
    time: "2m ago",
    isUnread: true,
    badge: "Investor",
    relationshipScore: 92,
    lastContact: "2 days ago",
    emailCount: 47,
    isStarred: false,
  },
  {
    id: "2",
    sender: "Marcus Williams",
    email: "marcus@techcorp.io",
    subject: "Customer Support: Product Integration Issue",
    preview: "We're seeing increased reports about the API integration failing during peak hours. The customer is requesting immediate assistance...",
    time: "15m ago",
    isUnread: true,
    badge: "Customer",
    relationshipScore: 78,
    lastContact: "Today",
    emailCount: 123,
    isStarred: true,
  },
  {
    id: "3",
    sender: "Alex Thompson",
    email: "alex@ourcompany.com",
    subject: "Team Meeting Rescheduled - New Time Proposal",
    preview: "Hey everyone, due to the client demo, I need to reschedule our weekly team sync. Here are some alternative time slots...",
    time: "1h ago",
    isUnread: true,
    badge: "Team",
    relationshipScore: 95,
    lastContact: "Yesterday",
    emailCount: 234,
    isStarred: false,
  },
  {
    id: "4",
    sender: "Jennifer Park",
    email: "jennifer.park@ventures.com",
    subject: "Follow-up: Series B Funding Discussion",
    preview: "Thank you for the comprehensive pitch deck. Our investment committee reviewed your materials and we'd like to schedule a follow-up call...",
    time: "3h ago",
    isUnread: false,
    badge: "Investor",
    relationshipScore: 88,
    lastContact: "3 days ago",
    emailCount: 31,
    isStarred: true,
  },
  {
    id: "5",
    sender: "David Martinez",
    email: "david@clientco.com",
    subject: "Feature Request: Advanced Analytics Dashboard",
    preview: "Our team has been exploring ways to enhance our reporting capabilities. We'd love to discuss the possibility of adding custom metrics...",
    time: "5h ago",
    isUnread: false,
    badge: "Customer",
    relationshipScore: 82,
    lastContact: "1 week ago",
    emailCount: 56,
    isStarred: false,
  },
  {
    id: "6",
    sender: "Emily Rodriguez",
    email: "emily@ourcompany.com",
    subject: "Design Review: New Landing Page Mockups",
    preview: "I've completed the first round of mockups for the new landing page. Would love to get everyone's feedback before we move to development...",
    time: "Yesterday",
    isUnread: false,
    badge: "Team",
    relationshipScore: 91,
    lastContact: "Yesterday",
    emailCount: 189,
    isStarred: false,
  },
  {
    id: "7",
    sender: "Robert Chang",
    email: "robert@enterprise.com",
    subject: "Enterprise Plan: Contract Renewal Discussion",
    preview: "Our annual contract is coming up for renewal next month. I wanted to reach out early to discuss potential upgrades and pricing...",
    time: "Yesterday",
    isUnread: false,
    badge: "Customer",
    relationshipScore: 94,
    lastContact: "5 days ago",
    emailCount: 67,
    isStarred: true,
  },
  {
    id: "8",
    sender: "Michael Lee",
    email: "michael@capital.com",
    subject: "Q1 Portfolio Review and Market Insights",
    preview: "As we enter Q1, I wanted to share some market insights and discuss how we can support your growth objectives for the quarter...",
    time: "2 days ago",
    isUnread: false,
    badge: "Investor",
    relationshipScore: 85,
    lastContact: "1 week ago",
    emailCount: 42,
    isStarred: false,
  },
];

const Index = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [currentLabel, setCurrentLabel] = useState('INBOX');

  const { data: apiEmails, isLoading, error } = useQuery({
    queryKey: ['emails'],
    queryFn: async () => {
      const response = await fetch('/api/gmail/emails?maxResults=200&all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      const data = await response.json();
      return data.emails || [];
    },
  });

  const emails: Email[] = apiEmails ? apiEmails.map(mapApiEmailToEmail).map((email: Email) => ({
    ...email,
    isStarred: starredIds.includes(email.id),
  })) : [];

  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['emails'] });
    toast.success("Inbox refreshed");
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleLogout = () => {
    toast.info("Logging out...");
    setTimeout(() => {
      toast.success("Logged out successfully");
    }, 500);
  };

  const toggleStar = (id: string) => {
    setStarredIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleLabelChange = (labelId: string) => {
    setCurrentLabel(labelId);
  };

  const handleCompose = () => {
    toast.info("Compose functionality coming soon!");
  };

  const handleIntegrationsClick = () => {
    toast.info("Integrations functionality coming soon!");
  };

  const handleEmailSelect = (email: Email) => {
    // Handle email selection if needed
  };

  const handleEmailClick = (email: Email) => {
    router.push(`/dashboard/${email.id}`);
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Investor": return "hsl(217 91% 60%)";
      case "Customer": return "hsl(142 71% 45%)";
      case "Team": return "hsl(48 96% 53%)";
      default: return "hsl(217 91% 60%)";
    }
  };

  const getRelationshipColor = (score: number) => {
    if (score >= 90) return "hsl(142 71% 45%)";
    if (score >= 75) return "hsl(48 96% 53%)";
    return "hsl(0 84% 60%)";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <HomeFeedSidebar />
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 ml-16">
        <GmailSidebar
          currentLabel={currentLabel}
          onLabelChange={handleLabelChange}
          labelCounts={{}}
          onCompose={handleCompose}
          onIntegrationsClick={handleIntegrationsClick}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 relative z-0">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight">Mailient</h1>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Relationship Intelligence</span>
                  <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-medium">Ready</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  className="h-9 w-9 transition-all hover:bg-secondary"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 transition-all hover:bg-secondary"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 transition-all hover:bg-secondary"
                >
                  <Moon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 transition-all hover:bg-secondary"
                >
                  <Bell className="h-4 w-4" />
                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 transition-all hover:bg-secondary"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-9 w-9 transition-all hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0">
          {/* Inbox Header */}
          <div className="px-6 py-6 border-b border-border">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Inbox</h2>
                <p className="text-sm text-muted-foreground">{emails.length} conversations</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, subject, or category..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="h-11 border-border bg-card pl-11 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Email List Container */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <EmailList
                emails={[]}
                selectedEmails={[]}
                onEmailSelect={() => { }}
                onEmailClick={() => { }}
                onStarToggle={() => { }}
                onArchive={() => { }}
                onDelete={() => { }}
                isLoading={true}
              />
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-destructive">Failed to load emails. Please try again.</p>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['emails'] })} className="mt-2">
                    Retry
                  </Button>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground">No emails found.</p>
                </div>
              </div>
            ) : (
              <EmailList
                emails={emails}
                selectedEmails={[]}
                onEmailSelect={handleEmailSelect}
                onEmailClick={handleEmailClick}
                onStarToggle={toggleStar}
                onArchive={() => { }}
                onDelete={() => { }}
                isLoading={false}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
