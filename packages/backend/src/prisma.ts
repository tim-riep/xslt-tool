import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import type { FastifyInstance } from "fastify";

export default (app: FastifyInstance) => {
    const adapter: PrismaPg = new PrismaPg({
        connectionString: app.config.DATABASE_URL as unknown as string,
    });

    return new PrismaClient({ adapter });
}