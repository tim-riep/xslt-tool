import type { FastifyInstance } from "fastify"
import { prisma } from "../../index.js"
import { authenticate } from "../../middleware/authenticate.js"

export default (fastify: FastifyInstance) => {
    fastify.get("/", {
        schema: {
            description: "Get current user details",
            tags: ["users"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        email: { type: "string", nullable: true },
                        firstName: { type: "string", nullable: true },
                        lastName: { type: "string" }
                    }
                },
                401: {
                    type: "object",
                    properties: {
                        error: { type: "string", const: "UNAUTHORIZED" }
                    }
                },
                404: {
                    type: "object",
                    properties: {
                        error: { type: "string", const: "NOT_FOUND" }
                    }
                }
            }
        },
        preHandler: [authenticate]
    }, async (request, reply) => {
        const { id } = request.user as { id: number }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
            }
        })

        if (!user)
            return reply.code(404).send({ error: "NOT_FOUND" })

        return reply.send(user)
    })
}
