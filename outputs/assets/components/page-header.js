export class AgvPageHeader extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;
    this.dataset.ready = 'true';
    if (!this.children.length && this.hasAttribute('title')) {
      const title = document.createElement('h1');
      title.textContent = this.getAttribute('title') || '';
      const description = document.createElement('p');
      description.textContent = this.getAttribute('description') || '';
      const copy = document.createElement('div');
      copy.append(title, description);
      this.append(copy);
    }
    this.setAttribute('role', 'region');
    const heading = this.querySelector('h1');
    if (heading && !heading.id) heading.id = `page-title-${location.pathname.split('/').pop()?.replace(/\W+/g, '-') || 'main'}`;
    if (heading) this.setAttribute('aria-labelledby', heading.id);
  }
}
customElements.define('agv-page-header', AgvPageHeader);
