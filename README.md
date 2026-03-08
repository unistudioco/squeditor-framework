**Squeditor Framework** is a high-performance, developer-first framework for building lightning-fast, static websites. It combines the power of **PHP-style templating** with the modern performance of **Tailwind CSS**, the interactivity of **UIKit 3**, and the speed of **Vite**.

We implement AI Agents skills to help you build your website easily in minutes. You can use AI Agents to generate well organized and clean code, components, sections, and pages and ship landing pages and saas and agency websites 10x faster.

### Showcase and Demo

[Main Demo](https://squeditor.com/showcase/main-demo/)  |  
[All Components](https://squeditor.com/showcase/all-components/)  |  
[Style Guide](https://squeditor.com/showcase/style-guide/)  |  
[GSAP Animations](https://squeditor.com/showcase/gsap-animations/)

[Full Documentation](https://docs.squeditor.com/framework/getting-started/introduction)

### Key Features

- Zero-Runtime PHP Templating
- Selective UIKit 3 Integration
- Token-Based Styling Architecture
- Built-in Light/Dark Mode
- Section-Based Workflow
- Automatic Style Guide

---

### Project Architecture

```bash
[workspace-root]/
├── php/                    # 🏗 CORE - PHP framework helpers
├── scripts/                # 🏗 CORE - Build and dev scripts
├── project-template/       # 🚀 STARTER - Blank project generator
└── showcase/               # 💎 DEMO - Full-featured example project
```

---

### Getting Started

#### 1. Scaffold a New Project
Squeditor includes a robust CLI scaffolding tool. It generates a completely clean, minimalist project instance fully pre-configured to utilize the advanced GSAP and UIKit engines without demo bloat.

To scaffold your new project, simply run the following command in your terminal:
```bash
npx @squeditor/squeditor-framework your-project-name
```
*(Replace `your-project-name` with your desired folder name).*

#### 2. Development
Navigate into your newly generated project folder, install its dependencies, and start the development server:
```bash
cd your-project-name
npm install
npm run dev
```

> [!CAUTION]
> **Use Port 3001 for Development**
> Vite will show a link to `http://127.0.0.1:5173/` in your terminal. **Do not use that link.**
> Instead, always visit the PHP Server address: **`http://127.0.0.1:3001`**. This is because Squeditor Framework uses PHP for template rendering, and Vite only serves the static assets.

#### 3. Build for Production
Generate the static `dist/` folder and a distributable ZIP archive:
```bash
npm run build
```

---

### Technology Stack

- **Dev Engine**: PHP 8.2+ (as a templating pre-processor)
- **CSS Architecture**: Tailwind CSS + SCSS (Layered Overrides)
- **JS Interactivity**: UIKit 3 (Selective Component Bundling)
- **Bundler**: Vite 5
- **Static Generation**: Custom Snapshot Engine
- **Deployment**: Integrated Netlify/Vercel support

---

### Contributing

We welcome contributions! Whether it's adding new section variants, improving the build pipeline, or refining the token system, feel free to open a PR.

---

### License

Squeditor Framework is released under the [MIT License](LICENSE).

---

Built with ❤️ by **Expert Developers** for the modern web.