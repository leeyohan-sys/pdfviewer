type WakeLockSentinelLike = {
  released: boolean
  release: () => Promise<void>
}

let sentinel: WakeLockSentinelLike | null = null
let keepAlive = false

async function requestLock() {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
  }
  if (!nav.wakeLock) return
  try {
    sentinel = await nav.wakeLock.request('screen')
  } catch {
    sentinel = null
  }
}

export async function keepScreenAwake() {
  keepAlive = true
  await requestLock()
}

export async function allowScreenSleep() {
  keepAlive = false
  if (!sentinel || sentinel.released) {
    sentinel = null
    return
  }
  try {
    await sentinel.release()
  } catch {
    // ignore
  }
  sentinel = null
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (keepAlive && document.visibilityState === 'visible') {
      void requestLock()
    }
  })
}
