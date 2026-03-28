import type { FastifyInstance, FastifyRequest } from "fastify";
import SaxonJS from "saxon-js";
import generateSef from "../../utilities/generateSef.js";

export default (fastify: FastifyInstance) => {
    fastify.post("/", {
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
                }
            }
        }
    }, async (request: FastifyRequest<{
        Body: {
            xml: string,
            stylesheet: string
        }
    }>) => {
        const { xml, stylesheet } = request.body
        const sef = await generateSef(Buffer.from(stylesheet, "base64").toString("utf-8"))
        const data = SaxonJS.transform({
            stylesheetText: sef,
            sourceText: Buffer.from(xml, "base64").toString("utf-8"),
            destination: "serialized"
        })

        return {
            transformedXml: Buffer.from(data.principalResult, "utf-8").toString("base64")
        }
    })
}