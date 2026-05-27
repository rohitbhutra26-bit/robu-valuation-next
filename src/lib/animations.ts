/**
 * Shared framer-motion animation variants for Robu Terminal
 * Keep animations fast and tasteful — financial UI should feel snappy, not showey
 */

// Typed cubic bezier tuples (framer-motion requires [n,n,n,n] not number[])
const EASE_OUT   = [0.25, 0.1, 0.25, 1]    as [number, number, number, number];
const EASE_SPRING = [0.22, 1,   0.36, 1]   as [number, number, number, number];

export const fadeUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

export const slideDown = {
  hidden:  { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_SPRING } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.18 } },
};

export const staggerContainer = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

export const staggerItem = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: EASE_OUT } },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

export const cardHover = {
  rest:  { scale: 1,    y: 0,  transition: { duration: 0.18, ease: 'easeOut' } },
  hover: { scale: 1.01, y: -2, transition: { duration: 0.18, ease: 'easeOut' } },
};

export const numberFlip = {
  enter: (dir: number) => ({
    y: dir > 0 ? 14 : -14,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    y: dir > 0 ? -14 : 14,
    opacity: 0,
    transition: { duration: 0.16 },
  }),
};
