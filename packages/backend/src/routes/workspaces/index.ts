import type { FastifyInstance } from "fastify"
import list from "./list.js"
import create from "./create.js"
import get from "./get.js"
import rename from "./rename.js"
import remove from "./remove.js"
import transform from "./transform.js"
import files from "./files/index.js"

export default (fastify: FastifyInstance) => {
    fastify.register(list)
    fastify.register(create)
    fastify.register(get)
    fastify.register(rename)
    fastify.register(remove)
    fastify.register(transform)
    fastify.register(files, { prefix: "/:id/files" })
}
