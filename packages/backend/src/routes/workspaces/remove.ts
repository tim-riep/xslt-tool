import type { FastifyInstance, FastifyRequest } from "fastify"
import { rm } from "node:fs/promises"
import { prisma } from "../../index.js"
import { authenticate } from "../../middleware/authenticate.js"
import { workspaceDir } from "../../utilities/workspaceFiles.js"

export default (fastify: FastifyInstance) => {
    fastify.delete("/:id", {
        schema: {
            description: "Delete a workspace and all of its files",
            tags: ["workspaces"],
            params: {
                type: "object",
                properties: { id: { type: "integer" } },
                required: ["id"]
            },
            response: {
                204: { type: "null" },
                404: {
                    type: "object",
                    properties: { error: { type: "string", const: "NOT_FOUND" } }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request: FastifyRequest<{ Params: { id: number } }>, reply) => {
        const { id: userId } = request.user as { id: number }
        const { id } = request.params

        const workspace = await prisma.workspace.findFirst({
            where: { id, userId },
            select: { id: true }
        })
        if (!workspace) return reply.code(404).send({ error: "NOT_FOUND" })

        await prisma.workspace.delete({ where: { id } })

        try {
            await rm(workspaceDir(id), { recursive: true, force: true })
        } catch (err) {
            request.log.warn({ err, workspaceId: id }, "failed to remove workspace directory")
        }

        return reply.code(204).send()
    })
}
