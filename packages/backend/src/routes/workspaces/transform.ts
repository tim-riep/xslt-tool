import type { FastifyInstance, FastifyRequest } from "fastify"
import { readFile } from "node:fs/promises"
import SaxonJS from "saxon-js"
import { prisma } from "../../index.js"
import { authenticate } from "../../middleware/authenticate.js"
import { generateSefFromPath } from "../../utilities/generateSef.js"
import {
    findUnsafeImport,
    resolveWorkspaceFilePath,
    workspaceDir
} from "../../utilities/workspaceFiles.js"

export default (fastify: FastifyInstance) => {
    fastify.post("/:id/transform", {
        schema: {
            description: "Run an XSLT transformation using files stored in a workspace",
            tags: ["workspaces", "transform"],
            params: {
                type: "object",
                properties: { id: { type: "integer" } },
                required: ["id"]
            },
            body: {
                type: "object",
                properties: {
                    xsltFile: { type: "string" },
                    xmlFile: { type: "string" },
                    xmlContent: {
                        type: "string",
                        contentEncoding: "base64",
                        description: "Base64 XML content, used when the XML source isn't a workspace file"
                    }
                },
                required: ["xsltFile"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        transformedXml: {
                            type: "string",
                            contentEncoding: "base64"
                        }
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
        Params: { id: number },
        Body: { xsltFile: string, xmlFile?: string, xmlContent?: string }
    }>, reply) => {
        const { id: userId } = request.user as { id: number }
        const { id } = request.params
        const { xsltFile, xmlFile, xmlContent } = request.body

        if (!xmlFile && typeof xmlContent !== "string")
            return reply.code(400).send({ error: "XML_REQUIRED" })

        const workspace = await prisma.workspace.findFirst({
            where: { id, userId },
            select: { id: true }
        })
        if (!workspace) return reply.code(404).send({ error: "NOT_FOUND" })

        const dir = workspaceDir(id)
        const xsltPath = resolveWorkspaceFilePath(dir, xsltFile)
        if (!xsltPath) return reply.code(400).send({ error: "INVALID_FILENAME" })

        let xmlText: string
        if (xmlFile) {
            const xmlPath = resolveWorkspaceFilePath(dir, xmlFile)
            if (!xmlPath) return reply.code(400).send({ error: "INVALID_FILENAME" })
            try {
                xmlText = (await readFile(xmlPath)).toString("utf-8")
            } catch {
                return reply.code(404).send({ error: "NOT_FOUND" })
            }
        } else if (typeof xmlContent === "string") {
            xmlText = Buffer.from(xmlContent, "base64").toString("utf-8")
        } else {
            return reply.code(400).send({ error: "XML_REQUIRED" })
        }

        const unsafe = await findUnsafeImport(dir)
        if (unsafe) {
            return reply.code(400).send({
                error: "UNSAFE_IMPORT",
                errorMessage: `Reference "${unsafe.reference}" in workspace resolves outside of the workspace folder.`
            })
        }

        let sef: string
        try {
            sef = await generateSefFromPath(xsltPath)
        } catch (error: unknown) {
            if (error instanceof Error) {
                return reply.code(400).send({
                    error: "COMPILE_FAILED",
                    errorMessage: error.message.split("\n").slice(1).join("\n")
                })
            }
            return reply.code(400).send({ error: "COMPILE_FAILED" })
        }

        try {
            const data = SaxonJS.transform({
                stylesheetText: sef,
                sourceText: xmlText,
                destination: "serialized"
            })
            return {
                transformedXml: Buffer.from(data.principalResult, "utf-8").toString("base64")
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                return reply.code(400).send({
                    error: "TRANSFORM_FAILED",
                    errorMessage: error.message
                })
            }
            return reply.code(400).send({ error: "TRANSFORM_FAILED" })
        }
    })
}
