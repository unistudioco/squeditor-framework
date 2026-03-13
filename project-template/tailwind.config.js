/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['selector', '.sq-theme-dark'],
    content: [
        './src/**/*.php',
        './src/**/*.html',
    ],
    theme: {
        extend: {
            screens: {
                'sm':  '459px',
                'md':  '768px',
                'lg':  '992px',
                'xl':  '1200px',
                '2xl': '1400px',
            },
            container: {
                center:  true,
                padding: '1rem', // 16px each side = 32px gutter (--bs-gutter-x)
            },
            colors: {
                primary: 'rgb(var(--sq-color-primary-rgb) / <alpha-value>)',
                secondary: 'rgb(var(--sq-color-secondary-rgb) / <alpha-value>)',
                accent: 'rgb(var(--sq-color-accent-rgb) / <alpha-value>)',
                body: 'rgb(var(--sq-color-body-bg-rgb) / <alpha-value>)',
                muted: 'rgb(var(--sq-color-muted-bg-rgb) / <alpha-value>)',
                'transition-from': 'var(--sq-page-transition-from)',
                'transition-via': 'var(--sq-page-transition-via)',
                'transition-to': 'var(--sq-page-transition-to)',
            },
            textColor: {
                heading: 'rgb(var(--sq-color-heading-text-rgb) / <alpha-value>)',
                body: 'rgb(var(--sq-color-body-text-rgb) / <alpha-value>)',
                muted: 'rgb(var(--sq-color-muted-text-rgb) / <alpha-value>)',
            },
            fontFamily: {
                sans: ['var(--sq-font-sans)'],
                serif: ['var(--sq-font-serif)'],
                mono: ['var(--sq-font-mono)'],
            },
            fontSize: {
                // Display sizes
                'display-1': ['8rem',    { lineHeight: '1',   letterSpacing: '-0.32rem' }],
                'display-2': ['6rem',    { lineHeight: '1',   letterSpacing: '-0.24rem' }],
                'display-3': ['5rem',    { lineHeight: '1',   letterSpacing: '-0.2rem'  }],
                'display-4': ['4.5rem',  { lineHeight: '1',   letterSpacing: '-0.18rem' }],
                'display-5': ['4rem',    { lineHeight: '1',   letterSpacing: '-0.16rem' }],
                'display-6': ['3.5rem',  { lineHeight: '1',   letterSpacing: '-0.14rem' }],

                // Heading sizes
                'h1': ['3rem',    { lineHeight: '1.1', letterSpacing: '-0.12rem'  }],
                'h2': ['2.5rem',  { lineHeight: '1.1', letterSpacing: '-0.08rem'  }],
                'h3': ['2rem',    { lineHeight: '1.1', letterSpacing: '-0.07rem'  }],
                'h4': ['1.5rem',  { lineHeight: '1.2', letterSpacing: '-0.06rem'  }],
                'h5': ['1.25rem', { lineHeight: '1.2', letterSpacing: '-0.05rem'  }],
                'h6': ['1rem',    { lineHeight: '1.2', letterSpacing: '-0.004rem' }],
            },
        },
    },
    plugins: [],
}