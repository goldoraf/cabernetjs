(function() {
window.Spike = Ember.Namespace.create({
  CURRENT_API_REVISION: 1
});

})();



(function() {


Spike.Datagrid = Ember.View.extend({
	
    template: Ember.Handlebars.compile(
        '<div class="with-table-header"> \
            <div class="row-pane table-header"> \
                {{view Spike.Datagrid.Columnpicker columnsBinding="columnsForDisplay"}} \
                <div id="filterbar-wrapper"> \
                    <h5>Filtrer par</h5> \
                    {{view Spike.Datagrid.Filterbar id="filterbar" filterableColumnsBinding="columns"}} \
                </div> \
            </div> \
            <div class="content"> \
                <table> \
                    <thead> \
                        <tr> \
                        {{#each columnsForDisplay}} \
                            {{#with this as column}} \
                                {{#if column.displayed}} \
                                    {{#view Spike.Datagrid.ColumnHeader columnNameBinding="column.name" classBinding="sortClass"}} \
                                        <span class="sort"></span> \
                                        <a {{action "sort"}}>{{columnName}}</a> \
                                    {{/view}} \
                                {{/if}} \
                            {{/with}} \
                        {{/each}} \
                        </tr> \
                    </thead> \
                    {{view Spike.Datagrid.Body dataBinding="displayedData" columnsBinding="columnsForDisplay"}} \
                </table> \
            </div> \
        </div>'),

	data: [],
	modelType: null,
	columns: null,
    displayedData: [],
    columnsForDisplay: null,

	init: function() {
		this._super();
        if (this.get('columns') === null) {
            this.set('columns', Ember.keys(this.get('modelType').__metadata__.definedProperties));
        }
        this._initColumnsForDisplay();
		this.set('displayedData', this.get('data'));
	},

	sortDesc: function(columnName) {
		this.sort(columnName, 'desc');
	},

	sortAsc: function(columnName) {
		this.sort(columnName, 'asc');
	},

	sort: function(columnName, direction) {
		var sorted = this.get('displayedData').toArray().sort(function(a, b) {
            var aValue, bValue, ret = 0;

            aValue = Ember.get(a, columnName);
            bValue = Ember.get(b, columnName);
            ret = Ember.compare(aValue, bValue);
            return ret;
		});
        if (direction === 'desc') sorted.reverse();
		this.set('displayedData', sorted);
	},

	applyFilters: function(filters) {
		var data = this.get('data');
		filters.forEach(function(filter) {
			var regex = new RegExp(filter.term, 'i', 'g');
            data = data.filter(function(item) {
                return item.get(filter.column).toString().match(regex);
            })
		});
		this.set('displayedData', data);
	},

    _initColumnsForDisplay: function() {
        var cols = [];
        this.get('columns').forEach(function(columnName) {
            cols.pushObject(Ember.Object.create({
                name: columnName,
                label: columnName,
                displayed: true
            }));
        });
        this.set('columnsForDisplay', cols);
    }
});

Spike.Datagrid.Body = Ember.View.extend({
    tagName: 'tbody',

    _columnsDidChange: function() {
        this.rerender();
    }.observes('parentView.columnsForDisplay.@each.displayed'),

    _dataDidChange: function() {
        this.rerender();
    }.observes('parentView.displayedData'),

    render: function(buffer) {
        this.get('data').forEach(function(row) {
            buffer.begin('tr');
            this.get('columns').forEach(function(col) {
                if (col.get('displayed') === true) buffer.push('<td>' + row.get(col.name) + '</td>');
            });
            buffer.end();
        }, this);
        
    }
});

Spike.Datagrid.ColumnHeader = Ember.View.extend({
	tagName: 'th',
	sortDirection: null,
	sortClass: function() {
		var sortDir = this.get('sortDirection');
		if (sortDir === 'up') return 'headerSortUp';
		if (sortDir === 'down') return 'headerSortDown';
		return '';
	}.property('sortDirection'),

	sort: function() {
		var sortDir = this.get('sortDirection');
		if (sortDir === 'up' || sortDir === null) {
			newSortDir = 'down';
			this.get('parentView').sortDesc(this.get('columnName'));
		} else {
			newSortDir = 'up';
			this.get('parentView').sortAsc(this.get('columnName'));
		}
		this.set('sortDirection', newSortDir);
	}
});

Spike.Datagrid.Filterbar = Ember.View.extend({
	appliedFilters: [],
    template: Ember.Handlebars.compile(
        '{{#each filterableColumns}} \
            {{view Spike.Datagrid.Filter class="filter-item" columnNameBinding="this"}} \
        {{/each}} \
        <div id="main-filter-form"> \
            {{#each appliedFilters}} \
                {{#view Spike.Datagrid.AppliedFilter tagName="span" class="filter" filterBinding="this"}} \
                    {{filter.column}} : {{filter.term}} \
                    <a {{action "removeFilter"}} class="icon-delete"></a> \
                    <br> \
                {{/view}} \
            {{/each}} \
        </div>'),

	applyFilter: function(columnName, term) {
		this.get('appliedFilters').pushObject({ column: columnName, term: term });
		this.get('parentView').applyFilters(this.get('appliedFilters'));
	},

	removeFilter: function(filter) {
		this.get('appliedFilters').removeObject(filter);
		this.get('parentView').applyFilters(this.get('appliedFilters'));
	}
});

Spike.Datagrid.Filter = Ember.View.extend({
	term: '',
    template: Ember.Handlebars.compile(
        '<a {{action "toggleForm"}} class="filter">{{columnName}}</a> \
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
		this.get('parentView').applyFilter(this.get('columnName'), this.get('term'));
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

Spike.Datagrid.AppliedFilter = Ember.View.extend({
	removeFilter: function() {
		this.get('parentView').removeFilter(this.get('filter'));
	}
});

Spike.Datagrid.Columnpicker = Ember.View.extend({
    template : Ember.Handlebars.compile(
        '<div class="table-header-add-on"> \
            <a class="columns-selection-toggle" {{action "togglePicker"}}>Select columns</a> \
        </div> \
        <div id="column-picker"> \
            <div id="column-picker-wrapper" class="picker-form-wrapper popover below"> \
                <div class="filter-form-arrow arrow"></div> \
                <div class="filter-form inner"> \
                    <div class="input"> \
                        <ul class="inputs-list"> \
                            {{#each columns}} \
                                <li> \
                                    <label> \
                                        {{#with this as column}} \
                                            {{view Ember.Checkbox checkedBinding="column.displayed"}} \
                                            <span>{{column.label}}</span> \
                                        {{/with}} \
                                    </label> \
                                </li> \
                            {{/each}} \
                        </ul> \
                    </div> \
                </div> \
            </div> \
        </div>'),

    didInsertElement: function() {
        this.$('div.picker-form-wrapper').hide();
    },

    togglePicker: function() {
        var wrapper = this.$('div.picker-form-wrapper');
        wrapper.toggle();
        wrapper.addClass('active');
        wrapper.position({
                of: this.$('a.columns-selection-toggle'),
                my: 'left top',
                at: 'left bottom'
            });
    }
});


})();



(function() {

})();

