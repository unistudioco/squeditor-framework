<?php
// src/template-parts/theme-switcher.php
// Only render if demo mode is enabled
if (!$site['demo_mode']) {
    return;
}

$active_theme  = $site['theme'] ?? 'modern';
$active_schema = $site['schema'] ?? 'light';

// We define the key brand/body colors for each theme manually for the switcher UI.
$available_themes = [
    'modern' => [
        'label' => 'Modern',
        'colors' => ['#107466', '#1c2020', '#e5fdc5', '#FFFFFF', '#707070']
    ],
    'two' => [
        'label' => 'Classic',
        'colors' => ['#272164', '#f5590b', '#f59e0b', '#f4f1eb', '#272164']
    ]
];

$typography_presets = [
    'modern' => [
        'label' => 'Modern',
        'heading_font' => 'TASA Orbiter',
        'heading_fw' => '600',
        'heading_lh' => '1',
        'heading_ls' => '-0.04em',
        'body_font' => 'TASA Orbiter',
        'body_lh' => '1.5',
        'body_ls' => 'normal',
    ],
    'classic' => [
        'label' => 'Classic',
        'heading_font' => 'Vidaloka',
        'heading_fw' => '400',
        'heading_lh' => '1',
        'heading_ls' => '-0.04em',
        'body_font' => 'Lora',
        'body_lh' => '1.75',
        'body_ls' => 'normal',
    ]
];

?>

<style>
.sq-theme-switcher {
    --sq-font-sans: "TASA Orbiter", "IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    --sq-font-heading: "TASA Orbiter", "IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    --sq-heading-line-height: 1.2 !important;
    --sq-heading-font-weight: 600 !important;
    --sq-heading-letter-spacing: normal !important;
    --sq-body-line-height: 1.5 !important;
    --sq-body-letter-spacing: normal !important;
    font-family: var(--sq-font-sans) !important;
}
</style>

<div class="sq-theme-switcher fixed bottom-6 right-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
    <button class="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:scale-105 transition-transform" type="button" data-uk-icon="settings" aria-label="Theme Settings"></button>
    <div data-uk-dropdown="mode: click; pos: top-right; offset: 12; animation: uk-animation-slide-bottom-small" class="uk-dropdown uk-dropdown-top-right !p-6 !bg-white dark:!bg-zinc-900 !rounded-2xl !shadow-xl !border min-w-[300px] overflow-hidden">
        <h4 class="text-h6 m-0 mb-4">Theme Settings</h4>
        
        <div class="flex flex-col gap-1">
            <div class="py-2 text-xs font-medium text-muted">Palette</div>
            <?php foreach ($available_themes as $key => $themeData): ?>
                <?php $is_active = ($active_theme === $key); ?>
                <button class="sq-js-theme-toggle w-full px-3 py-3 flex items-center justify-between rounded-xl text-sm transition-colors <?= $is_active ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white' ?>" data-theme="<?= htmlspecialchars($key) ?>" <?= $is_active ? 'disabled' : '' ?>>
                    <span class="flex items-center gap-3 mr-4">
                        <span class="flex items-center -space-x-1">
                            <?php foreach ($themeData['colors'] as $color): ?>
                                <span class="w-4 h-4 rounded-full border border-black/10 dark:border-white/10 shadow-sm" style="background-color: <?= $color ?>;"></span>
                            <?php endforeach; ?>
                        </span>
                        <span class="text-xs"><?= htmlspecialchars($themeData['label']) ?></span>
                    </span>
                    <?php if ($is_active): ?><span class="sq-icon-check text-primary"></span><?php endif; ?>
                </button>
            <?php endforeach; ?>
        </div>
        
        <div class="flex flex-col gap-1 mt-4">
            <div class="py-2 text-xs font-medium text-muted">Typography</div>
            <div class="grid grid-cols-2 gap-2">
                <?php foreach ($typography_presets as $pk => $pd): ?>
                    <button class="sq-js-typo-toggle p-2 rounded-xl text-xs font-medium bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100" data-preset="<?= $pk ?>"><?= $pd['label'] ?></button>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="flex flex-col gap-1 mt-4">
            <div class="py-2 text-xs font-medium text-muted">Schema</div>
            <div class="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <button class="sq-js-schema-toggle flex-1 py-2 rounded-lg text-sm font-medium transition-all" data-schema="light">Light</button>
                <button class="sq-js-schema-toggle flex-1 py-2 rounded-lg text-sm font-medium transition-all" data-schema="dark">Dark</button>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    
    // Schema
    const schemaToggles = document.querySelectorAll('.sq-js-schema-toggle');
    schemaToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const schema = btn.getAttribute('data-schema');
            localStorage.setItem('sq_schema', schema);
            body.classList.toggle('sq-theme-dark', schema === 'dark');
            body.classList.toggle('sq-theme-light', schema === 'light');
        });
    });

    // Theme (Demo only)
    document.querySelectorAll('.sq-js-theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            localStorage.setItem('sq_theme', theme);
            location.reload(); // Simplest way for demo
        });
    });

    // Typo
    const typoPresets = <?= json_encode($typography_presets) ?>;
    document.querySelectorAll('.sq-js-typo-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const pk = btn.getAttribute('data-preset');
            const p = typoPresets[pk];
            body.style.setProperty('--sq-font-heading', `"${p.heading_font}", sans-serif`);
            body.style.setProperty('--sq-font-sans', `"${p.body_font}", sans-serif`);
        });
    });
});
</script>
