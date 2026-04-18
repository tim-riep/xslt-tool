import type { FastifyInstance } from "fastify"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { authenticate } from "../../middleware/authenticate.js"
import { adhocDir } from "../../utilities/workspaceFiles.js"

const readIfExists = async (path: string): Promise<string> => {
    try {
        const buf = await readFile(path)
        return buf.toString("base64")
    } catch {
        return ""
    }
}

export default (fastify: FastifyInstance) => {
    fastify.get("/", {
        schema: {
            description: "Get the current user's auto-saved adhoc XML and XSLT",
            tags: ["adhoc"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        xml: { type: "string", contentEncoding: "base64" },
                        xslt: { type: "string", contentEncoding: "base64" }
                    }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request) => {
        const { id: userId } = request.user as { id: number }
        const dir = adhocDir(userId)

        const [xml, xslt] = await Promise.all([
            readIfExists(join(dir, "input.xml")),
            readIfExists(join(dir, "stylesheet.xsl"))
        ])

        return { xml, xslt }
    })
}
