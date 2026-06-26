"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui";
import { uploadAvatar, removeAvatar, updateName } from "@/app/profile/actions";
import type { Profile } from "@/lib/types";

export function ProfileCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(profile.full_name ?? "");
  const [error, setError] = useState<string | null>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await uploadAvatar(form);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setBusy(false);
    }
  }

  function onRemove() {
    setBusy(true);
    startTransition(async () => {
      try { await removeAvatar(); router.refresh(); }
      finally { setBusy(false); }
    });
  }

  function onSaveName() {
    if (name.trim() === (profile.full_name ?? "")) return;
    startTransition(async () => {
      const form = new FormData();
      form.append("full_name", name);
      await updateName(form);
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-tan/40 bg-white/70 p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative">
          <Avatar
            name={profile.full_name}
            email={profile.email}
            url={profile.avatar_url}
            size={96}
            className={busy ? "opacity-60" : ""}
          />
          {busy && (
            <span className="absolute inset-0 m-auto h-6 w-6 animate-spin rounded-full border-2 border-cream/60 border-t-cream" />
          )}
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button variant="dark" className="px-3 py-2 text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
              Upload photo
            </Button>
            {profile.avatar_url && (
              <Button variant="ghost" className="px-3 py-2 text-xs" disabled={busy || pending} onClick={onRemove}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-espresso/50">PNG or JPG, up to 5 MB.</p>
          {error && <p className="text-xs font-medium text-orange-light">{error}</p>}
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <label className="block text-sm font-medium text-espresso/80" htmlFor="full_name">
          Display name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="full_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-tan/50 bg-white px-3.5 py-2.5 text-espresso focus:border-logo focus:outline-none"
          />
          <Button
            variant="primary"
            className="px-4 py-2.5 text-sm"
            disabled={pending || !name.trim() || name.trim() === (profile.full_name ?? "")}
            onClick={onSaveName}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
