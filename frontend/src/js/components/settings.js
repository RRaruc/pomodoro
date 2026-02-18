import { api } from '../services/api.js';
import { showToast } from './toast.js';

export function getUiSettings(){
  // Если нет токена, считаем что пользователь "анонимен/гость не создан" и берем стандартные значения.
  if (!localStorage.getItem('token')){
    return {
      work_seconds: 1500,
      short_break_seconds: 300,
      long_break_seconds: 900,
      long_break_every: 4,
    };
  }
  try { return JSON.parse(localStorage.getItem('ui_settings') || '{}'); } catch { return {}; }
}

function secFromMin(v){ return Math.max(60, Math.floor(Number(v) * 60)); }
function minFromSec(v){ return Math.max(1, Math.round(Number(v) / 60)); }

export async function loadSettingsToUi(){
  if (!localStorage.getItem('token')) return;

  const s = await api('/v1/settings/me');
  localStorage.setItem('ui_settings', JSON.stringify(s));

  document.getElementById('workMinutes').value = String(minFromSec(s.work_seconds));
  document.getElementById('shortBreakMinutes').value = String(minFromSec(s.short_break_seconds));
  document.getElementById('longBreakMinutes').value = String(minFromSec(s.long_break_seconds));
  document.getElementById('longBreakEvery').value = String(s.long_break_every);
}

export function wireSettings(){
  const openSettings = () => (document.getElementById('modalSettingsBg').style.display = 'flex');
  const closeSettings = () => (document.getElementById('modalSettingsBg').style.display = 'none');

  document.getElementById('btnSettings').onclick = async () => {
    if (!localStorage.getItem('token')){
      showToast({ title:'Пользователь не зарегистрирован', body:'Чтобы менять настройки, нужно войти.' });
      return;
    }
    try { await loadSettingsToUi(); } catch {}
    openSettings();
  };

  document.getElementById('btnCloseSettings').onclick = closeSettings;

  document.getElementById('btnSettingsSave').onclick = async () => {
    try{
      if (!localStorage.getItem('token')){
        showToast({ title:'Пользователь не зарегистрирован', body:'Чтобы менять настройки, нужно войти.' });
        return;
      }

      const body = {
        work_seconds: secFromMin(document.getElementById('workMinutes').value),
        short_break_seconds: secFromMin(document.getElementById('shortBreakMinutes').value),
        long_break_seconds: secFromMin(document.getElementById('longBreakMinutes').value),
        long_break_every: Number(document.getElementById('longBreakEvery').value),
      };

      const s = await api('/v1/settings/me', { method:'PUT', body });
      localStorage.setItem('ui_settings', JSON.stringify(s));
      closeSettings();
      showToast({ title:'Сохранено', body:'Настройки обновлены.' });
    }catch{
      showToast({ title:'Ошибка', body:'Не удалось сохранить настройки.' });
    }
  };
}
