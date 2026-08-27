(() => {
  'use strict';

  const cfg = window.BLOG_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const state = { posts: [], filtered: [], currentIndex: -1 };

  const els = {
    title: $('#site-title'),
    heroTitle: $('#hero-title'),
    heroSubtitle: $('#hero-subtitle'),
    status: $('#status'),
    list: $('#post-list'),
    article: $('#post-view'),
    about: $('#about-view'),
    tocPanel: $('#toc-panel'),
    toc: $('#toc'),
    search: $('#search-input'),
    theme: $('#theme-toggle'),
    backTop: $('#back-top'),
    toast: $('#toast')
  };

  document.title = cfg.title || 'My Blog';
  els.title.textContent = cfg.title || 'My Blog';
  els.heroTitle.textContent = cfg.heroTitle || '记录想法，分享知识。';
  els.heroSubtitle.textContent = cfg.subtitle || '';

  function escHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function repoInfo() {
    if (cfg.owner && cfg.repo) return cfg;
    const host = location.hostname;
    const pathParts = location.pathname.split('/').filter(Boolean);
    const inferredOwner = host.endsWith('.github.io') ? host.split('.')[0] : '';
    const inferredRepo = host.endsWith('.github.io') ? (pathParts[0] || `${inferredOwner}.github.io`) : '';
    return { ...cfg, owner: inferredOwner, repo: inferredRepo };
  }

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async function discoverPosts() {
    const r = repoInfo();
    if (!r.owner || !r.repo) throw new Error('未配置 GitHub 仓库信息，请编辑 assets/js/config.js。');

    const treeUrl = `https://api.github.com/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/git/trees/${encodeURIComponent(r.branch || 'main')}?recursive=1`;
    const data = await fetchJson(treeUrl);
    if (data.truncated) console.warn('GitHub tree result is truncated.');

    const prefix = String(r.postsDir || 'posts').replace(/^\/+|\/+$/g, '');
    return (data.tree || [])
      .filter(item => item.type === 'blob' && item.path.startsWith(prefix + '/') && /\.md$/i.test(item.path))
      .map(item => ({ path: item.path, sha: item.sha }));
  }

  async function readMarkdown(path) {
    const r = repoInfo();
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.github.com/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(r.branch || 'main')}`;
    const data = await fetchJson(url);
    if (!data.content) throw new Error(`无法读取文章：${path}`);
    const binary = atob(data.content.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }

  function parseFrontMatter(raw, path) {
    const result = { path, title: path.split('/').pop().replace(/\.md$/i, ''), date: '', description: '', tags: [], cover: '', raw: raw.replace(/^\uFEFF/, '') };
    const m = result.raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!m) return result;
    const fm = m[1];
    result.raw = result.raw.slice(m[0].length);
    for (const line of fm.split(/\r?\n/)) {
      const match = line.match(/^([\w-]+)\s*:\s*(.*)$/);
      if (!match) continue;
      const key = match[1]; let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1,-1);
      if (key === 'tags') {
        if (value.startsWith('[') && value.endsWith(']')) result.tags = value.slice(1,-1).split(',').map(v => v.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        else result.tags = value.split(',').map(v => v.trim()).filter(Boolean);
      } else if (key in result) result[key] = value;
    }
    return result;
  }

  function markdownToHtml(md) {
    marked.setOptions({ gfm: true, breaks: true });
    let html = marked.parse(md);
    html = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    return html;
  }

  function slugify(text, used) {
    let base = String(text).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
    let id = base, n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id); return id;
  }

  function enhanceArticle(container) {
    const used = new Set();
    container.querySelectorAll('.markdown-body h1,.markdown-body h2,.markdown-body h3').forEach(h => {
      h.id = slugify(h.textContent, used);
    });
    container.querySelectorAll('.markdown-body pre code').forEach(block => {
      try { hljs.highlightElement(block); } catch (_) {}
    });
  }

  function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return new Intl.DateTimeFormat('zh-CN', { year:'numeric', month:'long', day:'numeric' }).format(d);
  }

  function renderList(posts = state.filtered) {
    els.status.classList.add('hidden');
    if (!posts.length) {
      els.list.innerHTML = '<div class="status-card">没有找到匹配的文章。</div>';
      return;
    }
    els.list.innerHTML = posts.map(post => `
      <article class="post-card">
        <div class="post-meta"><span>${escHtml(formatDate(post.date))}</span><span>·</span><span>${escHtml(post.path)}</span></div>
        <h2><a href="#/post/${encodeURIComponent(post.path)}">${escHtml(post.title)}</a></h2>
        ${post.description ? `<p class="post-excerpt">${escHtml(post.description)}</p>` : ''}
        ${post.tags?.length ? `<div class="tags">${post.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      </article>
    `).join('');
  }

  function renderToc() {
    const headings = [...els.article.querySelectorAll('.markdown-body h1,.markdown-body h2,.markdown-body h3')];
    if (!headings.length) { els.tocPanel.classList.add('hidden'); return; }
    els.tocPanel.classList.remove('hidden');
    els.toc.innerHTML = headings.map(h => `<a class="level-${h.tagName.slice(1)}" href="#${h.id}">${escHtml(h.textContent)}</a>`).join('');
  }

  function renderArticle(post, index) {
    els.list.classList.add('hidden');
    els.status.classList.add('hidden');
    els.about.classList.add('hidden');
    els.article.classList.remove('hidden');
    const desc = post.description ? `<p class="article-description">${escHtml(post.description)}</p>` : '';
    const cover = post.cover ? `<img class="article-cover" src="${escHtml(resolveAssetPath(post.cover))}" alt="" />` : '';
    const prev = state.posts[index - 1];
    const next = state.posts[index + 1];
    els.article.innerHTML = `
      <header class="article-header">
        <p class="eyebrow">ARTICLE</p>
        <h1 class="article-title">${escHtml(post.title)}</h1>
        <div class="post-meta"><span>${escHtml(formatDate(post.date))}</span>${post.tags?.length ? `<span>·</span><span>${post.tags.map(t => escHtml(t)).join(' · ')}</span>` : ''}</div>
        ${desc}${cover}
      </header>
      <div class="markdown-body">${markdownToHtml(post.raw)}</div>
      <div class="article-nav">
        ${prev ? `<a href="#/post/${encodeURIComponent(prev.path)}">← 上一篇<br><strong>${escHtml(prev.title)}</strong></a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/post/${encodeURIComponent(next.path)}">下一篇 →<br><strong>${escHtml(next.title)}</strong></a>` : '<span></span>'}
      </div>
    `;
    enhanceArticle(els.article);
    renderToc();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function resolveAssetPath(p) {
    if (/^(https?:)?\/\//i.test(p) || p.startsWith('/')) return p;
    const r = repoInfo();
    return `https://raw.githubusercontent.com/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/${encodeURIComponent(r.branch || 'main')}/${p.split('/').map(encodeURIComponent).join('/')}`;
  }

  function showHome() {
    els.article.classList.add('hidden');
    els.about.classList.add('hidden');
    els.tocPanel.classList.add('hidden');
    els.list.classList.remove('hidden');
    els.search.focus({ preventScroll: true });
    renderList(state.filtered);
  }

  function showAbout() {
    els.article.classList.add('hidden');
    els.list.classList.add('hidden');
    els.tocPanel.classList.add('hidden');
    els.about.classList.remove('hidden');
  }

  function route() {
    const hash = decodeURIComponent(location.hash || '#/');
    if (hash === '#/' || hash === '#') return showHome();
    if (hash === '#/about') return showAbout();
    const match = hash.match(/^#\/post\/(.+)$/);
    if (match) {
      const path = match[1];
      const idx = state.posts.findIndex(p => p.path === path);
      if (idx >= 0) return renderArticle(state.posts[idx], idx);
    }
    location.hash = '#/';
  }

  async function init() {
    try {
      const files = await discoverPosts();
      const parsed = await Promise.all(files.map(async item => parseFrontMatter(await readMarkdown(item.path), item.path)));
      parsed.sort((a,b) => {
        const ta = new Date(a.date || 0).getTime(), tb = new Date(b.date || 0).getTime();
        const order = (cfg.sort || 'newest') === 'oldest' ? ta - tb : tb - ta;
        return order || String(a.path || '').localeCompare(String(b.path || ''));
      });
      state.posts = parsed;
      state.filtered = [...parsed];
      renderList();
      route();
    } catch (err) {
      console.error(err);
      els.status.classList.remove('hidden');
      els.status.innerHTML = `<strong>加载失败</strong><br><span>${escHtml(err.message)}</span><br><br><small>请确认仓库公开、分支名称正确，并检查 assets/js/config.js。</small>`;
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('blog-theme', theme);
    els.theme.textContent = theme === 'dark' ? '☀' : '☾';
    els.theme.title = theme === 'dark' ? '切换浅色模式' : '切换深色模式';
    const dark = document.querySelector('#hljs-dark'), light = document.querySelector('#hljs-light');
    if (dark && light) { dark.disabled = theme !== 'dark'; light.disabled = theme === 'dark'; }
  }

  const savedTheme = localStorage.getItem('blog-theme');
  setTheme(savedTheme || 'light');

  els.theme.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  els.search.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    state.filtered = !q ? [...state.posts] : state.posts.filter(p => [p.title,p.description,p.path,...(p.tags || [])].join(' ').toLowerCase().includes(q));
    if (!location.hash.startsWith('#/post/')) renderList(state.filtered);
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => els.backTop.classList.toggle('show', window.scrollY > 500), { passive: true });
  els.backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  init();
})();
