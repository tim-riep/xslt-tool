#!/usr/bin/env node
// Assembles a self-contained `release/` folder ready to be copied to a
// server. Run this after `npm run build` (or via `npm run release`, which
// chains both). Output shape:
//
//   release/
//   ├── dist/                compiled backend + generated Prisma client
//   ├── public/              frontend static bundle (served by Fastify)
//   ├── prisma/              schema + migrations (for `prisma migrate deploy`)
//   ├── prisma.config.ts     Prisma CLI config
//   ├── package.json         backend manifest (install with `npm ci`)
//   ├── package-lock.json
//   ├── Caddyfile            reverse proxy config
//   └── DEPLOY.md            deployment guide

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const release = join(repoRoot, "release")
const backend = join(repoRoot, "packages", "backend")
const deploy = join(repoRoot, "deploy")

const required = [
    join(backend, "dist"),
    join(backend, "public"),
    join(backend, "prisma"),
    join(backend, "package.json"),
    join(backend, "package-lock.json"),
    join(backend, "prisma.config.ts"),
    join(deploy, "Caddyfile"),
    join(deploy, "README.md"),
]

for (const path of required) {
    if (!existsSync(path)) {
        console.error(`release: missing ${path}. Did you run \`npm run build\` first?`)
        process.exit(1)
    }
}

rmSync(release, { recursive: true, force: true })
mkdirSync(release, { recursive: true })

const entries = [
    ["dist", "dist"],
    ["public", "public"],
    ["prisma", "prisma"],
    ["package.json", "package.json"],
    ["package-lock.json", "package-lock.json"],
    ["prisma.config.ts", "prisma.config.ts"],
]

for (const [src, dst] of entries) {
    cpSync(join(backend, src), join(release, dst), { recursive: true })
}

cpSync(join(deploy, "Caddyfile"), join(release, "Caddyfile"))
cpSync(join(deploy, "README.md"), join(release, "DEPLOY.md"))

console.log(`release: assembled at ${release}`)
