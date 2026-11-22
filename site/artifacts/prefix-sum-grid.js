// prefix-sum-grid — the chapter 1 artifact: eight input cells above nine
// prefix-sum cells, filled one step at a time. Colors come from CSS variables,
// so the component follows the site theme without knowing about it.

const INPUT = [3, 1, 4, 1, 5, 9, 2, 6]
const TOTAL = INPUT.reduce((sum, value) => sum + value, 0)

const NS = 'http://www.w3.org/2000/svg'
const CELL = 64
const CELL_HEIGHT = 52
const STEP = 80
const X0 = 48
const Y_INPUT = 24
const Y_PREFIX = 168
const Y_LINE = 286
const WIDTH = X0 + INPUT.length * STEP + CELL + 24
const HEIGHT = 320

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

function element(tag, attributes = {}, text) {
  const node = document.createElementNS(NS, tag)
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value))
  }
  if (text !== undefined) node.textContent = text
  return node
}

function subscript(value) {
  return String(value)
    .split('')
    .map((digit) => SUBSCRIPTS[Number(digit)] ?? digit)
    .join('')
}

function arrowhead(x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const length = 7
  const spread = 0.42
  const baseX = x2 - Math.cos(angle) * length
  const baseY = y2 - Math.sin(angle) * length
  const leftX = baseX + Math.cos(angle + Math.PI / 2) * length * spread
  const leftY = baseY + Math.sin(angle + Math.PI / 2) * length * spread
  const rightX = baseX + Math.cos(angle - Math.PI / 2) * length * spread
  const rightY = baseY + Math.sin(angle - Math.PI / 2) * length * spread

  return element('path', {
    d: `M${x2} ${y2} L${leftX} ${leftY} L${rightX} ${rightY} Z`,
    class: 'psg-arrowhead',
  })
}

function makeCell(x, y, className) {
  const group = element('g', { class: `psg-cell ${className}` })
  group.append(
    element('rect', {
      x,
      y,
      width: CELL,
      height: CELL_HEIGHT,
      rx: 3,
      class: 'psg-cell__box',
    }),
  )

  const value = element('text', {
    x: x + CELL / 2,
    y: y + CELL_HEIGHT / 2 + 5,
    class: 'psg-cell__value',
  })
  group.append(value)

  return { group, value }
}

export default {
  id: 'prefix-sum-grid',

  mount(host) {
    const wrapper = document.createElement('div')
    wrapper.className = 'psg'

    const canvas = element('svg', {
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
      class: 'psg-svg',
      'aria-hidden': 'true',
      focusable: 'false',
    })

    canvas.append(
      element('text', { x: 22, y: Y_INPUT + CELL_HEIGHT / 2 + 5, class: 'psg-rowlabel' }, 'a'),
      element(
        'text',
        { x: 22, y: Y_PREFIX + CELL_HEIGHT / 2 + 5, class: 'psg-rowlabel' },
        'S',
      ),
    )

    const inputs = INPUT.map((value, index) => {
      const x = X0 + index * STEP
      const cell = makeCell(x, Y_INPUT, 'psg-cell--input')
      cell.value.textContent = String(value)
      canvas.append(cell.group)
      canvas.append(
        element(
          'text',
          { x: x + CELL / 2, y: Y_INPUT + CELL_HEIGHT + 16, class: 'psg-cell__index' },
          String(index),
        ),
      )
      return cell.group
    })

    const prefixes = Array.from({ length: INPUT.length + 1 }, (_, index) => {
      const x = X0 + index * STEP
      const cell = makeCell(x, Y_PREFIX, 'psg-cell--prefix')
      canvas.append(cell.group)
      canvas.append(
        element(
          'text',
          { x: x + CELL / 2, y: Y_PREFIX + CELL_HEIGHT + 16, class: 'psg-cell__index' },
          String(index),
        ),
      )
      return cell
    })

    const arrows = INPUT.map((_, index) => {
      const x1 = X0 + index * STEP + CELL / 2
      const y1 = Y_INPUT + CELL_HEIGHT
      const x2 = X0 + (index + 1) * STEP + CELL / 2
      const y2 = Y_PREFIX
      const group = element('g', { class: 'psg-arrow' })
      group.append(element('line', { x1, y1, x2, y2 }), arrowhead(x1, y1, x2, y2))
      group.style.display = 'none'
      canvas.append(group)
      return group
    })

    const lineStart = X0
    const lineEnd = X0 + INPUT.length * STEP
    canvas.append(
      element('line', { x1: lineStart, y1: Y_LINE, x2: lineEnd, y2: Y_LINE, class: 'psg-line' }),
      element('text', { x: lineStart, y: Y_LINE + 20, class: 'psg-scale' }, '0'),
      element('text', { x: lineEnd, y: Y_LINE + 20, class: 'psg-scale' }, String(TOTAL)),
    )

    const dot = element('circle', { cx: lineStart, cy: Y_LINE, r: 6, class: 'psg-dot' })
    canvas.append(dot)

    const controls = document.createElement('div')
    controls.className = 'psg-controls'

    const stepButton = document.createElement('button')
    stepButton.type = 'button'
    stepButton.textContent = 'Step'

    const resetButton = document.createElement('button')
    resetButton.type = 'button'
    resetButton.textContent = 'Reset'

    const status = document.createElement('p')
    status.className = 'psg-status'
    status.setAttribute('aria-live', 'polite')

    controls.append(stepButton, resetButton, status)

    const description = document.createElement('p')
    description.className = 'psg-sr'
    description.textContent =
      'Eight input cells above nine prefix-sum cells. Each step adds the next input value to the running total, which is also marked on a number line.'

    wrapper.append(canvas, controls, description)
    host.append(wrapper)

    let step = 0

    const sumAt = (count) =>
      INPUT.slice(0, count).reduce((sum, value) => sum + value, 0)

    function update() {
      inputs.forEach((cell, index) => {
        cell.classList.toggle('is-current', index === step - 1)
        cell.classList.toggle('is-past', index < step - 1)
      })

      prefixes.forEach((cell, index) => {
        const filled = index <= step
        cell.group.classList.toggle('is-empty', !filled)
        cell.group.classList.toggle('is-new', index === step && step > 0)
        cell.group.classList.toggle('is-past', index < step)
        cell.value.textContent = filled ? String(sumAt(index)) : '·'
      })

      arrows.forEach((arrow, index) => {
        arrow.style.display = index < step ? '' : 'none'
        arrow.classList.toggle('is-new', index === step - 1)
      })

      const total = sumAt(step)
      dot.setAttribute(
        'cx',
        String(lineStart + (total / TOTAL) * (lineEnd - lineStart)),
      )

      status.textContent = `S${subscript(step)} = ${total}`
      stepButton.disabled = step >= INPUT.length
      resetButton.disabled = step === 0
      wrapper.dataset.step = String(step)
    }

    stepButton.addEventListener('click', () => {
      if (step >= INPUT.length) return
      step += 1
      update()
    })

    resetButton.addEventListener('click', () => {
      step = 0
      update()
    })

    update()
  },
}
