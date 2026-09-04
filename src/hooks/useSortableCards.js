import { useEffect, useRef, useState } from 'react'

function flip(el, prevRect) {
  if (!el || !prevRect) return
  const next = el.getBoundingClientRect()
  const dx = prevRect.left - next.left
  const dy = prevRect.top - next.top
  if (!dx && !dy) return
  el.style.transition = 'none'
  el.style.transform = `translate(${dx}px, ${dy}px)`
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight
  el.style.transition = 'transform 0.22s cubic-bezier(.2,.8,.2,1)'
  el.style.transform = ''
}

// A two-column sortable board. Cards live in two explicit column arrays
// (not one flat list split by index parity) so a card can be dropped into
// the *other* column even when that column is shorter, empty at that
// height, or has no card directly alongside the one being dragged — the
// target is always "whichever card (in either column) is nearest the
// pointer," never "whichever card's rectangle the pointer happens to sit
// inside."
export default function useSortableCards(setColumns) {
  const refs = useRef({})
  const dragInfo = useRef(null)
  const [dragId, setDragId] = useState(null)

  function setCardRef(id) {
    return el => {
      if (el) refs.current[id] = el
      else delete refs.current[id]
    }
  }

  // Keyboard equivalent of the pointer-drag reorder above: move within the
  // current column (up/down) or across to the other column (left/right),
  // at a position clamped to the target column's length.
  function moveCard(id, cols, dir) {
    const sourceCol = cols.colA.includes(id) ? 'colA' : 'colB'
    const otherCol = sourceCol === 'colA' ? 'colB' : 'colA'
    const idx = cols[sourceCol].indexOf(id)
    const nextCols = { colA: cols.colA.slice(), colB: cols.colB.slice() }

    if (dir === 'up' || dir === 'down') {
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= nextCols[sourceCol].length) return
      const arr = nextCols[sourceCol]
      ;[arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]]
    } else {
      nextCols[sourceCol].splice(idx, 1)
      const targetIdx = Math.min(idx, nextCols[otherCol].length)
      nextCols[otherCol].splice(targetIdx, 0, id)
    }
    setColumns(nextCols)
  }

  function handleDragStart(id, cols, e) {
    e.preventDefault()
    const el = refs.current[id]
    if (!el) return
    const rect = el.getBoundingClientRect()

    const clone = el.cloneNode(true)
    clone.style.position = 'fixed'
    clone.style.left = '0'
    clone.style.top = '0'
    clone.style.width = `${rect.width}px`
    clone.style.margin = '0'
    clone.style.pointerEvents = 'none'
    clone.style.zIndex = '1000'
    clone.style.boxShadow = '0 16px 36px rgba(13,35,64,0.24)'
    clone.style.transition = 'none'
    clone.style.transform = `translate(${rect.left}px, ${rect.top}px)`
    document.body.appendChild(clone)

    dragInfo.current = {
      id,
      cols: { colA: cols.colA.slice(), colB: cols.colB.slice() },
      grabDX: e.clientX - rect.left,
      grabDY: e.clientY - rect.top,
      clone,
      lastSwapAt: 0,
    }
    setDragId(id)
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    if (dragId == null) return

    function onMove(e) {
      const info = dragInfo.current
      if (!info) return
      e.preventDefault()

      info.clone.style.transform = `translate(${e.clientX - info.grabDX}px, ${e.clientY - info.grabDY}px)`

      const now = performance.now()
      if (now - info.lastSwapAt < 150) return

      const candidates = []
      ;['colA', 'colB'].forEach(colKey => {
        info.cols[colKey].forEach((cid, idx) => {
          if (cid === info.id) return
          const el = refs.current[cid]
          if (!el) return
          const r = el.getBoundingClientRect()
          candidates.push({ id: cid, col: colKey, idx, cx: r.left + r.width / 2, cy: r.top + r.height / 2 })
        })
      })
      if (!candidates.length) return

      let nearest = null
      let nearestDist = Infinity
      candidates.forEach(c => {
        const dist = Math.hypot(e.clientX - c.cx, e.clientY - c.cy)
        if (dist < nearestDist) { nearestDist = dist; nearest = c }
      })

      const sourceCol = info.cols.colA.includes(info.id) ? 'colA' : 'colB'
      const sourceIdx = info.cols[sourceCol].indexOf(info.id)
      const targetCol = nearest.col
      let targetIdx = nearest.idx + (e.clientY > nearest.cy ? 1 : 0)

      const nextCols = { colA: info.cols.colA.slice(), colB: info.cols.colB.slice() }
      nextCols[sourceCol].splice(sourceIdx, 1)
      if (sourceCol === targetCol && sourceIdx < targetIdx) targetIdx -= 1
      nextCols[targetCol].splice(targetIdx, 0, info.id)

      if (nextCols.colA.join('|') === info.cols.colA.join('|') && nextCols.colB.join('|') === info.cols.colB.join('|')) return

      const beforeRects = {}
      ;[...info.cols.colA, ...info.cols.colB].forEach(cid => {
        if (cid === info.id) return
        const el = refs.current[cid]
        if (el) beforeRects[cid] = el.getBoundingClientRect()
      })

      info.cols = nextCols
      info.lastSwapAt = now
      setColumns(nextCols)

      requestAnimationFrame(() => {
        ;[...nextCols.colA, ...nextCols.colB].forEach(cid => {
          if (cid === info.id) return
          flip(refs.current[cid], beforeRects[cid])
        })
      })
    }

    function onUp() {
      const info = dragInfo.current
      if (info?.clone) info.clone.remove()
      dragInfo.current = null
      setDragId(null)
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = ''
    }
  }, [dragId, setColumns])

  return { dragId, setCardRef, handleDragStart, moveCard }
}
