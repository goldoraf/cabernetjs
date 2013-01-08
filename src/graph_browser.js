Cabernet.GraphBrowser = Ember.View.extend({
    data: [],
    hierarchy: [],
    displayed: Ember.Object.create(),
    classNames: ['graph-browser', 'container-fluid'],
    itemTemplates: null,
    itemFormTemplates: null,

    STRINGS: {
        'cabernet.graph_browser.add': 'Add',
        'cabernet.graph_browser.save': 'Save',
        'cabernet.graph_browser.delete': 'Delete'
    },

    collections: function() {
        return this.get('expandedHierarchy').map(function(coll) {
            return coll.get('name');
        });
    }.property('expandedHierarchy').cacheable(),

    expandedHierarchy: function() {
        return this.expandHierarchy();
    }.property('hierarchy').cacheable(),

    template: function() {
        return Ember.Handlebars.compile(
            '<div class="row">'
                + (this.get('expandedHierarchy').map(function(collection, index, collections) {

                    var c = "graph-browser-column ";
                    if (index == collections.get("length") -1) c += " column-last";
                    if (index == 0) c += " column-first";

                    return '<div class="span4 ' + c + " " + collection.get('name') +'"> \
                                <h2>'+ collection.get('label') +'</h2> \
                                {{#view Cabernet.GraphBrowserAddView collection="'+ collection.get('name') +'" classNames="bottom-form form-inline"}} \
                                    <form>'
                                        + collection.get('formTemplate') +
                                        '<button class="btn add">{{t "cabernet.graph_browser.add"}}</button> \
                                    </form> \
                                {{/view}} \
                                <ul class="unstyled items-list"> \
                                    {{#each item in displayed.'+ collection.get('name') +'}} \
                                        {{#view Cabernet.GraphBrowserItemView collection="'+ collection.get('name') +'" itemBinding="item"}} \
                                            {{#if editMode}} \
                                                {{#view Cabernet.GraphBrowserItemFormView collection="'+ collection.get('name') +'" itemBinding="item"}} \
                                                    <form>'
                                                        + collection.get('formTemplate') +
                                                        '<button class="btn save" {{action "saveItem"}}>{{t "cabernet.graph_browser.save"}}</button> \
                                                        <button class="btn remove" {{action "destroyItem"}}>{{t "cabernet.graph_browser.delete"}}</button> \
                                                        <span class="item-icon"></span> \
                                                    </form> \
                                                {{/view}} \
                                            {{else}}'
                                                    + collection.get('template') +
                                                '<span class="item-icon"></span> \
                                            {{/if}} \
                                        {{/view}} \
                                    {{/each}} \
                                </ul> \
                            </div>';
                }, this)).join('') +
            '</div>'
        );
    }.property(),

    init: function() {
        this._super();
        this.setI18nStrings();

        var firstLevelColl = this.get('collections').get('firstObject');
        this.get('displayed').set(firstLevelColl, this.get('data'));
    },

    expandHierarchy: function() {
        var collections = [];
        this.get('hierarchy').forEach(function(options, index) {
            if (typeof options === 'string') options = { model: options };
            Ember.assert("Hierarchy objects must have a 'model' property", options.hasOwnProperty('model'));
            
            options.name = options.name || this.getTypeName(options.model) + 's';
            options.label = options.label || Cabernet.I18n.translate(options.name);
            //if (index > 0) ... we set previous collection's relation property

            collections.pushObject(Cabernet.GraphBrowserCollection.create(options));
        }, this);

        Ember.warn("'itemTemplates' option is deprecated. Use 'template' option per hierarchy object instead.", this.get('itemTemplates') === null);
        if (this.get('itemTemplates') !== null) {
            var templates = this.get('itemTemplates');
            for (var model in templates) collections.findProperty('model', model).set('template', templates[model]);
        }
        Ember.warn("'itemFormTemplates' option is deprecated. Use 'formTemplate' option per hierarchy object instead.", this.get('itemFormTemplates') === null);
        if (this.get('itemFormTemplates') !== null) {
            var templates = this.get('itemFormTemplates');
            for (var model in templates) collections.findProperty('model', model).set('formTemplate', templates[model]);
        }

        return collections;
    },

    didInsertElement: function() {
        this.disableFormsFrom(this.get('collections').get('firstObject'));
    },

    unselectAll: function(collection) {
        this.$('div.'+collection+' li').removeClass('selected');
    },

    select: function(collection, item) {
        if (collection == this.get('collections').get('lastObject')) return;

        var childColl = this.nextCollection(collection);

        this.get('displayed').set(childColl, item.get(childColl));
        this.getAddFormNodes(childColl).attr('disabled', false);
        this.disableFormsFrom(childColl);
        this.emptyCollectionsFrom(childColl);
    },

    createItem: function(collection, data) {
        var modelType = this.getTypeForCollection(collection),
            newItem = Ember.getPath(modelType).create(data);

        return newItem;
    },

    // --- Add item --- //

    addItem: function(collection, item, queueName) {
        this.get('displayed').get(collection).pushObject(item);
        Cabernet.queueManager.add(queueName, this.addItemRollback, this)
        this.afterAddItem(collection, item, queueName);
    },
    afterAddItem: function(collection, item, queueName) {},

    addItemRollback: function(collection, item) {
        this.get('displayed').get(collection).removeObject(item);
    },

    // --- Save item --- //

    saveItem: function(collection, item, data) {
        var properties = _.keys(data);
        var oldVal = item.getProperties(properties);
        item.set("oldVal", oldVal);
        item.setProperties(data);
        var queue = Cabernet.queueManager.addQueue();
        Cabernet.queueManager.add(queue.name, this.saveItemRollback, this)
        this.afterSaveItem(collection, item, queue.name);
    },
    afterSaveItem: function(collection, item, data, queueName) {},

    saveItemRollback: function(collection, item, data) {
        item.setProperties(item.get("oldVal"));
    },

    // --- Destroy item --- //

    destroyItem: function(collection, item) {
        var queue = Cabernet.queueManager.addQueue();
        Cabernet.queueManager.add(queue.name, this.destroyItemRollback, this)
        var position = this.get("displayed").get(collection).indexOf(item);
        item.set("oldPosition", position);
        this.get("displayed").get(collection).removeObject(item);
        this.disableFormsFrom(collection);
        this.emptyCollectionsFrom(collection);
        this.afterDestroyItem(collection, item, queue.name);
    },
    afterDestroyItem: function(collection, item, queueName) {},

    destroyItemRollback: function(collection, item) {
        var position = item.get("oldPosition");
        var col = this.get('displayed').get(collection);
        if (position < col.get("length")) {
            this.get('displayed').get(collection).insertAt(position, item);
        } else  {
            this.get('displayed').get(collection).pushObject(item);
        }
        item.set("oldPosition", null);
    },

    getTypeForCollection: function(collection) {
        return this.get('expandedHierarchy').objectAt(this.get('collections').indexOf(collection)).get('model');
    },

    disableFormsFrom: function(collection) {
        var collIndex = this.get('collections').indexOf(collection),
            subChildColl;

        for (var i = collIndex + 1; i < this.get('collections').get('length'); i++) {
            subChildColl = this.get('collections').objectAt(i);
            this.getAddFormNodes(subChildColl).attr('disabled', true);
        }
    },

    emptyCollectionsFrom: function(collection) {
        if (collection === undefined) return;
        var collIndex = this.get('collections').indexOf(collection);
        for (var i = collIndex + 1; i < this.get('collections').get('length'); i++) {
            this.get('displayed').set(this.get('collections').objectAt(i), []);
        }
    },

    nextCollection: function(collection) {
        var collIndex = this.get('collections').indexOf(collection);
        return this.get('collections').objectAt(collIndex + 1);
    },

    getAddFormNodes: function(collection) {
        return this.$('.'+collection+' input, .'+collection+' button, .'+collection+' textarea, .'+collection+' select');
    },

    getTypeName: function(type) {
        var parts = type.toString().split(".");
        var name = parts[parts.length - 1];
        return name.underscore();
    },

    setI18nStrings: function() {
        var strings = this.get('STRINGS');
        for (var k in strings) {
            Cabernet.I18n.addMessage(k, strings[k]);
        }
    }
});

Cabernet.GraphBrowserCollection = Ember.Object.extend({
    name: null,
    label: null,
    model: null,
    template: '{{item.name}}',
    formTemplate: '<input type="text" name="name" value="" />'
});

Cabernet.GraphBrowserAddView = Ember.View.extend({
    collection: null,
    formData: null,

    didInsertElement: function() {
       // this.$(":input:visible:first").focus();
    },

    submit: function(e) {
        e.preventDefault();
        this.addItem(e);
    },

    addItem: function(e) {
        var formData = extractDataFromForm(this);
        if(formData.isEmpty) return;

        var parentView = this.get('parentView');
        var collection = this.get('collection');
        var item = parentView.createItem(collection, formData.data);

        this.$(':input').val(function(index, value) {
            return '';
        });


        this.set("formData", formData.data);
        var queue = Cabernet.queueManager.addQueue();
        Cabernet.queueManager.add(queue.name, this.addItemRollback, this);
        parentView.addItem(
            collection,
            item,
            queue.name
        );
    },

    addItemRollback: function() {
        var formData = this.get("formData");
        this.$(':input').val(function(index, value) {
            return formData[index];
        });
    }
});

Cabernet.GraphBrowserItemView = Ember.View.extend({
    editMode: false,
    tagName: 'li',
    collection: null,
    item: null,

    click: function(e) {
        this.get('parentView').unselectAll(this.get('collection'));
        this.$().addClass('selected');
        this.get('parentView').select(this.get('collection'), this.get('item'));
    },

    doubleClick: function(e) {
        this.set('editMode', true);
    }
});

Cabernet.GraphBrowserItemFormView = Ember.View.extend({
    collection: null,
    item: null,

    didInsertElement: function() {
        this.populateForm();
        var parentView = this.get("parentView");
        this.$("form").on("clickoutside", function(e) {
            parentView.set("editMode", false);
        });
        this.$(":input:visible:first").focus();
    },

    willDestroyElement: function() {
        this.$("form").unbind("clickoutside");
    },

    submit: function(e) {
        this.saveItem(e);
        return false;
    },

    keyPress: function(e) {
        if (e.keyCode == 27) {
            this.get("parentView").set("editMode", false);
        }
    },

    saveItem: function(e) {
        e.preventDefault();
        var formData = extractDataFromForm(this);

        if(!formData.isEmpty) {
            this.get('parentView').get('parentView').saveItem(this.get('collection'), this.get('item'), formData.data);
        }
        this.get('parentView').set('editMode', false);
    },

    destroyItem: function() {
        this.get('parentView').get('parentView').destroyItem(this.get('collection'), this.get('item'));
    },

    populateForm: function() {
        var val, data = this.getItemData();
        this.$(':input').val(function(index, value) {
            if (data.hasOwnProperty(this.name)) {
                return data[this.name];
            }
            return;
        });
    },

    getItemData: function() {
        var v, item = this.get('item'), ret = [];
        for (var key in item) {
            if (item.hasOwnProperty(key)) {
                v = this[key];
                if (v === 'toString') {
                    continue;
                } // ignore useless items
                if (Ember.typeOf(v) === 'function') {
                    continue;
                } // special IE
                if (key.match(new RegExp('__ember', 'i'))) {
                    continue;
                }
                ret.push(key);
            }
        }
        return item.getProperties(ret);
    }
});

var extractDataFromForm = function(form) {
    var data = {};
    var isEmpty = true;
    form.$(':input').serializeArray().forEach(function(item) {
        data[item.name] = $.trim(item.value);
        if(data[item.name] != '') {
            isEmpty = false;
        }
    });
    return {
        "isEmpty": isEmpty,
        "data": data
    };
}