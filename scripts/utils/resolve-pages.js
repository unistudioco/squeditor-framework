const fs = require('fs');
const path = require('path');

module.exports = function resolvePages(pagesConfig, projectRoot) {
    if (!pagesConfig || !Array.isArray(pagesConfig)) return [];
    
    // Check if any element has a glob (* or !)
    const hasGlob = pagesConfig.some(p => p.includes('*') || p.startsWith('!'));
    
    if (hasGlob) {
        let micromatch;
        try {
            micromatch = require(path.join(projectRoot, 'node_modules/micromatch'));
        } catch (e) {
            console.warn('[Squeditor] micromatch not found. Please run npm install.');
            return [];
        }

        const srcDir = path.join(projectRoot, 'src');
        if (!fs.existsSync(srcDir)) return [];
        
        // Exclude known non-page PHP files that should never be snapshotted
        const NON_PAGE_FILES = ['init.php'];
        const allFiles = fs.readdirSync(srcDir)
            .filter(f => f.endsWith('.php') && !NON_PAGE_FILES.includes(f));
        
        // Micromatch expects naked filenames logically. 
        // We ensure config patterns like '/' become 'index.php' for matching, 
        // and remove leading slashes so they match naked filenames natively.
        const normalizedConfig = pagesConfig.map(p => {
            if (p === '/') return 'index.php';
            if (p.startsWith('/')) return p.slice(1);
            return p;
        });
        
        const matched = micromatch(allFiles, normalizedConfig);
        
        // Convert back to URL-style paths that the rest of the application expects
        return matched.map(f => f === 'index.php' ? '/' : `/${f}`);
    } else {
        // Direct explicit list (legacy map support)
        return pagesConfig.map(p => {
            if (p === '/') return '/';
            return p.startsWith('/') ? p : `/${p}`;
        });
    }
};
