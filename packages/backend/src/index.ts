import { mkdir } from "node:fs/promises";
import makeApp from "./app/makeApp.js";
import { join } from "node:path";
import folderExists from "./utilities/folderExists.js";
import makePrisma from "./prisma.js";

for (const folder of ["storage", "storage/workspaces", "storage/adhoc", "public"]) {
    const path = join(import.meta.dirname, "..", folder)
    if (!await folderExists(path)) {
        await mkdir(path, { recursive: true })
    }
}

const app = await makeApp()

// Inferred from the fully-registered app instance so route files get typed
// access to plugin decorators (e.g. fastify.jwt, fastify.config).
export type AppType = typeof app

// Module-level singleton shared across all route handlers via named import.
export const prisma = makePrisma(app)

// Ensure all plugin registrations have settled before opening the socket.
await app.ready()

// Errors are handled by Fastify's built-in logger; no explicit catch needed.
void app.listen({
    port:app.config.PORT,
    host:app.config.HOST as unknown as string
})