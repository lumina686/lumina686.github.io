(function () {
  'use strict';

  const key = 'blog-publish-token';
  const token = document.getElementById('github-token');
  const remember = document.getElementById('remember-token');
  const status = document.getElementById('token-storage-status');
  if (!token || !remember || !status) return;

  function storage(type, action, value) {
    try {
      return { ok: true, value: window[type][action](key, value) };
    } catch (_) {
      return { ok: false, value: null };
    }
  }

  const saved = storage('localStorage', 'getItem');
  const session = storage('sessionStorage', 'getItem');
  token.value = saved.value || session.value || '';
  remember.checked = Boolean(saved.value);
  if (saved.value) status.textContent = '已自动填入此设备记住的令牌。';

  function persist() {
    const value = token.value.trim();
    const sessionResult = storage('sessionStorage', value ? 'setItem' : 'removeItem', value);
    const localResult = storage('localStorage', remember.checked && value ? 'setItem' : 'removeItem', value);
    if (!localResult.ok) {
      status.textContent = '无法保存或清除长期令牌，请检查浏览器存储设置；仍可使用当前输入的令牌发布。';
    } else if (!sessionResult.ok) {
      status.textContent = remember.checked && value
        ? '令牌已在此设备记住，但当前浏览器不支持会话保存。'
        : '浏览器无法保存会话令牌，离开后需要重新填写。';
    } else {
      status.textContent = value
        ? (remember.checked ? '已在此设备记住令牌，重新打开会自动填入。' : '令牌仅在当前会话保留，长期保存已清除。')
        : '尚未填写令牌；填写后将按所选方式保存。';
    }
  }

  token.addEventListener('input', persist);
  token.addEventListener('change', persist);
  remember.addEventListener('change', persist);
  document.getElementById('editor-form').addEventListener('submit', persist);
  document.getElementById('forget-token').addEventListener('click', () => {
    token.value = '';
    remember.checked = false;
    const local = storage('localStorage', 'removeItem');
    const session = storage('sessionStorage', 'removeItem');
    status.textContent = local.ok && session.ok
      ? '已清除本机令牌，草稿不受影响。'
      : '输入框已清空，但浏览器阻止了存储清除，请在浏览器设置中清除此站点的令牌存储。';
    token.focus();
  });
})();
