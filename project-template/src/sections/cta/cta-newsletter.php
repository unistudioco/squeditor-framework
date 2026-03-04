<?php
// src/sections/cta/cta-newsletter.php
$heading = $heading ?? 'Subscribe to our newsletter';
$subheading = $subheading ?? 'Get the latest updates and news from our team.';
?>
<section class="py-20 bg-zinc-50 dark:bg-zinc-800 dark:bg-opacity-40">
  <div class="max-w-7xl mx-auto px-6 flex flex-col items-center justify-between gap-8">
    <div class="mb-8 md:mb-0 md:w-1/2">
      <h2 class="text-4xl font-bold text-center m-0"><?= htmlspecialchars($heading) ?></h2>
      <p class="text-center mt-4"><?= htmlspecialchars($subheading) ?></p>
    </div>
    <div class="md:w-1/2 w-full">
      <form class="flex w-full">
        <input type="email" placeholder="Your email address" class="form-input !rounded-r-none h-12">
        <button type="submit" class="btn btn-lg btn-secondary !rounded-l-none h-12 px-6">Subscribe</button>
      </form>
    </div>
  </div>
</section>
