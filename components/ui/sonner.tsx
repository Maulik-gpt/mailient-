"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  // The toast is intentionally a fixed dark/black surface in BOTH themes — in
  // light mode a theme-following toast came out invisible (light bg + light
  // text). Black-with-white-text reads cleanly on the light app and stays
  // correct on the dark app. So we pin theme="dark" + fixed dark colors below
  // instead of following `useTheme()`.
  useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          // Fixed dark surface — visible on both the light and dark app.
          "--normal-bg": "#0c0c0e",
          "--normal-text": "#fafafa",
          "--normal-border": "rgba(255,255,255,0.12)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
