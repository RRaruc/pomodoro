import { api } from '../services/api.js';
import { showToast } from './toast.js';

function openAuth(){ document.getElementById('modalAuthBg').style.display = 'flex'; }
function closeAuth(){ document.getElementById('modalAuthBg').style.display = 'none'; }
function openLogout(){ document.getElementById('modalLogoutBg').style.display = 'flex'; }
function closeLogout(){ document.getElementById('modalLogoutBg').style.display = 'none'; }

function displayNameFromEmail(email){
  if (!email) return '';
  const at = email.indexOf('@');
  return (at >= 0 ? email.slice(0, at) : email) || '';
}

export function setAuthButtonLabel(){
  const t = localStorage.getItem('token');
  const email = localStorage.getItem('auth_email') || '';
  const btn = document.getElementById('btnAuth');

  if (t && email) btn.textContent = displayNameFromEmail(email);
  else btn.textContent = 'Log in';
}

export function wireAuth(){
  document.getElementById('btnAuth').onclick = () => {
    const t = localStorage.getItem('token');
    const email = localStorage.getItem('auth_email') || '';
    if (t && email) openLogout();
    else openAuth();
  };

  document.getElementById('btnCloseAuth').onclick = closeAuth;

  document.getElementById('btnLogoutNo').onclick = closeLogout;

  // Главное изменение: при выходе НЕ трогаем UI-таймер (mode/duration/remaining),
  // не выставляем "work 25:00" и т.п. Мы только останавливаем активную работу.
  document.getElementById('btnLogoutYes').onclick = () => {
    try{
      window.dispatchEvent(new CustomEvent('timer:stop'));
      localStorage.removeItem('token');
      localStorage.removeItem('auth_email');

      // ui_settings оставляем как есть для реального пользователя.
      // guest_email/guest_password оставляем — так гость может восстановиться при следующем START.

      setAuthButtonLabel();
      closeLogout();
      showToast({ title:'Выход', body:'Вы вышли из аккаунта.' });

      window.dispatchEvent(new CustomEvent('auth:changed'));
    }catch{}
  };

  document.getElementById('btnLogin').onclick = async () => {
    try{
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const data = await api('/v1/auth/login', { method:'POST', body:{ email, password } });

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('auth_email', email);

      setAuthButtonLabel();
      closeAuth();
      showToast({ title:'Вход выполнен', body:`Вы вошли как ${displayNameFromEmail(email)}.` });
      window.dispatchEvent(new CustomEvent('auth:changed'));
    }catch{
      showToast({ title:'Пользователь не зарегистрирован', body:'Проверь email/пароль или зарегистрируйся.' });
    }
  };

  document.getElementById('btnRegister').onclick = async () => {
    try{
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const data = await api('/v1/auth/register', { method:'POST', body:{ email, password } });

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('auth_email', email);

      setAuthButtonLabel();
      closeAuth();
      showToast({ title:'Регистрация завершена', body:`Пользователь ${displayNameFromEmail(email)} зарегистрирован.` });
      window.dispatchEvent(new CustomEvent('auth:changed'));
    }catch{
      showToast({ title:'Пользователь уже зарегистрирован', body:'Похоже, такой email уже существует. Попробуй вход.' });
    }
  };
}
