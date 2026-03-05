// showcase/squeditor.config.js
module.exports = {
    framework: '../squeditor-framework',
    name: '../new-project-name',
    version: '1.0.0',
    themes: {
        'two': {
            label: 'Two Theme',
            bodyClass: 'theme-two',
            scss: 'src/assets/scss/themes/_two.scss',
            pages: [],
            distSubfolder: '',
        }
    },
    components: [
        'sticky',
        'utility',
        'grid',
        'nav',
        'navbar',
        'icon',
        'slidenav',
        'modal',
        'close',
        'accordion',
        'tabs',
        'switcher',
        'offcanvas',
        'drop',
        'dropbar',
        'dropnav',
        'dropdown',
        'tooltip',
        'notification',
        'pagination',
        'dotnav',
        'slideshow',
        'slider',
        'lightbox',
        'animation',
        'visibility',
        'width',
        'height',
        'position',
        'cover',
        'parallax',
        'scrollspy',
        'transition',
        'spinner',
        'inverse',
        'svg',
        'video',
        'iframe',
    ],
    gsap: {
        plugins: ['ScrollTrigger', 'SplitText', 'Flip', 'Observer'],
        initScript: 'src/assets/js/gsap-init.js',
        advancedScript: 'src/assets/js/gsap-advanced.js',
    },
    slider: {
        library: 'splide', // 'swiper', 'splide', or false
    },
    output: {
        css: 'src/assets/css',
        js: 'src/assets/js',
    },
    devServer: { port: 3001, root: 'src' },
    snapshot: {
        baseUrl: 'http://127.0.0.1:3001',
        pages: ['/', '/404.php'],
        outputDir: 'dist',
        rewriteExtension: true,
    },
    media: {
        optimize: {
            enabled: true,
            imageQuality: 80,
            videoQuality: 28, // CRF (Lower is better, 23-28 is standard)
            include: ['**/*.{jpg,jpeg,png,webp,gif,mp4,webm}'],
            exclude: []
        },
        blur: {
            enabled: true,
            amount: 20,
            include: ['**/*.{jpg,jpeg,png,webp}', '**/*.{mp4,webm}'],
            exclude: ['**/logos/**', '**/icons/**', '**/placeholder.png']
        }
    },
    dist: {
        zipName: '../new-project-name.zip',
        previewPlatform: 'netlify',
    },
};
