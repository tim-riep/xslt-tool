import { exec } from "node:child_process"
import { randomUUID } from "node:crypto"
import { readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

const executeXslt3 = async (uuid: string) => {
    return new Promise<void>((resolve) => {
        exec(`npx xslt3 -xsl:${join(import.meta.dirname, '..', '..', 'storage', `${uuid}.xsl`)} -export:${join(import.meta.dirname, '..', '..', 'storage', `${uuid}.sef.json`)} -nogo`, () => {
            resolve()
        })
    })
}

export default async (xslt: string) => {
    const uuid = randomUUID()

    await writeFile(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.xsl`, xslt);

    await executeXslt3(uuid)

    const content = await readFile(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.sef.json`)

    await rm(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.xsl`)
    await rm(`${join(import.meta.dirname, '..', '..', 'storage', uuid)}.sef.json`)

    return content.toString("utf-8")
}