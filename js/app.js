(() => {
  "use strict";

  const POSTS = [
    {
      file: "posts/hello-world.md",
      title: "Hello World",
      date: "2026-08-26",
      description: "这是我的第一篇博客文章，记录博客正式开始运行的时刻。"
    },
    {
      file: "posts/example.md",
      title: "Markdown 示例",
      date: "2026-08-26",
      description: "看看这个博客支持哪些常用的 Markdown 写作功能。"
    }
  ];

  // ---------- Theme ----------
  const savedTheme = localStorage.getItem("blog-theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (systemDark ? "dark" : "light"));

  document.querySelectorAll("#themeToggle").forEach(button => {
    button.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      setTheme(current === "dark" ? "light" : "dark");
    });
  });

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("blog-theme", theme);

    document.querySelectorAll("#themeToggle").forEach(button => {
      button.textContent = theme === "dark" ? "☀" : "☾";
      button.setAttribute(
        "aria-label",
        theme === "dark" ? "切换浅色模式" : "切换深色模式"
      );
    });
  }

  // ---------- Common ----------
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  // ---------- Home ----------
  const postList = document.querySelector("#postList");
  const searchInput = document.querySelector("#searchInput");
  const emptyState = document.querySelector("#emptyState");

  if (postList) {
    renderPosts(POSTS);

    searchInput?.addEventListener("input", () => {
      const keyword = searchInput.value.trim().toLowerCase();
      const filtered = POSTS.filter(post =>
        `${post.title} ${post.description} ${post.date}`
          .toLowerCase()
          .includes(keyword)
      );
      renderPosts(filtered);
    });
  }

  function renderPosts(posts) {
    postList.innerHTML = posts.map(post => `
      <a class="post-card" href="post.html?file=${encodeURIComponent(post.file)}">
        <div class="post-meta">${formatDate(post.date)}</div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.description)}</p>
        <span class="read-more">阅读文章 →</span>
      </a>
    `).join("");

    emptyState?.classList.toggle("hidden", posts.length !== 0);
  }

  function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  // ---------- Article ----------
  const article = document.querySelector("#markdownContent");

  if (article) {
    const params = new URLSearchParams(location.search);
    const file = params.get("file");
    const post = POSTS.find(item => item.file === file);

    if (!post) {
      article.innerHTML = "<p>文章不存在。</p>";
      return;
    }

    document.title = `${post.title} · 我的博客`;
    document.querySelector("#articleTitle").textContent = post.title;
    document.querySelector("#articleDate").textContent = formatDate(post.date);

    fetch(post.file)
      .then(response => {
        if (!response.ok) throw new Error("Markdown 文件读取失败");
        return response.text();
      })
      .then(markdown => {
        marked.setOptions({
          gfm: true,
          breaks: false
        });
        const html = marked.parse(markdown);
        article.innerHTML = window.DOMPurify
          ? DOMPurify.sanitize(html)
          : html;
      })
      .catch(error => {
        console.error(error);
        article.innerHTML = `
          <p>无法读取文章。</p>
          <p>如果你直接双击 HTML 文件打开网站，浏览器可能会阻止 fetch。
          请通过 GitHub Pages 或本地 HTTP 服务器访问。</p>
        `;
      });
  }
})();
