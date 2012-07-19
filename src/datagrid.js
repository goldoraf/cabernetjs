
if (Em.I18n !== undefined) {
    Cabernet.translate = Em.I18n.t;
} else {
    Cabernet.translate = Ember.String.loc;
}

Cabernet.Datagrid = Ember.View.extend({
	
    template: Ember.Handlebars.compile(
        '<div class="row-pane table-header"> \
            {{view Cabernet.Datagrid.Columnpicker columnsBinding="columnsForDisplay"}} \
            <div id="filterbar-wrapper"> \
                <h5>Filter by</h5> \
                {{view Cabernet.Datagrid.Filterbar filterableColumnsBinding="columnsForDisplay"}} \
            </div> \
        </div> \
        <table class="bordered-table"> \
            <thead> \
                {{view Cabernet.Datagrid.Head itemViewClass="Cabernet.Datagrid.ColumnHeader" contentBinding="displayedColumns"}} \
            </thead> \
            {{view Cabernet.Datagrid.Body itemViewClass="Cabernet.Datagrid.Row" contentBinding="displayedData" columnsBinding="columnsForDisplay"}} \
        </table>'),

	data: [],
	modelType: null,
	columns: null,
    custom: {},

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
        if (direction === 'up') sorted.reverse();
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
        '<div id="filterbar"> \
            {{#each filterableColumns}} \
                {{view Cabernet.Datagrid.Filter class="filter-item" columnBinding="this"}} \
            {{/each}} \
        </div> \
        <div id="main-filter-form"> \
            {{#each appliedFilters}} \
                {{#view Cabernet.Datagrid.AppliedFilter tagName="span" class="filter" filterBinding="this"}} \
                    {{filter.column.label}} : {{filter.term}} \
                    <a {{action "removeFilter"}} class="icon-delete"></a> \
                    <br> \
                {{/view}} \
            {{/each}} \
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

Cabernet.Datagrid.Filter = Ember.View.extend({
	term: '',
    template: Ember.Handlebars.compile(
        '<a {{action "toggleForm"}} class="filter">{{column.label}}</a> \
        <div class="filter-form-wrapper popover below"> \
            <div class="filter-form-arrow arrow"></div> \
            <div class="filter-form inner"> \
                <form class="temporary-filter-form"> \
                    {{view Ember.TextField valueBinding="term"}} \
                    <input type="submit" value="Chercher" {{action "applyFilter"}}> \
                </form> \
            </div> \
        </div>'),

	didInsertElement: function() {
		this.$('div.filter-form-wrapper').hide();
	},

	applyFilter: function() {
		this.get('parentView').applyFilter(this.get('column'), this.get('term'));
		this.set('term', '');
		this.toggleForm();
		return false;
	},

	toggleForm: function(e) {
        if (e) e.stopPropagation();

        var formWrapper = this.$('div.filter-form-wrapper');
		formWrapper.toggle();
		if (formWrapper.is(':visible')) {
			$('div.filter-form-wrapper.active').removeClass('active').hide();
            formWrapper.addClass('active');
            formWrapper.position({
				of: this.$('a.filter'),
				my: 'left top',
				at: 'left bottom'
			});
            formWrapper.bind('clickoutside', function(e) {
                $(this).removeClass('active').hide().unbind('clickoutside');
            });
		} else {
            formWrapper.removeClass('active').hide().unbind('clickoutside');
        }
	}
});

Cabernet.Datagrid.AppliedFilter = Ember.View.extend({
	removeFilter: function() {
		this.get('parentView').removeFilter(this.get('filter'));
	}
});

Cabernet.Datagrid.Columnpicker = Cabernet.Popover.extend({
    classNames: ['columnpicker'],
    placement: 'below left',
    linkTemplate: '<a class="columns-selection-toggle" {{action "toggle"}}>Select columns</a>',
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