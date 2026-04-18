import type { FastifyInstance } from "fastify"
import { prisma } from "../../index.js"
import { authenticate } from "../../middleware/authenticate.js"

export default (fastify: FastifyInstance) => {
    fastify.get("/", {
        schema: {
            description: "List workspaces owned by the current user",
            tags: ["workspaces"],
            response: {
                200: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "integer" },
                            name: { type: "string" },
                            updatedAt: { type: "string", format: "date-time" }
                        }
                    }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request) => {
        const { id: userId } = request.user as { id: number }

        const workspaces = await prisma.workspace.findMany({
            where: { userId },
            select: { id: true, name: true, updatedAt: true },
            orderBy: { updatedAt: "desc" }
        })

        return workspaces
    })
}
