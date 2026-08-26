const SELECTOR = 'select:not([multiple]):not([size]):not([data-agv-select-native])';

function isEnhanceable(select) {
  return select.matches(SELECTOR) && !select.closest('[data-agv-select-skip]');
}

class AgvSelectMenu {
  constructor(select) {
    this.select = select;
    this.menu = document.createElement('div');
    this.menu.className = 'agv-select-menu';
    this.menu.setAttribute('role', 'listbox');
    this.menu.hidden = true;
    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = 'agv-select-trigger';
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.select.classList.add('agv-select-native');
    this.select.after(this.trigger);
    document.body.append(this.menu);
    this.render();
    this.bind();
  }

  render() {
    const selected = this.select.selectedOptions[0];
    this.trigger.textContent = selected?.textContent?.trim() || this.select.getAttribute('placeholder') || '请选择';
    this.trigger.disabled = this.select.disabled;
    this.menu.replaceChildren(...[...this.select.options].map((option, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'agv-select-option';
      item.textContent = option.textContent;
      item.dataset.value = option.value;
      item.dataset.index = String(index);
      item.disabled = option.disabled;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      if (option.selected) item.classList.add('is-selected');
      return item;
    }));
  }

  bind() {
    this.trigger.addEventListener('click', () => this.menu.hidden ? this.open() : this.close());
    this.trigger.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); this.open(event.key === 'ArrowUp' ? -1 : 1); }
      if (event.key === 'Escape') this.close();
    });
    this.menu.addEventListener('click', (event) => {
      const item = event.target.closest('.agv-select-option');
      if (!item || item.disabled) return;
      this.select.selectedIndex = Number(item.dataset.index);
      this.select.dispatchEvent(new Event('input', { bubbles: true }));
      this.select.dispatchEvent(new Event('change', { bubbles: true }));
      this.render();
      this.close();
      this.trigger.focus();
    });
    this.select.addEventListener('change', () => this.render());
    this.observer = new MutationObserver(() => this.render());
    this.observer.observe(this.select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label'] });
  }

  open(direction = 0) {
    if (this.trigger.disabled) return;
    closeAll(this);
    this.render();
    this.menu.hidden = false;
    this.trigger.setAttribute('aria-expanded', 'true');
    const rect = this.trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 160);
    const maxHeight = Math.min(288, window.innerHeight - rect.bottom - 16);
    this.menu.style.width = `${width}px`;
    this.menu.style.left = `${rect.left}px`;
    this.menu.style.top = `${rect.bottom + 4}px`;
    this.menu.style.maxHeight = `${Math.max(maxHeight, 120)}px`;
    const selected = this.menu.querySelector('.is-selected');
    const focusTarget = direction ? (selected?.[direction > 0 ? 'nextElementSibling' : 'previousElementSibling'] || selected) : selected;
    focusTarget?.focus({ preventScroll: true });
  }

  close() {
    if (this.menu.hidden) return;
    this.menu.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
  }
}

const menus = new Set();
function closeAll(except) { menus.forEach(menu => { if (menu !== except) menu.close(); }); }
function enhance(root = document) {
  root.querySelectorAll?.(SELECTOR).forEach(select => {
    if (select._agvSelectMenu || !isEnhanceable(select)) return;
    const menu = new AgvSelectMenu(select);
    select._agvSelectMenu = menu;
    menus.add(menu);
  });
}

document.addEventListener('click', event => {
  menus.forEach(menu => { if (!menu.menu.contains(event.target) && !menu.trigger.contains(event.target)) menu.close(); });
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAll(); });
window.addEventListener('resize', () => closeAll());
window.addEventListener('scroll', () => closeAll(), true);
document.addEventListener('DOMContentLoaded', () => enhance());
new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches?.(SELECTOR)) enhance(node.parentElement);
  enhance(node);
}))).observe(document.documentElement, { childList: true, subtree: true });

export { enhance as enhanceAgvSelects };
