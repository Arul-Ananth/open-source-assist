import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Stagger delay in ms. */
  delay?: number
  className?: string
}

/** Scroll-triggered entrance: fades/slides children in the first time they enter the viewport. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal ${className ?? ''}`} style={{ transitionDelay: `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  )
}
