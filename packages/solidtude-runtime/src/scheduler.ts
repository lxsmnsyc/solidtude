import { getRoot } from './nodes';

export function onMedia(query: string, callback: () => Promise<void>): void {
  const media = window.matchMedia(query);

  const onMediaCallback = () => {
    if (media.matches) {
      callback().catch(() => {
        // no-op
      });
      media.removeEventListener('change', onMediaCallback);
    }
  };

  media.addEventListener('change', onMediaCallback);
}

export function onVisible(id: string, callback: () => Promise<void>): void {
  const marker = getRoot(id);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === marker && entry.isIntersecting) {
        callback().catch(() => {
          // no-op
        });
        observer.disconnect();
      }
    });
  });

  observer.observe(marker);
}

export function onLoad(callback: () => Promise<void>): void {
  const onLoadCallback = () => {
    callback().catch(() => {
      // no-op
    });
    window.removeEventListener('load', onLoadCallback);
  };

  window.addEventListener('load', onLoadCallback);
}
