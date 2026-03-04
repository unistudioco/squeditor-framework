/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['selector', '.sq-theme-dark'],
    content: [
        './src/**/*.php',
        './src/**/*.html',
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--sq-color-primary)',
                secondary: 'var(--sq-color-secondary)',
                accent: 'var(--sq-color-accent)',
                'transition-from': 'var(--sq-page-transition-from)',
                'transition-via': 'var(--sq-page-transition-via)',
                'transition-to': 'var(--sq-page-transition-to)',
            },
            fontFamily: {
                sans: ['var(--sq-font-sans)'],
                serif: ['var(--sq-font-serif)'],
                mono: ['var(--sq-font-mono)'],
            },
        },
    },
    plugins: [],
}
