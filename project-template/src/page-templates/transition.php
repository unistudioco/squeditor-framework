<?php
// src/page-templates/transition.php

$transition = $site['page_transition'] ?? 'curve'; 
if ($transition !== 'disabled'): 
?>
  <div class="sq-page-transition transition-<?= htmlspecialchars($transition) ?>" aria-hidden="true">
    <?php if ($transition === 'curve'): ?>
    <svg class="shape-overlays" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sq-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--sq-page-transition-from)" />
          <stop offset="100%" stop-color="var(--sq-page-transition-to)" />
        </linearGradient>
        <linearGradient id="sq-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--sq-page-transition-to)" />
          <stop offset="100%" stop-color="var(--sq-page-transition-from)" />
        </linearGradient>
      </defs>
      <path class="shape-overlays__path" fill="url(#sq-grad-2)"></path>
      <path class="shape-overlays__path" fill="url(#sq-grad-1)"></path>
    </svg>
    <?php elseif ($transition === 'wave'): ?>
    <svg class="sq-transition-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sq-grad-wave" x1="0" y1="0" x2="99" y2="99" gradientUnits="userSpaceOnUse">
          <stop offset="0.2" stop-color="var(--sq-page-transition-from)" />
          <stop offset="0.7" stop-color="var(--sq-page-transition-to)" />
        </linearGradient>
      </defs>
      <path class="sq-transition-path" stroke="url(#sq-grad-wave)" fill="url(#sq-grad-wave)" stroke-width="0" vector-effect="non-scaling-stroke" d="M 0 0 V 100 Q 50 100 100 100 V 0 z"></path>
    </svg>
    <?php elseif ($transition === 'slide'): ?>
    <div class="sq-transition-slide w-full h-full bg-gradient-to-t from-transition-from via-transition-via to-transition-to"></div>
    <?php elseif ($transition === 'blinds'): ?>
    <div class="sq-transition-blinds flex w-full h-full">
      <div class="blind-strip flex-1 h-full bg-gradient-to-t from-transition-from via-transition-via to-transition-to"></div>
      <div class="blind-strip flex-1 h-full bg-gradient-to-t from-transition-from via-transition-via to-transition-to"></div>
      <div class="blind-strip flex-1 h-full bg-gradient-to-t from-transition-from via-transition-via to-transition-to"></div>
      <div class="blind-strip flex-1 h-full bg-gradient-to-t from-transition-from via-transition-via to-transition-to"></div>
      <div class="blind-strip flex-1 h-full bg-gradient-to-t from-transition-from via-transition-via to-transition-to"></div>
    </div>
    <?php endif; ?>
  </div>
<?php endif; ?>
