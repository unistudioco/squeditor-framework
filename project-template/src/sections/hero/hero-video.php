<?php
// src/sections/hero/hero-video.php
$heading = $heading ?? 'Watch Our Story';
$video_url = $video_url ?? 'https://www.w3schools.com/html/mov_bbb.mp4';
?>
<section class="relative h-screen flex items-center justify-center overflow-hidden">
  <video autoplay loop muted class="absolute z-0 w-full h-full object-cover">
    <source src="<?= htmlspecialchars($video_url) ?>" type="video/mp4">
  </video>
  <div class="z-10 relative text-center text-white p-8 md:p-16 sq-hero-overlay max-w-4xl mx-6">
    <h1 class="text-5xl lg:text-8xl font-black mb-8 tracking-tighter leading-tight">
      Elevate Your <span class="text-accent">SaaS Presence</span>
    </h1>
    <p class="text-lg md:text-xl text-teal-50/80 mb-10 max-w-2xl mx-auto leading-relaxed">
      A premium frontend framework built for modern developers who demand speed, flexibility, and stunning aesthetics out of the box.
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="#explore" class="btn btn-secondary btn-lg w-full sm:w-auto rounded-2xl hover:shadow-2xl transition-all hover:-translate-y-1">Start Designing</a>
      <a href="#" class="btn btn-ghost btn-lg w-full sm:w-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all">View Demo</a>
    </div>
  </div>
</section>
