Cabernet.DatagridController = Ember.ObjectController.extend({
	data: [],
    displayedData: [],
    modelType: null,
    columns: null,
    defaultSort: null,
    sessionBucket: null,

    copyAllEnabled: true,
    editable: false,
    scrollable: false,

    STRINGS: {
        'cabernet.datagrid.empty' : 'No results found',
        'cabernet.datagrid.fromValue'  : 'From',
        'cabernet.datagrid.toValue'    : 'to',
        'cabernet.datagrid.fromDate'   : 'From',
        'cabernet.datagrid.toDate'     : 'to',
        'cabernet.datagrid.all' : 'All',
        'cabernet.datagrid.yes' : 'Yes',
        'cabernet.datagrid.no'  : 'No',
        'cabernet.datagrid.options'  : 'Options',
        'cabernet.datagrid.copyToClipboard' : 'Copy to clipboard'
    },

    dataChanged: function() {
        // does nothing, but avoids duplicate 'controllerDataChanged' on filters...
    }.observes('data'),

    contentChanged: function() {
        Cabernet.log('DG controller content changed');
        if (!Ember.none(this.get('content')) && this.get('content').data !== undefined) {
            this.set('data', this.get('content').data);
            this.refreshDisplayedData();
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
        this.refreshDisplayedData();
        if (this.shouldPersistParams()) this.persistFilters();
    }.observes('appliedFilters.@each'),

    init: function() {
        this._super();

        this.setI18nStrings();

        var initialSort = this.get('defaultSort');
        if (this.shouldPersistParams()) {
            var persistedSort = this.retrieveParam('sort');
            if (!Ember.none(persistedSort)) initialSort = persistedSort;
        }
        this.setInitialSort(initialSort);

        this.refreshDisplayedData();
	},

    updateModel: function(model, property, oldValue, newValue, callback) {
        callback = callback || { success: function() {}, error: function() {}};
        
        // Validation
        if (newValue === "toto") {
            callback.error();
            return;
        }
        
        model instanceof Ember.Object ? model.set(property, newValue) : model[property] = newValue;
        return callback.success();
    },

	refreshDisplayedData: function() {
        if (Ember.empty(this.get('data'))) {
            this.set('displayedData', this.get('data'));
            return;
        }
        Cabernet.log('DG refreshDisplayedData');
        this.set('displayedData', this.applySort(this.applyFilters(this.get('data'))));
    },

    sort: function(columnName, direction) {
        this.setCurrentSort(columnName, direction);
        this.refreshDisplayedData();
    },

    setCurrentSort: function(columnName, direction) {
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
        if (this.shouldPersistParams()) this.persistSort(columnName, direction);
        return column;
    },

    getCurrentSortColumn: function() {
        return this.get('columnsForDisplay').find(function(col) {
            return col.get('sort') !== false;
        });
    },

    applySort: function(data) {
        Cabernet.log('DG applying sort');

        var sortColumn = this.getCurrentSortColumn();
        if (Ember.none(sortColumn)) return data;
        
        var columnName = sortColumn.get('name'),
            direction  = sortColumn.get('sort');
        
        var sorted = data.toArray().sort(function(a, b) {
            var aValue, bValue, ret = 0;

            aValue = Ember.get(a, columnName);
            bValue = Ember.get(b, columnName);
            ret = Ember.compare(aValue, bValue);
            return ret;
        });
        if (direction === 'down') sorted.reverse();
        return sorted;
    },

    applyFilters: function(data) {
        Cabernet.log('DG applying filters');

        this.get('appliedFilters').forEach(function(filter) {
            data = filter.apply(data);
        });
        return data;
    },

    setInitialSort: function(initialSort) {
        if (Ember.none(initialSort)) return;
        var col = initialSort,
            dir = 'up';
        if (col.indexOf('-') === 0) {
            dir = 'down';
            col = col.substr(1);
        }
        this.setCurrentSort(col, dir);
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
    },

    setI18nStrings: function() {
        var strings = this.get('STRINGS');
        for (var k in strings) {
            Cabernet.I18n.addMessage(k, strings[k]);
        }
    }
});
