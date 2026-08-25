const ACTION_TAGS = new Set(['BUTTON', 'A']);

function getDirectActions(container) {
    return Array.from(container.children).filter((element) => {
        const isAction = ACTION_TAGS.has(element.tagName) || element.getAttribute('role') === 'button';
        return isAction && !element.classList.contains('agv-action-menu__trigger');
    });
}

function getActionLabel(action, index) {
    return action.getAttribute('aria-label') ||
        action.getAttribute('title') ||
        action.textContent?.trim() ||
        `操作 ${index + 1}`;
}

class AgvActionMenu extends HTMLElement {
    constructor() {
        super();
        this._actions = [];
        this._onDocumentPointerDown = this._onDocumentPointerDown.bind(this);
        this._onDocumentKeyDown = this._onDocumentKeyDown.bind(this);
        this._onViewportChange = this.close.bind(this);
        this._onAnotherMenuOpen = this._onAnotherMenuOpen.bind(this);
    }

    connectedCallback() {
        if (this.dataset.ready === 'true') return;

        this.dataset.ready = 'true';
        const iconTrigger = this.dataset.agvActionMenuTrigger === 'icon';
        this.innerHTML = iconTrigger
            ? `<button class="agv-action-menu__trigger" type="button" aria-label="更多操作" title="更多操作" aria-haspopup="menu" aria-expanded="false"><img class="agv-action-menu__icon" src="assets/list-icons/more.svg" alt=""></button><div class="agv-action-menu__panel" role="menu" hidden></div>`
            : `<button class="agv-action-menu__trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span>更多</span><span class="agv-action-menu__chevron" aria-hidden="true"></span></button><div class="agv-action-menu__panel" role="menu" hidden></div>`;
        this._trigger = this.querySelector('.agv-action-menu__trigger');
        this._panel = this.querySelector('.agv-action-menu__panel');
        if (iconTrigger) this._panel.classList.add('agv-action-menu__panel--compact');

        this._trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.toggle();
        });
        document.addEventListener('pointerdown', this._onDocumentPointerDown, true);
        document.addEventListener('keydown', this._onDocumentKeyDown);
        window.addEventListener('resize', this._onViewportChange);
        window.addEventListener('scroll', this._onViewportChange, true);
        window.addEventListener('agv-action-menu-open', this._onAnotherMenuOpen);
    }

    disconnectedCallback() {
        document.removeEventListener('pointerdown', this._onDocumentPointerDown, true);
        document.removeEventListener('keydown', this._onDocumentKeyDown);
        window.removeEventListener('resize', this._onViewportChange);
        window.removeEventListener('scroll', this._onViewportChange, true);
        window.removeEventListener('agv-action-menu-open', this._onAnotherMenuOpen);
        this._panel?.remove();
        this._restoreSourceActions();
    }

    set actions(actions) {
        this._restoreSourceActions();
        this._actions = Array.from(actions);
        this._actions.forEach((action) => {
            action.classList.add('agv-action-source--collapsed');
            action.dataset.agvOriginalTabindex = action.getAttribute('tabindex') ?? '';
            action.setAttribute('tabindex', '-1');
            action.setAttribute('aria-hidden', 'true');
        });
        this._renderItems();
    }

    get actions() {
        return this._actions;
    }

    toggle() {
        this._panel.hidden ? this.open() : this.close();
    }

    open() {
        this._renderItems();
        window.dispatchEvent(new CustomEvent('agv-action-menu-open', { detail: this }));
        if (this._panel.parentElement !== document.body) document.body.appendChild(this._panel);
        this._panel.hidden = false;
        this._trigger.setAttribute('aria-expanded', 'true');
        this._positionPanel();
        requestAnimationFrame(() => {
            this._positionPanel();
            this._panel.querySelector('.agv-action-menu__item:not(:disabled)')?.focus();
        });
    }

    close({ restoreFocus = false } = {}) {
        if (!this._panel || this._panel.hidden) return;

        this._panel.hidden = true;
        this._trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus) this._trigger.focus();
    }

    _renderItems() {
        if (!this._panel) return;

        this._panel.replaceChildren();
        this._actions.forEach((action, index) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'agv-action-menu__item';
            item.setAttribute('role', 'menuitem');
            item.textContent = getActionLabel(action, index);
            item.disabled = action.matches(':disabled, [aria-disabled="true"]');
            item.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!item.disabled) {
                    this.close();
                    action.click();
                }
            });
            this._panel.appendChild(item);
        });
    }

    _positionPanel() {
        const trigger = this._trigger.getBoundingClientRect();
        const panel = this._panel.getBoundingClientRect();
        const edge = 8;
        const gap = 6;
        const left = Math.min(
            window.innerWidth - panel.width - edge,
            Math.max(edge, trigger.right - panel.width)
        );
        const preferAbove = this.dataset.agvActionMenuPlacement === 'top';
        const fitsBelow = trigger.bottom + gap + panel.height <= window.innerHeight - edge;
        const top = preferAbove
            ? Math.max(edge, trigger.top - panel.height - gap)
            : (fitsBelow ? trigger.bottom + gap : Math.max(edge, trigger.top - panel.height - gap));

        this._panel.style.left = `${Math.round(left)}px`;
        this._panel.style.top = `${Math.round(top)}px`;
    }

    _onDocumentPointerDown(event) {
        if (!this.contains(event.target) && !this._panel?.contains(event.target)) this.close();
    }

    _onDocumentKeyDown(event) {
        if (event.key === 'Escape' && !this._panel.hidden) {
            event.preventDefault();
            this.close({ restoreFocus: true });
        }
    }

    _onAnotherMenuOpen(event) {
        if (event.detail !== this) this.close();
    }

    _restoreSourceActions() {
        this._actions.forEach((action) => {
            action.classList.remove('agv-action-source--collapsed');
            action.removeAttribute('aria-hidden');
            const original = action.dataset.agvOriginalTabindex;
            delete action.dataset.agvOriginalTabindex;
            original ? action.setAttribute('tabindex', original) : action.removeAttribute('tabindex');
        });
    }
}

if (!customElements.get('agv-action-menu')) {
    customElements.define('agv-action-menu', AgvActionMenu);
}

function getActionCandidates(cell) {
    return [
        ...cell.querySelectorAll(':scope > [class*="action"], :scope > [class*="operation"]'),
        cell
    ];
}

function findActionContainer(cell) {
    return getActionCandidates(cell).find((candidate) => getDirectActions(candidate).length > 2);
}

function getVisibleActionItems(container) {
    return Array.from(container.children).filter((element) => {
        if (element.classList.contains('agv-action-source--collapsed')) return false;
        return ACTION_TAGS.has(element.tagName) ||
            element.getAttribute('role') === 'button' ||
            element.tagName === 'AGV-ACTION-MENU';
    });
}

const tableScrollbarStates = new WeakMap();

function ensureTableScrollbar(wrapper) {
    if (tableScrollbarStates.has(wrapper)) return tableScrollbarStates.get(wrapper).sync;

    const scrollbar = document.createElement('div');
    scrollbar.className = 'agv-table-scrollbar';
    scrollbar.tabIndex = 0;
    scrollbar.setAttribute('role', 'scrollbar');
    scrollbar.setAttribute('aria-label', '表格横向滚动');
    scrollbar.setAttribute('aria-orientation', 'horizontal');
    scrollbar.innerHTML = '<div class="agv-table-scrollbar__track"><div class="agv-table-scrollbar__thumb"></div></div>';
    wrapper.appendChild(scrollbar);

    const track = scrollbar.querySelector('.agv-table-scrollbar__track');
    const thumb = scrollbar.querySelector('.agv-table-scrollbar__thumb');
    const state = { dragging: false, startX: 0, startScrollLeft: 0, sync: null };

    state.sync = () => {
        const columnWidth = Number.parseFloat(getComputedStyle(wrapper).getPropertyValue('--agv-action-column-width')) || 176;
        const trackWidth = Math.max(0, wrapper.clientWidth - columnWidth);
        const scrollableViewport = Math.max(1, wrapper.clientWidth - columnWidth);
        const scrollableContent = Math.max(scrollableViewport, wrapper.scrollWidth - columnWidth);
        const maxScroll = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
        const thumbWidth = Math.max(32, trackWidth * (scrollableViewport / scrollableContent));
        const maxThumbTravel = Math.max(0, trackWidth - thumbWidth);
        const thumbLeft = maxScroll ? (wrapper.scrollLeft / maxScroll) * maxThumbTravel : 0;

        scrollbar.style.width = `${trackWidth}px`;
        scrollbar.hidden = maxScroll <= 1 || trackWidth <= 32;
        thumb.style.width = `${Math.min(trackWidth, thumbWidth)}px`;
        thumb.style.transform = `translateX(${thumbLeft}px)`;
        scrollbar.setAttribute('aria-valuemin', '0');
        scrollbar.setAttribute('aria-valuemax', String(Math.round(maxScroll)));
        scrollbar.setAttribute('aria-valuenow', String(Math.round(wrapper.scrollLeft)));
    };

    thumb.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.dragging = true;
        state.startX = event.clientX;
        state.startScrollLeft = wrapper.scrollLeft;
        thumb.setPointerCapture?.(event.pointerId);
    });

    thumb.addEventListener('pointermove', (event) => {
        if (!state.dragging) return;
        const trackWidth = track.clientWidth;
        const maxThumbTravel = Math.max(1, trackWidth - thumb.offsetWidth);
        const maxScroll = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
        wrapper.scrollLeft = state.startScrollLeft + ((event.clientX - state.startX) / maxThumbTravel) * maxScroll;
    });

    const stopDragging = () => {
        state.dragging = false;
    };
    thumb.addEventListener('pointerup', stopDragging);
    thumb.addEventListener('pointercancel', stopDragging);

    track.addEventListener('pointerdown', (event) => {
        if (event.target === thumb) return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        wrapper.scrollLeft = ratio * Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
    });

    scrollbar.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? wrapper.clientWidth * 0.8 : 48;
        if (event.key === 'ArrowLeft') wrapper.scrollBy({ left: -step, behavior: 'smooth' });
        else if (event.key === 'ArrowRight') wrapper.scrollBy({ left: step, behavior: 'smooth' });
        else if (event.key === 'Home') wrapper.scrollTo({ left: 0, behavior: 'smooth' });
        else if (event.key === 'End') wrapper.scrollTo({ left: wrapper.scrollWidth, behavior: 'smooth' });
        else return;
        event.preventDefault();
    });

    wrapper.addEventListener('scroll', state.sync, { passive: true });
    new ResizeObserver(state.sync).observe(wrapper);
    tableScrollbarStates.set(wrapper, state);
    state.sync();
    return state.sync;
}

function updateActionColumnWidth(table) {
    let widestContent = 0;

    table.querySelectorAll('tbody td:last-child').forEach((cell) => {
        const container = getActionCandidates(cell).find((candidate) => getVisibleActionItems(candidate).length);
        if (!container) return;

        const items = getVisibleActionItems(container);
        const gap = Number.parseFloat(getComputedStyle(container).columnGap) || 6;
        const itemsWidth = items.reduce((total, item) => total + Math.ceil(item.getBoundingClientRect().width), 0);
        widestContent = Math.max(widestContent, itemsWidth + Math.max(0, items.length - 1) * gap + 26);
    });

    const measuredWidth = widestContent || 176;
    const width = Math.min(240, Math.max(104, Math.ceil(measuredWidth / 8) * 8));
    const widthValue = `${width}px`;
    const wrapper = table.closest('.table-wrap');

    table.style.setProperty('--agv-action-column-width', widthValue);
    wrapper?.style.setProperty('--agv-action-column-width', widthValue);

    if (wrapper) {
        ensureTableScrollbar(wrapper)();
    }
}

function markStickyActionColumns(root = document) {
    root.querySelectorAll?.('table').forEach((table) => {
        const lastHeader = table.querySelector('thead tr:first-child th:last-child');
        const headerLabel = lastHeader?.textContent?.replace(/\s+/g, '') || '';
        const shouldStick = table.hasAttribute('data-sticky-actions') || /^操作(?:列)?$/.test(headerLabel);

        if (shouldStick) {
            table.classList.add('agv-table--sticky-actions');
            table.closest('.table-wrap')?.classList.add('agv-table-wrap--sticky-actions');
        }
    });
}

function enhanceTableActions(root = document) {
    markStickyActionColumns(root);

    root.querySelectorAll?.('table tbody td:last-child').forEach((cell) => {
        const container = findActionContainer(cell);
        if (!container || container.dataset.agvActionMenu === 'none' || container.dataset.agvActionEnhanced === 'true') return;

        const actions = getDirectActions(container);
        if (actions.length <= 2) return;

        const menu = document.createElement('agv-action-menu');
        if (container.dataset.agvActionMenu === 'icon') {
            menu.dataset.agvActionMenuTrigger = 'icon';
            menu.dataset.agvActionMenuPlacement = 'top';
        }
        container.appendChild(menu);
        menu.actions = actions.slice(2);
        container.dataset.agvActionEnhanced = 'true';
    });

    requestAnimationFrame(() => {
        root.querySelectorAll?.('table.agv-table--sticky-actions').forEach(updateActionColumnWidth);
    });
}

let enhancementQueued = false;
function queueEnhancement() {
    if (enhancementQueued) return;
    enhancementQueued = true;
    queueMicrotask(() => {
        enhancementQueued = false;
        enhanceTableActions();
    });
}

function startTableActionEnhancer() {
    enhanceTableActions();
    new MutationObserver(queueEnhancement).observe(document.body, {
        childList: true,
        subtree: true
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTableActionEnhancer, { once: true });
} else {
    startTableActionEnhancer();
}

export { enhanceTableActions, markStickyActionColumns };
