<?php
// src/components/swiper-slider.php

$options = $data['options'] ?? '{}';
$slides = $data['slides'] ?? [];
$id = $data['id'] ?? 'swiper-' . uniqid();
$classes = $data['class'] ?? '';
$showNav = $data['nav'] ?? true;
$showPagination = $data['pagination'] ?? true;
?>

<div class="sq-swiper-wrapper relative <?php echo escape($classes); ?>">
    <!-- Swiper Container with Data Attribute logic -->
    <div id="<?php echo escape($id); ?>" class="swiper" data-sq-swiper='<?php echo escape($options); ?>'>
        <!-- Slides -->
        <div class="swiper-wrapper">
            <?php foreach ($slides as $slide): ?>
                <div class="swiper-slide">
                    <?php echo $slide; ?>
                </div>
            <?php endforeach; ?>
        </div>
        
        <!-- Built-in Pagination -->
        <?php if ($showPagination): ?>
            <div class="swiper-pagination"></div>
        <?php endif; ?>
    </div>
    
    <!-- Built-in Navigation -->
    <?php if ($showNav): ?>
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
    <?php endif; ?>
</div>
