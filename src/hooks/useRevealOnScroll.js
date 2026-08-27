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
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}
