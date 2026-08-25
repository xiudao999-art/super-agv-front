function hasAdjacentList(container) {
    const next = container.nextElementSibling;
    if (next?.matches('.table-wrap, .record-list')) return true;

    return Boolean(container.parentElement?.querySelector(':scope > .table-wrap, :scope > .record-list'));
}

function markFilterField(field) {
    field.classList.add('agv-filter-field');
}

function wrapSingleFilter(field, modifier = '') {
    if (field.parentElement?.classList.contains('agv-filter-bar')) return;

    const bar = document.createElement('div');
    bar.className = `agv-filter-bar agv-filter-bar--single ${modifier}`.trim();
    field.before(bar);
    bar.appendChild(field);
}

function enhanceListFilters(root = document) {
    root.querySelectorAll?.(".capacity-filter-card > .field").forEach((field) => {
        markFilterField(field);
        field.classList.add("agv-filter-field--capacity");
    });

    root.querySelectorAll?.('.filters, .log-filters, .toolbar').forEach((container) => {
        const fields = Array.from(container.querySelectorAll(':scope > .field-shell, :scope > .field'));
        if (!fields.length || !hasAdjacentList(container)) return;

        container.classList.add('agv-filter-bar');
        fields.forEach(markFilterField);
        container.querySelectorAll(':scope > .filter-actions, :scope > .toolbar-actions').forEach((actions) => {
            actions.classList.add('agv-filter-actions');
        });
    });

    root.querySelectorAll?.('label.filter').forEach((field) => {
        if (!field.nextElementSibling?.matches('.table-wrap')) return;
        wrapSingleFilter(field);
        markFilterField(field);
    });

    root.querySelectorAll?.('label.record-search').forEach((field) => {
        if (!field.nextElementSibling?.matches('.record-list')) return;
        wrapSingleFilter(field, 'agv-filter-bar--search');
        field.classList.add('agv-filter-search');
    });
}

function startListFilterEnhancer() {
    enhanceListFilters();
    new MutationObserver(() => enhanceListFilters()).observe(document.body, {
        childList: true,
        subtree: true
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startListFilterEnhancer, { once: true });
} else {
    startListFilterEnhancer();
}

export { enhanceListFilters };
