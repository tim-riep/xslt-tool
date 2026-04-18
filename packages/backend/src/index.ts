import { mkdir } from "node:fs/promises";
import makeApp from "./app/makeApp.js";
import { join } from "node:path";
import folderExists from "./utilities/folderExists.js";
import makePrisma from "./prisma.js";

if(!await folderExists(join(import.meta.dirname,"..","storage")))
{
    await mkdir(join(import.meta.dirname,"..","storage"))
}

if(!await folderExists(join(import.meta.dirname,"..","public")))
{
    await mkdir(join(import.meta.dirname,"..","public"))
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
    port:app.config.PORT
})