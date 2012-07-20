
if (Em.I18n !== undefined) {
    Cabernet.translate = Em.I18n.t;
} else {
    Cabernet.translate = Ember.String.loc;
}

Cabernet.Datagrid = Ember.View.extend({
	
    template: Ember.Handlebars.compile(
        '<div class="row-pane datagrid-header"> \
            {{view Cabernet.Datagrid.Columnpicker columnsBinding="columnsForDisplay"}} \
            <div class="filterbar"> \
                <h5>Filter by</h5> \
                {{view Cabernet.Datagrid.Filterbar filterableColumnsBinding="columnsForDisplay"}} \
            </div> \
        </div> \
        <table> \
            <thead> \
                {{view Cabernet.Datagrid.Head itemViewClass="Cabernet.Datagrid.ColumnHeader" contentBinding="displayedColumns"}} \
            </thead> \
            {{view Cabernet.Datagrid.Body itemViewClass="Cabernet.Datagrid.Row" contentBinding="displayedData" columnsBinding="columnsForDisplay"}} \
        </table>'),

	data: [],
	modelType: null,
	columns: null,
    custom: {},
    defaultSort: null,

    classNames: ['datagrid'],
    columnsForDisplay: null,
    displayedData: [],
    displayedColumns: function() {
        return this.get('columnsForDisplay').filterProperty('displayed');
    }.property('columnsForDisplay.@each.displayed'),

	init: function() {
		this._super();
        if (this.get('columns') === null) {
            this.set('columns', Ember.keys(this.get('modelType').__metadata__.definedProperties));
        }
        this._initColumnsForDisplay();
		this.set('displayedData', this.get('data'));
        this.applyDefaultSort();
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
	},

	applyFilters: function(filters) {
		var data = this.get('data');
		filters.forEach(function(filter) {
			var regex = new RegExp(filter.term, 'i', 'g');
            data = data.filter(function(item) {
                return item.get(filter.column.get('name')).toString().match(regex);
            })
		});
		this.set('displayedData', data);
	},

    _initColumnsForDisplay: function() {
        var cols = [];
        this.get('columns').forEach(function(columnName) {
            cols.pushObject(Ember.Object.create({
                name: columnName,
                label: Cabernet.translate(columnName),
                displayed: true,
                sort: false
            }));
        });
        this.set('columnsForDisplay', cols);
    }
});

Cabernet.Datagrid.Body = Ember.CollectionView.extend({
    tagName: 'tbody',
    rowTemplate: null,
    emptyView: Ember.View.extend({
      template: Ember.Handlebars.compile("The collection is empty")
    }),

    init: function() {
        this.refreshRowTemplate();
        this._super();
    },

    columnsDidChange: function() {
        this.refreshRowTemplate();
        this.refreshContent();
    }.observes('parentView.displayedColumns'),

    refreshContent: function() {
        var content = this.get('content'),
            length = content.get('length');
        this.arrayWillChange(content, 0, length);
        this.arrayDidChange(content, 0, null, length);
    },

    refreshRowTemplate: function() {
        this.set('rowTemplate', this.generateRowTemplate());
    },

    generateRowTemplate: function() {
        var custom, inner, html = [];
        this.get('parentView').get('displayedColumns').forEach(function(col) {
            custom = this.get('parentView').getCustomDisplay(col.name);
            inner = (custom !== null) ? custom : '{{content.'+col.name+'}}';
            if (col.get('displayed') === true) html.push('<td>'+inner+'</td>');
        }, this);
        return Ember.Handlebars.compile(html.join(''));
    }
});

Cabernet.Datagrid.Row = Ember.View.extend({
    init: function() {
        this.set('template', this.get('parentView').get('rowTemplate'));
        this._super();
    }
})

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
	appliedFilters: [],
    template: Ember.Handlebars.compile(
        '<div class="filters"> \
            {{view Ember.CollectionView itemViewClass="Cabernet.Datagrid.Filter" class="filter-links" contentBinding="filterableColumns"}} \
            {{view Ember.CollectionView itemViewClass="Cabernet.Datagrid.AppliedFilter" class="applied-filters" contentBinding="appliedFilters"}} \
        </div>'),

	applyFilter: function(column, term) {
		this.get('appliedFilters').pushObject({ column: column, term: term });
		this.get('parentView').applyFilters(this.get('appliedFilters'));
	},

	removeFilter: function(filter) {
		this.get('appliedFilters').removeObject(filter);
		this.get('parentView').applyFilters(this.get('appliedFilters'));
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