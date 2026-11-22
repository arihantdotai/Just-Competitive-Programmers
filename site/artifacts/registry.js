// Artifact registry: maps a manuscript artifact id to a lazily imported
// component module. Add one line per new artifact; a missing entry keeps the
// static fallback visible on the site.

export const artifacts = {
  'prefix-sum-grid': () => import('./prefix-sum-grid.js'),
}

export function hasArtifact(id) {
  return Object.hasOwn(artifacts, id)
}

export async function loadArtifact(id) {
  const loader = artifacts[id]
  if (!loader) return null

  const module = await loader()
  return module.default ?? module
}
