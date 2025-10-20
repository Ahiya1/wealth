// Duration constants for consistent timing across the app
export const DURATION = {
  fast: 0.15,      // Button hover, quick feedback
  normal: 0.3,     // Card hover, page transitions (most pages)
  slow: 0.5,       // Dashboard page transition ("breath before data")
  breath: 0.6,     // Affirmation entrance (hero animation)
  progress: 0.8,   // Progress bars, gauge animations
  loading: 1.5,    // Loading pulse (slow, calming)
}

// Easing functions for animation curves
export const EASING = {
  default: [0.4, 0, 0.2, 1] as [number, number, number, number],  // easeOut (Tailwind default)
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],  // Gentle bounce for success
  spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
}

// Page transitions (configurable duration for reduced motion support)
export const getPageTransition = (reducedMotion: boolean, duration: number = DURATION.normal) => ({
  initial: reducedMotion ? {} : { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: reducedMotion ? {} : { opacity: 0, y: -10 },
  transition: { duration: reducedMotion ? 0 : duration, ease: EASING.default },
})

// Legacy page transition (for backward compatibility)
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: DURATION.normal, ease: EASING.default },
}

// Dashboard-specific slow page transition ("breath before data")
export const dashboardEntrance = (reducedMotion: boolean) => getPageTransition(reducedMotion, DURATION.slow)

// Affirmation card entrance (hero animation, solo)
export const affirmationEntrance = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.breath, ease: EASING.default }
  },
}

// Card hover effects (multiple variants for different contexts)
export const cardHover = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { duration: DURATION.fast, ease: EASING.default },
}

export const cardHoverSubtle = {
  whileHover: {
    y: -2,
    scale: 1.005,
    boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
  },
  transition: { duration: DURATION.fast },
}

export const cardHoverElevated = {
  whileHover: {
    y: -6,
    scale: 1.015,
    boxShadow: '0 12px 32px rgba(0,0,0,0.08)'
  },
  transition: { duration: DURATION.fast },
}

// Staggered list animations
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

// Progress bar animation
export const progressBarAnimation = (percentage: number) => ({
  initial: { width: 0 },
  animate: { width: `${Math.min(percentage, 100)}%` },
  transition: { duration: DURATION.progress, ease: EASING.default },
})

// Modal/Dialog animation
export const modalAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: DURATION.fast },
}

// Button hover effects
export const buttonHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
}

export const buttonPrimary = {
  whileHover: {
    scale: 1.02,
    boxShadow: '0 4px 12px hsl(var(--sage-600) / 0.2)'
  },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
}

export const buttonHoverWithGlow = {
  whileHover: {
    scale: 1.02,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
  },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast },
}

// Input focus effects
export const inputFocus = {
  whileFocus: {
    boxShadow: '0 0 0 3px hsl(var(--sage-500) / 0.1)',
  },
  transition: { duration: 0.2 },
}

// Success states
export const successBounce = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.15, 0.95, 1.05, 1],
  },
  transition: {
    duration: 0.5,
    ease: EASING.default,
    times: [0, 0.2, 0.4, 0.7, 1]
  },
}

// Legacy celebration animation (for backward compatibility)
export const celebrationAnimation = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.1, 1] },
  transition: { duration: 0.4, ease: EASING.default },
}

// Error states
export const errorShake = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
  },
  transition: { duration: 0.4 },
}

// Loading states
export const loadingPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: DURATION.loading,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

export const skeletonPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}
