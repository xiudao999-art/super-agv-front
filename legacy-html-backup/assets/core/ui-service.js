let toastTimer;
let lastFocusedElement = null;

export function showToast(message, duration = 2300) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = String(message ?? '');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

export function openLayer(id) {
  const layer = document.getElementById(id);
  if (!layer) return false;
  lastFocusedElement = document.activeElement;
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => layer.classList.add('open'));
  return true;
}

export function closeLayer(id, delay = 220) {
  const layer = document.getElementById(id);
  if (!layer) return false;
  layer.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    layer.hidden = true;
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  }, delay);
  return true;
}

window.agvUi = { showToast, openLayer, closeLayer };
if (typeof window.showToast !== 'function') window.showToast = showToast;
