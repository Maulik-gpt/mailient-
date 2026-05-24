import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface Post {
  id: string;
  title: string;
  summary: string;
  label: string;
  author: string;
  published: string;
  url: string;
  image: string;
}

interface Blog7Props {
  tagline: string;
  heading: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  posts: Post[];
}

const Blog7 = ({
  tagline = "Latest Updates",
  heading = "Blog Posts",
  description = "Discover the latest trends, tips, and best practices in modern web development. From UI components to design systems, stay updated with our expert insights.",
  buttonText = "View all articles",
  buttonUrl = "https://shadcnblocks.com",
  posts = [],
}: Blog7Props) => {
  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto flex flex-col items-center gap-16 px-4 md:px-8 lg:px-16">
        <div className="text-center">
          <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 text-xs tracking-wide">
            {tagline}
          </Badge>
          <h2 className="mb-4 text-pretty text-3xl font-bold tracking-tight md:mb-5 md:text-5xl lg:mb-6 lg:max-w-4xl lg:text-6xl text-foreground">
            {heading}
          </h2>
          <p className="mb-8 text-muted-foreground md:text-lg lg:max-w-2xl mx-auto leading-relaxed font-light">
            {description}
          </p>
          <Button variant="link" className="w-full sm:w-auto font-semibold text-sm hover:no-underline hover:text-neutral-500 transition-colors group" asChild>
            <a href={buttonUrl} target="_blank">
              {buttonText}
              <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 w-full max-w-7xl mx-auto">
          {posts.map((post) => (
            <Card key={post.id} className="grid grid-rows-[auto_auto_1fr_auto] rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800/60 bg-white dark:bg-neutral-900/40 shadow-sm hover:shadow-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-300 group">
              <div className="aspect-[16/10] w-full overflow-hidden">
                <a
                  href={post.url}
                  target="_blank"
                  className="block h-full w-full"
                >
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                </a>
              </div>
              <CardHeader className="p-7 pb-3">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 px-3 py-1 rounded-full uppercase tracking-widest">
                    {post.label}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">{post.published}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold hover:text-neutral-500 transition-colors leading-snug text-foreground">
                  <a href={post.url} target="_blank">
                    {post.title}
                  </a>
                </h3>
              </CardHeader>
              <CardContent className="p-7 pt-2">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 font-light">{post.summary}</p>
              </CardContent>
              <CardFooter className="p-7 pt-0 mt-auto border-t border-neutral-100 dark:border-neutral-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3 pt-5">
                  <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    {post.author.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-foreground tracking-tight">{post.author}</span>
                </div>
                <a
                  href={post.url}
                  target="_blank"
                  className="flex items-center text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors pt-5 tracking-wide uppercase"
                >
                  Read Article
                  <ArrowRight className="ml-1.5 size-3 group-hover:translate-x-1 transition-transform" />
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Blog7 };
