/**
 * Mounts the SVG displacement filter used by the Tier 2 `.liquid-glass-refract`
 * material. Must be rendered once at the app root so `backdrop-filter: url(#liquid-refraction)`
 * resolves. Hidden and inert; non-Chromium browsers ignore the url() filter and
 * fall back to the Tier 1 CSS glass via the `@supports` gate in index.css.
 */
export const LiquidGlassFilter = () => (
  <svg width="0" height="0" aria-hidden className="pointer-events-none absolute">
    <filter id="liquid-refraction" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.008 0.012"
        numOctaves={2}
        seed={7}
        result="noise"
      />
      <feGaussianBlur in="noise" stdDeviation={1.2} result="softNoise" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softNoise"
        scale={26}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
)
