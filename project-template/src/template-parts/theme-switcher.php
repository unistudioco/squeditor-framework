<?php
// Only render if demo mode is enabled
if (!$site['demo_mode']) {
    return;
}

$active_theme  = $site['theme'] ?? 'modern';
$active_schema = $site['schema'] ?? 'light';

// Check config for themes
// $config is not easily available here, so we get them from squeditor.config.js indirectly or hardcode for now
// we know there's a 'two' theme and 'default' theme.
// We define the key brand/body colors for each theme manually for the switcher UI.
$available_themes = [
    'modern' => [
        'label' => 'Modern',
        'colors' => ['#1c2020', '#1f8fc7', '#ff7640', '#FFFFFF', '#707070']
    ],
    'two' => [
        'label' => 'Classic',
        'colors' => ['#272164', '#f5590b', '#f59e0b', '#f4f1eb', '#272164']
    ],
    'saas' => [
        'label' => 'Tech',
        'colors' => ['#1f2937', '#fda088', '#fe7c72', '#ffffff', '#716969']
    ],
    'creative' => [
        'label' => 'Creative',
        'colors' => ['#111113', '#e6a3e7', '#3d3add', '#ffffff', '#030b17']
    ],
    'ai' => [
        'label' => 'AI',
        'colors' => ['#222224', '#3f2ed9', '#dbf15e', '#f9f9f9', '#89898e']
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
    ],
    'tech' => [
        'label' => 'Tech',
        'heading_font' => 'SuisseIntl',
        'heading_fw' => '700',
        'heading_lh' => '1',
        'heading_ls' => '-0.04em',
        'body_font' => 'SuisseIntl',
        'body_lh' => '1.6',
        'body_ls' => 'normal',
    ],
    'creative' => [
        'label' => 'Creative',
        'heading_font' => 'Bricolage Grotesque',
        'heading_fw' => '700',
        'heading_lh' => '1',
        'heading_ls' => '-0.06em',
        'body_font' => 'Mabry Pro',
        'body_lh' => '1.6',
        'body_ls' => 'normal',
    ]
];

?>

<!-- DEMO PURPOSE ONLY: Theme Switcher Styles -->
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
    line-height: 1.5 !important;
    letter-spacing: normal !important;
}

/* Typography Overrides with high specificity to beat TailwindfontSize defaults */
html body h1, html body h2, html body h3, html body h4, html body h5, html body h6,
html body .text-h1, html body .text-h2, html body .text-h3, html body .text-h4, html body .text-h5, html body .text-h6,
html body .text-display-1, html body .text-display-2, html body .text-display-3, html body .text-display-4, html body .text-display-5, html body .text-display-6 {
    font-family: var(--sq-font-heading) !important;
    font-weight: var(--sq-heading-font-weight) !important;
    line-height: var(--sq-heading-line-height) !important;
    letter-spacing: var(--sq-heading-letter-spacing) !important;
}
</style>
<!-- /DEMO -->

<!-- DEMO PURPOSE ONLY: Floating Theme Switcher -->
<div class="sq-theme-switcher fixed bottom-6 right-6 z-[1000] flex flex-col gap-2 pointer-events-auto" data-uk-margin>
    <button class="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:scale-105 transition-transform" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Theme Settings" data-sq-cursor-stick>
        <span class="sq-icon-palette"></span>
    </button>
    <div data-uk-dropdown="mode: click; pos: top-right; offset: 12; animation: uk-animation-slide-bottom-small" class="uk-dropdown uk-dropdown-top-right !p-6 !bg-white dark:!bg-zinc-900 !rounded-2xl !shadow-xl !border min-w-[300px] overflow-hidden">
        <div class="flex items-center justify-between pointer-events-none">
            <h4 class="text-h6 m-0">Theme Settings</h4>
        </div>
        <!-- Theme List -->
        <div class="flex flex-col gap-1 mt-2">
            <div class="py-2 text-xs font-medium text-muted">Palette</div>
            <?php foreach ($available_themes as $key => $themeData): ?>
                <?php 
                $is_active = ($active_theme === $key);
                $label = $themeData['label'];
                $colors = $themeData['colors'];
                ?>
                <button 
                    class="sq-js-theme-toggle w-full px-3 py-3 flex items-center justify-between rounded-xl text-sm  <?= $is_active ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white' ?>"
                    data-theme="<?= htmlspecialchars($key) ?>"
                    <?= $is_active ? 'disabled' : '' ?>
                >
                    <span class="flex items-center gap-3 mr-4">
                        <span class="flex items-center -space-x-1">
                            <?php foreach ($colors as $color): ?>
                                <span class="w-4 h-4 rounded-full border border-black/10 dark:border-white/10 shadow-sm" style="background-color: <?= htmlspecialchars($color) ?>;"></span>
                            <?php endforeach; ?>
                        </span>
                        <span class="text-xs"><?= htmlspecialchars($label) ?></span>
                    </span>
                    
                    <?php if ($is_active): ?>
                        <span class="sq-icon-check text-primary"></span>
                    <?php endif; ?>
                </button>
            <?php endforeach; ?>
        </div>
        
        <!-- Typography -->
        <div class="flex flex-col gap-1 mt-2">
            <div class="py-2 text-xs font-medium text-muted">Typography</div>
            
            <div class="grid grid-cols-2 gap-2">
                <?php foreach ($typography_presets as $presetKey => $presetData): ?>
                    <button 
                        class="sq-js-typo-toggle flex items-center justify-center p-2 rounded-xl text-xs font-medium transition-all border-none ring-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        data-preset="<?= htmlspecialchars($presetKey) ?>"
                    >
                        <?= htmlspecialchars($presetData['label']) ?>
                    </button>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Color Mode -->
        <div class="flex flex-col gap-1 mt-2">
            <div class="py-2 text-xs font-medium text-muted">Schema</div>
            <div class="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <button 
                    class="sq-js-schema-toggle flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium <?= ($active_schema === 'light') ? '!bg-transparent text-zinc-900 shadow-sm' : 'text-zinc-500' ?>"
                    data-schema="light"
                >
                    <span class="sq-icon-sun"></span>
                    Light
                </button>
                <button 
                    class="sq-js-schema-toggle flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium <?= ($active_schema === 'dark') ? '!bg-transparent text-white shadow-sm' : 'text-zinc-500' ?>"
                    data-schema="dark"
                >
                    <span class="sq-icon-moon"></span>
                    Dark
                </button>
            </div>
        </div>
        
    </div>
</div>
<!-- /DEMO -->

<!-- DEMO PURPOSE ONLY: Theme Switcher Logic -->
<script>
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Schema / Dark Mode Toggling
    const schemaToggles = document.querySelectorAll('.sq-js-schema-toggle');
    const body = document.body;
    
    // Helper to update the button visuals
    const updateToggleVisuals = (schema) => {
        schemaToggles.forEach(btn => {
            if (btn.getAttribute('data-schema') === schema) {
                if (schema === 'light') {
                    btn.className = 'sq-js-schema-toggle flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-white text-zinc-900 shadow-sm';
                } else {
                    btn.className = 'sq-js-schema-toggle flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white shadow-sm';
                }
            } else {
                if (btn.getAttribute('data-schema') === 'light') {
                    btn.className = 'sq-js-schema-toggle flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white font-medium';
                } else {
                    btn.className = 'sq-js-schema-toggle flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium';
                }
            }
        });
    };
    
    // Initialize visuals on load
    const currentSchema = localStorage.getItem('sq_schema') || '<?= htmlspecialchars($active_schema) ?>';
    updateToggleVisuals(currentSchema);
    
    schemaToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const newSchema = toggle.getAttribute('data-schema');
            if (!newSchema) return;
            
            // Update storage
            localStorage.setItem('sq_schema', newSchema);
            
            // Update DOM class
            if (newSchema === 'dark') {
                document.documentElement.classList.add('sq-theme-dark');
                document.documentElement.classList.remove('sq-theme-light');
                body.classList.add('sq-theme-dark');
                body.classList.remove('sq-theme-light');
            } else {
                document.documentElement.classList.remove('sq-theme-dark');
                document.documentElement.classList.add('sq-theme-light');
                body.classList.remove('sq-theme-dark');
                body.classList.add('sq-theme-light');
            }
            
            // Visual update
            updateToggleVisuals(newSchema);
        });
    });
    
    // 2. Theme Switching (JS-only for static demo)
    const themeToggles = document.querySelectorAll('.sq-js-theme-toggle');
    const themeData = <?= json_encode($available_themes) ?>;
    
    themeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            if (toggle.disabled) return;
            
            const newTheme = toggle.getAttribute('data-theme');
            if (!newTheme) return;

            // Update body class
            // Remove all possible theme classes
            Object.keys(themeData).forEach(key => {
                body.classList.remove('theme-' + key);
            });
            // Add new theme class
            body.classList.add('theme-' + newTheme);
            
            // Save to storage
            localStorage.setItem('sq_theme', newTheme);
            
            // Update button visual state
            themeToggles.forEach(btn => {
                const isMatch = btn.getAttribute('data-theme') === newTheme;
                btn.disabled = isMatch;
                
                // Refresh class list for visual feedback
                const baseClass = "sq-js-theme-toggle w-full px-3 py-3 flex items-center justify-between rounded-xl text-sm  ";
                const activeClass = "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium";
                const inactiveClass = "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white";
                
                btn.className = baseClass + (isMatch ? activeClass : inactiveClass);
                
                // Hide/show check icon
                const check = btn.querySelector('.sq-icon-check');
                if (check) check.style.display = isMatch ? 'block' : 'none';
            });
        });
    });

    // Initialize from storage if present
    const storedTheme = localStorage.getItem('sq_theme');
    if (storedTheme && themeData[storedTheme]) {
        const targetBtn = document.querySelector(`.sq-js-theme-toggle[data-theme="${storedTheme}"]`);
        if (targetBtn) targetBtn.click();
    }
    
    // 3. Typography Selection
    const typoSels = document.querySelectorAll('.sq-js-typo-toggle');
    const host = document.body;
    const loadedFonts = new Set();
    
    // Pass PHP presets to JS
    const typoPresets = <?= json_encode($typography_presets) ?>;
    
    // We don't try to fetch these from Google Fonts
    const localFonts = [
        'system-ui', 'Sunsive', 'Malinton', 'Mabry Pro', 'Plain', 'Paris', 'Sherika', 'Safari', 
        'PolySans', 'Circular Std', 'Costaline', 'Nebulica', 'Moldin', 
        'Arial', 'Helvetica', 'Times New Roman', 
        'Verdana', 'Serif', 'Sans Serif'
    ];
    
    // Helper to request Google Font if needed
    const loadGoogleFont = (fontFamily) => {
        if (localFonts.includes(fontFamily) || loadedFonts.has(fontFamily)) return;
        
        const safeFontName = fontFamily.replace(/ /g, '+');
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${safeFontName}:wght@300;400;500;600;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        loadedFonts.add(fontFamily);
    };
    
    // Apply preset
    const applyPreset = (presetKey) => {
        if (!typoPresets[presetKey]) return;
        
        const preset = typoPresets[presetKey];
        
        // Load fonts
        loadGoogleFont(preset.heading_font);
        loadGoogleFont(preset.body_font);
        
        // CSS specific values
        const formatFont = (f) => f === 'system-ui' ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : `"${f}", sans-serif`;
        
        host.style.setProperty('--sq-font-heading', formatFont(preset.heading_font));
        host.style.setProperty('--sq-font-sans', formatFont(preset.body_font));
        host.style.setProperty('--sq-heading-font-weight', preset.heading_fw);
        host.style.setProperty('--sq-heading-line-height', preset.heading_lh);
        host.style.setProperty('--sq-heading-letter-spacing', preset.heading_ls);
        host.style.setProperty('--sq-body-line-height', preset.body_lh);
        host.style.setProperty('--sq-body-letter-spacing', preset.body_ls);
        
        // Update button visual state
        typoSels.forEach(btn => {
            if (btn.getAttribute('data-preset') === presetKey) {
                btn.className = 'sq-js-typo-toggle flex items-center justify-center p-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-none ring-0';
            } else {
                btn.className = 'sq-js-typo-toggle flex items-center justify-center p-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border-none ring-0';
            }
        });
    };
    
    // Init from storage or PHP default
    const activePreset = localStorage.getItem('sq_typo_preset') || '<?= $site['typo_preset'] ?? 'modern' ?>';
    applyPreset(activePreset);
    
    // Listen for changes
    typoSels.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetKey = btn.getAttribute('data-preset');
            applyPreset(presetKey);
            localStorage.setItem('sq_typo_preset', presetKey);
        });
    });
    
});
</script>
<!-- /DEMO -->