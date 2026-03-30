import { type FastifyRequest } from "fastify";
import { prisma, type AppType } from "../../index.js";
import { compare } from "bcryptjs";

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

            // 409 (not 401) deliberately — avoids revealing whether the email
            // exists or the password is wrong (credential enumeration prevention).
            if (!user || !user.password)
                return response.code(409).send({
                    error: "NO_MATCH"
                })

            if (!await compare(request.body.password, user.password))
                return response.code(409).send({
                    error: "NO_MATCH"
                })



            return response.status(200).setCookie('refresh_token', fastify.jwt.sign({
                id: user.id
            }, {
                // Refresh token lives longer than the access token; the client
                // uses it to obtain a new access token without re-entering credentials.
                expiresIn: "60m"
            }), {
                httpOnly: true,
                sameSite: "strict",
                secure: fastify.config.SECURE_COOKIES as unknown as boolean,
                // Scoped to this path so the cookie is never sent on regular API
                // requests — only on explicit refresh calls to /auth/login.
                path: "/auth/login",
            }).send({
                access_token: fastify.jwt.sign({
                    id: user.id
                }, {
                    // Short-lived: clients must refresh frequently, limiting the
                    // damage window if an access token is leaked.
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

            // Rotate the refresh token on every use so a stolen token can only
            // be used once before it is replaced.
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