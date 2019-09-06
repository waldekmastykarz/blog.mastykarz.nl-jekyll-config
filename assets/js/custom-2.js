/**
 * Main JS file for theme behaviours
 */
(function ($) {
  "use strict";

  var $window = $(window),
    $body = $('body'),
    $menuToggle = $('#menu-toggle'),
    $toTop = $('#back-to-top'),
    mobile = false;

  $(document).ready(function () {

    // Detect mobile
    isMobile();

    // Responsive video embeds
    // $('.post-content').fitVids();

    // Menu on small screens
    $menuToggle.on('click', function (e) {
      $body.toggleClass('menu--opened');
      $menuToggle.blur();
      e.preventDefault();
    });
    $window.on('resize orientationchange', function () {
      isMobile();
      if (mobile === false) {
        $body.removeClass('menu--opened');
      }
    });

    // Back to top button
    if (mobile === true) {
      $toTop.initCanvas();
    }
    $toTop.on('click', function (e) {
      $('html, body').animate({ 'scrollTop': 0 });
      e.preventDefault();
    });
    $window.on('resize scroll', function () {
      if (mobile === true) {
        $toTop.initCanvas();
      } else {
        $toTop.hide();
        $toTop.find('canvas').remove();
      }
    });

    loadAds();
    initSearch();
  });

  function isMobile() {
    if ($menuToggle.is(':hidden')) {
      mobile = false;
    } else {
      mobile = true;
    }
  }

  function calcScrollPct() {
    var top = $window.scrollTop(),
      docH = $(document).height(),
      winH = $window.height(),
      pct = Math.ceil((top / (docH - winH)) * 10000) / 10000;
    return pct;
  }

  $.fn.initCanvas = function () {
    var _this = $(this),
      canvas = document.createElement('canvas');

    if (canvas.getContext) {
      var ctx = canvas.getContext('2d'),
        options = {
          lineWidth: 2,
          rotate: 0,
          size: _this.height(),
          colorProgress: '#d4a259',
          colorBackground: '#eee'
        },
        perc = calcScrollPct();
      _this.find('canvas').remove();
      if (perc < 0.1 && _this.css('opacity') !== 0) {
        _this.stop().fadeOut(300);
      } else if (perc >= 0.1) {
        _this.stop().fadeIn(600);
        _this.append(canvas);
        canvas.width = canvas.height = options.size;
        ctx.translate(options.size / 2, options.size / 2);
        ctx.rotate((-1 / 2 + options.rotate / 180) * Math.PI);
        drawCircle(options.colorProgress, options.colorBackground, options.lineWidth);
      }
    }

    function drawCircle(colorProgress, colorBackground, lineWidth) {
      ctx.clearRect(-(options.size) / 2, -(options.size) / 2, options.size, options.size);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      // Background circle
      ctx.beginPath();
      ctx.arc(0, 0, (options.size - lineWidth) / 2, 0, Math.PI * 2, false);
      ctx.strokeStyle = colorBackground;
      ctx.stroke();
      ctx.closePath();
      // Progress circle
      ctx.beginPath();
      ctx.arc(0, 0, (options.size - lineWidth) / 2, 0, (Math.PI * 2) * perc, false);
      ctx.strokeStyle = colorProgress;
      ctx.stroke();
      ctx.closePath();
    }
  };

  function loadAds() {
    if ($('.ad').length < 1) {
      // don't setup ads on non-posts
      return;
    }

    // add top add only if there are multiple paragraphs
    if ($('.post-content p').length > 4 && $('#ad0').length < 1) {
      $('.post-content p:first').after('<div id="ad0" class="ad"></div>');
    }

    $.get('https://mastykarzblog-api2.azurewebsites.net/api/ads').then(function (ads) {
      for (var i = 0; i < ads.length; i++) {
        var ad = ads[i];
        var $a = $(`<a href="${ad.url}" target="_blank" data-ad-name="${ad.name}" data-ad-org="${ad.org}" data-ad-url="${ad.url}" rel="nofollow"><img src="${ad.imageUrl}" /></a>`);
        $a.click(function () {
          var $this = $(this);
          sendTelemetry({
            org: $this.data('ad-org'),
            name: $this.data('ad-name'),
            url: $this.attr('href')
          }, 'click');
        });
        $('#ad' + i).html($a);
        sendTelemetry(ad, 'impression');
      }

      if (ads.length > 1) {
        $('#ad1').parents('.row').show();
      }
    });
  };

  function sendTelemetry(ad, event) {
    ga('send', 'event', ad.name, event, location.href);
  };

  function initSearch() {
    $('#contact-form').on('submit', function (e) {
      e.preventDefault();
      var searchQuery = $('#search').val();

      if (searchQuery.length > 3) {
        ga('send', 'pageview', '/search?s=' + encodeURIComponent(searchQuery));
        $('.post-feed').show();
        $('.js-search-results-label').html('Searching...');
        $('.js-search-results-data').html('');
        $.ajax({
          url: 'https://mastykarzblog-api2.azurewebsites.net/search?q=' + encodeURIComponent(searchQuery),
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }).done(function (data) {
          $('.js-search-results-label').html('Number of posts found: ' + data.value.length);

          if (data.value.length > 0) {
            for (var i = 0; i < data.value.length; i++) {
              var result = data.value[i];
              var date = formatDate(new Date(result.pubDate));
              $('.js-search-results-data').append('<article class="post"><header class="post-header"><div class="post-meta"><time class="published" datetime="' + date + '">' + date + '</time></div><h2 class="post-title"><a href="' + result.url + '" rel="bookmark">' + getTitleFromSearch(result) + '</a></h2></header><div class="post-content">' + getContentFromSearch(result) + '</div></article>');
            }
          }
        });
      }
    });
  }

  function getTitleFromSearch(result) {
    if (result['@search.highlights'] &&
      result['@search.highlights'].title) {
      return result['@search.highlights'].title[0];
    }
    else {
      return result.title;
    }
  }

  function getContentFromSearch(result) {
    if (result['@search.highlights'] &&
      result['@search.highlights'].content) {
      return result['@search.highlights'].content.slice(0, 2).join(' [...] ');
    }
    else {
      return result.content.substr(0, 160) + '...';
    }
  }

  function formatDate(date) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
  }

}(jQuery));
