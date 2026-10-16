export function requestBrowserFullscreen(element?: HTMLElement): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const target = element || document.documentElement;

  try {
    if (target.requestFullscreen) {
      return target.requestFullscreen().catch(() => {});
    }
    const anyTarget = target as unknown as {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    if (anyTarget.webkitRequestFullscreen) {
      return anyTarget.webkitRequestFullscreen();
    }
    if (anyTarget.mozRequestFullScreen) {
      return anyTarget.mozRequestFullScreen();
    }
    if (anyTarget.msRequestFullscreen) {
      return anyTarget.msRequestFullscreen();
    }
  } catch {
    // Browser gesture restrictions or permission rejections handled safely
  }
  return Promise.resolve();
}

export function exitBrowserFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  try {
    if (document.exitFullscreen) {
      return document.exitFullscreen().catch(() => {});
    }
    const anyDoc = document as unknown as {
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };
    if (anyDoc.webkitExitFullscreen) {
      return anyDoc.webkitExitFullscreen();
    }
    if (anyDoc.mozCancelFullScreen) {
      return anyDoc.mozCancelFullScreen();
    }
    if (anyDoc.msExitFullscreen) {
      return anyDoc.msExitFullscreen();
    }
  } catch {
    // Graceful fallback
  }
  return Promise.resolve();
}

export function isBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const anyDoc = document as unknown as {
    fullscreenElement?: Element | null;
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  const isApiFullscreen = !!(
    document.fullscreenElement ||
    anyDoc.webkitFullscreenElement ||
    anyDoc.mozFullScreenElement ||
    anyDoc.msFullscreenElement
  );
  if (isApiFullscreen) return true;

  if (typeof window !== 'undefined' && window.screen) {
    const heightDiff = Math.abs(window.screen.height - window.innerHeight);
    const widthDiff = Math.abs(window.screen.width - window.innerWidth);
    if (heightDiff <= 5 && widthDiff <= 5) {
      return true;
    }
  }
  return false;
}
