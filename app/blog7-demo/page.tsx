import { Blog7 } from "@/components/blocks/blog7";

const demoData = {
  tagline: "Latest Insights",
  heading: "Mailient Engineering",
  description:
    "Explore our technical deep dives into building scalable, encrypted, and autonomous AI systems. Discover how we're redefining email productivity.",
  buttonText: "Explore all technical posts",
  buttonUrl: "/blogs",
  posts: [
    {
      id: "post-1",
      title: "Building Autonomous Email Agents in Next.js",
      summary:
        "Learn how we implemented the Arcus AI engine using Next.js, Vercel AI SDK, and OpenAI to autonomously manage calendar scheduling and triage.",
      label: "Engineering",
      author: "Maulik",
      published: "May 24, 2026",
      url: "/blogs",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "post-2",
      title: "Zero-Knowledge Architecture for Inboxes",
      summary:
        "A deep dive into our client-side encryption implementation. How we secure user data so even we cannot read the contents of your emails.",
      label: "Security",
      author: "Mailient Team",
      published: "May 20, 2026",
      url: "/blogs",
      image: "https://images.unsplash.com/photo-1614064641913-6b71a2ec06f7?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: "post-3",
      title: "Designing the Perfect Voice Profile API",
      summary:
        "How we leverage LLMs to learn and mimic user writing styles dynamically. Our journey from basic RAG to advanced few-shot persona prompting.",
      label: "AI Research",
      author: "Maulik",
      published: "May 15, 2026",
      url: "/blogs",
      image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2070&auto=format&fit=crop",
    },
  ],
};

export default function Blog7DemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-satoshi selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <Blog7 {...demoData} />
    </div>
  );
}
