import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { SessionGrid } from "~/components/dashboard/SessionGrid";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  void api.session.list.prefetch();

  return (
    <HydrateClient>
      <SessionGrid />
    </HydrateClient>
  );
}
