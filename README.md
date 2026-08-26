# Markdown Blog

一个适用于 GitHub Pages 的静态 Markdown 博客。

## 文件结构

```text
/
├── index.html
├── post.html
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── posts/
│   ├── hello-world.md
│   └── example.md
├── about.html
└── README.md
```

## 发布文章

1. 在 `posts/` 中创建 `.md` 文件。
2. 打开 `assets/js/app.js`。
3. 在 `POSTS` 数组中加入文章的文件名、标题、日期和简介。
4. 推送到 GitHub。
5. GitHub Pages 会自动更新。

## 注意

Markdown 使用浏览器端的 Marked.js 解析，因此不需要服务器端程序。
