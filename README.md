# 句号的个人博客

> 写代码，也写字。记录技术、阅读与生活里值得留下的东西。

站点地址：<https://lumina686.github.io/>

这是一个用 Markdown + Jekyll 写的静态个人博客，部署在 GitHub Pages 上。没有 React、Vue、Node.js、npm、外部 CDN，也没有额外的构建工具。构建由 GitHub Actions 完成，本地不需要安装 Ruby 或 Jekyll。

## 目录结构

```text
.
├── _config.yml            # 站点信息、作者信息、时区、链接
├── _layouts/
│   ├── default.html       # 全站外壳：头部、导航、页脚、SEO 标签
│   └── post.html          # 文章页布局
├── _posts/                # 所有文章，Markdown 格式
├── assets/
│   ├── style.css          # 全站样式与配色变量
│   └── favicon.svg        # 站点图标
├── about.md               # 关于页
├── index.html             # 首页
├── .github/workflows/
│   └── pages.yml          # GitHub Actions 构建与部署
└── README.md
```

## 写一篇新文章

在 `_posts/` 中新建 `YYYY-MM-DD-title.md`，开头写：

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

第二个 `---` 之后直接写 Markdown 正文。首页会自动按日期倒序列出最近 6 篇文章。

## 发布流程

```bash
git add -A
git diff --cached
git commit -m "docs: add a new post"
git push origin main
```

推送到 `main` 后，GitHub Actions 会自动构建 Jekyll 站点，并部署到 GitHub Pages。不需要在本地生成 `_site`，也不需要提交 `_site`。

## 修改站点信息

- 名字、简介、邮箱、GitHub 用户名、网址：`_config.yml`
- 首页文案、项目卡片：`index.html`
- 关于页：`about.md`
- 配色、字体、间距：`assets/style.css` 顶部的 `:root` 变量
- 文章：`_posts/*.md`

## 本地预览

仓库里的 `index.html` 是 Jekyll 模板源码，直接双击文件看不到最终页面。推荐直接推送到 GitHub，让 Actions 构建；如果需要在本地预览，可以自行安装 Ruby + Jekyll，但这不是本项目的必要步骤。

## 当前配置

- GitHub 仓库：`lumina686/lumina686.github.io`
- Pages 来源：GitHub Actions
- 部署分支：`main`
- 构建工作流：`.github/workflows/pages.yml`
