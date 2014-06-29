(function () {
    'use strict';

    function init() {
        setupCollapsibleArticles();
    }

    function setupCollapsibleArticles() {
        var $articles = $('.entry').addClass('is-collapsed');

        $articles.on('click', '.entry-title', function () {
            var $article = $(this).parent();
            $article.toggleClass('is-collapsed');
            $articles.not($article).addClass('is-collapsed');
        });
    }

    init();
}());
