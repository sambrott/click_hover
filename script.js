/**
 * Single-page Bauhaus grid: jQuery demos on shape stacks.
 */
$(function () {
  var $body = $('body');

  /* —— Home: full viewport grid —— */
  if ($body.hasClass('home')) {
    var spawnPalette = ['#204ecf', '#f2c409', '#e85d04'];
    var allowHoverAccent = !window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches;

    var $stage = $('.bauhaus-stage');

    var hoverIdleRevertMs = 450;

    function ensureHoverDupLayer($stack) {
      if (!allowHoverAccent) return;
      if (!$stack.length) return;
      if ($stack.children('.geo-mosaic-inner.geo-layer-hover').length) return;
      var $idle = $stack.children('.geo-mosaic-inner').first();
      if (!$idle.length) return;
      $idle.addClass('geo-layer-idle');
      var $hover = $idle.clone();
      $hover.removeClass('geo-layer-idle').addClass('geo-layer-hover');
      $stack.append($hover);
    }

    $stage.find('.geo-stack').each(function () {
      ensureHoverDupLayer($(this));
    });

    var mosaicPatternNodes = $stage
      .children('.geo-cell')
      .map(function () {
        return this.cloneNode(true);
      })
      .get();

    function debounce(fn, ms) {
      var t;
      return function () {
        clearTimeout(t);
        var args = arguments;
        t = setTimeout(function () {
          fn.apply(null, args);
        }, ms);
      };
    }

    function accentAtCycleStep(step) {
      var s = String(step);
      if (s === '0') return spawnPalette[0];
      if (s === '1') return spawnPalette[1];
      if (s === '2') return spawnPalette[2];
      return null;
    }

    function randomHoverAccentExcluding(hex) {
      var pool = spawnPalette.slice();
      if (hex && pool.length > 1) {
        pool = $.grep(pool, function (c) {
          return (
            String(c).toLowerCase() !== String(hex).toLowerCase()
          );
        });
        if (!pool.length) pool = spawnPalette.slice();
      }
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function mosaicVisibleInner($stack) {
      if (!$stack.length) return $();
      if (
        allowHoverAccent &&
        $stack.hasClass('geo-stack--hue-hover-active')
      ) {
        var $hov = $stack.children('.geo-mosaic-inner.geo-layer-hover');
        if ($hov.length) return $hov.first();
      }
      var $idle = $stack.children('.geo-mosaic-inner').not('.geo-layer-hover').first();
      return $idle.length ? $idle : $stack.children('.geo-mosaic-inner').first();
    }

    function applyHoverAccent($stack, $cell, forceNewHue) {
      if (!allowHoverAccent) return;
      if ($cell.hasClass('geo-cell--triad-lock')) return;
      ensureHoverDupLayer($stack);

      var raw = $cell.attr('data-cycle-step');
      var parsed = raw === undefined || raw === '' ? NaN : parseInt(raw, 10);
      var cur =
        Number.isFinite(parsed) ? accentAtCycleStep(parsed) : null;
      var hue;
      if (
        !forceNewHue &&
        $stack.data('bhHoverHue') !== undefined
      ) {
        hue = $stack.data('bhHoverHue');
      } else {
        hue = randomHoverAccentExcluding(cur);
        $stack.data('bhHoverHue', hue);
      }
      var $hoverLayer = $stack.children('.geo-mosaic-inner.geo-layer-hover');
      if (!$hoverLayer.length) return;
      $stack.addClass('geo-stack--hue-hover-active');
      $hoverLayer.css('--cell-accent', hue);
    }

    function clearHoverAccent($stack) {
      if (!$stack.length) return;
      $stack.removeData('bhHoverHue');
      $stack.removeClass('geo-stack--hue-hover-active');
      $stack.children('.geo-mosaic-inner.geo-layer-hover').each(function () {
        if (this.style) this.style.removeProperty('--cell-accent');
      });
    }

    function disarmHoverIdle($stack) {
      var tid = $stack.data('bhHoverIdleTimer');
      if (tid) window.clearTimeout(tid);
      $stack.removeData('bhHoverIdleTimer');
    }

    function armHoverIdle($stack, $cell) {
      disarmHoverIdle($stack);
      var tid = window.setTimeout(function () {
        if (!$stack.length) return;
        $stack.removeData('bhHoverIdleTimer');
        if (!$stack.hasClass('geo-stack--hue-hover-active')) return;
        if (!$cell.is(':hover')) return;
        clearHoverAccent($stack);
      }, hoverIdleRevertMs);
      $stack.data('bhHoverIdleTimer', tid);
    }

    function pingHoverMotion($cell) {
      if (!allowHoverAccent) return;
      if ($cell.hasClass('geo-cell--triad-lock')) return;
      var $stack = $cell.find('.geo-stack').first();
      if (!$stack.length) return;
      var pickingFresh =
        !$stack.hasClass('geo-stack--hue-hover-active');
      applyHoverAccent($stack, $cell, pickingFresh);
      armHoverIdle($stack, $cell);
    }

    function syncCoverMosaic() {
      var $outer = $('.bauhaus-stage-outer').first();
      if (!$outer.length || !mosaicPatternNodes.length) return;

      var el = $outer.get(0);
      var w = el.clientWidth;
      var h = el.clientHeight;
      if (w < 24 || h < 24) return;

      var ratio = w / h;
      var rows = Math.max(6, Math.min(14, Math.round(10)));
      var cols = Math.round(rows * ratio);
      cols = Math.max(8, Math.min(22, cols));
      rows = Math.max(6, Math.min(15, Math.round(cols / ratio)));

      var cellPx = Math.max(w / cols, h / rows);

      $stage.empty();
      var total = cols * rows;
      var P = mosaicPatternNodes.length;
      for (var i = 0; i < total; i++) {
        var $node = $(mosaicPatternNodes[i % P].cloneNode(true));
        $node.attr('data-cell', 't' + i);
        if (i >= P) {
          $node.removeAttr('data-effect');
        }
        if (allowHoverAccent) {
          $node.find('.geo-stack').each(function () {
            ensureHoverDupLayer($(this));
          });
        }
        $stage.append($node);
      }

      $stage.css({
        gridTemplateColumns: 'repeat(' + cols + ', ' + cellPx + 'px)',
        gridTemplateRows: 'repeat(' + rows + ', ' + cellPx + 'px)'
      });
      $stage[0].style.setProperty('--cell', cellPx + 'px');
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      syncCoverMosaic();
      var syncDebounced = debounce(syncCoverMosaic, 140);
      var $observeOuter = $('.bauhaus-stage-outer').first();
      if (
        typeof ResizeObserver !== 'undefined' &&
        $observeOuter.length
      ) {
        var ro = new ResizeObserver(syncDebounced);
        ro.observe($observeOuter.get(0));
      }
      $(window).on('orientationchange resize', syncDebounced);
    }

    $stage.on('mouseenter', '.geo-cell', function () {
      pingHoverMotion($(this));
    });
    $stage.on('mousemove', '.geo-cell', function () {
      pingHoverMotion($(this));
    });
    $stage.on('mouseleave', '.geo-cell', function () {
      var $cell = $(this);
      var $stack = $cell.find('.geo-stack').first();
      disarmHoverIdle($stack);
      clearHoverAccent($stack);
    });

    $('.bauhaus-viewport').on('pointerleave pointercancel', function () {
      $stage.find('.geo-stack--hue-hover-active').each(function () {
        var $stack = $(this);
        disarmHoverIdle($stack);
        clearHoverAccent($stack);
      });
    });

    $(window).on('blur', function () {
      $stage.find('.geo-stack--hue-hover-active').each(function () {
        var $stack = $(this);
        disarmHoverIdle($stack);
        clearHoverAccent($stack);
      });
    });

    function toggleInvertLock($cell) {
      $cell.toggleClass('geo-cell--triad-lock');
    }

    /** Each click advances blue → yellow → orange → … on this tile only. */
    function bumpColorCycle($cell) {
      var raw = $cell.attr('data-cycle-step');
      var cur = raw === undefined || raw === '' ? -1 : parseInt(raw, 10);
      if (!Number.isFinite(cur)) cur = -1;
      cur = (cur + 1) % 3;
      $cell.attr('data-cycle-step', String(cur));
    }

    function spawnChip($stack) {
      function drop(lox, loy) {
        var c =
          spawnPalette[Math.floor(Math.random() * spawnPalette.length)];
        var left = lox + Math.random() * 34;
        var top = loy + Math.random() * 34;
        $('<div class="geo-mini-chip"></div>')
          .css({
            backgroundColor: c,
            left: left + '%',
            top: top + '%'
          })
          .appendTo($stack);
      }

      drop(5, 5);
      drop(48, 48);
    }

    function runRunner($stack) {
      var $cell = $stack.closest('.geo-cell');
      var hovered = $cell.is(':hover');
      var $inner = mosaicVisibleInner($stack);
      if (!$inner.length) return;
      $inner.removeClass('geo-stack--runner geo-stack--runner-hover');
      $inner[0].offsetWidth;
      $inner.addClass(hovered ? 'geo-stack--runner-hover' : 'geo-stack--runner');
    }

    /** Curve tiles: rotate inner mosaic only (+90° per click)—grid square stays fixed. */
    function bumpCurveRotation($cell) {
      var $inners = $cell.find('.geo-stack > .geo-mosaic-inner');
      if (!$inners.length) return;

      var cur = parseInt($inners.first().attr('data-curve-deg'), 10) || 0;
      cur += 90;
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches;
      var cssSpin = {
        transition: reduced
          ? 'none'
          : 'transform 0.5s cubic-bezier(0.34, 1.15, 0.52, 1)',
        transform: 'rotate(' + cur + 'deg)'
      };
      $inners.each(function () {
        $(this).attr('data-curve-deg', cur).css(cssSpin);
      });
    }

    $stage.on('click', '.geo-cell', function (e) {
      var $cell = $(this);
      var eff = $cell.data('effect');
      var $stack = $cell.find('.geo-stack');

      if (eff && e.shiftKey) {
        toggleInvertLock($cell);
        return;
      }

      bumpColorCycle($cell);

      if ($cell.attr('data-shape') === 'curve') {
        bumpCurveRotation($cell);
      }

      if (eff === 'lit') {
        $stack.toggleClass('geo-stack--lit');
        return;
      }
      if (eff === 'opacity') {
        $stack.stop(true).animate({ opacity: 0.38 }, 190).animate({ opacity: 1 }, 280);
        return;
      }
      if (eff === 'fade') {
        $stack.stop(true).fadeTo(160, 0.38).fadeTo(260, 1);
        return;
      }
      if (eff === 'runner') {
        runRunner($stack);
        return;
      }
      if (eff === 'spawn') {
        spawnChip($stack);
        return;
      }
      if (eff === 'wobble') {
        var $inner = mosaicVisibleInner($stack);
        if (!$inner.length) return;
        $inner.removeClass('geo-stack--wobble');
        $inner[0].offsetWidth;
        $inner.addClass('geo-stack--wobble');
        return;
      }
    });

    $stage.on('animationend', '.geo-stack, .geo-mosaic-inner', function (e) {
      var name = e.originalEvent && e.originalEvent.animationName;
      var $el = $(this);

      if (name === 'geo-square-pop' || name === 'geo-curve-flash') {
        $el.closest('.geo-cell').removeClass('geo-cell--clicked');
      }
      if (name === 'geo-runner-marquee' || name === 'geo-runner-marquee-hover') {
        $el.removeClass('geo-stack--runner geo-stack--runner-hover');
      }
      if (name === 'geo-wobble') {
        $el.removeClass('geo-stack--wobble');
      }
    });
  }

  /* —— Legacy sub-pages (optional exercises) —— */
  if ($body.hasClass('p1')) {
    $('#p1-tiles .p1-tile')
      .hover(
        function () {
          $('#p1-blob').toggleClass('shape-shift');
        },
        function () {
          $('#p1-blob').toggleClass('shape-shift');
        }
      )
      .on('click', function () {
        $(this).toggleClass('is-lit');
      });

    $('#p1-fade-btn').on('click', function () {
      $('.p1-fade-zone .slab').fadeToggle(400);
    });
  }

  if ($body.hasClass('p2')) {
    $('.p2-box').on('click', function () {
      $(this).animate({ opacity: 0.4 }, 200).animate({ opacity: 1 }, 300);
    });

    $('#p2-run').on('click', function () {
      var $el = $('#p2-runner-inner');
      $el.stop(true).css({ left: 0 });
      $el.animate({ left: '280px' }, 600).animate({ left: 0 }, 500);
    });
  }

  if ($body.hasClass('p3')) {
    var $doc = $(document);
    var $fill = $('#p3-meter-fill');

    function onScroll() {
      var scrollTop = $doc.scrollTop();
      var max = $doc.height() - $(window).height();
      var p = max > 0 ? Math.min(100, Math.round((scrollTop / max) * 100)) : 0;
      $fill.css('width', p + '%');
      $('#p3-scroll-readout').css('opacity', 0.35 + (p / 100) * 0.65);
    }

    $(window).on('scroll', onScroll);
    onScroll();
  }

  if ($body.hasClass('p4')) {
    var palette4 = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#9b5de5', '#00bbf9'];

    function randomChip() {
      var c = palette4[Math.floor(Math.random() * palette4.length)];
      return $('<div class="p4-chip"></div>').css('background-color', c);
    }

    $('#p4-add').on('click', function () {
      $('#p4-canvas').append(randomChip());
    });

    $('#p4-before').on('click', function () {
      var $canvas = $('#p4-canvas');
      var $first = $canvas.children('.p4-chip').first();
      var $chip = randomChip();
      if ($first.length) {
        $first.before($chip);
      } else {
        $canvas.append($chip);
      }
    });
  }
});
