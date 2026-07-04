import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Sift — only what needs you";

export default function Image() {
  return ogImage("Only the emails that deserve your attention.", "It reads everything. You read almost nothing.");
}
