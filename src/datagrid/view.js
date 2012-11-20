Cabernet.DatagridView = Ember.View.extend({
    classNames: ['datagrid'],
    template: Ember.Handlebars.compile(
        '<table> \
            <thead> \
                <tr> \
                    {{#each column in displayedColumns}} \
                        {{view Cabernet.DatagridHeaderView columnBinding="column"}} \
                    {{/each}} \
                    <th class="columnpicker">{{view Cabernet.DatagridColumnpicker columnsBinding="columnsForDisplay"}}</th> \
                </tr> \
            </thead> \
            <tbody /> \
        </table>'
    ),

    didInsertElement: function() {
        this.renderGrid();
        this.addObserver('controller.displayedData', function displayedDataChanged() {
            this.renderGrid();
        });
        this.addObserver('controller.displayedColumns', function displayedColumnsChanged() {
            this.renderGrid();
        });
    },

    renderGrid: function() {
        var data = this.get('controller').get('displayedData');
        if (data.get('length') === 0) {
            this.$('tbody').replaceWith(this.get('emptyTemplate')({ 
                columnCount: this.get('controller').get('displayedColumns').get('length'),
                emptyText: this.get('controller').get('emptyText')
            }));
        } else {
            this.$('tbody').replaceWith(this.get('gridTemplate')({ data: data }));
        }
    },

    emptyTemplate: function() {
        return Handlebars.compile('<tbody><tr><td class="datagrid-empty" colspan="{{columnCount}}">{{emptyText}}</td></tr></tbody>');
    }.property(),

    gridTemplate: function() {
        var custom, inner, css, html = [],
            columnCount = this.get('controller').get('displayedColumns').get('length');
        
        this.get('controller').get('displayedColumns').forEach(function(col, index) {
            custom = col.get('template');
            inner = (custom !== null) ? custom : '{{this.'+col.name+'}}';
            css = (col.get('classNames') !== null) 
                ? ' class="' + (Ember.isArray(col.get('classNames')) ? col.get('classNames').join(' ') : col.get('classNames')) + '"' 
                : '';
            if (col.get('displayed') === true || col.get('hideable') === false) 
                html.push('<td'+css+(index === (columnCount - 1) ? ' colspan="2">' : '>')+inner+'</td>');
        }, this);
        
        return Handlebars.compile('<tbody>{{#list data}}<tr>'+html.join('')+'</tr>{{/list}}</tbody>');
    }.property('controller.displayedColumns').cacheable()
});

Cabernet.DatagridHeaderView = Ember.View.extend({
    tagName: 'th',
    classNameBindings: ['sortClass'],

    sortClass: function() {
        var sortDir = this.get('column').get('sort');
        if (sortDir === 'up') return 'headerSortUp';
        if (sortDir === 'down') return 'headerSortDown';
        return '';
    }.property('column.sort'),

    filterViewClass: function() {
        return Ember.get(this.get('column').get('filter').get('viewClass'));
    }.property('column.filter'),

    template: Ember.Handlebars.compile(
        '{{#if view.column.filterable}} \
            {{view "view.filterViewClass" filterBinding="view.column.filter"}} \
        {{/if}} \
        <a class="sortlink" {{action sort view.column.name target="controller"}}>{{view.column.label}}</a>'
    )
});

Cabernet.DatagridFilterView = Cabernet.Popover.extend({
    classNames: ['filter'],
    placement: 'below',
    linkTemplate: '<a {{bindAttr class="view.linkClass"}} {{action "toggle" target="view"}}>U</a>',

    linkClass: function() {
        var klass = 'filterlink';
        if (this.get('filter').get('applied') === true) klass+= ' active';
        return klass;
    }.property('filter.applied'),
});

Cabernet.DatagridTextFilterView = Cabernet.DatagridFilterView.extend({
    contentTemplate: '{{view Cabernet.DatagridFilterTextField}}',

    applyFilter: function(value) {
        this.get('filter').set('value', value);
    },

    toggle: function(e) {
        this._super(e);
        var field = this.$('input');
        if (field.is(':visible')) field.focus();
    }
});

Cabernet.DatagridFilterTextField = Ember.TextField.extend({
    insertNewline: function() {
        this.get('parentView').applyFilter(this.get('value'));
    }
});

Cabernet.DatagridPickFilterView = Cabernet.DatagridFilterView.extend({
    contentTemplate: '<ul class="inputs-list"> \
                        {{#each view.distinctValues}} \
                            <li> \
                                <label> \
                                  {{view Ember.Checkbox checkedBinding="checked"}} \
                                  {{value}} \
                                </label> \
                            </li> \
                        {{/each}} \
                      </ul>',

    distinctValues: function() {
        var distinct = [];
        this.get('filter').get('values').forEach(function(v) { 
            distinct.pushObject(Ember.Object.create({ value: v, checked: true })); 
        });
        return distinct;
    }.property('filter.values'),

    didInsertElement: function() {
        this.addObserver('distinctValues.@each.checked', function checkedValuesChanged() {
            var checkedValues = this.get('distinctValues').filterProperty('checked').mapProperty('value');
            this.get('filter').set('value', checkedValues);
        });
    }
});

Cabernet.DatagridRangeFilterView = Cabernet.DatagridFilterView.extend({
    contentTemplate: '<p>From {{view.filter.selectedMin}} to {{view.filter.selectedMax}}</p><div class="slider-range"></div>',

    applyFilter: function(value) {
        this.get('filter').set('value', value);
    },

    didInsertElement: function() {
        var that = this;
        this.$('div.slider-range').slider({
            range: true,
            min: this.get('filter').get('min'),
            max: this.get('filter').get('max'),
            values: [this.get('filter').get('min'), this.get('filter').get('max')],
            step: this.get('filter').get('step'),
            slide: function(event, ui) {
                that.get('filter').set('value', ui.values);
            }
        });
    }
});

Cabernet.DatagridDaterangeFilterView = Cabernet.DatagridFilterView.extend({
    contentTemplate: '<p>From {{view Ember.TextField classNames="min-date" valueBinding="view.filter.selectedMin"}} \
        to {{view Ember.TextField classNames="max-date" valueBinding="view.filter.selectedMax"}}</p>',

    didInsertElement: function() {
        var minDateInput = this.$('input.min-date'),
            maxDateInput = this.$('input.max-date');
        minDateInput.datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1,
            dateFormat: 'yy-mm-dd',
            onClose: function(selectedDate) {
                maxDateInput.datepicker("option", "minDate", selectedDate);
            }
        });
        maxDateInput.datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1,
            dateFormat: 'yy-mm-dd',
            onClose: function(selectedDate) {
                minDateInput.datepicker("option", "maxDate", selectedDate);
            }
        });
    }
});

Cabernet.DatagridColumnpicker = Cabernet.Popover.extend({
    classNames: ['columnpicker'],
    placement: 'below left',
    linkTemplate: '<a class="toggle" {{action "toggle" target="view"}}>Select columns</a>',
    contentTemplate: '{{view Ember.CollectionView tagName="ul" class="inputs-list" \
                        itemViewClass="Cabernet.DatagridColumnpickerElement" contentBinding="view.columns"}}'
});

Cabernet.DatagridColumnpickerElement = Ember.View.extend({
    template: Ember.Handlebars.compile(
        '<label> \
            {{#if view.content.hideable}} \
                {{view Ember.Checkbox checkedBinding="view.content.displayed"}} \
            {{else}} \
                {{view Ember.Checkbox checkedBinding="view.content.displayed" disabled="disabled"}} \
            {{/if}} \
            <span>{{view.content.label}}</span> \
        </label>'
    )
});