import type { FastifyInstance, FastifyRequest } from "fastify";
import SaxonJS from "saxon-js";
import generateSef from "../../utilities/generateSef.js";
import { authenticate } from "../../middleware/authenticate.js";

export default (fastify: FastifyInstance) => {
    fastify.post("/", {
        preHandler: [authenticate],
        schema: {
            description: "Run adhoc transformation",
            tags: ["transform"],
            body: {
                type: "object",
                properties: {
                    xml: {
                        type: "string",
                        contentEncoding: "base64",
                        description: "XML to be transformed as base64 string"
                    },
                    stylesheet: {
                        type: "string",
                        contentEncoding: "base64",
                        description: "Stylesheet as base64 string"
                    }
                },
                required: ["xml", "stylesheet"]
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        transformedXml: {
                            type: "string",
                            contentEncoding: "base64",
                            description: "Transformed XML as base64 string"
                        }
                    }
                },
                400: {
                    type: "object",
                    properties: {
                        errorMessage: {
                            type: "string"
                        }
                    }
                }
            }
        }
    }, async (request: FastifyRequest<{
        Body: {
            xml: string,
            stylesheet: string
        }
    }>, reply) => {
        const { xml, stylesheet } = request.body

        let sef: string = ""

        try {
            sef = await generateSef(Buffer.from(stylesheet, "base64").toString("utf-8"))
        }
        catch (error: unknown) {

            if (error instanceof Error) {

                return reply.status(400).send({
                    errorMessage: error.message.replace(/file:\/\/\/.*?\.xsl/g, 'file:///[REDACTED].xsl').split('\n').slice(1).join('\n')
                })
            }
        }

        try {
            const data = SaxonJS.transform({
                stylesheetText: sef,
                sourceText: Buffer.from(xml, "base64").toString("utf-8"),
                destination: "serialized"
            })

            return {
                transformedXml: Buffer.from(data.principalResult, "utf-8").toString("base64")
            }
        } catch (error) {
            if (error instanceof Error) {
                return reply.status(400).send({
                    errorMessage: error.message
                })
            }
            return reply.status(400).send({
                errorMessage: ""
            })
        }



    })
}