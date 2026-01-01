// /components/ConnectGmailButton.jsx
"use client";

import { signIn } from "next-auth/react";

export default function ConnectGmailButton() {
  return (
    <button
      onClick={() => {
        console.log('ConnectGmailButton: Sign in clicked');
        signIn("google", { redirectTo: "/onboarding" });
      }}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
    >
      Connect Gmail Account
    </button>
  );
}
