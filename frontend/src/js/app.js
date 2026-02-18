import { wireModalBackdropClose } from './components/modals.js';
import { wireAuth, setAuthButtonLabel } from './components/auth.js';
import { wireSettings, loadSettingsToUi } from './components/settings.js';
import { wireTasks, renderTasks } from './components/tasks.js';
import { refreshReport } from './components/report.js';
import { wireTimer, initTimerUi } from './components/timer.js';

function renderActionsEmpty(){
  const el = document.getElementById('reportActions');
  el.innerHTML = `<div class="reportItem mutedLine">Пока нет действий</div>`;
}

function applyAuthVisibility(){
  setAuthButtonLabel();
  document.getElementById('reportCard').style.display = 'block';

  const token = localStorage.getItem('token');
  if (!token){
    document.getElementById('streak').textContent = '—';
    document.getElementById('todayFocus').textContent = '—';
  }
}

(async function init(){
  wireModalBackdropClose();
  wireAuth();
  wireSettings();
  wireTasks();
  wireTimer();

  renderActionsEmpty();
  applyAuthVisibility();

  initTimerUi();

  if (localStorage.getItem('token')){
    await loadSettingsToUi().catch(()=>{});
    await renderTasks().catch(()=>{});
    await refreshReport().catch(()=>{});
  }else{
    await renderTasks().catch(()=>{});
    await refreshReport().catch(()=>{});
  }

  window.addEventListener('auth:changed', async () => {
    applyAuthVisibility();
    await loadSettingsToUi().catch(()=>{});
    await renderTasks().catch(()=>{});
    await refreshReport().catch(()=>{});
  });
})();
