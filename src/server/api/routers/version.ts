import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { generateUI } from "~/lib/claude";

export const versionRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        prompt: z.string().min(1),
        parentVersionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.sessionId, userId: ctx.session.user.id },
        include: { versions: { orderBy: { versionNumber: "asc" } } },
      });

      if (!project) throw new Error("Session not found");

      let previousHtml: string | undefined;
      if (input.parentVersionId) {
        const parent = project.versions.find((v) => v.id === input.parentVersionId);
        previousHtml = parent?.htmlContent;
      }

      const { html: htmlContent, message: aiMessage } = await generateUI(input.prompt, previousHtml);

      const nextVersionNumber = (project.versions.length ?? 0) + 1;

      const [version] = await ctx.db.$transaction([
        ctx.db.version.create({
          data: {
            projectId: project.id,
            versionNumber: nextVersionNumber,
            prompt: input.prompt,
            htmlContent,
            aiMessage,
          },
        }),
        ...(project.versions.length === 0
          ? [ctx.db.project.update({
              where: { id: project.id },
              data: { title: input.prompt.slice(0, 60), updatedAt: new Date() },
            })]
          : [ctx.db.project.update({
              where: { id: project.id },
              data: { updatedAt: new Date() },
            })]),
      ]);

      return version!;
    }),
});
