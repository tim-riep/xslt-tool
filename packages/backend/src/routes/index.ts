import type { FastifyInstance } from "fastify";
import transform from "./transform/index.js";
import auth from "./auth/index.js";
import users from "./users/index.js";
import workspaces from "./workspaces/index.js";
import adhoc from "./adhoc/index.js";
import fastifyRateLimit from "@fastify/rate-limit";

const routes = (fastify:FastifyInstance) => {
    fastify.register(fastifyRateLimit,{
        max:10000,
        timeWindow:"1 minute"
    })
    fastify.register(transform,{
        prefix:"/transform"
    })
    fastify.register(auth,{
        prefix:"/auth"
    })
    fastify.register(users,{
        prefix:"/users"
    })
    fastify.register(workspaces,{
        prefix:"/workspaces"
    })
    fastify.register(adhoc,{
        prefix:"/adhoc"
    })
}

export default routes