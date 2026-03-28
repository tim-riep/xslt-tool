import fastifyEnv from "@fastify/env";
import { fastify, type FastifyInstance } from "fastify";
import configSchema from "./configSchema.js";

export default async () : Promise<FastifyInstance> => {
    const app = fastify({
        logger:true
    })

    await app.register(fastifyEnv, {
        confKey:'config',
        schema:configSchema,
        dotenv:{
            debug:true
        }
    })

    return app;
}