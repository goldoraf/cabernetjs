Cabernet.DatagridView = Ember.View.extend({
    classNames: ['datagrid'],
    columnsClassNames: {},
    initScroll: true,
    nbColumns: null,
    template: Ember.Handlebars.compile(
        '<div {{bindAttr class=":options controller.scrollable:scrollable"}}>{{view Cabernet.DatagridOptionsView}}</div> \
        <div class="dg-wrapper"><table data-datagrid-table="cabernet-datagrid-table"> \
            <thead> \
                <tr> \
                    {{each displayedColumns itemViewClass="Cabernet.DatagridHeaderView"}} \
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
        </table></div>'
    ),

    editablePlugin: function() {
        this.$("td.editable").on("saveCell", $.proxy(function(e, oldValue, newValue) {
            var $cell = $(e.target);
            var trNumber = $cell.parents("tr").index("table[data-datagrid-table='cabernet-datagrid-table'] tbody tr");
            var model = this.get("controller").get("displayedData").objectAt(trNumber);
            var property = $cell.attr("data-datagrid-columnName");
            this.get("controller").updateModel(model, property, oldValue, newValue, {
                success: function() {},
                error: function(msg) {
                    e.stopPropagation(); // be sure no other event is going to break or callback
                    console.log("propagation stoped");
                    $cell.data("value", oldValue);
                    $cell.trigger("dblclick");
                    $cell.addClass("error");
                }
            });
            
        }, this));

        // Editable table
        if (this.get("controller").get("editable")) {
            this.$('tbody').editableCell({
                cellSelector: "td.editable"
            });   
        }
    },

    scrollablePlugin: function() {
        if (this.get("initScroll") && this.get("controller").get("scrollable")) {
            this.get("parentView").$(".dg-wrapper").tableScroll("undo");
            this.get("parentView").$(".dg-wrapper").tableScroll({
                height: 400,
                flush: true
            });
            this.set("initScroll", false);
        }
    },

    reinitScrollablePlugin: function() {
        this.set("nbColumns", 0);
    },

    childInserted: function(cell) {
        var nbColumns = this.get("nbColumns") + 1;
        this.set("nbColumns", nbColumns);
        if (this.get("nbColumns") == this.get("controller").get("displayedColumns").length) {
            this.set("initScroll", true);
            this.scrollablePlugin();
        }
    },

    didInsertElement: function() {
        this.renderGrid();
        this.set("initScroll", true);
        this.scrollablePlugin();
        this.editablePlugin();

        this.addObserver('controller.displayedData', function() {
            this.renderGrid();
            this.set("initScroll", true);
            this.scrollablePlugin();
            this.editablePlugin();
        });
        this.addObserver('controller.displayedColumns', function() {
            this.reinitScrollablePlugin();
            this.renderGrid();
            this.editablePlugin();
        });

        this._super();
    },

    renderGrid: function() {
        Cabernet.log('DG renderGrid');
        
        var data = this.get('controller').get('displayedData');
        if (data.get('length') === 0) {
            this.$('tbody').replaceWith(this.get('emptyTemplate')({ 
                columnCount: this.get('controller').get('displayedColumns').get('length')
            }));
        } else {
            // Render the table
            this.$('tbody').replaceWith(this.get('gridTemplate')({ data: data }));
            
            // Workaround for the elemtn:first css selector
            this.$("tbody tr:first").addClass("row-0");
            this.$("tr > td:eq(0), tr > th:eq(0)").addClass("cell-0");
        }
    },
    
    emptyTemplate: function() {
        return Cabernet.Handlebars.compile('<tbody><tr><td class="datagrid-empty" colspan="{{columnCount}}">{{t "cabernet.datagrid.empty"}}</td></tr></tbody>');
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

    didInsertElement: function() {
        this.get("parentView").childInserted(this.$());
    },

    sortClass: function() {
        var sortDir = this.get("content").get('sort');
        if (sortDir === 'up') return 'headerSortUp';
        if (sortDir === 'down') return 'headerSortDown';
        return '';
    }.property('sort'),

    filterViewClass: function() {
        return Ember.get(this.get("content").get('filter').get('viewClass'));
    }.property('filter'),

    template: Ember.Handlebars.compile(
        '<a class="sortlink" {{action sort view.content.name target="controller"}}>{{view.content.label}}</a> \
        {{#if view.content.filterable}} \
            {{view "view.filterViewClass" filterBinding="view.content.filter"}} \
        {{/if}}'
    )
});

Cabernet.DatagridFilterView = Cabernet.Popover.extend({
    classNames: ['filter'],
    placement: 'below',
    linkTemplate: '<a {{bindAttr class="view.linkClass"}} {{action "toggle" target="view"}}>|</a>',

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
    contentTemplate: '<p>{{t "cabernet.datagrid.fromValue"}} {{view.filter.selectedMin}} \
        {{t "cabernet.datagrid.toValue"}} {{view.filter.selectedMax}}</p><div class="slider-range"></div>',

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
    contentTemplate: '<p>{{t "cabernet.datagrid.fromDate"}} {{view Ember.TextField classNames="min-date" valueBinding="view.filter.selectedMin"}} \
        {{t "cabernet.datagrid.toDate"}} {{view Ember.TextField classNames="max-date" valueBinding="view.filter.selectedMax"}}</p>',

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

Cabernet.DatagridBooleanFilterView = Cabernet.DatagridFilterView.extend({
    classNames: ['boolean'],
    contentTemplate: '<ul class="inputs-list"> \
                        <li><label><input type="radio" name="radiogroup" value="all"/>{{t "cabernet.datagrid.all"}}</label></li> \
                        <li><label><input type="radio" name="radiogroup" value="true"/>{{t "cabernet.datagrid.yes"}}</label></li> \
                        <li><label><input type="radio" name="radiogroup" value="false"/>{{t "cabernet.datagrid.no"}}</label></li> \
                      </ul>',

    stringValue: function() {
        var v = this.get('filter').get('value');
        return Ember.empty(v) ? 'all' : v === true ? 'true' : 'false';
    }.property('filter.value'),

    didInsertElement: function() {
        this.$('input[name=radiogroup]').val([this.get('stringValue')]);
        var that = this;
        this.$('input[name=radiogroup]').change(function() {
            var v = that.$('input[name=radiogroup]:checked').val();
            that.get('filter').set('value', v == 'all' ? '' : v == 'true' ? true : false);
        });
    }
});

Cabernet.DatagridOptionsView = Cabernet.Popover.extend({
    classNames: ['options'],
    placement: 'below right',
    linkTemplate: '<a class="toggle" {{action "toggle" target="view"}}>{{t "cabernet.datagrid.options"}}</a>',
    contentTemplate: '{{#if copyAllEnabled}} \
                        <div class="clipboard-wrapper" style="position:relative"> \
                            <div class="clipboard-button">{{t "cabernet.datagrid.copyToClipboard"}}</div> \
                        </div> \
                        <hr /> \
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
        if (popover.is(':visible') && !clipClient.glued) {
            clipClient.glue(this.$('div.clipboard-button').get(0), this.$('div.clipboard-wrapper').get(0));
            clipClient.glued = true;
        }
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