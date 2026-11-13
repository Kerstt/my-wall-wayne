"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Film, Mail, Hand, Smartphone, Pencil, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PROFILE } from "@/lib/profile";
import { getBrowserClient } from "@/lib/supabase";

type ProfileData = {
  name: string;
  city: string;
  about: string;
  avatarUrl: string;
};

const defaultProfile: ProfileData = {
  name: PROFILE.name,
  city: PROFILE.city,
  about: "Photographer, diver, and maker. Always up for a good walk and a better conversation.",
  avatarUrl: "",
};

const actions = [
  { icon: Camera, label: "View photos", meta: "541" },
  { icon: Film, label: "View videos", meta: "14" },
  { icon: Mail, label: "Send a message" },
  { icon: Hand, label: "Poke" },
  { icon: Smartphone, label: "Subscribe via SMS" },
];

const friends = ["Ava", "Liam", "Mia", "Noah", "Zoe", "Eli"];
const friendColors = [
  "from-sky-300 to-indigo-400",
  "from-rose-300 to-orange-300",
  "from-emerald-300 to-teal-400",
  "from-violet-300 to-fuchsia-400",
  "from-amber-200 to-orange-400",
  "from-cyan-300 to-sky-500",
];

export function ProfileSidebar() {
  const [profile, setProfile] = useState(defaultProfile);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data, error } = await getBrowserClient()
          .from("wall_profile")
          .select("name, city, about, avatar_url")
          .eq("id", "default")
          .single();
        if (error) throw error;
        if (data) setProfile({ name: data.name, city: data.city, about: data.about, avatarUrl: data.avatar_url ?? "" });
      } catch (error) {
        console.error("Failed to load Supabase profile", error);
      }
    }
    void loadProfile();
  }, []);

  async function saveProfile(next: ProfileData) {
    setProfile(next);
    const { error } = await getBrowserClient().from("wall_profile").upsert({
      id: "default",
      name: next.name,
      city: next.city,
      about: next.about,
      avatar_url: next.avatarUrl || null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error("Couldn't save profile", { description: error.message });
      return;
    }
    setEditing(false);
    toast.success("Profile updated in Supabase");
  }

  function uploadPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("Image must be 2 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const blob = await fetch(String(reader.result)).then((response) => response.blob());
        const path = `profile-${Date.now()}.${blob.type.split("/")[1] || "jpg"}`;
        const supabase = getBrowserClient();
        const { error } = await supabase.storage.from("wall-images").upload(path, blob, { contentType: blob.type, upsert: false });
        if (error) throw error;
        const avatarUrl = supabase.storage.from("wall-images").getPublicUrl(path).data.publicUrl;
        await saveProfile({ ...profile, avatarUrl });
      } catch (error) {
        toast.error("Couldn't upload profile picture", { description: error instanceof Error ? error.message : "Check your Supabase storage setup." });
      }
    };
    reader.onerror = () => toast.error("Couldn't read that image");
    reader.readAsDataURL(file);
  }

  return (
    <aside className="flex flex-col gap-4">
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-square w-full bg-gradient-to-br from-sky-200 via-indigo-200 to-violet-300">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={`${profile.name} profile`} className="size-full object-cover" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-6xl font-semibold tracking-tight text-white/90 drop-shadow-sm">
              {initials(profile.name)}
            </span>
          )}
          <Button type="button" size="icon-sm" variant="secondary" className="absolute right-2 bottom-2 shadow" onClick={() => fileRef.current?.click()} aria-label="Change profile picture">
            <Camera />
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
        </div>
        <CardContent className="px-2 pb-2">
          <Button type="button" variant="ghost" size="sm" className="mb-1 w-full justify-start" onClick={() => setEditing(true)}>
            <Pencil /> Edit profile
          </Button>
          <ul className="flex flex-col">
            {actions.map(({ icon: Icon, label, meta }) => (
              <li key={label}>
                <button type="button" onClick={() => toast.info(`${label} will be connected next`)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Icon className="size-4" />
                  <span className="flex-1">{label}</span>
                  {meta ? <span className="text-xs tabular-nums">{meta}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardContent className="flex flex-col gap-3 px-4 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">About</h2>
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setEditing(true)}>Edit</button>
          </div>
          <p className="leading-relaxed text-muted-foreground">{profile.about}</p>
          <Separator />
          <Info label="Networks">
            {PROFILE.networks.map((network) => <div key={network}>{network}</div>)}
          </Info>
          <Separator />
          <Info label="Birthday">{PROFILE.birthday}</Info>
          <Separator />
          <Info label="Current city">{profile.city}</Info>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardContent className="flex flex-col gap-3 px-4 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Mutual friends</h2>
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info("Friends list will be connected next")}>See all</button>
          </div>
          <p className="text-muted-foreground">287 friends in common</p>
          <div className="grid grid-cols-3 gap-2">
            {friends.map((friend, index) => (
              <div key={friend} className="flex flex-col items-center gap-1">
                <div className={`aspect-square w-full rounded-lg bg-gradient-to-br ${friendColors[index]}`} />
                <span className="text-xs text-muted-foreground">{friend}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {editing ? <ProfileEditor profile={profile} onCancel={() => setEditing(false)} onSave={saveProfile} /> : null}
    </aside>
  );
}

function ProfileEditor({ profile, onCancel, onSave }: { profile: ProfileData; onCancel: () => void; onSave: (profile: ProfileData) => void }) {
  const [draft, setDraft] = useState(profile);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="presentation" onMouseDown={onCancel}>
      <Card className="relative w-full max-w-sm shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onMouseDown={(event) => event.stopPropagation()}>
        <Button type="button" variant="ghost" size="icon-sm" className="absolute top-3 right-3" onClick={onCancel} aria-label="Close"><X /></Button>
        <CardContent className="flex flex-col gap-3 pt-6">
          <h2 id="edit-profile-title" className="text-lg font-semibold">Edit profile</h2>
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Name" maxLength={50} />
          <Input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} placeholder="City" maxLength={80} />
          <Textarea value={draft.about} onChange={(event) => setDraft({ ...draft, about: event.target.value })} placeholder="About you" maxLength={280} rows={4} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={() => onSave({ ...draft, name: draft.name.trim() || PROFILE.name, city: draft.city.trim() || PROFILE.city, about: draft.about.trim() })}><Upload /> Save changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}`.toUpperCase() : (parts[0]?.[0] ?? "?").toUpperCase();
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-0.5 leading-relaxed">{children}</div></div>;
}
