/**
 * Name the gesture the visitor actually has. Telling a phone "move your
 * cursor" describes hardware they are not holding.
 */
export const POINTER_HINT =
  window.matchMedia('(pointer: coarse)').matches
    ? 'drag across the field'
    : 'move your cursor over the field'
