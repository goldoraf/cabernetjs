Cabernet.Datagrid = Ember.View.extend({
    
    template: Ember.Handlebars.compile(
        '<table> \
                <thead> \
                    <tr> \
                        {{#each column in displayedColumns}} \
                            <th {{bindAttr class="column.sortClass" }}>\
                                <div class="header-wrapper"> \
                                <a class="sortlink" {{action onSort context="column.name"}}>{{column.label}}</a> \
                                {{#if column.filterable}} \
                                    {{#if column.filter.isText}} \
                                        {{view Cabernet.Datagrid.TextFilterView filterBinding="column.filter"}} \
                                    {{/if}} \
                                    {{#if column.filter.isPick}} \
                                        {{view Cabernet.Datagrid.PickFilterView filterBinding="column.filter"}} \
                                    {{/if}} \
                                    {{#if column.filter.isRange}} \
                                        {{view Cabernet.Datagrid.RangeFilterView filterBinding="column.filter"}} \
                                    {{/if}} \
                                    {{#if column.filter.isDaterange}} \
                                        {{view Cabernet.Datagrid.DaterangeFilterView filterBinding="column.filter"}} \
                                    {{/if}} \
                                    {{#if column.filter.isBoolean}} \
                                        {{view Cabernet.Datagrid.BooleanFilterView filterBinding="column.filter"}} \
                                    {{/if}} \
                                {{/if}} \
                                </div> \
                            </th> \
                        {{/each}} \
                        <th class="options"> \
                            {{view Cabernet.Datagrid.OptionsView columnsBinding="columnsForDisplay"}}\
                        </th> \
                    </tr> \
                </thead> \
                <tbody /> \
            </table> \
        '),

    data: [],
    modelType: null,
    columns: null,
    custom: {},
    defaultSort: null,
    sessionBucket: null,

    classNames: ['datagrid'],
    columnsClassNames: {},
    displayedData: [],
    clipClient: null,

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

    columnsForDisplay: function() {
        return this.expandColumnsDefinition();
    }.property().cacheable(),

    displayedColumns: function() {
        return this.get('columnsForDisplay').filter(function(columnForDisplay) {
            if (columnForDisplay.get('hideable') === true)
                return columnForDisplay.get('displayed');
            return true;
        });
    }.property('columnsForDisplay.@each.displayed'),

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
        //if (this.shouldPersistParams()) this.persistFilters();
    }.observes('appliedFilters.@each'),

    init: function() {
        this._super();

        this.setI18nStrings();
        
        this.addObserver('displayedColumns', function displayedColumnsChanged() {
            this.saveParam('displayedColumns', this.get('displayedColumns').mapProperty('name'));
            this.renderGrid();
        });

        var initialSort = this.get('defaultSort');
        if (this.shouldPersistParams()) {
            var persistedSort = this.retrieveParam('sort');
            if (!Ember.none(persistedSort)) initialSort = persistedSort;
        }
        this.setInitialSort(initialSort);

        this.refreshDisplayedData();

        this.addObserver('displayedData', function displayedDataChanged() {
            this.renderGrid();
        });

    },

    didInsertElement: function() {
        this.renderGrid();
    },

    renderGrid: function() {
        if (this.get('displayedData').get('length') === 0) {
            this.$('tbody').replaceWith(this.get('emptyTemplate')({ 
                columnCount: this.get('displayedColumns').get('length')
            }));
        } else
            this.$('tbody').replaceWith(this.get('gridTemplate')({ data: this.get('displayedData') }));
            // Workaround for the element:first css selector
            this.$("tbody tr:first").addClass("row-0");
            this.$("tr > td:eq(0), tr > th:eq(0)").addClass("cell-0");
    },

    emptyTemplate: function() {
        return Cabernet.Handlebars.compile('<tbody><tr><td class="datagrid-empty" colspan="{{columnCount}}">{{t "cabernet.datagrid.empty"}}</td></tr></tbody>');
    }.property(),

    gridTemplate: function() {
        var custom, inner, css, html = [],
            cssClasses = this.get('columnsClassNames'),
            columnCount = this.get('displayedColumns').get('length');
        
        this.get('displayedColumns').forEach(function(col, index) {
            custom = this.getCustomDisplay(col.name);
            inner = (custom !== null) ? custom : '{{this.'+col.name+'}}';
            css = (cssClasses[col.name] !== undefined) ? ' class="'+cssClasses[col.name]+'"' : '';
            if (col.get('displayed') === true || col.get('hideable') === false) 
                html.push('<td'+css+(index === (columnCount - 1) ? ' colspan="2">' : '>')+inner+'</td>');
        }, this);
        
        return Cabernet.Handlebars.compile('<tbody>{{#list data}}<tr>'+html.join('')+'</tr>{{/list}}</tbody>');
    }.property('displayedColumns').cacheable(),

    getCustomDisplay: function(columnName) {
        if (!this.get('custom').hasOwnProperty(columnName)) return null;
        return this.get('custom')[columnName];
    },

    refreshDisplayedData: function() {
        this.set('displayedData', this.applySort(this.applyFilters(this.get('data'))));
    },

    onSort: function(event) {
        this.sort(event.context);
    },

    sort: function(columnName, direction) {
        this.setCurrentSort(columnName, direction);
        this.refreshDisplayedData();
    },

    setCurrentSort: function(columnName, direction) {
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

    generateTSV: function() {
        var contents = '';
        var keys = [];
        this.get('displayedColumns').forEach(function(column, index) {
            keys.push(column.get('name'));
        });

        var datas = this.get('displayedData').toArray();
        for (var rowIndex = 0; rowIndex < datas.length; rowIndex++) {
            var row = datas[rowIndex];
            var values = [];

            this.get('displayedColumns').forEach(function(column, index) {
                var item = Ember.get(row, column.get('name'));
                values.push(item);
            });
            contents += values.join("\t") + "\r\n";
        }
        return keys.join("\t") + "\r\n" + contents;
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

    expandColumnsDefinition: function() {
        /*if (this.shouldPersistParams()) {
            var previouslyDisplayed = this.retrieveParam('displayedColumns');
        }*/

        if (this.get('columns') === null) {
            // TODO : add a check on 'modelType'
           this.set('columns', this.getColumnsFromModel());
        }

        var cols = [], data = this.get('data');
        this.get('columns').forEach(function(column) {
            cols.pushObject(Cabernet.Datagrid.Column.createFromOptions(column, data));
        });
        return cols;
    },

    getColumnsFromModel: function() {
        var cols = [],
            props = this.get('modelType').__metadata__.definedProperties;
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

Cabernet.Datagrid.Column = Ember.Object.extend({
    name: '',
    label: '',
    type: String,
    displayed: true,
    sort: false,
    filterable: true,
    filter: null,
    hideable: true,

    sortClass: function() {
        var sortDir = this.get('sort');
        if (sortDir === 'up') return 'headerSortUp';
        if (sortDir === 'down') return 'headerSortDown';
        return '';
    }.property('sort')
});

Cabernet.Datagrid.Column.reopenClass({
    createFromOptions: function(options, data) {
        if (typeof options === 'string') options = { name: options };
        Ember.assert("Column objects must have a 'name' property", options.hasOwnProperty('name'));

        options.label = options.label || Cabernet.I18n.translate(options.name);
        options.type = options.type || String;

        if (!options.hasOwnProperty('filterable') || options.filterable === true) {
            if (options.filter !== undefined) {
                var filterOpts = options.filter;
            } else {
                var filterType;
                switch(options.type) {
                    case Date:
                        filterType = 'daterange';
                        break;
                    case Number:
                        filterType = 'range';
                        break;
                    case Boolean:
                        filterType = 'boolean';
                        break;
                    default:
                        filterType = 'text';
                        break;
                }
                var filterOpts = { type: filterType };
            }
            if (typeof filterOpts === 'string') filterOpts = { type: filterOpts };
            filterOpts.column = options.name;
            
            options.filter = Cabernet.Datagrid.Filter.createFromOptions(filterOpts, data);
        } 

        return this.create(options);
    }
});

Cabernet.Datagrid.Filter = Ember.Object.extend({
    column: '',
    value: '',

    isText: function() {
        return this.get('type') === 'text';
    }.property('type'),

    isPick: function() {
        return this.get('type') === 'pick';
    }.property('type'),

    isRange: function() {
        return this.get('type') === 'range';
    }.property('type'),

    isDaterange: function() {
        return this.get('type') === 'daterange';
    }.property('type'),

    isBoolean: function() {
        return this.get('type') === 'boolean';
    }.property('type'),

    getValueFor: function(item) {
        return item instanceof Ember.Object ? item.get(this.get('column')) : item[this.get('column')];
    },

    applied: function() {
        return !Ember.empty(this.get('value'));
    }.property('value')
});

Cabernet.Datagrid.Filter.reopenClass({
    createFromOptions: function(options, data) {
        var klassName = options.type.charAt(0).toUpperCase() + options.type.slice(1) + 'Filter',
            klass = Cabernet.Datagrid[klassName];
        if (klass.hasOwnProperty('expandOptions')) options = klass.expandOptions(options, data);
        return klass.create(options);
    }
});

Cabernet.Datagrid.TextFilter = Cabernet.Datagrid.Filter.extend({
    type: 'text',

    apply: function(data) {
        var regex = new RegExp(this.get('value'), 'i', 'g');
        return data.filter(function(item) {
            return this.getValueFor(item).toString().match(regex);
        }, this);
    }
});

Cabernet.Datagrid.PickFilter = Cabernet.Datagrid.Filter.extend({
    type: 'pick',
    values: null,

    apply: function(data) {
        var value;
        return data.filter(function(item) {
            return this.get('value').contains(this.getValueFor(item));
        }, this);
    },

    applied: function() {
        return Ember.isArray(this.get('value')) 
            && this.get('values').get('length') != this.get('value').get('length');
    }.property('value')
});

Cabernet.Datagrid.PickFilter.reopenClass({
    expandOptions: function(options, data) {
        options.values = options.values || data.mapProperty(options.column).uniq();
        return options;
    }
});

Cabernet.Datagrid.RangeFilter = Cabernet.Datagrid.Filter.extend({
    type: 'range',
    
    selectedMax: function() {
        return !Ember.empty(this.get('value')) ? this.get('value')[1] : this.get('max');
    }.property('value'),

    selectedMin: function() {
        return !Ember.empty(this.get('value')) ? this.get('value')[0] : this.get('min');
    }.property('value'),

    apply: function(data) {
        var value, min = this.get('value')[0], max = this.get('value')[1];
        return data.filter(function(item) {
            value = this.getValueFor(item);

            var isValueCorrect = true;
            if (!Ember.empty(min)) {
                isValueCorrect = (value >= min);
            }
            if (!Ember.empty(max)) {
                isValueCorrect = (isValueCorrect && value <= max);
            }
            
            return isValueCorrect;
        }, this);
    },

    applied: function() {
        return this.get('selectedMin') != this.get('min') || this.get('selectedMax') != this.get('max');
    }.property('value')
});

Cabernet.Datagrid.RangeFilter.reopenClass({
    expandOptions: function(options, data) {
        options.max = options.max || Math.max.apply(Math, data.mapProperty(options.column));
        options.min = options.min || Math.min.apply(Math, data.mapProperty(options.column));
        options.step = options.step || 1;
        return options;
    }
});

Cabernet.Datagrid.DaterangeFilter = Cabernet.Datagrid.Filter.extend({
    type: 'datarange',
    selectedMin: '',
    selectedMax: '',

    selectedDatesChanged: function() {
        if (Ember.empty(this.get('selectedMin')) && Ember.empty(this.get('selectedMax'))) this.set('value', '');
        else this.set('value', [this.get('selectedMin'), this.get('selectedMax')]);
    }.observes('selectedMin', 'selectedMax'),

    apply: function(data) {
        var value, 
            min = !Ember.empty(this.get('value')[0]) ? moment(this.get('value')[0]).unix() : null,
            max = !Ember.empty(this.get('value')[1]) ? moment(this.get('value')[1]).unix() : null;
        return data.filter(function(item) {
            value = moment(this.getValueFor(item)).unix();
            return (min === null || value >= min) && (max === null || value <= max);
        }, this);
    },

    applied: function() {
        return Ember.isArray(this.get('value'));
    }.property('value')
});

Cabernet.Datagrid.BooleanFilter = Cabernet.Datagrid.Filter.extend({
    type: 'boolean',

    apply: function(data) {
        return data.filter(function(item) {
            return this.getValueFor(item) === this.get('value');
        }, this);
    }
});

Cabernet.Datagrid.FilterView = Cabernet.Popover.extend({
    classNames: ['filter'],
    placement: 'below left',
    withArrow: false,
    linkTemplate: '<a {{bindAttr class="linkClass"}} {{action "toggle"}}>U</a>',

    linkClass: function() {
        var klass = 'filterlink';
        if (this.get('filter').get('applied') === true) klass+= ' active';
        return klass;
    }.property('filter.applied')
});

Cabernet.Datagrid.PickFilterView = Cabernet.Datagrid.FilterView.extend({
    contentTemplate: '<ul class="inputs-list"> \
                        {{#each distinctValues}} \
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
    }.property().cacheable(),

    didInsertElement: function() {
        this.addObserver('distinctValues.@each.checked', function checkedValuesChanged() {
            var checkedValues = this.get('distinctValues').filterProperty('checked').mapProperty('value');
            this.get('filter').set('value', checkedValues);
        });
    }
});

Cabernet.Datagrid.RangeFilterView = Cabernet.Datagrid.FilterView.extend({
    contentTemplate: '<p>{{t "cabernet.datagrid.fromValue"}} {{filter.selectedMin}} \
        {{t "cabernet.datagrid.toValue"}} {{filter.selectedMax}}</p><div class="slider-range"></div>',

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

Cabernet.Datagrid.DaterangeFilterView = Cabernet.Datagrid.FilterView.extend({
    contentTemplate: '<p>{{t "cabernet.datagrid.fromDate"}} {{view Ember.TextField classNames="min-date" valueBinding="filter.selectedMin"}} \
        {{t "cabernet.datagrid.toDate"}} {{view Ember.TextField classNames="max-date" valueBinding="filter.selectedMax"}}</p>',

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

Cabernet.Datagrid.TextFilterView = Cabernet.Datagrid.FilterView.extend({
    contentTemplate: '{{view Cabernet.Datagrid.FilterTextField valueBinding="filter.value"}}',

    toggle: function(e) {
        this._super(e);
        var field = this.$('input');
        if (field.is(':visible')) field.focus();
    }
});

Cabernet.Datagrid.FilterTextField = Ember.TextField.extend({
    insertNewline: function() {
        //this.get('parentView').applyFilter(this.get('value'));
    }
});

Cabernet.Datagrid.BooleanFilterView = Cabernet.Datagrid.FilterView.extend({
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

Cabernet.Datagrid.OptionsView = Cabernet.Popover.extend({
    classNames: ['options'],
    placement: 'below left',
    withArrow: false,
    linkTemplate: '<a class="toggle" {{action "toggle"}}>{{t "cabernet.datagrid.options"}}</a>',
    contentTemplate: '<div class="clipboard-wrapper" style="position:relative"> \
                            <div class="clipboard-button">{{t "cabernet.datagrid.copyToClipboard"}}</div> \
                        </div> \
                        <hr /> \
                        {{view Ember.CollectionView tagName="ul" class="inputs-list" \
                        itemViewClass="Cabernet.Datagrid.ColumnpickerElement" contentBinding="columns"}}',

    didInsertElement: function() {
        var clipClient = new ZeroClipboard.Client();
        clipClient.setText('');
        clipClient.setHandCursor(true);
        clipClient.setCSSEffects(true);
        clipClient.glued = false;

        this.set('clipClient', clipClient);

        var that = this;
        this.get('clipClient').addEventListener('mouseDown', function(client) {
            that.get('clipClient').setText(that.get('parentView').generateTSV());
        });
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

Cabernet.Datagrid.ColumnpickerElement = Ember.View.extend({
    template: Ember.Handlebars.compile(
        '<label> \
            {{#if content.hideable}} \
                {{view Ember.Checkbox checkedBinding="content.displayed"}} \
            {{else}} \
                {{view Ember.Checkbox checkedBinding="content.displayed" disabled="disabled"}} \
            {{/if}} \
            <span>{{content.label}}</span> \
        </label>'
    )
});
