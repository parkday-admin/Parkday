import { useEffect, useRef, useState } from 'react'
import styles from './Fab.module.css'

// Fades out while the user actively scrolls down a list (where a fixed FAB
// would otherwise sit on top of whatever card happens to pass underneath
// it) and reappears on scroll-up or once scrolling settles, so it never
// permanently obscures content at a resting scroll position.
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(typeof window !== 'undefined' ? window.scrollY : 0)
  const idleTimer = useRef(null)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      const goingDown = y > lastY.current + 4
      const goingUp = y < lastY.current - 4
      if (goingDown) setHidden(true)
      else if (goingUp) setHidden(false)
      lastY.current = y
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setHidden(false), 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(idleTimer.current)
    }
  }, [])

  return hidden
}

export default function Fab({ onClick, title = 'Add expense' }) {
  const hidden = useHideOnScrollDown()
  return (
    <button
      type="button"
      className={`${styles.fab} ${hidden ? styles.fabHidden : ''}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <i aria-hidden="true" className="ti ti-plus" />
    </button>
  )
}
