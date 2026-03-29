import { type FastifyRequest } from "fastify";
import { prisma, type AppType } from "../../index.js";
import { verify } from "argon2";

export default (fastify: AppType) => {
    fastify.post("/", {
        schema: {
            description: 'Login',
            tags: ["auth"],
            security: [],
            body: {
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            grant_type: {
                                type: "string",
                                const: "user_credentials"
                            },
                            mail: {
                                type: "string",
                                format: "email",
                                minLength: 5
                            },
                            password: {
                                type: "string",
                                minLength: 10,
                                maxLength: 256
                            }
                        },
                        required: ["mail", "password", "grant_type"]
                    },
                    {
                        type: "object",
                        required: ["grant_type"],
                        properties: {
                            grant_type: {
                                type: "string",
                                const: "refresh_cookie"
                            }
                        }
                    }
                ]
            },
            response: {
                200: {
                    description: "Success",
                    type: "object",
                    properties: {
                        access_token: {
                            type: "string"
                        }
                    }
                },
                401: {
                    description: "missing or invalid refresh token",
                    type: "object",
                    properties: {
                        error: {
                            type: "string",
                            const: "NO_MATCH"
                        }
                    }
                },
                409: {
                    description: "data does not match database",
                    type: "object",
                    properties: {
                        error: {
                            type: "string",
                            const: "NO_MATCH"
                        }
                    }
                },
                400: {
                    description: "validation error",
                    type: "object",
                    properties: {
                        code: {
                            type: "string"
                        },
                        error: {
                            type: "string"
                        },
                        message: {
                            type: "string"
                        }
                    }
                }
            }
        }
    }, async (request: FastifyRequest<{
        Body: {
            mail: string,
            password: string,
            grant_type: "user_credentials"
        } | {
            grant_type: "refresh_cookie"
        }
    }>, response) => {
        if (request.body.grant_type === "user_credentials") {
            const user = await prisma.user.findUnique({
                where: {
                    email: request.body.mail
                },
                select: {
                    password: true,
                    id: true
                }
            })

            if (!user || !user.password)
                return response.code(409).send({
                    error: "NO_MATCH"
                })

            if (!await verify(user.password, request.body.password))
                return response.code(409).send({
                    error: "NO_MATCH"
                })



            return response.status(200).setCookie('refresh_token', fastify.jwt.sign({
                id: user.id
            }, {
                expiresIn: "60m"
            }), {
                httpOnly: true,
                sameSite: "strict",
                secure: fastify.config.SECURE_COOKIES as unknown as boolean,
                path: "/auth/login",
            }).send({
                access_token: fastify.jwt.sign({
                    id: user.id
                }, {
                    expiresIn: "300s"
                })
            })
        } else {
            const token = request.cookies.refresh_token
            if (!token)
                return response.code(401).send({ error: "NO_MATCH" })

            let payload: { id: string }
            try {
                payload = fastify.jwt.verify<{ id: string }>(token)
            } catch {
                return response.code(401).send({ error: "NO_MATCH" })
            }

            return response.status(200).setCookie('refresh_token', fastify.jwt.sign({
                id: payload.id
            }, {
                expiresIn: "60m"
            }), {
                httpOnly: true,
                sameSite: "strict",
                secure: fastify.config.SECURE_COOKIES as unknown as boolean,
                path: "/auth/login",
            }).send({
                access_token: fastify.jwt.sign({
                    id: payload.id
                }, {
                    expiresIn: "300s"
                })
            })
        }

    })
}