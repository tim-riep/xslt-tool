import type { FastifyInstance } from "fastify"
import get from "./get.js"
import save from "./save.js"

export default (fastify: FastifyInstance) => {
    fastify.register(get)
    fastify.register(save)
}
