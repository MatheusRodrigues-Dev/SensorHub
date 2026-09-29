const listeners = new Set<() => void>()
export function onSessionExpired(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function notifySessionExpired() {
  listeners.forEach(listener => listener())
}
