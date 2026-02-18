function setModal(id, open){
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = open ? 'flex' : 'none';
}

export const modals = {
  openAuth: () => setModal('modalAuthBg', true),
  closeAuth: () => setModal('modalAuthBg', false),
  openSettings: () => setModal('modalSettingsBg', true),
  closeSettings: () => setModal('modalSettingsBg', false),
  openLogout: () => setModal('modalLogoutBg', true),
  closeLogout: () => setModal('modalLogoutBg', false),
};

export function wireModalBackdropClose(){
  const pairs = [
    ['modalAuthBg', modals.closeAuth],
    ['modalSettingsBg', modals.closeSettings],
    ['modalLogoutBg', modals.closeLogout],
  ];
  for (const [id, closeFn] of pairs){
    const bg = document.getElementById(id);
    if (!bg) continue;
    bg.onclick = (e) => { if (e.target === bg) closeFn(); };
  }
}
