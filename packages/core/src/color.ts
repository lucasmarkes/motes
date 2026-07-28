export type RGB = [number, number, number]

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * `parseHexColor` and `parseColorRGBA` both accept 3- and 6-digit hex bodies
 * and would drift out of sync if each expanded shorthand its own way.
 */
function expandBody(body: string): string {
  return body.length === 3
    ? body[0]! + body[0]! + body[1]! + body[1]! + body[2]! + body[2]!
    : body
}

/**
 * Shared by both parsers so the bit-shift math that turns a 6-digit hex body
 * into normalised components lives in exactly one place.
 */
function rgbFrom(body6: string): RGB {
  const n = parseInt(body6, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Parse `#rgb` or `#rrggbb` into normalised 0..1 components. */
export function parseHexColor(hex: string): RGB {
  const match = HEX.exec(hex.trim())
  if (!match) throw new Error(`[motes] invalid accent color: "${hex}"`)
  return rgbFrom(expandBody(match[1]!))
}

export type RGBA = [number, number, number, number]

const HEX_RGBA = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Parse `#rgb`, `#rrggbb`, `#rrggbbaa`, or the `transparent` keyword into
 * normalised 0..1 components.
 *
 * Alpha exists here for one reason: a background can be `transparent`, so the
 * field composites over whatever the page put behind the canvas. Every other
 * colour in motes is opaque, and `parseHexColor` above stays the way to say so.
 */
export function parseColorRGBA(input: string): RGBA {
  const text = input.trim()
  if (text.toLowerCase() === 'transparent') return [0, 0, 0, 0]

  const match = HEX_RGBA.exec(text)
  if (!match) throw new Error(`[motes] invalid colour: "${input}"`)

  const body = expandBody(match[1]!)
  const a = body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1
  const [r, g, b] = rgbFrom(body.slice(0, 6))
  return [r, g, b, a]
}

/**
 * Premultiply, because the whole render pipeline is premultiplied.
 *
 * Straight alpha would need a branch in the shader to composite correctly;
 * premultiplied, a transparent background is just `vec4(0)` and the opaque
 * case is arithmetically unchanged. See main.frag.
 */
export function premultiply([r, g, b, a]: RGBA): RGBA {
  return [r * a, g * a, b * a, a]
}
