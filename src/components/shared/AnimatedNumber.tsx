import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  /** Final value as displayed text, e.g. "2,417". Commas are re-applied while counting. */
  value: string
  className?: string
  /** Count duration in ms. */
  duration?: number
  /** Extra delay (ms) before the count starts once visible. */
  delay?: number
}

/**
 * Counts up from 0 to the target the first time it scrolls into view.
 * Respects prefers-reduced-motion (jumps straight to the final value).
 */
export function AnimatedNumber({ value, className, duration = 1300, delay = 0 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const target = Number.parseInt(value.replace(/,/g, ''), 10) || 0
  const [display, setDisplay] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target)
      return
    }
    let raf = 0
    let timeout = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
        setDisplay(Math.round(target * eased))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    timeout = window.setTimeout(run, delay)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timeout)
    }
  }, [started, target, duration, delay])

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('en-US')}
    </span>
  )
}
