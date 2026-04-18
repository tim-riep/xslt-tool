import type { AppType } from "../../index.js";
import { authenticate } from "../../middleware/authenticate.js";

export default (fastify: AppType) => {
    fastify.post("/", {
        preHandler: [authenticate],
        schema: {
            description: 'Logout',
            tags: ["auth"],
            response: {
                200: {
                    description: "Successfully logged out",
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            const: "LOGGED_OUT"
                        }
                    }
                }
            }
        }
    }, async (_request, response) => {
        return response.status(200).clearCookie('refresh_token', {
            httpOnly: true,
            sameSite: "strict",
            secure: fastify.config.SECURE_COOKIES as unknown as boolean,
            path: "/api/auth/login",
        }).send({
            message: "LOGGED_OUT"
        })
    })
}
