/**
 * Every off-site destination, in one place.
 *
 * These are other people's origins, which is why they are allowed to be
 * literal here — the playground's own host is never named anywhere in this
 * app, so localhost and any deployment stay identical.
 */
export const LINKS = {
  github: 'https://github.com/lucasmarkes/motes',
  npm: 'https://www.npmjs.com/package/motes',
  x: 'https://x.com/lucasmarkes__',
  /** Whose it is, as opposed to where it lives. */
  author: 'https://github.com/lucasmarkes',
} as const

export const AUTHOR = 'Lucas Marques'
