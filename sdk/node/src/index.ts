import { createMiddleware } from './middleware.js'
import type { GerbaudoOptions } from './types.js'

export function gerbaudo(opts?: GerbaudoOptions) {
  return createMiddleware(opts)
}
