Cabernet.GraphBrowser = Ember.View.extend({
    data: [],
    hierarchy: [],
    displayed: Ember.Object.create(),
    classNames: ['graph-browser', 'container-fluid'],
    itemTemplates: {},
    itemFormTemplates: {},

    STRINGS: {
        'cabernet.graph_browser.add': 'Add',
        'cabernet.graph_browser.save': 'Save',
        'cabernet.graph_browser.delete': 'Delete'
    },

    collections: function() {
        return this.get('hierarchy').map(function(type) {
            return this.getTypeName(type) + 's';
        }, this);
    }.property('hierarchy').cacheable(),

    template: function() {
        return Ember.Handlebars.compile(
            '<div class="row">'
                + (this.get('collections').map(function(collection) {
                    return '<div class="span4 '+ collection +'"> \
                                <h2>'+ collection +'</h2> \
                                {{#view Cabernet.GraphBrowserAddView collection="'+ collection +'" classNames="bottom-form form-inline"}} \
                                    <form>'
                                    + this.getFormTemplateFor(collection) +
                                    '<button class="btn primary" {{action "addItem"}}>{{t "cabernet.graph_browser.add"}}</button> \
                                    </form> \
                                {{/view}} \
                                <ul class="unstyled items-list"> \
                                    {{#each item in displayed.'+ collection +'}} \
                                        {{#view Cabernet.GraphBrowserItemView collection="'+ collection +'" itemBinding="item"}} \
                                            {{#if editMode}} \
                                                {{#view Cabernet.GraphBrowserItemFormView collection="'+ collection +'" itemBinding="item"}}'
                                                    + this.getFormTemplateFor(collection) +
                                                    '<button class="btn primary" {{action "saveItem"}}>{{t "cabernet.graph_browser.save"}}</button> \
                                                    <button class="btn danger" {{action "destroyItem"}}>{{t "cabernet.graph_browser.delete"}}</button> \
                                                {{/view}} \
                                            {{else}}'
                                                + this.getTemplateFor(collection) +
                                            '{{/if}} \
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

    didInsertElement: function() {
        this.disableFormsFrom(this.get('collections').get('firstObject'));
    },

    getTemplateFor: function(collection) {
        var type = this.getTypeForCollection(collection);
        if (this.get('itemTemplates').hasOwnProperty(type)) return this.get('itemTemplates')[type];
        return '{{item.name}}';
    },

    getFormTemplateFor: function(collection) {
        var type = this.getTypeForCollection(collection);
        if (this.get('itemFormTemplates').hasOwnProperty(type)) return this.get('itemFormTemplates')[type];
        return '<input type="text" name="name" value="" />';
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
        this.get("displayed").get(collection).removeObject(item);
        this.afterDestroyItem(collection, item, queue.name);
    },
    afterDestroyItem: function(collection, item, queueName) {},

    destroyItemRollback: function(collection, item) {
        this.get('displayed').get(collection).pushObject(item);
    },

    getTypeForCollection: function(collection) {
        return this.get('hierarchy').objectAt(this.get('collections').indexOf(collection));
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


Cabernet.GraphBrowserAddView = Ember.View.extend({
    collection: null,
    formData: null,

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
    },

    // Necessary for IE (and the form tag too) ; 
    // without this, when the user types 'Return', a call to 'addItem' is made but not to the right view... 
    didInsertElement: function() {
        this.$('form').submit(function(e) { return false; })
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
    },

    saveItem: function() {
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