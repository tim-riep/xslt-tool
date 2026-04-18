import type { FastifyInstance, FastifyRequest } from "fastify"
import { mkdir, stat, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { prisma } from "../../../index.js"
import { authenticate } from "../../../middleware/authenticate.js"
import {
    importHrefIsSafe,
    kindFromFilename,
    resolveWorkspaceFilePath,
    workspaceDir
} from "../../../utilities/workspaceFiles.js"

// Kept in sync with STATIC_FILE_ACCESS_PATTERNS in utilities/workspaceFiles.ts.
const STATIC_FILE_ACCESS_PATTERNS: RegExp[] = [
    /\bxsl:(?:import|include|use-package|import-schema)\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi,
    /\bxsl:result-document\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi,
    /\b(?:document|doc)\s*\(\s*["']([^"']+)["']/gi,
    /\bunparsed-text(?:-lines|-available)?\s*\(\s*["']([^"']+)["']/gi,
]

export default (fastify: FastifyInstance) => {
    fastify.put("/*", {
        schema: {
            description: "Create or overwrite a file (possibly in a subfolder) in a workspace",
            tags: ["workspaces"],
            params: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    "*": { type: "string" }
                },
                required: ["id", "*"]
            },
            body: {
                type: "object",
                properties: {
                    content: {
                        type: "string",
                        contentEncoding: "base64",
                        description: "File content as base64"
                    }
                },
                required: ["content"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                400: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                        errorMessage: { type: "string" }
                    }
                },
                404: {
                    type: "object",
                    properties: { error: { type: "string", const: "NOT_FOUND" } }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request: FastifyRequest<{
        Params: { id: number, "*": string },
        Body: { content: string }
    }>, reply) => {
        const { id: userId } = request.user as { id: number }
        const { id } = request.params
        const name = request.params["*"]
        const { content } = request.body

        const workspace = await prisma.workspace.findFirst({
            where: { id, userId },
            select: { id: true }
        })
        if (!workspace) return reply.code(404).send({ error: "NOT_FOUND" })

        const dir = workspaceDir(id)
        const filePath = resolveWorkspaceFilePath(dir, name)
        if (!filePath) return reply.code(400).send({ error: "INVALID_FILENAME" })

        // For XSLT uploads, reject any import/include href that would point
        // outside the workspace before we persist it. The transform endpoint
        // does the same scan as a safety net across pre-existing files.
        if (kindFromFilename(name) === "XSLT") {
            const text = Buffer.from(content, "base64").toString("utf-8")
            for (const pattern of STATIC_FILE_ACCESS_PATTERNS) {
                pattern.lastIndex = 0
                let match: RegExpExecArray | null
                while ((match = pattern.exec(text)) !== null) {
                    const href = match[1]
                    if (!href) continue
                    if (!importHrefIsSafe(dir, href)) {
                        return reply.code(400).send({
                            error: "UNSAFE_IMPORT",
                            errorMessage: `Reference "${href}" resolves outside of the workspace.`
                        })
                    }
                }
            }
        }

        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, Buffer.from(content, "base64"))

        await prisma.workspace.update({
            where: { id },
            data: { updatedAt: new Date() }
        })

        const info = await stat(filePath)
        return { name, updatedAt: info.mtime.toISOString() }
    })
}
