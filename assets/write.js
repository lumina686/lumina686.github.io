(function () {
  'use strict';

  const owner = 'lumina686';
  const repo = 'lumina686.github.io';
  const mode = new URLSearchParams(location.search).get('mode') === 'photo' ? 'photo' : 'post';
  const form = document.getElementById('editor-form');
  const title = document.getElementById('post-title');
  const body = document.getElementById('post-body');
  const photos = document.getElementById('post-photos');
  const token = document.getElementById('github-token');
  const status = document.getElementById('editor-status');
  const preview = document.getElementById('photo-preview');
  const publishButton = document.getElementById('publish-button');
  let database;
  let saving = false;
  let draftDirty = false;
  let previewUrls = [];

  document.getElementById('editor-title').textContent = mode === 'photo' ? '上传照片' : '写点东西';
  document.getElementById('body-label').textContent = mode === 'photo' ? '照片说明（可选）' : '正文';
  document.getElementById('mode-' + mode).setAttribute('aria-current', 'page');
  try { token.value = sessionStorage.getItem('blog-publish-token') || ''; } catch (_) { /* private browsing */ }

  function setStatus(message) { status.textContent = message; }
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('blog-local-drafts', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function readDraft() {
    return new Promise((resolve, reject) => {
      const request = database.transaction('drafts').objectStore('drafts').get(mode);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function writeDraft(value) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(value, mode);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }
  function deleteDraft() {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').delete(mode);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }
  function showPhotos() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    preview.replaceChildren();
    for (const file of photos.files) {
      const item = document.createElement('img');
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      item.src = url;
      item.alt = '待上传照片';
      preview.appendChild(item);
    }
  }
  async function saveDraft() {
    if (!database) return;
    draftDirty = true;
    if (saving) return;
    saving = true;
    try {
      while (draftDirty) {
        draftDirty = false;
        await writeDraft({ title: title.value, body: body.value, photos: Array.from(photos.files), savedAt: Date.now() });
      }
      setStatus('草稿已自动保存到这台设备');
    } catch (_) {
      setStatus('草稿保存失败，请检查浏览器存储空间。');
    } finally { saving = false; }
  }
  async function api(path, key, options) {
    const response = await fetch('https://api.github.com' + path, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'GitHub 请求失败（' + response.status + '）');
    return data;
  }
  async function toBase64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let index = 0; index < bytes.length; index += 32768) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 32768));
    }
    return btoa(binary);
  }
  function chinaDate() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  openDatabase().then(async db => {
    database = db;
    const draft = await readDraft();
    if (draft) {
      title.value = draft.title || '';
      body.value = draft.body || '';
      if (draft.photos && draft.photos.length) {
        const transfer = new DataTransfer();
        draft.photos.forEach(file => transfer.items.add(file));
        photos.files = transfer.files;
        showPhotos();
      }
      setStatus('已恢复上次保存在这台设备的草稿');
    } else setStatus('草稿会自动保存在这台设备');
  }).catch(() => setStatus('浏览器无法保存草稿，请检查隐私或存储设置。'));

  title.addEventListener('input', saveDraft);
  body.addEventListener('input', saveDraft);
  photos.addEventListener('change', () => { showPhotos(); saveDraft(); });
  document.getElementById('clear-button').addEventListener('click', async () => {
    if (!confirm('删除这台设备上当前类型的草稿？')) return;
    if (database) await deleteDraft();
    title.value = '';
    body.value = '';
    photos.value = '';
    showPhotos();
    setStatus('本机草稿已删除');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const heading = title.value.trim();
    const writing = body.value.trim();
    const selected = Array.from(photos.files);
    const key = token.value.trim();
    if (!heading || (mode === 'post' && !writing) || (mode === 'photo' && !selected.length)) {
      setStatus('请填写标题，并写正文或选择照片。'); return;
    }
    if (!key) { setStatus('发布前请填写 GitHub 发布令牌。'); token.focus(); return; }
    if (selected.some(file => file.size > 5 * 1024 * 1024)) {
      setStatus('每张照片不能超过 5 MB。'); return;
    }
    publishButton.disabled = true;
    title.disabled = true;
    body.disabled = true;
    photos.disabled = true;
    try {
      const user = await api('/user', key, { method: 'GET' });
      if (user.login !== owner) throw new Error('只有 lumina686 账号可以发布。');
      try { sessionStorage.setItem('blog-publish-token', key); } catch (_) { /* private browsing */ }
      const stamp = Date.now() + '-' + crypto.randomUUID().slice(0, 8);
      const imageLines = [];
      for (const [index, file] of selected.entries()) {
        setStatus(`正在上传照片 ${index + 1}/${selected.length}…`);
        const extension = file.name.split('.').pop().toLowerCase();
        const path = `assets/uploads/${stamp}-${index + 1}.${extension}`;
        await api(`/repos/${owner}/${repo}/contents/${path}`, key, {
          method: 'PUT', body: JSON.stringify({ message: `Add blog photo ${index + 1}`, content: await toBase64(file) })
        });
        imageLines.push(`![照片 ${index + 1}](/${path})`);
      }
      const date = chinaDate();
      const excerpt = writing.replace(/\s+/g, ' ').slice(0, 110) || '一组照片。';
      const content = mode === 'photo' ? [...imageLines, writing].filter(Boolean).join('\n\n') : [writing, ...imageLines].filter(Boolean).join('\n\n');
      const article = [
        '---', 'layout: post', `title: ${JSON.stringify(heading)}`, `date: ${date}`,
        `excerpt: ${JSON.stringify(excerpt)}`, 'tags:', `  - ${mode === 'photo' ? '摄影' : '随笔'}`,
        '---', '', content, ''
      ].join('\n');
      setStatus('正在发布到博客…');
      await api(`/repos/${owner}/${repo}/contents/_posts/${date}-${mode}-${stamp}.md`, key, {
        method: 'PUT', body: JSON.stringify({ message: `Publish ${mode} post: ${heading}`, content: await toBase64(new Blob([article])) })
      });
      while (saving) await new Promise(resolve => setTimeout(resolve, 30));
      if (database) await deleteDraft();
      title.value = '';
      body.value = '';
      photos.value = '';
      showPhotos();
      setStatus('已提交发布，博客通常会在几分钟内更新。');
    } catch (error) {
      setStatus('发布失败：' + error.message + '。草稿仍保存在这台设备。');
    } finally {
      publishButton.disabled = false;
      title.disabled = false;
      body.disabled = false;
      photos.disabled = false;
    }
  });
})();
