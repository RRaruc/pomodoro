let hideTimer = null;

export function showToast({ title='Сообщение', body='—', buttons=[] } = {}){
  const toast = document.getElementById('toast');
  const titleEl = document.getElementById('toastTitle');
  const bodyEl = document.getElementById('toastBody');
  const rowEl = document.getElementById('toastRow');

  titleEl.textContent = title;
  bodyEl.textContent = body;

  rowEl.innerHTML = '';
  const btns = buttons.length ? buttons : [{ text:'Ок' }];

  for (const b of btns){
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.type = 'button';
    btn.textContent = b.text;
    btn.onclick = () => {
      try { b.onClick && b.onClick(); } finally { hideToast(); }
    };
    rowEl.appendChild(btn);
  }

  toast.style.display = 'block';

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => hideToast(), 5000);
}

export function hideToast(){
  const toast = document.getElementById('toast');
  toast.style.display = 'none';
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
}
