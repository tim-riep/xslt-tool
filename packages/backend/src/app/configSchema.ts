
import type { AnySchema, JSONSchemaType } from 'ajv'
import type { EnvSchemaData } from 'env-schema'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT:number,
      DATABASE_URL:string,
      JWT_PASSPHRASE:string,
      SECURE_COOKIES:boolean
    };
  }
}

const schema : JSONSchemaType<EnvSchemaData> | AnySchema = {
    type: 'object',
    required: ['PORT','DATABASE_URL','JWT_PASSPHRASE'],
    properties: {
        PORT: {
            type:'number',
            default:3000
        },
        DATABASE_URL:{
            type:'string'
        },
        JWT_PASSPHRASE: {
          type:"string"
        },
        SECURE_COOKIES: {
          type:"boolean",
          default: true
        }

    }
}

export default schema