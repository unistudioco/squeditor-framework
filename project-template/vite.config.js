import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: 'src',
    base: './',
    publicDir: false, // Handle static assets via dedicated script to maintain structure
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true, // Wipe dist/ to clean up the assets/assets mess
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/assets/js/main.js'),
                main_css: path.resolve(__dirname, 'src/assets/scss/main.scss'),
                tailwind: path.resolve(__dirname, 'src/assets/css/tailwind.css'),
                'squeditor-icons': path.resolve(__dirname, 'src/assets/css/squeditor-icons.css'),
                'fonts': path.resolve(__dirname, 'src/assets/css/fonts.css'),
            },
            output: {
                entryFileNames: 'assets/js/[name].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names ? assetInfo.names[0] : assetInfo.name;
                    if (name.endsWith('.css')) return 'assets/css/[name][extname]';

                    // Route fonts and other compiled assets
                    const isFont = name.match(/\.(woff2?|eot|ttf|otf)$/) || name.includes('squeditor-icons.svg');
                    const isImage = !isFont && name.match(/\.(png|jpe?g|gif|svg|webp)$/);

                    if (isFont) {
                        if (name.startsWith('squeditor-icons')) {
                            return 'assets/static/fonts/squeditor-icons/[name][extname]';
                        }
                        return 'assets/static/fonts/[name][extname]';
                    }

                    if (isImage) {
                        return 'assets/static/images/[name][extname]';
                    }

                    return 'assets/[name][extname]';
                },
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                silenceDeprecations: ['import', 'legacy-js-api'],
                // Global SCSS import for all files
                additionalData: `@import "/assets/scss/_config.scss"; @import "/assets/scss/_functions.scss"; @import "/assets/scss/_tokens.scss";`,
            },
        },
    },
    plugins: [{
        name: 'php-watch',
        handleHotUpdate({ file, server }) {
            if (file.endsWith('.php')) {
                // Force Vite to invalidate CSS modules so Tailwind generates new classes
                const tailwindModule = server.moduleGraph.getModuleById(path.resolve(__dirname, 'src/assets/css/tailwind.css'));
                if (tailwindModule) server.moduleGraph.invalidateModule(tailwindModule);
                
                const scssModule = server.moduleGraph.getModuleById(path.resolve(__dirname, 'src/assets/scss/main.scss'));
                if (scssModule) server.moduleGraph.invalidateModule(scssModule);

                server.ws.send({ type: 'full-reload' });
            }
        }
    }],
});
