import type { FastifyInstance, FastifyRequest } from "fastify"
import { mkdir } from "node:fs/promises"
import { prisma } from "../../index.js"
import { authenticate } from "../../middleware/authenticate.js"
import { workspaceDir } from "../../utilities/workspaceFiles.js"

export default (fastify: FastifyInstance) => {
    fastify.post("/", {
        schema: {
            description: "Create a new workspace",
            tags: ["workspaces"],
            body: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 1, maxLength: 120 }
                },
                required: ["name"]
            },
            response: {
                201: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                409: {
                    type: "object",
                    properties: { error: { type: "string", const: "NAME_TAKEN" } }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request: FastifyRequest<{ Body: { name: string } }>, reply) => {
        const { id: userId } = request.user as { id: number }
        const { name } = request.body

        const existing = await prisma.workspace.findUnique({
            where: { userId_name: { userId, name } },
            select: { id: true }
        })
        if (existing) return reply.code(409).send({ error: "NAME_TAKEN" })

        const workspace = await prisma.workspace.create({
            data: { name, userId },
            select: { id: true, name: true, updatedAt: true }
        })

        await mkdir(workspaceDir(workspace.id), { recursive: true })

        return reply.code(201).send(workspace)
    })
}
