import type { FastifyInstance, FastifyRequest } from "fastify"
import { readFile, stat } from "node:fs/promises"
import { prisma } from "../../../index.js"
import { authenticate } from "../../../middleware/authenticate.js"
import {
    kindFromFilename,
    resolveWorkspaceFilePath,
    workspaceDir
} from "../../../utilities/workspaceFiles.js"

export default (fastify: FastifyInstance) => {
    fastify.get("/*", {
        schema: {
            description: "Get a file (possibly in a subfolder) from a workspace",
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
                200: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        kind: { type: "string", enum: ["XML", "XSLT"] },
                        content: {
                            type: "string",
                            contentEncoding: "base64",
                            description: "File content as base64"
                        },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                400: {
                    type: "object",
                    properties: { error: { type: "string", const: "INVALID_FILENAME" } }
                },
                404: {
                    type: "object",
                    properties: { error: { type: "string", enum: ["NOT_FOUND"] } }
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

        const kind = kindFromFilename(name)
        if (kind === null) return reply.code(400).send({ error: "INVALID_FILENAME" })

        try {
            const [buffer, info] = await Promise.all([readFile(filePath), stat(filePath)])
            return {
                name,
                kind,
                content: buffer.toString("base64"),
                updatedAt: info.mtime.toISOString()
            }
        } catch {
            return reply.code(404).send({ error: "NOT_FOUND" })
        }
    })
}
