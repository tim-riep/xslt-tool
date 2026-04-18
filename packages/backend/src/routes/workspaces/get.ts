import type { FastifyInstance, FastifyRequest } from "fastify"
import { readdir, stat } from "node:fs/promises"
import type { Dirent } from "node:fs"
import { join, relative, sep } from "node:path"
import { prisma } from "../../index.js"
import { authenticate } from "../../middleware/authenticate.js"
import { kindFromFilename, workspaceDir } from "../../utilities/workspaceFiles.js"

interface FileEntry {
    name: string
    kind: "XML" | "XSLT"
    size: number
    updatedAt: string
}

async function walk(root: string, current: string, acc: FileEntry[]): Promise<void> {
    let entries: Dirent[]
    try {
        entries = await readdir(current, { withFileTypes: true })
    } catch {
        return
    }
    for (const entry of entries) {
        const full = join(current, entry.name)
        if (entry.isDirectory()) {
            await walk(root, full, acc)
            continue
        }
        const kind = kindFromFilename(entry.name)
        if (kind === null) continue
        const info = await stat(full)
        acc.push({
            name: relative(root, full).split(sep).join("/"),
            kind,
            size: info.size,
            updatedAt: info.mtime.toISOString()
        })
    }
}

export default (fastify: FastifyInstance) => {
    fastify.get("/:id", {
        schema: {
            description: "Get a workspace with its file metadata",
            tags: ["workspaces"],
            params: {
                type: "object",
                properties: { id: { type: "integer" } },
                required: ["id"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        updatedAt: { type: "string", format: "date-time" },
                        files: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    kind: { type: "string", enum: ["XML", "XSLT"] },
                                    size: { type: "integer" },
                                    updatedAt: { type: "string", format: "date-time" }
                                }
                            }
                        }
                    }
                },
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
            select: { id: true, name: true, updatedAt: true }
        })
        if (!workspace) return reply.code(404).send({ error: "NOT_FOUND" })

        const dir = workspaceDir(workspace.id)
        const files: FileEntry[] = []
        await walk(dir, dir, files)
        files.sort((a, b) => a.name.localeCompare(b.name))

        return { ...workspace, updatedAt: workspace.updatedAt.toISOString(), files }
    })
}
