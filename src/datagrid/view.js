/** !!!!! view.js depends on jquery.editableCell.js !!!!! */

Cabernet.DatagridView = Ember.View.extend({
    classNames: ['datagrid'],
    columnsClassNames: {},
    template: Ember.Handlebars.compile(
        '<div class="options">{{view Cabernet.DatagridOptionsView}}</div> \
        <table data-datagrid-table="cabernet-datagrid-table"> \
            <thead> \
                <tr> \
                    {{#each column in displayedColumns}} \
                        {{view Cabernet.DatagridHeaderView columnBinding="column"}} \
                    {{/each}} \
                </tr> \
            </thead> \
            <tbody /> \
            <tfoot>\
                <tr>\
                    {{#each column in displayedColumns}} \
                        <th {{bindAttr class="column.sortClass"}}> \
                            {{column.label}} \
                        </th> \
                    {{/each}} \
                <tr>\
            </tfoot>\
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
        
        this.$("td.editable").on("saveCell", $.proxy(function(e, oldValue, newValue) {
            var $cell = $(e.target);
            var trNumber = $cell.parents("tr").index("table[data-datagrid-table='cabernet-datagrid-table'] tbody tr");
            var model = this.get("controller").get("displayedData").objectAt(trNumber);
            var property = $cell.attr("data-datagrid-columnName");
            this.get("controller").updateModel(model, property, oldValue, newValue, {
                success: function() {},
                error: function(msg) {
                    e.stopPropagation(); // be sure no other event is going to break or callback
                    $cell.data("value", oldValue);
                    $cell.trigger("dblclick");
                    $cell.addClass("error");
                }
            });
            
        }, this));
    },

    renderGrid: function() {
        Cabernet.log('DG renderGrid');
        
        var data = this.get('controller').get('displayedData');
        if (data.get('length') === 0) {
            this.$('tbody').replaceWith(this.get('emptyTemplate')({ 
                columnCount: this.get('controller').get('displayedColumns').get('length'),
                emptyText: this.get('controller').get('emptyText')
            }));
        } else {
            this.$('tbody').replaceWith(this.get('gridTemplate')({ data: data }));
            
            this.$("tbody").first("tr").addClass("row-0");
            this.$("tr > td:first, tr > th:first").addClass("cell-0");
            
            // Editable table
           	if (this.get("controller").get("editable")) {
                this.$('tbody').editableCell({
                    cellSelector: "td.editable"
                });   
            }
            
            // make the table scrollabel
            if (this.get("controller").get("scrollable")) {
                this.$("table[data-datagrid-table='cabernet-datagrid-table']").tableScroll("undo").tableScroll({
                    height: this.get("controller").get("height"), 
                    flush: true
                });
            }
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
                html.push('<td data-datagrid-columnName="'+ col.name + '" class="editable"' + '>' +inner+'</td>');
        }, this);
        
        return Cabernet.Handlebars.compile('<tbody>{{#list data}}<tr>'+html.join('')+'</tr>{{/list}}</tbody>');
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
        '<a class="sortlink" {{action sort view.column.name target="controller"}}>{{view.column.label}}</a> \
        {{#if view.column.filterable}} \
            {{view "view.filterViewClass" filterBinding="view.column.filter"}} \
        {{/if}}'
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
    contentTemplate: '{{view Cabernet.DatagridFilterTextField valueBinding="view.filter.value"}}',

    toggle: function(e) {
        this._super(e);
        var field = this.$('input');
        if (field.is(':visible')) field.focus();
    }
});

Cabernet.DatagridFilterTextField = Ember.TextField.extend({
    insertNewline: function() {
        //this.get('parentView').applyFilter(this.get('value'));
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
        var checked, distinct = [];
        this.get('filter').get('values').forEach(function(v) { 
            checked = !Ember.isArray(this.get('filter').get('value')) || this.get('filter').get('value').contains(v);
            distinct.pushObject(Ember.Object.create({ value: v, checked: checked })); 
        }, this);
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

    didInsertElement: function() {
        var initialValues, that = this;

        if (Ember.isArray(this.get('filter').get('value'))) {
            var filterValue = this.get('filter').get('value');
            initialValues = [filterValue[0], filterValue[1]];
        } else {
            initialValues = [this.get('filter').get('min'), this.get('filter').get('max')];
        }

        this.$('div.slider-range').slider({
            range: true,
            min: this.get('filter').get('min'),
            max: this.get('filter').get('max'),
            values: initialValues,
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
            maxDateInput = this.$('input.max-date'),
            initialValue = this.get('filter').get('value');
        
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
        if (Ember.isArray(initialValue) && !Ember.empty(initialValue[0])) {
            minDateInput.datepicker("option", "defaultDate", initialValue[0]);
        }
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
        if (Ember.isArray(initialValue) && !Ember.empty(initialValue[1])) {
            maxDateInput.datepicker("option", "defaultDate", initialValue[1]);
        }
        if (Ember.isArray(initialValue)) {
            // TODO : this is not optimal (at all). It causes multiple rerendering of the grid...
            this.get('filter').beginPropertyChanges();
            this.get('filter').set('selectedMin', initialValue[0]);
            this.get('filter').set('selectedMax', initialValue[1]);
            this.get('filter').endPropertyChanges();
        }
    }
});

Cabernet.DatagridOptionsView = Cabernet.Popover.extend({
    classNames: ['options'],
    placement: 'below right',
    linkTemplate: '<a class="toggle" {{action "toggle" target="view"}}>Options</a>',
    contentTemplate: '{{#if copyAllEnabled}} \
                        <div id="clipboard-wrapper" style="position:relative"> \
                            <div id="clipboard-button">Copy to Clipboard</div> \
                        </div> \
                      {{/if}} \
                      {{view Ember.CollectionView tagName="ul" class="inputs-list" \
                        itemViewClass="Cabernet.DatagridColumnpickerElement" contentBinding="columnsForDisplay"}}',

    didInsertElement: function() {
        if (this.get('controller').get('copyAllEnabled')) {
            var clipClient = new ZeroClipboard.Client();
            clipClient.setText('');
            clipClient.setHandCursor(true);
            clipClient.setCSSEffects(true);
            clipClient.glued = false;

            this.set('clipClient', clipClient);

            var that = this;
            this.get('clipClient').addEventListener('mouseDown', function(client) {
                that.get('clipClient').setText(that.get('controller').generateTSV());
            });
        }
    },

    toggle: function(e) {
        this._super(e);
        var popover = this.$('div.popover'),
            clipClient = this.get('clipClient');
        if (popover.is(':visible') && !clipClient.glued) clipClient.glue('clipboard-button', 'clipboard-wrapper');
    }
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