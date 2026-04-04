"use client";

import Contact from '@/components/ui/contact'
import { FloatingNavbar } from "@/components/FloatingNavbar";

export default function ContactPage() {
  return (
    <div className="relative min-h-screen">
      <Contact />
      <FloatingNavbar />
    </div>
  )
}
