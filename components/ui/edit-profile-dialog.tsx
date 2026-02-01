"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditProfileForm } from "./profile/edit-profile-form";

interface EditProfileDialogProps {
  trigger?: React.ReactNode;
  user?: {
    name?: string;
    email?: string;
  };
  profile?: {
    avatar_url?: string;
    bio?: string;
    location?: string;
    website?: string;
    banner_url?: string;
    username?: string;
  };
  onSave?: (data: any) => Promise<void>;
}

export function EditProfileDialog({
  trigger,
  profile,
  onSave
}: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSave = async (data: any) => {
    if (onSave) {
      await onSave(data);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none focus:outline-none overflow-visible">
        <EditProfileForm
          profile={profile}
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      </DialogContent>
    </Dialog>
  );
}
