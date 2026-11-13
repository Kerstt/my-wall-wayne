"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Globe, ImagePlus, Loader2, MessageSquareText, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getBrowserClient } from "@/lib/supabase";
import {
  FEED_LIMIT,
  MAX_AUTHOR_LENGTH,
  MAX_POST_LENGTH,
  avatarColor,
  initials,
  timeAgo,
  type WallPost,
} from "@/lib/posts";
import { cn } from "@/lib/utils";


function mergePosts(current: WallPost[], incoming: WallPost[]) {
  const byId = new Map(current.map((p) => [p.id, p]));
  for (const p of incoming) byId.set(p.id, p);
  return [...byId.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, FEED_LIMIT);
}

export function WallFeed({ initialPosts }: { initialPosts: WallPost[] }) {
  const [posts, setPosts] = useState<WallPost[]>(initialPosts);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");

  const markFresh = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setFresh((s) => new Set([...s, ...ids]));
    setTimeout(() => {
      setFresh((s) => {
        const next = new Set(s);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 2500);
  }, []);

  const addPosts = useCallback(
    (incoming: WallPost[]) => {
      setPosts((current) => {
        const known = new Set(current.map((p) => p.id));
        markFresh(incoming.filter((p) => !known.has(p.id)).map((p) => p.id));
        const next = mergePosts(current, incoming);
        return next;
      });
    },
    [markFresh],
  );

  const refetch = useCallback(async () => {
    try {
      const { data, error } = await getBrowserClient()
        .from("wall_posts")
        .select("id, author, body, created_at")
        .order("created_at", { ascending: false })
        .limit(FEED_LIMIT);
      if (error) throw error;
      if (data) addPosts(data);
    } catch (error) {
      console.error("Supabase feed unavailable; using local posts", error);
    }
  }, [addPosts]);

  // Live feed: subscribe to new rows, and backfill whenever we (re)connect or the tab regains focus.
  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserClient>;
    try {
      supabase = getBrowserClient();
    } catch (error) {
      console.error("Supabase is not configured; using local posts", error);
      setLive(false);
      return;
    }
    const channel = supabase
      .channel("wall_posts_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wall_posts" },
        (payload) => addPosts([payload.new as WallPost]),
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") void refetch();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [addPosts, refetch]);

  // Keep relative timestamps current.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onSearch = (event: Event) => setQuery((event as CustomEvent<string>).detail);
    window.addEventListener("wall:search", onSearch);
    return () => window.removeEventListener("wall:search", onSearch);
  }, []);

  const visiblePosts = posts.filter((post) => {
    const value = query.trim().toLowerCase();
    return !value || post.author.toLowerCase().includes(value) || post.body.toLowerCase().includes(value);
  });

  return (
    <div className="flex flex-col gap-4">
      <Composer onPosted={(post) => addPosts([post])} />

      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recent activity</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          <span className="relative flex size-2">
            {live ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            ) : null}
            <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-emerald-500" : "bg-muted-foreground/40")} />
          </span>
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {visiblePosts.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <MessageSquareText className="size-6" />
            Nothing here yet. Be the first to write on the wall.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiblePosts.map((post) => (
            <li key={post.id}>
              <PostItem post={post} now={now} fresh={fresh.has(post.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Composer({ onPosted }: { onPosted: (post: WallPost) => void }) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const trimmed = body.trim();
  const remaining = MAX_POST_LENGTH - body.length;
  const canShare = (trimmed.length > 0 || imageUrl !== null) && body.length <= MAX_POST_LENGTH && !pending;

  function chooseImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("Images must be 1.5 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result));
      setImageName(file.name);
    };
    reader.onerror = () => toast.error("Couldn't read that image");
    reader.readAsDataURL(file);
  }

  function share() {
    if (!canShare) return;
    const name = author.trim() || "Anonymous";
    startTransition(async () => {
      const localPost: WallPost = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        author: name,
        body: trimmed,
        image_url: null,
        created_at: new Date().toISOString(),
      };
      try {
        let remoteImageUrl: string | null = null;
        if (imageUrl) {
          const imageBlob = await fetch(imageUrl).then((response) => response.blob());
          const extension = imageBlob.type.split("/")[1] || "jpg";
          const path = `${localPost.id}.${extension}`;
          const supabase = getBrowserClient();
          const { error: uploadError } = await supabase.storage.from("wall-images").upload(path, imageBlob, {
            contentType: imageBlob.type,
            upsert: false,
          });
          if (uploadError) throw uploadError;
          remoteImageUrl = supabase.storage.from("wall-images").getPublicUrl(path).data.publicUrl;
        }
        const { data, error } = await getBrowserClient()
          .from("wall_posts")
          .insert({ id: localPost.id, author: name, body: trimmed, image_url: remoteImageUrl })
          .select("id, author, body, image_url, created_at")
          .single();
        if (error) throw error;
        setBody("");
        setImageUrl(null);
        setImageName("");
        if (data) onPosted(data);
        textareaRef.current?.focus();
      } catch (error) {
        toast.error("Couldn't publish your post", { description: error instanceof Error ? error.message : "Check your Supabase setup and try again." });
      }
    });
  }

  return (
    <Card className="gap-0 py-0">
      <form
        className="flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          share();
        }}
      >
        <div className="flex flex-col gap-2 p-4 pb-3">
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={MAX_AUTHOR_LENGTH}
            placeholder="Your name (optional)"
            aria-label="Your name"
            className="h-8 max-w-60 border-none bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                share();
              }
            }}
            placeholder="What's on your mind?"
            aria-label="Message"
            rows={3}
            className="min-h-20 resize-none border-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {imageUrl ? (
            <div className="relative w-fit overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={imageName || "Selected wall image"} className="max-h-48 max-w-full object-cover" />
              <Button type="button" variant="secondary" size="icon-xs" className="absolute top-2 right-2" onClick={() => { setImageUrl(null); setImageName(""); }} aria-label="Remove selected image">
                <X />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3 border-t px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3.5" />
            Everyone
          </span>
          <span
            className={cn(
              "ml-auto text-xs tabular-nums text-muted-foreground",
              remaining <= 20 && "text-amber-600",
              remaining < 0 && "font-medium text-destructive",
            )}
            aria-live="polite"
          >
            {remaining}
          </span>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => chooseImage(event.target.files?.[0])} />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => imageInputRef.current?.click()} aria-label="Add picture to post">
            <ImagePlus />
          </Button>
          <Button type="submit" size="sm" disabled={!canShare} className="min-w-20">
            {pending ? <Loader2 className="animate-spin" /> : null}
            Share
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PostItem({ post, now, fresh }: { post: WallPost; now: number; fresh: boolean }) {
  return (
    <article
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-4 transition-[background-color,border-color,box-shadow] duration-700",
        fresh && "animate-in fade-in slide-in-from-top-2 border-primary/30 bg-primary/[0.03] shadow-sm",
      )}
    >
      <Avatar size="lg">
        <AvatarFallback className={cn("font-medium", avatarColor(post.author))}>{initials(post.author)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">{post.author}</span>
          <time
            dateTime={post.created_at}
            title={new Date(post.created_at).toLocaleString()}
            className="shrink-0 text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            {timeAgo(post.created_at, now)}
          </time>
        </div>
        <p className="mt-1 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{post.body}</p>
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt={`Picture shared by ${post.author}`} className="mt-3 max-h-96 w-full rounded-lg border object-cover" />
        ) : null}
      </div>
    </article>
  );
}
