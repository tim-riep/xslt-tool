import { mkdir } from "node:fs/promises";
import makeApp from "./app/makeApp.js";
import { join } from "node:path";
import folderExists from "./utilities/folderExists.js";
import makePrisma from "./prisma.js";

if(!await folderExists(join(import.meta.dirname,"..","storage")))
{
    await mkdir(join(import.meta.dirname,"..","storage"))
}

const app = await makeApp()

export type AppType = typeof app

export const prisma = makePrisma(app)

await app.ready()

void app.listen({
    port:app.config.PORT
})