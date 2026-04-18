import type { FastifyInstance, FastifyRequest } from "fastify"
import { unlink } from "node:fs/promises"
import { prisma } from "../../../index.js"
import { authenticate } from "../../../middleware/authenticate.js"
import {
    resolveWorkspaceFilePath,
    workspaceDir
} from "../../../utilities/workspaceFiles.js"

export default (fastify: FastifyInstance) => {
    fastify.delete("/*", {
        schema: {
            description: "Delete a file (possibly in a subfolder) from a workspace",
            tags: ["workspaces"],
            params: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    "*": { type: "string" }
                },
                required: ["id", "*"]
            },
            response: {
                204: { type: "null" },
                400: {
                    type: "object",
                    properties: { error: { type: "string", const: "INVALID_FILENAME" } }
                },
                404: {
                    type: "object",
                    properties: { error: { type: "string", const: "NOT_FOUND" } }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request: FastifyRequest<{ Params: { id: number, "*": string } }>, reply) => {
        const { id: userId } = request.user as { id: number }
        const { id } = request.params
        const name = request.params["*"]

        const workspace = await prisma.workspace.findFirst({
            where: { id, userId },
            select: { id: true }
        })
        if (!workspace) return reply.code(404).send({ error: "NOT_FOUND" })

        const filePath = resolveWorkspaceFilePath(workspaceDir(id), name)
        if (!filePath) return reply.code(400).send({ error: "INVALID_FILENAME" })

        try {
            await unlink(filePath)
        } catch {
            return reply.code(404).send({ error: "NOT_FOUND" })
        }

        return reply.code(204).send()
    })
}
