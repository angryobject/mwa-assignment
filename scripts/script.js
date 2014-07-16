/*global $, Lawnchair*/
(function () {
    'use strict';

    // Storage

    var storeProto = {
        add: function add(entry, cb, ctx) {
            if (!entry.key) {
                entry.key = Date.now();
            }

            this._store.save(entry, cb.bind(ctx));
        },

        get: function get(id, cb, ctx) {
            this._store.get(id, cb.bind(ctx));
        },

        remove: function remove(id, cb, ctx) {
            this._store.remove(id, cb.bind(ctx));
        },

        all: function all(cb, ctx) {
            this._store.all(cb.bind(ctx));
        }
    };

    function createStore(cb) {
        new Lawnchair({adapter:'dom', name: 'diary'}, function (_store) {
            var store = Object.create(storeProto);
            store._store = _store;
            cb(store);
        });
    }

    // Diary Entries Controller

    var diaryEntriesProto = {
        init: function init() {
            this._addListeners();
        },

        render: function render() {
            this.store.all(function (data) {
                if (!data.length) {
                    this.$entriesContainer.html('<div class="entries-empty">No entries found =(. Write something now!</div>');
                } else {
                    var html = '';

                    $.each(data.reverse(), function (i, entry) {
                        html += entryTemplate(entry);
                    });

                    this.$entriesContainer.html(html);
                    this._collapseAllEntries();
                }
            }, this);
        },

        _addListeners: function _addListeners() {
            this.$entriesContainer.on('click', '.entry-delete', this._onDelete.bind(this));
            this.$entriesContainer.on('click', '.entry-edit', this._onEditStart.bind(this));
            this.$entriesContainer.on('click', '.entry-editCancel', this._onEditCancel.bind(this));
            this.$entriesContainer.on('submit', '.editEntryForm', this._onSave.bind(this));
            this.$entriesContainer.on('click', '.entry-title', this._onCollapseToggle.bind(this));
            this.$entriesContainer.on('click', '.entry-image-header', this._onMapCollapseToggle.bind(this));
        },

        _onDelete: function _onDelete(e) {
            var entryId = $(e.target).parents('.entry').data('id');
            this.store.remove(entryId, this.render, this);
        },

        _onEditStart: function _onEditStart(e) {
            var $entry = $(e.target).parents('.entry');
            this._entryEditMode($entry);
        },

        _onEditCancel: function _onEditCancel(e) {
            var $entry = $(e.target).parents('.entry');
            this._entryNormalMode($entry);
        },

        _onSave: function _onSave(e) {
            var entryId = $(e.target).parents('.entry').data('id');
            var formElems = e.target.elements;

            e.preventDefault();

            this.store.get(entryId, function (entry) {
                if (entry) {
                    entry.title = formElems.title.value || entry.title;
                    entry.content = formElems.content.value || entry.content;
                    this.store.add(entry, this.render, this);
                }
            }, this);
        },

        _onCollapseToggle: function _onCollapseToggle(e) {
            var $entry = $(e.target).parent();
            this._collapseToggleEntry($entry);
        },

        _onMapCollapseToggle: function _onMapCollapseToggle(e) {
            $(e.target).next().toggleClass('is-collapsed');
        },

        _collapseAllEntries: function _collapseAllEntries() {
            this.$entriesContainer.children('.entry').addClass('is-collapsed');
        },

        _collapseToggleEntry: function _collapseToggleEntry($entry) {
            if ($entry.hasClass('is-editing')) { return; }

            $entry.toggleClass('is-collapsed');

            this.$entriesContainer.children().not($entry).addClass('is-collapsed')
                .find('.entry-image-content').addClass('is-collapsed');
        },

        _entryEditMode: function _entryEditMode($entry) {
            var entryId = $entry.data('id');

            this.store.get(entryId, function (entry) {
                if (entry) {
                    var editHtml = entryEditTemplate(entry);
                    $entry.append(editHtml);
                    $entry.addClass('is-editing');
                }
            });
        },

        _entryNormalMode: function _entryNormalMode($entry) {
            $entry.removeClass('is-editing');
            $entry.children('.entry-contentEdit').remove();
        }
    };

    // Diary Form Controller

    var diaryFormProto = {
        init: function init() {
            this.$form = this.$formContainer.find('.newEntryForm');
            this.formElems = this.$form[0].elements;
            this._addListeners();
        },

        _addListeners: function _addListeners() {
            this.$form.on('click', 'input[type="submit"]', this._checkForm.bind(this));
            this.$form.on('submit', this._submitForm.bind(this));
            this.$formContainer.on('click', '.newEntry-formToggle', this._formToggle.bind(this));
        },

        _checkForm: function _checkForm() {
            var title = this.formElems.title.value;
            var content = this.formElems.content.value;

            this.$form.removeClass('is-error');

            if (title === '' || content === '') {
                // cause recalculate style
                this.$form.width();
                this.$form.addClass('is-error');
                if (navigator.vibrate) { navigator.vibrate(100); }
            }
        },

        _submitForm: function _submitForm(e) {
            e.preventDefault();

            if (this.$form.hasClass('is-error')) { return; }

            var self = this;
            var title = this.formElems.title.value;
            var content = this.formElems.content.value;
            var entry;
            var geoTimer;

            entry = {
                title: title,
                content: content,
                date:  Date.now()
            };

            if (navigator.geolocation) {
                geoTimer = setTimeout(onGeoFail, 20000);
                navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoFail, {timeout:10000});
                this.$form.addClass('is-submitting');
            } else {
                onResult();
            }

            function onGeoSuccess(pos) {
                if (geoTimer) {
                    clearTimeout(geoTimer);
                    entry.geo = {
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude
                    };
                    onResult();
                }
            }

            function onGeoFail() {
                clearTimeout(geoTimer);
                geoTimer = null;
                onResult();
            }

            function onResult() {
                self.$form[0].reset();
                self.$form.addClass('is-collapsed');
                self.$form.removeClass('is-submitting');

                self.onSubmit(entry);
            }
        },

        _formToggle: function _formToggle() {
            this.$form.toggleClass('is-collapsed');
        }
    };

    // Main

    function main() {
        var store;

        var diaryEntries = Object.create(diaryEntriesProto);
        diaryEntries.$entriesContainer = $('#entries');

        var diaryForm = Object.create(diaryFormProto);
        diaryForm.$formContainer = $('#newEntry');

        diaryForm.onSubmit = function (entry) {
            store.add(entry, diaryEntries.render, diaryEntries);
        };

        createStore(function (_store) {
            store = _store;
            diaryEntries.store = store;
            diaryEntries.init();
            diaryEntries.render();
            diaryForm.init();
        });
    }

    // Template functions. Better use a templating engine,
    // but it's too much overhead for this assignment.

    function entryTemplate(entry) {
        var html = '';

        html += '<article class="entry" data-id="' + entry.key + '">';
        html += '<h2 class="entry-title">' + entry.title + '</h2>';
        html += '<div class="entry-content">';
        html += '<p>';
        html += entry.content.replace(/\n/g, '<br/>');
        html += '</p>';
        html += '<footer>';
        html += '<time class="entry-date">Posted on: ' + new Date(entry.date).toLocaleString() + '</time>';

        if (entry.geo) {
            html += '<div class="entry-image">';
            html += '<span role="button" class="btn entry-image-header">Show map</span>';
            html += '<div class="entry-image-content is-collapsed">';
            html += '<img src="http://maps.googleapis.com/maps/api/staticmap?';
            html += 'center=' + entry.geo.lat + ',' + entry.geo.lon;
            html += '&markers=color:blue%7C' + entry.geo.lat + ',' + entry.geo.lon;
            html += '&zoom=13&size=260x200">';
            html += '<a target="_blank" href="https://www.google.com/maps/place/';
            html += entry.geo.lat + ',' + entry.geo.lon + '">';
            html += 'a bigger map</a>';
            html += '</div>';
            html += '</div>';
        }

        html += '<div class="entry-actions">';
        html += '<span role="button" class="entry-actions-item entry-edit">edit</span>';
        html += '<span role="button" class="entry-actions-item entry-delete">delete</span>';
        html += '</div>';
        html += '</footer>';
        html += '</div>';
        html += '</article>';

        return html;
    }

    function entryEditTemplate(entry) {
        var html = '';

        html += '<div class="entry-contentEdit">';
        html += '<div class="entry-actions">';
        html += '<span role="button" class="entry-actions-item entry-editCancel">cancel</span>';
        html += '</div>';
        html += '<form class="entryForm editEntryForm">';
        html += '<label><span>Title:</span>';
        html += '<input type="text" name="title" value="' + entry.title + '">';
        html += '</label>';
        html += '<label><span>Content:</span>';
        html += '<textarea name="content">' + entry.content + '</textarea>';
        html += '</label>';
        html += '<input class="btn" type="submit" value="Save">';
        html += '</form>';
        html += '</div>';

        return html;
    }

    // Polyfills

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Compatibility
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (oThis) {
            if (typeof this !== 'function') {
                // closest thing possible to the ECMAScript 5
                // internal IsCallable function
                throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function () {},
                fBound = function () {
                    return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                        aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();

            return fBound;
        };
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create#Polyfill
    if (typeof Object.create != 'function') {
        (function () {
            var F = function () {};
            Object.create = function (o) {
                if (arguments.length > 1) {
                  throw Error('Second argument not supported');
                }
                if (o === null) {
                  throw Error('Cannot set a null [[Prototype]]');
                }
                if (typeof o != 'object') {
                  throw TypeError('Argument must be an object');
                }
                F.prototype = o;
                return new F();
            };
        })();
    }

    main();

}());
