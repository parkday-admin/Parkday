import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSheetDrag } from './useSheetDrag'
import styles from './Sheet.module.css'

// Tracks which open sheets are stacked on top of one another (e.g.
// AddCustomItemSheet over FamilyMemberSheet) so Escape dismisses only the
// topmost one instead of the whole stack at once.
let openStack = []
let nextId = 0

// Shared bottom-sheet shell: full-viewport backdrop (portaled to <body> so
// it always sits above the nav drawer regardless of where the sheet is
// mounted in the tree), a top boundary that stays below the fixed header
// (via the --app-header-h var AppShell keeps in sync), and drag-to-dismiss
// from the handle/header area. Every sheet in the app renders through this
// instead of reimplementing backdrop/positioning/drag itself.
export default function Sheet({ open, onClose, children }) {
  const { elRef, dragY, onPointerDown, reset } = useSheetDrag(onClose)
  const idRef = useRef(null)
  if (idRef.current === null) idRef.current = nextId++

  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    openStack.push(idRef.current)
    return () => { openStack = openStack.filter(id => id !== idRef.current) }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (openStack[openStack.length - 1] !== idRef.current) return
      onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheetOuter}>
        <div
          ref={elRef}
          className={styles.sheetInner}
          style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
        >
          <div className={styles.dragWrap}><div className={styles.drag} /></div>
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
