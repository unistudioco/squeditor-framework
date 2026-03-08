**Squeditor Framework** is a high-performance, developer-first framework for building lightning-fast, static websites. It combines the power of **PHP-style templating** with the modern performance of **Tailwind CSS**, the interactivity of **UIKit 3**, and the speed of **Vite**.

We implement [AI Agents skills](https://docs.squeditor.com/framework/agents) to help you build your website easily in minutes. You can use AI Agents to generate well organized and clean code, components, sections, and pages and ship landing pages and saas and agency websites 10x faster.

### Full Documentation
[Read Docs](https://docs.squeditor.com/framework/getting-started/introduction)

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
├── squeditor-framework/    # CORE - Framework engine (PHP helpers, scripts)
└── your-project-name/      # TEMPLATE - Generated project
```

---

### Getting Started

#### 1. Scaffold a New Project
Squeditor Framework includes a robust CLI scaffolding tool. It generates a completely clean, minimalist project instance fully pre-configured to utilize the advanced GSAP and UIKit engines without demo bloat.

To scaffold your new project and install `@squeditor-framework`, simply run the following command in your terminal:
```bash
npx @squeditor/squeditor-framework your-project-name
```

**Alternative: Manual Setup**

If you prefer to set up the project manually, you can clone the framework repository via:
```bash
git clone https://github.com/unistudioco/squeditor-framework.git
```

Then, scaffold a new project using this:
```bash
npm run scaffold your-project-name
```

*(Replace `your-project-name` with your desired project name).*

#### 2. Development
Navigate into your newly generated project folder, install its dependencies, and start the development server:
```bash
cd your-project-name
npm install
npm run dev
```

Visit the PHP Server address: **`http://127.0.0.1:3001`** or **`http://localhost:3001`**. This is because Squeditor Framework uses PHP for template rendering, and Vite only serves the static assets.

#### 3. Build for Production
This will generate the static `dist/` folder and a distributable ZIP archive:
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

### Changelog

Latest improvements, fixes and updates can be found here [Changelog](https://docs.squeditor.com/framework/changelog)

---

### Contributing

We welcome contributions! Please read this guide to understand our development process and how you can get involved [Contributing Guide](https://docs.squeditor.com/framework/contributing)

---

### License

Squeditor Framework is released under the [MIT License](https://docs.squeditor.com/framework/license).

---

Built with ❤️ by **Expert Developers** for the modern web.