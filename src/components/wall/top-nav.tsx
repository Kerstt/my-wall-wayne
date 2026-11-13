"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const links = [
  { label: "Home", href: "/" },
  { label: "Profile", href: "#profile" },
  { label: "Friends", href: "#friends" },
  { label: "Inbox", href: "#inbox", count: 2 },
];

export function TopNav() {
  const [query, setQuery] = useState("");

  function search(value: string) {
    setQuery(value);
    window.dispatchEvent(new CustomEvent("wall:search", { detail: value }));
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">w</span>
          wall
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link, index) => (
            <a
              key={link.label}
              href={link.href}
              aria-current={index === 0 ? "page" : undefined}
              className="relative rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
            >
              {link.label}
              {link.count ? <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{link.count}</span> : null}
            </a>
          ))}
        </nav>
        <div className="relative ml-auto hidden sm:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(event) => search(event.target.value)} placeholder="Search posts" className="h-8 w-56 rounded-full bg-muted/60 pl-8" aria-label="Search posts" />
        </div>
      </div>
    </header>
  );
}
