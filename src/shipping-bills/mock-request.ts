/** Deterministic mock transport. Use ?mock=error or ?mock=empty for review. */
export async function mockRequest<T>(operation: () => T, empty?: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const mode = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('mock')
  if (mode === 'error') throw new Error('Mock request failed. Remove ?mock=error and retry.')
  return structuredClone(mode === 'empty' && empty ? empty() : operation())
}
