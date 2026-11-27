import { createRequire } from 'node:module'

// Stubs Next.js 'server-only' package during Node.js unit test execution
const require = createRequire(import.meta.url)
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') return {}
  return originalLoad.call(this, request, parent, isMain)
}
