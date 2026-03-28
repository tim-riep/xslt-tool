import { stat } from "node:fs/promises"

export default async (folder:string) => {
    try {
        const info = await stat(folder)
        return info.isDirectory()
    }
    catch {
        return false
    }
}