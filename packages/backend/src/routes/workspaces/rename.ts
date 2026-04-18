import type { FastifyInstance, FastifyRequest } from "fastify"
import { prisma } from "../../index.js"
import { authenticate } from "../../middleware/authenticate.js"

export default (fastify: FastifyInstance) => {
    fastify.patch("/:id", {
        schema: {
            description: "Rename a workspace",
            tags: ["workspaces"],
            params: {
                type: "object",
                properties: { id: { type: "integer" } },
                required: ["id"]
            },
            body: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 1, maxLength: 120 }
                },
                required: ["name"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                404: {
                    type: "object",
                    properties: { error: { type: "string", const: "NOT_FOUND" } }
                },
                409: {
                    type: "object",
                    properties: { error: { type: "string", const: "NAME_TAKEN" } }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request: FastifyRequest<{ Params: { id: number }, Body: { name: string } }>, reply) => {
        const { id: userId } = request.user as { id: number }
        const { id } = request.params
        const { name } = request.body

        const workspace = await prisma.workspace.findFirst({
            where: { id, userId },
            select: { id: true }
        })
        if (!workspace) return reply.code(404).send({ error: "NOT_FOUND" })

        const clash = await prisma.workspace.findUnique({
            where: { userId_name: { userId, name } },
            select: { id: true }
        })
        if (clash && clash.id !== id) return reply.code(409).send({ error: "NAME_TAKEN" })

        const updated = await prisma.workspace.update({
            where: { id },
            data: { name },
            select: { id: true, name: true, updatedAt: true }
        })

        return updated
    })
}
