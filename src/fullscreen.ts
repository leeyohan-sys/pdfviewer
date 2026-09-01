type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
}

export async function enterFullscreen(target: HTMLElement = document.documentElement) {
  const element = target as FullscreenElement
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen({ navigationUI: 'hide' })
      return
    }
  } catch {
    try {
      await element.requestFullscreen()
      return
    } catch {
      // fall through
    }
  }
  try {
    await element.webkitRequestFullscreen?.()
  } catch {
    // Samsung/iOS may reject; caller can retry on the next tap.
  }
}

export async function exitFullscreen() {
  const doc = document as FullscreenDocument
  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) return
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen()
      return
    }
  } catch {
    // ignore
  }
  try {
    await doc.webkitExitFullscreen?.()
  } catch {
    // ignore
  }
}

export function isFullscreen() {
  const doc = document as FullscreenDocument
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
}
