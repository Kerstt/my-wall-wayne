import { TopNav } from "@/components/wall/top-nav";
import { ProfileSidebar } from "@/components/wall/profile-sidebar";
import { RightRail } from "@/components/wall/right-rail";
import { WallFeed } from "@/components/wall/wall-feed";
import { PROFILE } from "@/lib/profile";

export const dynamic = "force-dynamic";

const tabs = ["Wall", "Info", "Photos", "Notes", "Boxes"];

export default async function Home() {
  return (
    <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_240px]">
          <div className="order-2 md:order-1">
            <ProfileSidebar />
          </div>

          <section className="order-1 flex min-w-0 flex-col gap-5 md:order-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{PROFILE.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{PROFILE.city}</p>
            </div>

            <nav className="flex gap-1 border-b" aria-label="Profile sections">
              {tabs.map((tab) => {
                const active = tab === "Wall";
                return (
                  <a
                    key={tab}
                    href="#"
                    aria-current={active ? "page" : undefined}
                    className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                  >
                    {tab}
                  </a>
                );
              })}
            </nav>

            <WallFeed initialPosts={[]} />
          </section>

          <div className="order-3 hidden lg:block">
            <RightRail />
          </div>
        </main>
    </div>
  );
}
