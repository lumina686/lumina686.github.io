(function () {
  'use strict';

  const owner = 'lumina686';
  const repo = 'lumina686.github.io';
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'photo' ? 'photo' : 'post';
  const editPath = params.get('edit') || '';
  const editing = /^_posts\/[a-zA-Z0-9_-]+\.md$/.test(editPath);
  const draftKey = editing ? `edit:${editPath}` : mode;
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
  let editSha = '';
  let originalFrontMatter = '';
  let existingImages = [];

  document.getElementById('editor-title').textContent = editing ? '编辑已发表内容' : (mode === 'photo' ? '上传照片' : '写点东西');
  if (editing) publishButton.textContent = '保存修改';
  document.getElementById('body-label').textContent = mode === 'photo' ? '照片说明（可选）' : '正文';
  document.getElementById('mode-' + mode).setAttribute('aria-current', 'page');

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
      const request = database.transaction('drafts').objectStore('drafts').get(draftKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function writeDraft(value) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(value, draftKey);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }
  function deleteDraft() {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').delete(draftKey);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }
  function showPhotos() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    preview.replaceChildren();
    existingImages.forEach((source, index) => {
      const item = document.createElement('div');
      const image = document.createElement('img');
      image.src = source;
      image.alt = `已发表照片 ${index + 1}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '移除这张';
      remove.addEventListener('click', () => {
        existingImages.splice(index, 1);
        showPhotos();
        saveDraft();
      });
      item.append(image, remove);
      preview.appendChild(item);
    });
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
        await writeDraft({ title: title.value, body: body.value, photos: Array.from(photos.files), existingImages, savedAt: Date.now() });
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
    if (editing) {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${editPath}`);
      if (!response.ok) throw new Error('无法读取已发表内容');
      const item = await response.json();
      editSha = item.sha;
      const raw = new TextDecoder().decode(Uint8Array.from(atob(item.content.replace(/\s/g, '')), character => character.charCodeAt(0)));
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (!match) throw new Error('文章格式不受支持');
      originalFrontMatter = match[1];
      const titleLine = originalFrontMatter.match(/^title:\s*(.*)$/m);
      if (titleLine) {
        try { title.value = JSON.parse(titleLine[1]); } catch (_) { title.value = titleLine[1].replace(/^['"]|['"]$/g, ''); }
      }
      body.value = raw.slice(match[0].length).trim();
      if (mode === 'photo') {
        existingImages = [...body.value.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(item => item[1]);
        body.value = body.value.replace(/!\[[^\]]*\]\([^)]+\)/g, '').trim();
        showPhotos();
      }
    }
    const draft = await readDraft();
    if (draft) {
      title.value = draft.title || '';
      body.value = draft.body || '';
      existingImages = draft.existingImages || existingImages;
      if (draft.photos && draft.photos.length) {
        const transfer = new DataTransfer();
        draft.photos.forEach(file => transfer.items.add(file));
        photos.files = transfer.files;
      }
      showPhotos();
      setStatus('已恢复上次保存在这台设备的草稿');
    } else setStatus(editing ? '已载入已发表内容，修改会先保存在本机' : '草稿会自动保存在这台设备');
  }).catch(error => setStatus(error.message || '浏览器无法保存草稿，请检查隐私或存储设置。'));

  title.addEventListener('input', saveDraft);
  body.addEventListener('input', saveDraft);
  photos.addEventListener('change', () => { showPhotos(); saveDraft(); });
  document.getElementById('paste-photo').addEventListener('click', async () => {
    try {
      const items = await navigator.clipboard.read();
      const images = [];
      for (const item of items) {
        const type = item.types.find(value => value.startsWith('image/'));
        if (type) images.push(new File([await item.getType(type)], `粘贴照片-${Date.now()}.png`, { type }));
      }
      if (!images.length) { setStatus('剪贴板里没有图片，请先复制照片。'); return; }
      const transfer = new DataTransfer();
      Array.from(photos.files).concat(images).forEach(file => transfer.items.add(file));
      photos.files = transfer.files;
      showPhotos();
      saveDraft();
    } catch (_) { setStatus('无法读取剪贴板。请点一下照片说明框后按 Ctrl+V。'); }
  });
  document.addEventListener('paste', event => {
    if (mode !== 'photo') return;
    const images = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith('image/'));
    if (!images.length) return;
    event.preventDefault();
    const transfer = new DataTransfer();
    Array.from(photos.files).concat(images).forEach(file => transfer.items.add(file));
    photos.files = transfer.files;
    showPhotos();
    saveDraft();
  });
  document.getElementById('clear-button').addEventListener('click', async () => {
    if (!confirm('删除这台设备上当前类型的草稿？')) return;
    if (database) await deleteDraft();
    title.value = '';
    body.value = '';
    photos.value = '';
    existingImages = [];
    showPhotos();
    setStatus('本机草稿已删除');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const heading = title.value.trim();
    const writing = body.value.trim();
    const selected = Array.from(photos.files);
    const key = token.value.trim();
    if (!heading || (mode === 'post' && !writing) || (mode === 'photo' && !selected.length && !existingImages.length)) {
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
      const excerpt = writing.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/<img[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 110) || '一组照片。';
      const content = mode === 'photo' ? [...existingImages.map((source, index) => `![照片 ${index + 1}](${source})`), ...imageLines, writing].filter(Boolean).join('\n\n') : [writing, ...imageLines].filter(Boolean).join('\n\n');
      const frontMatter = editing
        ? originalFrontMatter.replace(/^title:.*$/m, `title: ${JSON.stringify(heading)}`).replace(/^excerpt:.*$/m, `excerpt: ${JSON.stringify(excerpt)}`)
        : ['layout: post', `title: ${JSON.stringify(heading)}`, `date: ${date}`, `excerpt: ${JSON.stringify(excerpt)}`, 'tags:', `  - ${mode === 'photo' ? '摄影' : '随笔'}`].join('\n');
      const article = ['---', frontMatter, '---', '', content, ''].join('\n');
      setStatus('正在发布到博客…');
      await api(`/repos/${owner}/${repo}/contents/${editing ? editPath : `_posts/${date}-${mode}-${stamp}.md`}`, key, {
        method: 'PUT', body: JSON.stringify({ message: `${editing ? 'Edit' : 'Publish'} ${mode} post: ${heading}`, content: await toBase64(new Blob([article])), ...(editing ? { sha: editSha } : {}) })
      });
      while (saving) await new Promise(resolve => setTimeout(resolve, 30));
      if (database) await deleteDraft();
      title.value = '';
      body.value = '';
      photos.value = '';
      existingImages = [];
      showPhotos();
      setStatus(editing ? '修改已提交，博客通常会在几分钟内更新。' : '已提交发布，博客通常会在几分钟内更新。');
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
