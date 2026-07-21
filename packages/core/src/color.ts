export type RGB = [number, number, number]

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Parse `#rgb` or `#rrggbb` into normalised 0..1 components. */
export function parseHexColor(hex: string): RGB {
  const match = HEX.exec(hex.trim())
  if (!match) throw new Error(`[motes] invalid accent color: "${hex}"`)

  let body = match[1]!
  if (body.length === 3) {
    body = body[0]! + body[0]! + body[1]! + body[1]! + body[2]! + body[2]!
  }

  const n = parseInt(body, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
