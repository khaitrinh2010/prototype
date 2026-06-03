import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { sessionRouter } from "~/server/api/routers/session";
import { versionRouter } from "~/server/api/routers/version";

export const appRouter = createTRPCRouter({
  session: sessionRouter,
  version: versionRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
