import { Waves, HardDrive, Gift } from "lucide-react";

const items = [
  {
    icon: Waves,
    tint: "bg-sky-50 text-sky-600",
    title: "Weekend dive trips",
    body: "Reef and wreck dives for every level. Small groups, gear included.",
  },
  {
    icon: HardDrive,
    tint: "bg-emerald-50 text-emerald-600",
    title: "One-click backups",
    body: "Image your whole drive in minutes and restore to any machine.",
  },
  {
    icon: Gift,
    tint: "bg-rose-50 text-rose-600",
    title: "Handmade card boxes",
    body: "Keepsake boxes for weddings and celebrations, made to order.",
  },
];

export function RightRail() {
  return (
    <aside className="flex flex-col gap-3">
      <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sponsored</h2>
      {items.map(({ icon: Icon, tint, title, body }) => (
        <a
          key={title}
          href="#"
          className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
        >
          <span className={`grid size-9 place-items-center rounded-lg ${tint}`}>
            <Icon className="size-4.5" />
          </span>
          <span className="text-sm font-medium group-hover:text-primary">{title}</span>
          <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
        </a>
      ))}
    </aside>
  );
}
