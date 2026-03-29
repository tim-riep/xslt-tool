import type { FastifyInstance } from "fastify"
import me from "./me.js"

export default (fastify: FastifyInstance) => {
    fastify.register(me, { prefix: "/me" })
}
