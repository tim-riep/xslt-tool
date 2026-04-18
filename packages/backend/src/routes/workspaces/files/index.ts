import type { FastifyInstance } from "fastify"
import get from "./get.js"
import upsert from "./upsert.js"
import remove from "./remove.js"

export default (fastify: FastifyInstance) => {
    fastify.register(get)
    fastify.register(upsert)
    fastify.register(remove)
}
