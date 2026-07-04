import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "The Mailient blog";

export default function Image() {
  return ogImage("The Mailient Blog", "Essays on AI email agents, inbox triage, replies in your voice, and encryption — by the founder building one.");
}
