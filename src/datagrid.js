
if (Em.I18n !== undefined) {
    Cabernet.translate = Em.I18n.t;
} else {
    Cabernet.translate = Ember.String.loc;
}

Cabernet.Datagrid = Ember.View.extend({
	
    template: Ember.Handlebars.compile(
        '<div class="datagrid-header"> \
            {{view Cabernet.Datagrid.Columnpicker columnsBinding="columnsForDisplay"}} \
            <div class="filterbar"> \
                <h5>{{filtersText}}</h5> \
                {{view Cabernet.Datagrid.Filterbar appliedFiltersBinding="appliedFilters" filterableColumnsBinding="columnsForDisplay"}} \
            </div> \
        </div> \
        {{#if emptyData}} \
            <div class="datagrid-empty"><p>{{emptyText}}</p></div> \
        {{else}} \
            <table> \
                <thead> \
                    {{view Cabernet.Datagrid.Head itemViewClass="Cabernet.Datagrid.ColumnHeader" contentBinding="displayedColumns"}} \
                </thead> \
                <tbody /> \
            </table> \
        {{/if}}'),

	data: [],
	modelType: null,
	columns: null,
    custom: {},
    defaultSort: null,
    filtersText: 'Filter by',
    emptyText: 'No results found',
    sessionBucket: null,

    classNames: ['datagrid'],
    columnsForDisplay: null,
    appliedFilters: [],
    displayedData: [],

    didInsertElement: function() {
        this.renderGrid();
    },

    renderGrid: function() {
        this.$('tbody').replaceWith(this.get('gridTemplate')({ data: this.get('displayedData') }));
    },

    gridTemplate: function() {
        var custom, inner, html = [];
        this.get('displayedColumns').forEach(function(col) {
            custom = this.getCustomDisplay(col.name);
            inner = (custom !== null) ? custom : '{{this.'+col.name+'}}';
            if (col.get('displayed') === true) html.push('<td>'+inner+'</td>');
        }, this);
        return Handlebars.compile('<tbody>{{#list data}}<tr>'+html.join('')+'</tr>{{/list}}</tbody>');
    }.property('displayedColumns').cacheable(),

    emptyData: function() {
        return this.get('displayedData').get('length') === 0;
    }.property('displayedData'),

    displayedColumns: function() {
        return this.get('columnsForDisplay').filterProperty('displayed');
    }.property('columnsForDisplay.@each.displayed'),

    appliedFiltersChanged: function() {
        this.applyFilters();
        if (this.shouldPersistParams()) this.persistFilters();
    }.observes('appliedFilters.@each'),

	init: function() {
		this._super();
        if (this.get('columns') === null) {
            this.set('columns', Ember.keys(this.get('modelType').__metadata__.definedProperties));
        }
        this.initColumnsForDisplay();
        this.addObserver('displayedColumns', function displayedColumnsChanged() {
            this.saveParam('columns', this.get('displayedColumns').mapProperty('name'));
            this.renderGrid();
        });

		this.set('displayedData', this.get('data'));
        if (this.shouldPersistParams()) {
            this.set('appliedFilters', this.getPreviouslyAppliedFilters());
            var persistedSort = this.retrieveParam('sort');
            if (!Ember.none(persistedSort)) this.set('defaultSort', persistedSort);
        }
        this.applyDefaultSort();
        this.addObserver('displayedData', function displayedDataChanged() {
            this.renderGrid();
        });
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
        this.get('columnsForDisplay').findProperty('name', col).set('sort', dir);
    },

    getCustomDisplay: function(columnName) {
        if (!this.get('custom').hasOwnProperty(columnName)) return null;
        return this.get('custom')[columnName];
    },

	sort: function(columnName, direction) {
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
		var data = this.get('data');
		this.get('appliedFilters').forEach(function(filter) {
			var regex = new RegExp(filter.term, 'i', 'g');
            data = data.filter(function(item) {
                return item.get(filter.column.get('name')).toString().match(regex);
            })
		});
		this.set('displayedData', data);
	},

    persistFilters: function() {
        var data = [];
        this.get('appliedFilters').forEach(function(item) {
            data.push({ column: item.column.get('name'), term: item.term});
        });
        this.saveParam('filters', data);
    },

    getPreviouslyAppliedFilters: function() {
        var filters = [],
            data = this.retrieveParam('filters');

        if (Ember.none(data)) return filters;

        data.forEach(function(item) {
            filters.pushObject({ column: this.get('columnsForDisplay').findProperty('name', item.column), term: item.term })
        }, this);
        return filters;
    },

    persistSort: function(columnName, direction) {
        this.saveParam('sort', (direction == 'down') ? '-'+columnName : columnName);
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

    initColumnsForDisplay: function() {
        var cols = [];
        var displayed = this.get('columns');
        if (this.shouldPersistParams()) {
            var stored = this.retrieveParam('columns');
            if (!Ember.none(stored)) displayed = stored;
        }
        this.get('columns').forEach(function(columnName) {
            cols.pushObject(Ember.Object.create({
                name: columnName,
                label: Cabernet.translate(columnName),
                displayed: displayed.contains(columnName),
                sort: false
            }));
        });
        this.set('columnsForDisplay', cols);
    }
});

Cabernet.Datagrid.Head = Ember.CollectionView.extend({
    tagName: 'tr',

    sort: function(columnName) {
        var actualSort = this.get('content').findProperty('name', columnName).get('sort');
        var sortDir = (actualSort === 'down') ? 'up' : 'down';
        this.get('content').setEach('sort', false);
        this.get('content').findProperty('name', columnName).set('sort', sortDir);
        this.get('parentView').sort(columnName, sortDir);
    }
});

Cabernet.Datagrid.ColumnHeader = Ember.View.extend({
	tagName: 'th',
    template: Ember.Handlebars.compile('<a {{action "sort"}}>{{content.label}}</a>'),
	
	classNameBindings: ['sortClass'],
    sortClass: function() {
		var sortDir = this.get('content').get('sort');
		if (sortDir === 'up') return 'headerSortUp';
		if (sortDir === 'down') return 'headerSortDown';
		return '';
	}.property('content.sort'),

	sort: function() {
		this.get('parentView').sort(this.get('content').get('name'));
	}
});

Cabernet.Datagrid.Filterbar = Ember.View.extend({
	template: Ember.Handlebars.compile(
        '<div class="filters"> \
            {{view Ember.CollectionView itemViewClass="Cabernet.Datagrid.Filter" class="filter-links" contentBinding="filterableColumns"}} \
            {{view Ember.CollectionView itemViewClass="Cabernet.Datagrid.AppliedFilter" class="applied-filters" contentBinding="appliedFilters"}} \
        </div>'),

	applyFilter: function(column, term) {
		this.get('appliedFilters').pushObject({ column: column, term: term });
	},

	removeFilter: function(filter) {
		this.get('appliedFilters').removeObject(filter);
	}
});

Cabernet.Datagrid.Filter = Cabernet.Popover.extend({
	term: '',
    classNames: ['filter'],
    placement: 'below right',
    linkTemplate: '<a {{action "toggle"}} class="toggle">{{content.label}}</a>',
    contentTemplate: '{{view Cabernet.Datagrid.FilterTermField valueBinding="term"}}',
    
	applyFilter: function() {
		this.get('parentView').get('parentView').applyFilter(this.get('content'), this.get('term'));
		this.set('term', '');
		this.toggle();
		return false;
	},

    toggle: function(e) {
        this._super(e);
        var field = this.$('input');
        if (field.is(':visible')) field.focus();
    },
});

Cabernet.Datagrid.FilterTermField = Ember.TextField.extend({
    insertNewline: function() {
        this.get('parentView').applyFilter();
    }
});

Cabernet.Datagrid.AppliedFilter = Ember.View.extend({
	tagName: 'span',
    classNames: ['applied-filter'],
    template: Ember.Handlebars.compile(
        '{{content.column.label}} : {{content.term}} \
        <a {{action "removeFilter"}} class="delete"></a> \
        <br>'
    ),

    removeFilter: function() {
		this.get('parentView').get('parentView').removeFilter(this.get('content'));
	}
});

Cabernet.Datagrid.Columnpicker = Cabernet.Popover.extend({
    classNames: ['columnpicker'],
    placement: 'below left',
    linkTemplate: '<a class="toggle" {{action "toggle"}}>Select columns</a>',
    contentTemplate: '{{view Ember.CollectionView tagName="ul" class="inputs-list" \
                        itemViewClass="Cabernet.Datagrid.Columnpicker.Element" contentBinding="columns"}}'
});

Cabernet.Datagrid.Columnpicker.Element = Ember.View.extend({
    template: Ember.Handlebars.compile(
        '<label> \
            {{view Ember.Checkbox checkedBinding="content.displayed"}} \
            <span>{{content.label}}</span> \
        </label>'
    )
})