import { api } from '../services/api.js';
import { showToast } from './toast.js';

function requireTokenForTasks(){
  const token = localStorage.getItem('token');
  if (token) return true;

  document.getElementById('tasksHint').style.display = 'block';
  showToast({
    title:'Пользователь не зарегистрирован',
    body:'Запусти таймер без авторизации (создастся гость) или выполни вход.'
  });
  return false;
}

export async function renderTasks(){
  const token = localStorage.getItem('token');
  const tasksEl = document.getElementById('tasks');
  if (!token){
    tasksEl.innerHTML = '';
    return;
  }
  try{
    const tasks = await api('/v1/tasks');
    tasksEl.innerHTML = tasks.map((t) => `
      <div class="taskItem">
        <div style="min-width:0;">
          <div class="name">${t.name}</div>
          <div class="meta">pomodoros: ${t.pomodoros || 0}</div>
        </div>
        <div class="row" style="flex-wrap:nowrap;">
          <button class="btn" data-act="inc" data-id="${t.id}" type="button">+</button>
          <button class="btn" data-act="dec" data-id="${t.id}" type="button">-</button>
        </div>
      </div>
    `).join('');
    document.getElementById('tasksHint').style.display = 'none';
  }catch{
    tasksEl.innerHTML = '';
  }
}

export function wireTasks(){
  document.getElementById('btnAddTask').onclick = async () => {
    if (!requireTokenForTasks()) return;
    const name = (document.getElementById('taskName').value || '').trim();
    if (!name) return;
    try{
      await api('/v1/tasks', { method:'POST', body:{ name } });
      document.getElementById('taskName').value = '';
      await renderTasks();
    }catch{
      showToast({ title:'Ошибка', body:'Не удалось создать задачу.' });
    }
  };

  document.getElementById('tasks').onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (!requireTokenForTasks()) return;

    const id = Number(btn.dataset.id);
    const act = btn.dataset.act;
    try{
      if (act === 'inc') await api(`/v1/tasks/${id}/inc`, { method:'POST' });
      if (act === 'dec') await api(`/v1/tasks/${id}/dec`, { method:'POST' });
      await renderTasks();
    }catch{
      showToast({ title:'Ошибка', body:'Не удалось обновить задачу.' });
    }
  };
}
