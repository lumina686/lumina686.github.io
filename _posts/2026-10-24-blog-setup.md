---
layout: post
title: 这个博客是怎么搭起来的
date: 2026-10-24
excerpt: 没有 Node.js，没有数据库，只有 Markdown、Jekyll 和 GitHub Actions。
tags:
  - 技术
  - Jekyll
---

这个博客的技术栈很简单：Markdown 负责内容，Jekyll 负责把内容变成网页，GitHub Actions 负责构建，GitHub Pages 负责托管。

没有 Node.js，没有 npm，没有 React 或 Vue，也没有外部 CDN。整个站点就是几个文本文件，加上一个 CSS 样式表。

## 三个部分

- **Markdown**：每篇文章是 `_posts` 目录下的一个 `.md` 文件，开头写 Front Matter，后面写正文。
- **Jekyll**：读取配置、布局和文章，生成静态 HTML。它不需要数据库，也不需要你在本地安装 Ruby。
- **GitHub Actions + Pages**：每次推送到 `main`，Actions 自动构建，Pages 把生成的 `_site` 发布到公网。

```text
Markdown → Jekyll（GitHub Actions）→ HTML → GitHub Pages
```

## 目录结构

```text
.
├── _config.yml        # 站点标题、描述、时区、链接
├── _layouts/
│   ├── default.html   # 全站外壳：头部、导航、页脚
│   └── post.html      # 文章页布局
├── _posts/            # 所有 Markdown 文章
├── assets/
│   ├── style.css      # 全站样式
│   └── favicon.svg    # 站点图标
├── about.md           # 关于页
├── index.html         # 首页
└── .github/workflows/
    └── pages.yml      # 构建与部署流程
```

## 写一篇新文章

在 `_posts` 里新建一个文件，文件名使用 `YYYY-MM-DD-title.md`，开头保留这样的 Front Matter：

```yaml
---
layout: post
title: 文章标题
date: 2026-10-24
excerpt: 一句话摘要
tags:
  - 随笔
---
```

第二个 `---` 之后直接写正文。保存、提交、推送，剩下的交给 Actions。

## 为什么不用前端框架

个人博客的核心是内容，不是交互。静态站点已经足够快，也足够稳定。

没有 `node_modules`，就没有需要定期升级的依赖；没有客户端路由，就不必担心首屏加载和 SEO。样式只有一个 CSS 文件，想改配色，改几行变量就可以。

这套方案也有不适合的地方：如果要做评论、搜索、复杂的动态交互，它会显得吃力。但对我现在想做的事情来说，简单就是优势。

## 一点取舍

我希望这个博客能放很久。所以比起「功能齐全」，我更在意「几年后还能不能轻松维护」。

文本文件不会过期，Git 仓库可以随时迁移，静态 HTML 放在哪里都能打开。技术会变，但这些基础的东西，大概还能用一阵子。

如果你也想搭一个类似的博客，这个仓库的结构可以直接参考。真正重要的不是工具，而是你打算往里面写什么。
