import { Header } from "@/components/Header";
import { Scheduler } from "@/components/Scheduler";
import { loadScheduler } from "./data";

export const dynamic = "force-dynamic";

export default async function SchedulerPage() {
  const { email, fullName, avatarUrl, isAdmin, designs, posts } =
    await loadScheduler();

  return (
    <div className="min-h-screen">
      <Header
        isAdmin={isAdmin}
        email={email}
        fullName={fullName}
        avatarUrl={avatarUrl}
        active="studio"
      />
      <Scheduler initialPosts={posts} designs={designs} />
    </div>
  );
}
