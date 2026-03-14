<?php
// src/page-templates/offcanvas.php
?>

<!-- Mobile Offcanvas Nav -->
<div id="sq_mobile_offcanvas" data-uk-offcanvas="flip: true; overlay: true">
  <div class="uk-offcanvas-bar">
    <button class="uk-offcanvas-close" type="button" data-uk-close></button>
    <div class="mt-8">
        <?php get_template_part('nav', ['mobile' => true]); ?>
    </div>
  </div>
</div>
