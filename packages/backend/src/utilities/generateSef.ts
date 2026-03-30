import { exec } from "node:child_process"
import { randomUUID } from "node:crypto"
import { readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

// xslt3 CLI only accepts file paths, so the stylesheet must be written to
// disk before compilation. A UUID-based filename prevents collisions between
// concurrent requests.
const executeXslt3 = async (uuid: string) => {
    return new Promise<void>((resolve,reject) => {
        // -nogo: compile-only mode — produce the SEF without running a transformation.
        exec(`npx xslt3 -xsl:${join(import.meta.dirname, '..', '..', 'storage', `${uuid}.xsl`)} -export:${join(import.meta.dirname, '..', '..', 'storage', `${uuid}.sef.json`)} -nogo`, (err) => {
            if(err)
                reject(err)
            resolve()
        })
    })
}

// Compiles an XSLT stylesheet string into a SEF (Saxon-JS Execution Format)
// JSON, which Saxon-JS can execute directly without re-parsing the stylesheet.
export default async (xslt: string) => {
    const uuid = randomUUID()

    await writeFile(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.xsl`, xslt);

    await executeXslt3(uuid)

    const content = await readFile(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.sef.json`)

    // Clean up temp files immediately after reading to avoid storage accumulation.
    await rm(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.xsl`)
    await rm(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.sef.json`)

    return content.toString("utf-8")
}