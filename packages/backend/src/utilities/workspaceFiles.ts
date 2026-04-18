import { readFile, readdir } from "node:fs/promises"
import type { Dirent } from "node:fs"
import { resolve, sep, join } from "node:path"

// One path segment: letters, digits, dot, underscore, dash. Rejects empty,
// `.`, `..`, and anything starting with a dot. Slashes live between segments.
const SEGMENT_PATTERN = /^(?!\.)[A-Za-z0-9_.-]+$/

const ALLOWED_EXTENSIONS = [".xml", ".xsl", ".xslt"] as const

export type WorkspaceFileKind = "XML" | "XSLT"

// Backend root (packages/backend) derived from this file's compiled location
// (dist/utilities/workspaceFiles.js → ../..).
const BACKEND_ROOT = join(import.meta.dirname, "..", "..")

export const workspacesRoot = () => join(BACKEND_ROOT, "storage", "workspaces")

export const workspaceDir = (workspaceId: number) =>
    join(workspacesRoot(), String(workspaceId))

export const adhocDir = (userId: number) =>
    join(BACKEND_ROOT, "storage", "adhoc", String(userId))

// Infers a logical kind from the extension so callers and clients don't have
// to track it separately.
export const kindFromFilename = (filename: string): WorkspaceFileKind | null => {
    const lower = filename.toLowerCase()
    if (lower.endsWith(".xml")) return "XML"
    if (lower.endsWith(".xsl") || lower.endsWith(".xslt")) return "XSLT"
    return null
}

// Validates a relative path coming from the client (may contain subfolders —
// e.g. "lib/common.xsl") and returns the absolute path inside the given
// workspace directory. Returns null on any rule violation — callers translate
// null to a 400 response.
//
// Rules:
//   - Forward-slash separated segments only (no leading/trailing slash).
//   - Each segment must match SEGMENT_PATTERN (no ".", no "..", no hidden).
//   - Backslashes are rejected outright (avoids Windows-path ambiguity).
//   - Extension of the final segment must be .xml, .xsl or .xslt.
//   - After path.resolve, the absolute path must stay inside workspaceDirPath
//     (belt-and-braces against any sneaky input that slipped past the regex).
export const resolveWorkspaceFilePath = (
    workspaceDirPath: string,
    relPath: string
): string | null => {
    if (relPath.length === 0) return null
    if (relPath.includes("\\")) return null
    if (relPath.startsWith("/")) return null

    const segments = relPath.split("/")
    if (segments.some(s => !SEGMENT_PATTERN.test(s))) return null

    const lower = relPath.toLowerCase()
    if (!ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext))) return null

    const absolute = resolve(workspaceDirPath, relPath)
    const root = resolve(workspaceDirPath) + sep
    if (!(absolute + sep).startsWith(root)) return null

    return absolute
}

// Checks whether an `xsl:import` / `xsl:include` / `xsl:use-package` href
// stays inside the workspace folder. Less restrictive than
// resolveWorkspaceFilePath (accepts `./` prefixes, doesn't enforce extensions),
// but still blocks URI schemes, absolute paths, backslashes, and anything that
// resolves outside the workspace root.
export const importHrefIsSafe = (workspaceDirPath: string, href: string): boolean => {
    if (href.length === 0) return false
    if (href.includes("\\")) return false
    if (href.includes(":")) return false // blocks http://, file://, data:, etc.
    if (href.startsWith("/")) return false

    const stripped = href.replace(/^(?:\.\/)+/, "")
    if (stripped.length === 0) return false

    const absolute = resolve(workspaceDirPath, stripped)
    const root = resolve(workspaceDirPath) + sep
    return (absolute + sep).startsWith(root)
}

// Patterns that can reference another file from inside an XSLT. The capture
// group is the raw URI/path. These are heuristic — they match literal strings
// only, so `document($var)` with a computed URI slips through. That residual
// risk is documented in deploy/README.md; OS-level sandboxing is the proper
// long-term mitigation.
const STATIC_FILE_ACCESS_PATTERNS: RegExp[] = [
    // xsl:import / include / use-package / import-schema with href="..."
    /\bxsl:(?:import|include|use-package|import-schema)\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi,
    // xsl:result-document href="..."
    /\bxsl:result-document\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi,
    // document('literal') / doc('literal')
    /\b(?:document|doc)\s*\(\s*["']([^"']+)["']/gi,
    // unparsed-text('literal') / unparsed-text-lines / unparsed-text-available
    /\bunparsed-text(?:-lines|-available)?\s*\(\s*["']([^"']+)["']/gi,
]

export interface UnsafeReference {
    file: string
    reference: string
}

// Walks every .xsl/.xslt file in the workspace and verifies none of their
// static file references escape the workspace. Returns the first offending
// reference, or null if everything is safe.
export const findUnsafeImport = async (
    workspaceDirPath: string
): Promise<UnsafeReference | null> => {
    const stack: string[] = [workspaceDirPath]
    while (stack.length > 0) {
        const current = stack.pop()
        if (current === undefined) break
        let entries: Dirent[]
        try {
            entries = await readdir(current, { withFileTypes: true })
        } catch {
            continue
        }
        for (const entry of entries) {
            const full = join(current, entry.name)
            if (entry.isDirectory()) {
                stack.push(full)
                continue
            }
            const kind = kindFromFilename(entry.name)
            if (kind !== "XSLT") continue

            const content = await readFile(full, "utf-8")
            for (const pattern of STATIC_FILE_ACCESS_PATTERNS) {
                pattern.lastIndex = 0
                let match: RegExpExecArray | null
                while ((match = pattern.exec(content)) !== null) {
                    const reference = match[1]
                    if (!reference) continue
                    if (!importHrefIsSafe(workspaceDirPath, reference)) {
                        return { file: full, reference }
                    }
                }
            }
        }
    }
    return null
}
