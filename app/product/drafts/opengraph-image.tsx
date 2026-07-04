import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Drafts — replies that sound like you";

export default function Image() {
  return ogImage("Replies that sound like you.", "Learned from your last 90 days of sent mail. Waiting in your Gmail drafts — approve in one click.");
}
