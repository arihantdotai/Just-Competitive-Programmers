import { mkdir } from 'node:fs/promises'
import path from 'node:path'

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export const escapeAttr = escapeHtml

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

export async function fileExists(file: string): Promise<boolean> {
  return Bun.file(file).exists()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isExternalUrl(value: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('data:')
}

export function hashString(value: string): string {
  return new Bun.CryptoHasher('sha256').update(value).digest('hex')
}

export interface ParsedArgs {
  flags: Set<string>
  options: Map<string, string>
  positional: string[]
}

export function parseArgs(argv: string[] = Bun.argv.slice(2)): ParsedArgs {
  const flags = new Set<string>()
  const options = new Map<string, string>()
  const positional: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }

    const body = arg.slice(2)
    const equals = body.indexOf('=')

    if (equals !== -1) {
      options.set(body.slice(0, equals), body.slice(equals + 1))
      continue
    }

    const next = argv[index + 1]
    if (next && !next.startsWith('-')) {
      options.set(body, next)
      index += 1
    } else {
      flags.add(body)
    }
  }

  return { flags, options, positional }
}

export function stripNumericPrefix(value: string): string {
  return value.replace(/^\d+[-_. ]*/, '')
}

export function projectPath(...parts: string[]): string {
  return path.resolve(import.meta.dir, '..', '..', ...parts)
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function indent(text: string, spaces = 2): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n')
}
