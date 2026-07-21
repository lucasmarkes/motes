/**
 * The only colour on this page.
 *
 * The renderer mixes every cell from a grey ramp toward `accent`, weighted
 * `val * 0.5 + boost * 1.4` (see main.frag). Ambient value alone therefore
 * tops out halfway; only the pointer's boost carries a cell all the way to
 * the accent itself. Feeding it a cool near-white makes the field resolve
 * grey everywhere — the channel spread of an ambient cell lands under 10/255
 * — and leaves the cursor as the one thing on screen with a temperature.
 *
 * oklch(0.95 0.04 258): the neutrals in styles.css sit on the same cool axis
 * at chroma 0.006–0.014. This is that axis carried up to the top of the ramp
 * and given just enough chroma to read. Hex because that is what the option
 * takes.
 */
export const POINTER_ACCENT = '#def0ff'
