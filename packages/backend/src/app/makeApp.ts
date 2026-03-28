import fastifyEnv from "@fastify/env";
import { fastify, type FastifyInstance } from "fastify";
import configSchema from "./configSchema.js";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import routes from "../routes/index.js";

export default async () : Promise<FastifyInstance> => {
    const app = fastify({
        logger:true,
        bodyLimit:1024*1024*1024
    })

    await app.register(fastifyEnv, {
        confKey:'config',
        schema:configSchema,
        dotenv:true
    })

    await app.register(fastifySwagger, {
        openapi: {
            openapi:"3.0.0",
            info:{
                title:'XSL Tool API',
                version:'0.0.1'
            }
        }
    })

    await app.register(fastifySwaggerUi)

    app.register(routes)

    return app;
}