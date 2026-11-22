// Reading-site runtime: dark mode, the sidebar, pinpoint links, and artifact
// hydration. Everything here is progressive enhancement — the pages are plain,
// readable HTML with JavaScript disabled.

const THEME_KEY = 'book-theme'
const root = document.documentElement
const body = document.body
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

const themeListeners = new Set()

function currentTheme() {
  return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

function syncThemeToggles() {
  const dark = currentTheme() === 'dark'

  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.setAttribute('aria-pressed', dark ? 'true' : 'false')
    button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode')
    const label = button.querySelector('.theme-toggle__label')
    if (label) label.textContent = dark ? 'Light mode' : 'Dark mode'
  }
}

function applyTheme(theme, persist) {
  root.setAttribute('data-theme', theme)
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Private mode: the theme still applies for this page.
    }
  }
  syncThemeToggles()
  for (const listener of themeListeners) {
    try {
      listener(theme)
    } catch (error) {
      console.warn('theme listener failed', error)
    }
  }
}

for (const button of document.querySelectorAll('[data-theme-toggle]')) {
  button.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true)
  })
}

syncThemeToggles()

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  let stored = null
  try {
    stored = localStorage.getItem(THEME_KEY)
  } catch {
    stored = null
  }
  if (stored !== 'dark' && stored !== 'light') {
    applyTheme(event.matches ? 'dark' : 'light', false)
  }
})

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const sidebar = document.querySelector('[data-sidebar]')
const sidebarToggle = document.querySelector('[data-sidebar-toggle]')
const scrim = document.querySelector('[data-sidebar-close]')

function setSidebar(open) {
  body.classList.toggle('sidebar-open', open)
  sidebarToggle?.setAttribute('aria-expanded', open ? 'true' : 'false')
  if (scrim) scrim.hidden = !open
}

sidebarToggle?.addEventListener('click', () => {
  setSidebar(!body.classList.contains('sidebar-open'))
})

scrim?.addEventListener('click', () => setSidebar(false))

sidebar?.addEventListener('click', (event) => {
  if (event.target.closest('a') && window.matchMedia('(max-width: 1000px)').matches) {
    setSidebar(false)
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebar(false)
})

/* ------------------------------------------------------------------ */
/* Sidebar scroll-spy                                                  */
/* ------------------------------------------------------------------ */

const spyLinks = new Map()

for (const link of document.querySelectorAll('[data-spy]')) {
  spyLinks.set(link.dataset.spy, link)
}

const spyTargets = [...spyLinks.keys()]
  .map((id) => document.getElementById(id))
  .filter(Boolean)

let spyTicking = false

function updateSpy() {
  spyTicking = false
  if (spyTargets.length === 0) return

  const offset = 140
  let active = spyTargets[0]

  for (const target of spyTargets) {
    if (target.getBoundingClientRect().top - offset <= 0) active = target
  }

  for (const [id, link] of spyLinks) {
    link.classList.toggle('is-active', id === active.id)
  }
}

function scheduleSpy() {
  if (spyTicking) return
  spyTicking = true
  requestAnimationFrame(updateSpy)
}

window.addEventListener('scroll', scheduleSpy, { passive: true })
window.addEventListener('resize', scheduleSpy)
updateSpy()

/* ------------------------------------------------------------------ */
/* Pinpoint links                                                      */
/* ------------------------------------------------------------------ */

const baseUrl = (document.querySelector('meta[name="book-base-url"]')?.content ?? '').replace(
  /\/+$/,
  '',
)

function canonicalUrl(pin) {
  return `${baseUrl}${location.pathname}?p=${encodeURIComponent(pin)}`
}

function pinIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute(
    'd',
    'M6.4 9.6 9.6 6.4M7.1 4.4 8.7 2.8a2.2 2.2 0 0 1 3.1 0l1.4 1.4a2.2 2.2 0 0 1 0 3.1L11.6 9M8.9 11.6l-1.6 1.6a2.2 2.2 0 0 1-3.1 0l-1.4-1.4a2.2 2.2 0 0 1 0-3.1L4.4 7',
  )
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.3')
  path.setAttribute('stroke-linecap', 'round')
  svg.append(path)
  return svg
}

for (const target of document.querySelectorAll('[data-pin]')) {
  if (target.classList.contains('book-chapter--site')) continue

  const pin = target.getAttribute('data-pin')
  if (!pin) continue

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'pin-button'
  button.dataset.pinTarget = pin
  button.setAttribute('aria-label', 'Copy a link to this element')
  button.append(pinIcon())
  target.append(button)
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API is unavailable on insecure origins; fall back.
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    return false
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('.pin-button')
  if (!button) return

  event.preventDefault()
  const url = canonicalUrl(button.dataset.pinTarget)
  const copied = await copyText(url)

  button.dataset.copied = copied ? 'Link copied' : url
  button.classList.add('is-copied')
  window.setTimeout(() => {
    button.classList.remove('is-copied')
    delete button.dataset.copied
  }, 2200)
})

/* ------------------------------------------------------------------ */
/* Pinpoint navigation                                                 */
/* ------------------------------------------------------------------ */

function requestedPin() {
  const params = new URLSearchParams(location.search)
  const queryPin = params.get('p')
  if (queryPin) return queryPin
  if (location.hash.length > 1) {
    try {
      return decodeURIComponent(location.hash.slice(1))
    } catch {
      return location.hash.slice(1)
    }
  }
  return null
}

function findPin(id) {
  const byId = document.getElementById(id)
  if (byId) return byId
  return document.querySelector(`[data-pin="${CSS.escape(id)}"]`)
}

function reveal(element) {
  element.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'center',
  })

  element.classList.remove('is-pinpoint')
  void element.offsetWidth
  element.classList.add('is-pinpoint')
  window.setTimeout(() => element.classList.remove('is-pinpoint'), 2000)

  const pin = element.querySelector(':scope > .pin-button')
  if (pin) {
    pin.classList.add('is-pinpoint')
    window.setTimeout(() => pin.classList.remove('is-pinpoint'), 4000)
  }
}

/* ------------------------------------------------------------------ */
/* Artifacts                                                           */
/* ------------------------------------------------------------------ */

let registryPromise

function loadRegistry() {
  registryPromise ??= import(new URL('./artifacts/registry.js', import.meta.url).href)
  return registryPromise
}

const artifactContext = {
  get theme() {
    return currentTheme()
  },
  onThemeChange(listener) {
    themeListeners.add(listener)
    return () => themeListeners.delete(listener)
  },
}

const pendingArtifacts = new WeakSet()

async function hydrateArtifact(target) {
  const figure = target.matches('[data-artifact]')
    ? target
    : target.closest('[data-artifact]')
  if (!figure || pendingArtifacts.has(figure)) return

  pendingArtifacts.add(figure)
  const host = figure.querySelector('[data-artifact-host]') ?? figure
  const id = figure.dataset.artifact

  try {
    const { loadArtifact } = await loadRegistry()
    const artifact = await loadArtifact(id)
    if (!artifact) {
      console.info(`artifact "${id}" has no registered component; keeping the static fallback`)
      return
    }

    host.replaceChildren()
    figure.classList.add('is-hydrated')
    artifact.mount(host, artifactContext)
  } catch (error) {
    console.warn(`artifact "${id}" failed to mount`, error)
    pendingArtifacts.delete(figure)
  }
}

const artifactFigures = [...document.querySelectorAll('[data-artifact]')]

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries, instance) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        instance.unobserve(entry.target)
        hydrateArtifact(entry.target)
      }
    },
    { rootMargin: '400px 0px' },
  )

  for (const figure of artifactFigures) observer.observe(figure)
} else {
  for (const figure of artifactFigures) hydrateArtifact(figure)
}

const initialPin = requestedPin()
if (initialPin) {
  const target = findPin(initialPin)
  if (target) {
    hydrateArtifact(target)
    reveal(target)
    history.replaceState(null, '', `${location.pathname}${target.id ? `#${target.id}` : ''}`)
  }
}
