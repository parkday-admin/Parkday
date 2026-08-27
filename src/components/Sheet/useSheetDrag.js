import { useRef, useState } from 'react'

// Drag-to-dismiss for a bottom sheet. A gesture starting within `zoneHeight`
// px of the sheet's top (the drag handle + header area) tracks the pointer;
// releasing past 30% of the sheet's height, or with high enough velocity
// (a flick), calls onDismiss. Anything below that zone (the scrollable
// body) is left alone so list scrolling still works.
export function useSheetDrag(onDismiss, zoneHeight = 80) {
  const elRef = useRef(null)
  const [dragY, setDragY] = useState(0)
  const drag = useRef(null)

  function clientY(e) {
    return e.touches ? e.touches[0].clientY : e.clientY
  }

  function onPointerDown(e) {
    const rect = elRef.current?.getBoundingClientRect()
    if (!rect) return
    const y = clientY(e)
    if (y - rect.top > zoneHeight) return
    drag.current = { startY: y, startTime: Date.now(), height: rect.height }
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener('touchmove', onPointerMove, { passive: false })
    window.addEventListener('touchend', onPointerUp)
  }

  function onPointerMove(e) {
    if (!drag.current) return
    const delta = Math.max(0, clientY(e) - drag.current.startY)
    setDragY(delta)
    if (e.cancelable) e.preventDefault()
  }

  function onPointerUp(e) {
    if (!drag.current) return
    const endY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY
    const delta = Math.max(0, (endY ?? drag.current.startY) - drag.current.startY)
    const elapsed = Math.max(1, Date.now() - drag.current.startTime)
    const velocity = delta / elapsed
    const { height } = drag.current
    cleanup()
    if (delta > height * 0.3 || velocity > 0.6) onDismiss?.()
    else setDragY(0)
  }

  function cleanup() {
    drag.current = null
    window.removeEventListener('mousemove', onPointerMove)
    window.removeEventListener('mouseup', onPointerUp)
    window.removeEventListener('touchmove', onPointerMove)
    window.removeEventListener('touchend', onPointerUp)
  }

  function reset() {
    cleanup()
    setDragY(0)
  }

  return { elRef, dragY, onPointerDown, reset }
}
