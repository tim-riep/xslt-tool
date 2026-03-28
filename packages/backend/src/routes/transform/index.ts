import type { FastifyInstance } from "fastify";
import adhoc from "./adhoc.js";

export default (fastify:FastifyInstance) => {
    fastify.register(adhoc,{
        prefix:"/adhoc"
    })
}