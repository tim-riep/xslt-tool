import { type FastifyInstance, type FastifyRequest } from "fastify";
import { prisma } from "../../index.js";
import { hash } from "argon2";

export default (fastify: FastifyInstance) => {
    fastify.post("/", {
        schema: {
            description: 'Register a user',
            tags: ["auth"],
            body: {
                type: "object",
                properties: {
                    mail: {
                        type: "string",
                        format: "email",
                        minLength: 5
                    },
                    password: {
                        type: "string",
                        minLength: 10,
                        maxLength: 256
                    },
                    firstName: {
                        type:"string",
                        minLength:1
                    },
                    lastName: {
                        type:"string",
                        minLength:1
                    }
                },
                required: ["mail", "password","lastName"],
                additionalProperties: false
            },
            response:{
                201: {
                    description:"User created"
                },
                409: {
                    description:"Mail taken",
                    type:"object",
                    properties:{
                        error: {
                            type:"string",
                            const:"EMAIL_TAKEN"
                        }
                    }
                },
                400: {
                    description:"validation error",
                    type:"object",
                    properties:{
                        code: {
                            type:"string"
                        },
                        error:{
                            type:"string"
                        },
                        message:{
                            type:"string"
                        }
                    }
                }
            }
        }
    }, async (request: FastifyRequest<{
        Body: {
            mail: string,
            lastName:string,
            firstName?:string,
            password:string
        }
    }>, response) => {
        const user = await prisma.user.findUnique({
            where: {
                email: request.body.mail
            }
        })

        if (user)
            return response.code(409).send({
                error:"EMAIL_TAKEN"
        })

        await prisma.user.create({
            data:{
                lastName:request.body.lastName,
                email:request.body.mail,
                firstName:request.body.firstName ?? null,
                password:await hash(request.body.password)
            }
        })
        return response.status(201)

    })
}