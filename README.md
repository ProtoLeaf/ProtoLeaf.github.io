# GitHub Pages Markdown Blog

这是一个纯 HTML + CSS + JavaScript 的静态博客，不需要 Node.js、构建工具或数据库。

## 1. 文件结构

```text
/
├── index.html
├── posts/
│   └── hello-world.md
└── assets/
    ├── css/
    │   └── style.css
    └── js/
        ├── config.js
        └── app.js
```

## 2. 配置仓库

打开 `assets/js/config.js`，填写：

```js
window.BLOG_CONFIG = {
  title: 'My Blog',
  heroTitle: '记录想法，分享知识。',
  subtitle: '这是一个直接从 GitHub 仓库读取 Markdown 文章的静态博客。',
  owner: '你的 GitHub 用户名',
  repo: '你的仓库名',
  branch: 'main',
  postsDir: 'posts',
  sort: 'newest',
  allowHtml: false
};
```

如果使用 `https://用户名.github.io/` 形式的仓库，也可以留空 `owner` 和 `repo`，程序会尝试从域名自动识别。

## 3. 写文章

在 `posts/` 新建任意 `.md` 文件，例如 `posts/my-first-post.md`：

```markdown
---
title: 我的第一篇文章
date: 2026-08-28
description: 文章摘要
tags: [随笔, 技术]
---

# 我的第一篇文章

正文……
```

推荐填写 Front Matter 中的 `title`、`date`、`description`、`tags`。没有 Front Matter 也可以读取，文章标题默认使用文件名。

## 4. GitHub Pages

将整个目录提交到你的 GitHub Pages 仓库根目录，然后在仓库的 Pages 设置中选择从目标分支部署即可。

## 注意

网站通过 GitHub API 读取公开仓库内容，因此你的文章仓库需要公开。GitHub API 未认证请求存在速率限制；个人博客正常访问通常足够。如果后续文章很多或访问量较大，可以改成生成 `posts/index.json` 的方式，进一步降低 API 请求次数。
