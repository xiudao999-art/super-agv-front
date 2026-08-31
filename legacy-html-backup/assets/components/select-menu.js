const SELECTOR = 'select:not([multiple]):not([size]):not([data-agv-select-native])';

function isEnhanceable(select) {
  return select.matches(SELECTOR) && !select.closest('[data-agv-select-skip]');
}

class AgvSelectMenu {
  constructor(select) {
    this.select = select;
    this.searchable = select.hasAttribute('data-agv-select-searchable');
    this.menu = document.createElement('div');
    this.menu.className = 'agv-select-menu';
    if (!this.searchable) this.menu.setAttribute('role', 'listbox');
    this.menu.hidden = true;
    if (this.searchable) {
      this.menu.classList.add('is-searchable');
      this.searchInput = document.createElement('input');
      this.searchInput.type = 'search';
      this.searchInput.className = 'agv-select-search';
      this.searchInput.placeholder = select.dataset.agvSelectSearchPlaceholder || '输入关键词筛选';
      this.searchInput.setAttribute('aria-label', this.searchInput.placeholder);
      this.options = document.createElement('div');
      this.options.className = 'agv-select-options';
      this.options.setAttribute('role', 'listbox');
      this.empty = document.createElement('div');
      this.empty.className = 'agv-select-empty';
      this.empty.textContent = '没有匹配项';
      this.empty.hidden = true;
      this.menu.append(this.searchInput, this.options, this.empty);
    }
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
    const items = [...this.select.options].map((option, index) => {
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
    });
    if (this.searchable) {
      this.options.replaceChildren(...items);
      this.filter(this.searchInput.value);
    } else {
      this.menu.replaceChildren(...items);
    }
  }

  filter(value) {
    if (!this.searchable) return;
    const keyword = value.trim().toLocaleLowerCase('zh-CN');
    let visible = 0;
    this.options.querySelectorAll('.agv-select-option').forEach(item => {
      const matched = !keyword || item.textContent.toLocaleLowerCase('zh-CN').includes(keyword);
      item.hidden = !matched;
      if (matched) visible += 1;
    });
    this.empty.hidden = visible > 0;
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
    this.searchInput?.addEventListener('input', () => this.filter(this.searchInput.value));
    this.searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.options.querySelector('.agv-select-option:not([hidden]):not(:disabled)')?.focus();
      }
      if (event.key === 'Escape') { event.preventDefault(); this.close(); this.trigger.focus(); }
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
    const requestedMinWidth = Number(this.select.dataset.agvSelectMenuMinWidth) || 160;
    const availableWidth = Math.max(160, window.innerWidth - rect.left - 8);
    const width = Math.min(Math.max(rect.width, requestedMinWidth), availableWidth);
    const maxHeight = Math.min(288, window.innerHeight - rect.bottom - 16);
    this.menu.style.width = `${width}px`;
    this.menu.style.left = `${rect.left}px`;
    this.menu.style.top = `${rect.bottom + 4}px`;
    this.menu.style.maxHeight = `${Math.max(maxHeight, 120)}px`;
    if (this.searchable) {
      this.options.style.maxHeight = `${Math.max(maxHeight - 52, 68)}px`;
      this.searchInput.focus({ preventScroll: true });
      return;
    }
    const selected = this.menu.querySelector('.is-selected');
    const focusTarget = direction ? (selected?.[direction > 0 ? 'nextElementSibling' : 'previousElementSibling'] || selected) : selected;
    focusTarget?.focus({ preventScroll: true });
  }

  close() {
    if (this.menu.hidden) return;
    this.menu.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
    if (this.searchable) { this.searchInput.value = ''; this.filter(''); }
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
window.addEventListener('scroll', event => {
  const targetIsNode=event.target instanceof Node;
  menus.forEach(menu => { if (!targetIsNode||!menu.menu.contains(event.target)) menu.close(); });
}, true);
document.addEventListener('DOMContentLoaded', () => enhance());
new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches?.(SELECTOR)) enhance(node.parentElement);
  enhance(node);
}))).observe(document.documentElement, { childList: true, subtree: true });

export { enhance as enhanceAgvSelects };
