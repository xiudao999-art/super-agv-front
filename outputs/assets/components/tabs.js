export class AgvTabs extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'tablist');
    const current = location.pathname.split('/').pop();
    this.querySelectorAll('a').forEach(link => {
      link.setAttribute('role', 'tab');
      const active = link.getAttribute('href')?.split('?')[0] === current || link.classList.contains('active');
      link.classList.toggle('active', active);
      link.setAttribute('aria-selected', String(active));
    });
  }
}
customElements.define('agv-tabs', AgvTabs);
