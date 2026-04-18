import type { FastifyInstance, FastifyRequest } from "fastify"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { authenticate } from "../../middleware/authenticate.js"
import { adhocDir } from "../../utilities/workspaceFiles.js"

export default (fastify: FastifyInstance) => {
    fastify.put("/", {
        schema: {
            description: "Save the current user's adhoc XML and/or XSLT auto-state",
            tags: ["adhoc"],
            body: {
                type: "object",
                properties: {
                    xml: { type: "string", contentEncoding: "base64" },
                    xslt: { type: "string", contentEncoding: "base64" }
                }
            },
            response: {
                204: { type: "null" }
            }
        },
        preHandler: [authenticate]
    }, async (request: FastifyRequest<{ Body: { xml?: string, xslt?: string } }>, reply) => {
        const { id: userId } = request.user as { id: number }
        const { xml, xslt } = request.body

        const dir = adhocDir(userId)
        await mkdir(dir, { recursive: true })

        const writes: Promise<void>[] = []
        if (typeof xml === "string") {
            writes.push(writeFile(join(dir, "input.xml"), Buffer.from(xml, "base64")))
        }
        if (typeof xslt === "string") {
            writes.push(writeFile(join(dir, "stylesheet.xsl"), Buffer.from(xslt, "base64")))
        }
        await Promise.all(writes)

        return reply.code(204).send()
    })
}
