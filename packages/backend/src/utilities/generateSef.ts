import { execFile } from "node:child_process"
import { randomUUID } from "node:crypto"
import { readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

const tempDir = () => join(import.meta.dirname, "..", "..", "storage")

// -nogo: compile-only mode — produce the SEF without running a transformation.
// execFile (not exec) avoids passing paths through a shell.
const compileXsltToSef = (inputPath: string, outputPath: string) =>
    new Promise<void>((resolve, reject) => {
        execFile(
            "npx",
            ["xslt3", `-xsl:${inputPath}`, `-export:${outputPath}`, "-nogo"],
            (err: Error | null) => {
                if (err) reject(err)
                else resolve()
            }
        )
    })

// Compiles an XSLT on disk to SEF JSON and returns the SEF content.
// The input XSLT is left in place (caller owns it); the SEF is written next
// to it and removed after reading. Compiling from the real on-disk location
// lets xslt3 resolve <xsl:import>/<xsl:include> against sibling files.
export const generateSefFromPath = async (xsltPath: string) => {
    const sefPath = `${xsltPath}.sef.json`
    await compileXsltToSef(xsltPath, sefPath)
    try {
        const content = await readFile(sefPath)
        return content.toString("utf-8")
    } finally {
        await rm(sefPath, { force: true })
    }
}

// Compiles an XSLT string to SEF JSON via a throwaway temp file. Used by the
// adhoc transform where there's no persistent XSLT location.
export default async (xslt: string) => {
    const uuid = randomUUID()
    const xsltPath = join(tempDir(), `${uuid}.xsl`)
    await writeFile(xsltPath, xslt)
    try {
        return await generateSefFromPath(xsltPath)
    } finally {
        await rm(xsltPath, { force: true })
    }
}
