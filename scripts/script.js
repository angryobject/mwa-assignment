/*global $, Lawnchair*/
(function () {
    'use strict';

    var store;
    var $newEntryForm;
    var $entriesContainer;

    function init() {
        $newEntryForm = $('#newEntryForm');
        $entriesContainer = $('#entries');

        createStore(function (_store) {
            store = _store;
            addListeners();
            showEntries();
        });
    }

    function createStore(cb) {
        new Lawnchair({adapter:'dom', name: 'diary'}, cb);
    }

    function addListeners() {
        $newEntryForm.on('submit', onNewEntrySubmit);
        $entriesContainer.on('click', '.entry-delete', onEntryDelete);
        $entriesContainer.on('click', '.entry-edit', onEntryEditStart);
        $entriesContainer.on('click', '.entry-editCancel', onEntryEditCancel);
        $entriesContainer.on('submit', '.entry-editForm', onEntryEditSave);
        $entriesContainer.on('click', '.entry-title', onEntryCollapse);
    }

    function onNewEntrySubmit(e) {
        var form = e.target;
        var title = form.elements.title.value;
        var content = form.elements.content.value;
        var entry;

        e.preventDefault();

        if (title === '' || content === '') {
            form.classList.add('is-error');
            return;
        }

        entry = {
            title: title,
            content: content,
            date:  Date.now()
        };

        form.classList.remove('is-error');
        form.reset();

        addEntryToStore(entry, showEntries);
    }

    function onEntryDelete(e) {
        var entryId = $(e.target).parents('.entry').data('id');
        removeEntryFromStore(entryId, showEntries);
    }

    function onEntryEditStart(e) {
        var $entry = $(e.target).parents('.entry');
        entryEditMode($entry);
    }

    function onEntryEditCancel(e) {
        var $entry = $(e.target).parents('.entry');
        entryNormalMode($entry);
    }

    function onEntryEditSave(e) {
        var entryId = $(e.target).parents('.entry').data('id');
        var formElems = e.target.elements;

        e.preventDefault();

        getEntryFromStore(entryId, function (entry) {
            if (entry) {
                entry.title = formElems.title.value || entry.title;
                entry.content = formElems.content.value || entry.content;
                addEntryToStore(entry, showEntries);
            }
        });
    }

    function onEntryCollapse(e) {
        var $entry = $(e.target).parent();
        collapseToggleEntry($entry);
    }

    function addEntryToStore(entry, cb) {
        if (!entry.key) {
            entry.key = Date.now();
        }

        store.save(entry, cb);
    }

    function getEntryFromStore(id, cb) {
        store.get(id, cb);
    }

    function removeEntryFromStore(id, cb) {
        store.remove(id, cb);
    }

    function showEntries() {
        store.all(function (data) {
            if (!data.length) {
                $entriesContainer.html('<div class="entries-empty">No entries found =(. Write something now!</div>');
            } else {
                var html = '';

                $.each(data.reverse(), function (i, entry) {
                    html += entryTemplate(entry);
                });

                $entriesContainer.html(html);
                collapseAllEntries();
            }
        });
    }

    function entryEditMode($entry) {
        var entryId = $entry.data('id');

        getEntryFromStore(entryId, function (entry) {
            if (entry) {
                var editHtml = entryEditTemplate(entry);
                $entry.append(editHtml);
                $entry.addClass('is-editing');
            } else {
                // do nothing
            }
        });
    }

    function entryNormalMode($entry) {
        $entry.removeClass('is-editing');
        $entry.children('.entry-contentEdit').remove();
    }

    function collapseToggleEntry($entry) {
        if ($entry.hasClass('is-editing')) { return; }

        $entry.toggleClass('is-collapsed');
        $entriesContainer.children().not($entry).addClass('is-collapsed');
    }

    function collapseAllEntries() {
        $entriesContainer.children('.entry').addClass('is-collapsed');
    }

    function entryTemplate(entry) {
        var html = '';

        html += '<article class="entry" data-id="' + entry.key + '">';
        html += '<h2 class="entry-title">' + entry.title + '</h2>';
        html += '<div class="entry-content">';
        html += '<p>';
        html += entry.content.replace(/\n/g, '<br/>');
        html += '</p>';
        html += '<time class="entry-date">Posted on: ' + new Date(entry.date).toLocaleString() + '</time>';
        html += '<div class="entry-actions">';
        html += '<span class="entry-actions-item entry-edit">edit</span>';
        html += '<span class="entry-actions-item entry-delete">delete</span>';
        html += '</div>';
        html += '</div>';
        html += '</article>';

        return html;
    }

    function entryEditTemplate(entry) {
        var html = '';

        html += '<div class="entry-contentEdit">';
        html += '<div class="entry-actions">';
        html += '<span class="entry-actions-item entry-editCancel">cancel</span>';
        html += '</div>';
        html += '<form class="entry-editForm">';
        html += '<label>Title:';
        html += '<input type="text" name="title" value="' + entry.title + '">';
        html += '</label>';
        html += '<label>Content:';
        html += '<textarea name="content">' + entry.content + '</textarea>';
        html += '</label>';
        html += '<input type="submit" value="Save">';
        html += '</form>';
        html += '</div>';

        return html;
    }

    init();
}());
