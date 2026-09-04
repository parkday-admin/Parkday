import { useEffect, useRef, useState } from 'react'

// Fades a section in and slides it up slightly the first time it scrolls
// into view. Fires once (observer disconnects after) — a section that's
// already been revealed shouldn't flicker back out on scroll-up. Skips the
// motion entirely for prefers-reduced-motion, showing the content as
// already-visible rather than leaving it permanently hidden.
export function useRevealOnScroll() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setInView(true)
        observer.disconnect()
      },
      // A low threshold + a positive bottom rootMargin means a section starts
      // revealing as soon as its top edge approaches the viewport, not only
      // once 15% of its (possibly very tall) area is already on screen —
      // the old settings left a visible blank gap while scrolling past a
      // tall section before its fade-in ever triggered.
      { threshold: 0, rootMargin: '0px 0px 120px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}
