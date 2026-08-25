const prefetchedUrls = new Set();
let pendingTabDestination = null;

function prefetchTabTarget(link) {
  const url = new URL(link.getAttribute('href'), location.href);
  if (url.origin !== location.origin || url.href === location.href || prefetchedUrls.has(url.href)) {
    return;
  }

  prefetchedUrls.add(url.href);
  const hint = document.createElement('link');
  hint.rel = 'prefetch';
  hint.href = url.href;
  hint.fetchPriority = 'low';
  document.head.appendChild(hint);
}

function markTabNavigation(event, link) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    link.target === '_blank'
  ) {
    return;
  }

  const destination = new URL(link.getAttribute('href'), location.href);
  if (destination.origin === location.origin) {
    pendingTabDestination = destination.pathname;
  }
}

window.addEventListener('pageswap', (event) => {
  if (!event.viewTransition) return;

  const destinationUrl = event.activation?.entry?.url;
  const destinationPath = destinationUrl
    ? new URL(destinationUrl, location.href).pathname
    : null;
  if (!pendingTabDestination || pendingTabDestination !== destinationPath) {
    event.viewTransition.skipTransition();
  }
});

export class AgvTabs extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'tablist');
    const current = location.pathname.split('/').pop();

    this.querySelectorAll('a').forEach(link => {
      link.setAttribute('role', 'tab');
      const active = link.getAttribute('href')?.split('?')[0] === current || link.classList.contains('active');
      link.classList.toggle('active', active);
      link.setAttribute('aria-selected', String(active));

      const prefetch = () => prefetchTabTarget(link);
      link.addEventListener('pointerenter', prefetch, { once: true, passive: true });
      link.addEventListener('focus', prefetch, { once: true });
      link.addEventListener('touchstart', prefetch, { once: true, passive: true });
      link.addEventListener('click', (event) => markTabNavigation(event, link));
    });
  }
}

if (!customElements.get('agv-tabs')) {
  customElements.define('agv-tabs', AgvTabs);
}
