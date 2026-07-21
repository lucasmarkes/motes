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
 * oklch(0.94 0.055 258): the neutrals in styles.css sit on the same cool axis
 * at chroma 0.006–0.014. This is that axis carried to the top of the ramp with
 * enough chroma to actually read as cool at the core — 42/255 of channel
 * spread there, against 5–9 for anything the pointer is not touching. Past
 * about 0.07 the brightest ambient cells start to tint too, and the field
 * stops being grey. Hex because that is what the option takes.
 */
export const POINTER_ACCENT = '#d5edff'
