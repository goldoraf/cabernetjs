//Generate four random hex digits.
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

Cabernet.DatagridController = Ember.ObjectController.extend({
	data: [],
    displayedData: [],
    modelType: null,
    columns: null,
    defaultSort: null,
    emptyText: 'No results found',
    sessionBucket: null,

    copyAllEnabled: true,

    dataChanged: function() {
        // does nothing, but avoids duplicate 'controllerDataChanged' on filters...
        this.get('data').forEach(function(obj) {
            obj instanceof Ember.Object ? obj.set("guid", guid()) : obj.guid = guid();
        });
    }.observes('data'),

    contentChanged: function() {
        Cabernet.log('DG controller content changed');
        if (!Ember.none(this.get('content')) && this.get('content').data !== undefined) {
            this.set('data', this.get('content').data);
            this.set('displayedData', this.get('data'));
            this.applyFilters();
        }
    }.observes('content'),

    columnsForDisplay: function() {
        return this.expandColumnsDefinition();
    }.property(),

    displayedColumns: function() {
        return this.get('columnsForDisplay').filter(function(columnForDisplay) {
            if (columnForDisplay.get('hideable') === true)
                return columnForDisplay.get('displayed');
            return true;
        });
    }.property('columnsForDisplay.@each.displayed'),

    displayedColumnsChanged: function() {
        Cabernet.log('DG displayed columns changed');
        this.saveParam('displayedColumns', this.get('displayedColumns').mapProperty('name'));
    }.observes('displayedColumns'),

    filters: function() {
        return this.get('columnsForDisplay').map(function(columnForDisplay) {
            if (columnForDisplay.get('filterable') === true)
                return columnForDisplay.get('filter');
            return null;
        }).without(null);
    }.property('columnsForDisplay.@each.filter'),

    appliedFilters: function() {
        return this.get('filters').filterProperty('applied');
    }.property('filters.@each.applied'),

    appliedFiltersChanged: function() {
        this.applyFilters();
        if (this.shouldPersistParams()) this.persistFilters();
    }.observes('appliedFilters.@each'),

    init: function() {
        this._super();

        this.get('data').forEach(function(obj) {
            obj.set("guid", guid());
        });

        this.set('displayedData', this.get('data'));

        if (this.shouldPersistParams()) {
            var persistedSort = this.retrieveParam('sort');
            if (!Ember.none(persistedSort)) this.set('defaultSort', persistedSort);
        }
        this.applyDefaultSort();
        this.applyFilters();
        
        $(document).on("saveCell", "td.editable", $.proxy(function(e, oldValue, newValue) {
            var $cell = $(e.target);
            if (newValue === "toto") {
                e.stopImmediatePropagation();
                $cell.addClass("error");
                return;
            }
            var propertyName = $cell.attr("id");
            var guid = $cell.parents("tr").attr("id");
            var object = this.get("data").findProperty("guid", guid);
            object.set(propertyName, newValue);
        }, this));
    },

    sort: function(columnName, direction) {
        if (columnName instanceof jQuery.Event) {
            columnName = columnName.context;
        }
        var column = this.get('columnsForDisplay').findProperty('name', columnName);
        if (direction === undefined) {
            var actualSort = column.get('sort'),
                direction  = (actualSort === 'down') ? 'up' : 'down';
        }

        this.get('columnsForDisplay').setEach('sort', false);
        column.set('sort', direction);
        
        var sorted = this.get('displayedData').toArray().sort(function(a, b) {
            var aValue, bValue, ret = 0;

            aValue = Ember.get(a, columnName);
            bValue = Ember.get(b, columnName);
            ret = Ember.compare(aValue, bValue);
            return ret;
        });
        if (direction === 'down') sorted.reverse();
        this.set('displayedData', sorted);
        if (this.shouldPersistParams()) this.persistSort(columnName, direction);
    },

    applyFilters: function() {
        Cabernet.log('DG applying filters');

        var data = this.get('data');
        this.get('appliedFilters').forEach(function(filter) {
            data = filter.apply(data);
        });
        this.set('displayedData', data);
    },

    applyDefaultSort: function() {
        if (Ember.none(this.get('defaultSort'))) return;
        var col = this.get('defaultSort'),
            dir = 'up';
        if (col.indexOf('-') === 0) {
            dir = 'down';
            col = col.substr(1);
        }
        this.sort(col, dir);
    },

    persistSort: function(columnName, direction) {
        this.saveParam('sort', (direction == 'down') ? '-'+columnName : columnName);
    },

    persistFilters: function() {
        var data = [];
        this.get('appliedFilters').forEach(function(filter) {
            data.push({ column: filter.get('column'), value: filter.get('value') });
        });
        this.saveParam('filters', data);
    },

    saveParam: function(key, data) {
        sessionStorage.setItem(this.getSessionBucket(key), JSON.stringify(data));
    },

    retrieveParam: function(key) {
        return JSON.parse(sessionStorage.getItem(this.getSessionBucket(key)));
    },

    getSessionBucket: function(key) {
        return 'cabernet.datagrid.' + this.get('sessionBucket') + '.' + key;
    },

    shouldPersistParams: function() {
        return !Ember.none(this.get('sessionBucket'));
    },

    generateTSV: function() {
        var row, rowIndex, values, contents = '',
            data = this.get('displayedData').toArray(),
            keys = this.get('displayedColumns').mapProperty('name');

        for (rowIndex = 0; rowIndex < data.length; rowIndex++) {
            row = data[rowIndex];
            values = [];

            keys.forEach(function(column) {
                values.push(row instanceof Ember.Object ? row.get(column) : row[column]);
            });
            contents += values.join("\t") + "\r\n";
        }
        return keys.join("\t") + "\r\n" + contents;
    },

    expandColumnsDefinition: function() {
        if (this.get('columns') === null) {
            // TODO : add a check on 'modelType'
           this.set('columns', this.getColumnsFromModel());
        }

        var col, cols = [], data = this.get('data'), colsDef = this.get('columns'),
            previouslyDisplayed = this.shouldPersistParams() ? this.retrieveParam('displayedColumns') : null,
            appliedFilters  = this.shouldPersistParams() ? this.retrieveParam('filters') : null,
            previouslyFiltered = !Ember.none(appliedFilters) ? appliedFilters.mapProperty('column') : null;
        
        colsDef.forEach(function(column) {
            col = Cabernet.DatagridColumn.createFromOptions(column, this);
            if (!Ember.none(previouslyDisplayed) && !previouslyDisplayed.contains(col.get('name'))) {
                col.set('displayed', false);
            }
            if (!Ember.none(previouslyFiltered) && previouslyFiltered.contains(col.get('name'))) {
                col.get('filter').set('value', appliedFilters.findProperty('column', col.get('name')).value);
            }
            cols.pushObject(col);
        }, this);

        return cols;
    },

    getColumnsFromModel: function() {
        var cols = [],
            props = Ember.get(this.get('modelType')).__metadata__.definedProperties;
        for (var propName in props) { cols.pushObject({ name: propName, type: props[propName].type }); }
        return cols;
    }
});
