import type { FastifyInstance } from "fastify";
import transform from "./transform/index.js";

const routes = (fastify:FastifyInstance) => {
    fastify.register(transform,{
        prefix:"/transform"
    })
}

export default routes