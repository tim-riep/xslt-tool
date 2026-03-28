
import type { AnySchema, JSONSchemaType } from 'ajv'
import type { EnvSchemaData } from 'env-schema'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT:number
    };
  }
}

const schema : JSONSchemaType<EnvSchemaData> | AnySchema = {
    type: 'object',
    required: ['PORT'],
    properties: {
        PORT: {
            type:'number',
            default:3000
        }
    }
}

export default schema