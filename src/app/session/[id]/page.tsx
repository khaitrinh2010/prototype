import { notFound, redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { SessionView } from "~/components/session/SessionView";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  void api.session.getById.prefetch({ id });

  return (
    <HydrateClient>
      <SessionView sessionId={id} />
    </HydrateClient>
  );
}
