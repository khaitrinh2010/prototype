import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const sessionRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "asc" },
          select: { id: true, versionNumber: true, prompt: true, createdAt: true },
        },
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: {
          versions: { orderBy: { versionNumber: "asc" } },
        },
      });
    }),

  create: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.project.create({
      data: { userId: ctx.session.user.id },
    });
  }),

  updateTitle: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { title: input.title },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.project.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: { versions: { orderBy: { versionNumber: "asc" } } },
      });

      if (!original) throw new Error("Session not found");

      return ctx.db.project.create({
        data: {
          title: `${original.title} (copy)`,
          userId: ctx.session.user.id,
          versions: {
            create: original.versions.map((v) => ({
              versionNumber: v.versionNumber,
              prompt: v.prompt,
              htmlContent: v.htmlContent,
              aiMessage: v.aiMessage,
            })),
          },
        },
        include: { versions: { orderBy: { versionNumber: "asc" } } },
      });
    }),
});
