import fastifyEnv from "@fastify/env";
import { fastify, type FastifyInstance } from "fastify";
import configSchema from "./configSchema.js";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import routes from "../routes/index.js";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
export default async () : Promise<FastifyInstance> => {
    const app = fastify({
        logger:true,
        bodyLimit:1024*1024*1024, // 1 GB — XSLT transformations may involve large XML documents
        trustProxy: true // Required behind Caddy/nginx so X-Forwarded-Proto is honoured (SECURE_COOKIES)
    })

    if (process.env.NODE_ENV !== "production") {
        // In production everything is served through Caddy on a single
        // origin — CORS is a no-op. Dev uses Vite's proxy, but keep CORS
        // enabled so direct hits from other origins (Swagger UI, curl from
        // a browser tab, ad-hoc tools) work.
        await app.register(fastifyCors, {
            origin: true,
            credentials: true,
        })
    }

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
            },
            security: [{ bearerAuth: [] }],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT"
                    }
                }
            }
        }
    })

    await app.register(fastifySwaggerUi)

    app.register(routes, { prefix: "/api" })

    await app.register(fastifyJwt,{
        secret: app.config.JWT_PASSPHRASE as unknown as string
    })

    await app.register(fastifyCookie,{
        secret: app.config.JWT_PASSPHRASE as unknown as string
    })

    const publicDir = join(import.meta.dirname, "..", "..", "public")
    await app.register(fastifyStatic, {
        root: publicDir,
        prefix: "/",
        wildcard: false
    })

    app.setNotFoundHandler((request, reply) => {
        if (request.method === "GET" && !request.url.startsWith("/api") && !request.url.startsWith("/documentation")) {
            return reply.sendFile("index.html")
        }
        return reply.code(404).send({ statusCode: 404, error: "Not Found", message: `Route ${request.method}:${request.url} not found` })
    })

    return app;
}