# 句号的个人博客

> 写代码，也写字。记录技术、阅读与生活里值得留下的东西。

站点地址：<https://lumina686.github.io/>

这是一个用 Markdown + Jekyll 写的静态个人博客，部署在 GitHub Pages 上。没有 React、Vue、Node.js、npm、外部 CDN，也没有额外的构建工具。构建由 GitHub Actions 完成，本地不需要安装 Ruby 或 Jekyll。

界面是「液态玻璃」（Liquid Glass）风格：半透明玻璃面板、虹彩描边、指针扫过时的高光，以及一层缓慢流动的彩色场背景。默认深色，右上角的按钮可以切换到浅色，选择会记在浏览器里。

## 目录结构

```text
.
├── _config.yml            # 站点信息、作者信息、时区、链接
├── _layouts/
│   ├── default.html       # 全站外壳：流体背景、玻璃导航、页脚、SEO 标签
│   └── post.html          # 文章页布局（标题玻璃板 + 正文玻璃板 + 阅读进度）
├── _posts/                # 所有文章，Markdown 格式
├── assets/
│   ├── style.css          # 液态玻璃设计系统：材质、令牌、排版、响应式
│   ├── liquid.js          # 流体场背景、主题切换、指针高光、滚动进度
│   └── favicon.svg        # 站点图标（玻璃球）
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
- 文章：`_posts/*.md`

## 修改外观

视觉全部集中在 `assets/style.css` 顶部的令牌和 `assets/liquid.js` 里。

```css
:root {
  --bg: #050b10;          /* 页面底色 */
  --ink: #eef6f8;         /* 正文 */
  --muted: rgba(219, 233, 238, .72);
  --accent: #7cecd4;      /* 薄荷：眉题、链接、进度条 */
  --accent-2: #b79dff;    /* 淡紫：虹彩的另一端 */
  --glass-fill: rgba(8, 16, 23, .48);   /* 玻璃染色 */
  --blur: 18px;           /* 玻璃模糊半径 */
  --r-xl: 34px;           /* 大圆角 */
}

:root[data-theme="light"] {
  /* 浅色主题覆盖同一组变量 */
}
```

- **玻璃材质**：`.glass` 负责半透明底、`backdrop-filter` 模糊、内阴影和投影；`::before` 是那圈会随悬停缓慢旋转的虹彩边；`::after` 是指针跟随的高光。
- **流体场背景**：`liquid.js` 里的一段 WebGL 片元着色器，颜色在 `palettes.dark` / `palettes.light` 两组 RGB 里改。不支持 WebGL 时画布自动隐藏，回退到 `.field` 上的 CSS 渐变，页面仍然完整。
- **圆角、间距、字号**：`--r-*` 和 `clamp()` 一起工作，改一处即可。
- **动效**：都遵守 `prefers-reduced-motion`；开启后背景只画一帧，悬停高光、浮动球体和入场动画全部静止。

想换回一个更朴素的观感，把 `body` 上的 `.field` 容器和 `assets/liquid.js` 的引用删掉，再调低 `--glass-fill` 的不透明度即可，其余布局不受影响。

## 关于脚本

`assets/liquid.js` 约 13KB，没有依赖，只做五件事：

1. 画背景流体场（WebGL，失败则静默回退到 CSS）；
2. 切换并记住明暗主题；
3. 在玻璃上写入 `--mx` / `--my`，驱动指针高光；
4. 滚动时给导航加状态、更新文章页的阅读进度条；
5. 用 IntersectionObserver 做轻量的入场动画。

禁用 JavaScript 时，导航、排版、颜色、卡片链接都照常工作，只是没有背景动画和主题切换。

## 本地预览

仓库里的 `index.html` 是 Jekyll 模板源码，直接双击文件看不到最终页面。推荐直接推送到 GitHub，让 Actions 构建；如果需要在本地预览，可以自行安装 Ruby + Jekyll，但这不是本项目的必要步骤。

## 当前配置

- GitHub 仓库：`lumina686/lumina686.github.io`
- Pages 来源：GitHub Actions
- 部署分支：`main`
- 构建工作流：`.github/workflows/pages.yml`
- 默认主题：深色（右上角可切换浅色并记住选择）
