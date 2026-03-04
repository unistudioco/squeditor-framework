<?php
// src/sections/hero/hero-split.php

$defaults = [
    'badge_icon'        => 'sq-icon-stars-02',
    'badge_label'       => 'True 24/7',
    'badge_sub'         => 'Care When It Counts',
    'heading'           => 'A calmer dental visit starts here.',
    'heading_highlight' => 'here.',
    'subheading'        => 'Modern dentistry designed around your comfort. From routine checkups to advanced care, we make dental visits simple, clear, and stress-free.',
    'cta_label'         => 'Contact Us',
    'cta_url'           => '/contact.html',
    'avatars'           => [
        'assets/static/images/common/avatars/01.png', 
        'assets/static/images/common/avatars/02.png', 
        'assets/static/images/common/avatars/03.png'
    ],
    'avatar_count'      => '15+',
    'avatar_label'      => 'Expert Dentists for you',
    'image_src'         => 'assets/static/images/showcase/hero-dental.png', // Will generate real image later
    'image_alt'         => 'Dental care procedure',
    'services'          => [
        ['label' => 'Teeth Cleaning', 'status' => 'active'],
        ['label' => 'Whitening',      'status' => 'active'],
        ['label' => 'Lost Filling',   'status' => 'pending'],
    ],
];

// Merge provided args with defaults
$args = array_merge($defaults, $args ?? []);

// Process heading highlight
$highlight_html = '<span class="text-sq-secondary">' . htmlspecialchars($args['heading_highlight']) . '</span>';
$processed_heading = str_replace(
    htmlspecialchars($args['heading_highlight']), 
    $highlight_html, 
    htmlspecialchars($args['heading'])
);
?>

<div class="sq-hero--split min-h-screen w-full relative overflow-hidden flex flex-col pt-8 pb-8 px-4 md:px-8">
    <div class="sq-hero--inner max-w-7xl mx-auto lg:px-6 flex items-center justify-between">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 lg:gap-24 flex-1 relative z-10">
          
          <!-- Left Column: Content -->
          <div class="flex flex-col justify-center max-w-xl py-8 md:py-12">
              
              <!-- Badge -->
              <div class="inline-flex items-center self-start bg-white dark:bg-opacity-5 rounded-full p-1 pr-4 shadow-sm border mb-8" data-gsap="from: {opacity: 0, y: -20}; duration: 0.8">
                  <span class="flex items-center justify-center w-8 h-8 rounded-full sq-bg-secondary font-bold mr-3">
                    <i class="sq-icon <?= htmlspecialchars($args['badge_icon']) ?>"></i>
                  </span>
                  <span class="text-sm font-semibold"><?= htmlspecialchars($args['badge_label']) ?></span>
                  <span class="w-px h-4 bg-zinc-200 mx-4"></span>
                  <span class="text-sm text-muted"><?= htmlspecialchars($args['badge_sub']) ?></span>
              </div>

              <!-- Heading -->
              <h2 class="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]" 
                  data-gsap="from: {opacity: 0, y: 60}; duration: 0.8; delay: 0.2">
                  <?= $processed_heading ?>
              </h2>

              <!-- Subheading -->
              <p class="text-lg md:text-xl text-muted mb-10 max-w-md leading-relaxed" 
                  data-gsap="from: {opacity: 0, y: 20}; duration: 0.8; delay: 0.4">
                  <?= htmlspecialchars($args['subheading']) ?>
              </p>

              <!-- CTA Button -->
              <div data-gsap="from: {opacity: 0, y: 16}; duration: 0.6; delay: 0.7" class="self-start mb-16">
                  <a href="<?= htmlspecialchars($args['cta_url']) ?>" class="btn btn-secondary min-h-[48px] !px-8 !py-4 !text-base !shadow-lg !shadow-sq-primary/30 flex items-center gap-2 transition-transform hover:scale-105">
                      <?= htmlspecialchars($args['cta_label']) ?>
                      <i class="sq-icon sq-icon-arrow-up-right text-lg leading-none mt-0.5"></i>
                  </a>
              </div>

              <!-- Social Proof -->
              <div class="flex items-center mt-auto" data-gsap="from: {opacity: 0, y: 16}; duration: 0.6; delay: 0.9">
                  <div class="flex -space-x-3 mr-4">
                      <?php foreach($args['avatars'] as $avatar): ?>
                        <div class="w-10 h-10 rounded-full border-[3px] overflow-hidden bg-zinc-100 border-white dark:border-zinc-900 shadow-sm">
                          <img class="w-full h-full object-cover" src="<?= htmlspecialchars($avatar) ?>" alt="Dentist Avatar">
                        </div>
                      <?php endforeach; ?>
                      <div class="w-10 h-10 rounded-full border-[3px] border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200">
                          <?= htmlspecialchars($args['avatar_count']) ?>
                      </div>
                  </div>
                  <span class="text-sm text-muted font-medium"><?= htmlspecialchars($args['avatar_label']) ?></span>
              </div>

          </div>

          <!-- Right Column: Image & Floating Cards -->
          <div class="relative h-[400px] md:h-[700px]">
              
              <!-- Image Wrapper -->
              <div class="h-full rounded-[2rem] overflow-hidden" data-gsap="from: {clipPath: 'inset(0 0 100% 0)'}; duration: 2; ease: expo.inOut;">
                  <img src="<?= htmlspecialchars($args['image_src']) ?>" alt="<?= htmlspecialchars($args['image_alt']) ?>" class="w-full h-full object-cover rounded-[2rem]">
              </div>

              <!-- Floating Services Container -->
              <div class="absolute bottom-4 md:bottom-12 right-4 md:right-12 flex flex-col gap-3 z-10 w-64" data-gsap="from: {opacity: 0, x: 30}; stagger: 0.15; delay: 1.3">
                  <?php foreach($args['services'] as $index => $service): ?>
                      <div class="bg-white/90 backdrop-blur-md rounded-full py-3 px-5 shadow-lg flex items-center justify-between border border-white/40">
                          
                          <div class="flex items-center gap-3">
                              <!-- Service Icon -->
                              <i class="sq-icon sq-icon-medical-cross text-xl text-zinc-400"></i>
                              
                              <span class="text-sm font-medium text-zinc-800"><?= htmlspecialchars($service['label']) ?></span>
                          </div>

                          <!-- Status Icon -->
                          <?php if($service['status'] === 'active'): ?>
                              <div class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <i class="sq-icon sq-icon-check text-white text-[10px] font-bold"></i>
                              </div>
                          <?php else: ?>
                              <div class="w-5 h-5 rounded-full border-2 border-zinc-200"></div>
                          <?php endif; ?>
                          
                      </div>
                  <?php endforeach; ?>
              </div>

          </div>

      </div>
    </div>
</div>
