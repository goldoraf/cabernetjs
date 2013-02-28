 Cabernet.Datagrid = Ember.View.extend({
    
    template: function() {
        return Ember.Handlebars.compile(
            '<table class="dg-table">\
                {{{colgroup}}}\
                <thead>' + this.get('headerTemplate') + '</thead>\
                <tfoot>' + this.get('footerTemplate') + '</tfoot>\
                <tbody />\
            </table>\
            <div class="datagrid-options">\
                {{#if copyToClipboardEnabled}}\
                    {{view Cabernet.Datagrid.ClipboardView gridBinding="this"}}\
                {{/if}}\
                {{#if columnPickerEnabled}}\
                    {{view Cabernet.Datagrid.ColumnpickerView columnsBinding="columnsForDisplay"}}\
                {{/if}}\
            </div>'
        );
    }.property('headerTemplate', 'footerTemplate').cacheable(),

    headerTemplate:
        '<tr> \
            {{#each column in columnsForDisplay}} \
                <th>\
                    <div {{bindAttr class=":dg-table-header view.filterable:dg-filterable column.sortable:dg-sortable"}}> \
                        {{#if column.sortable}} \
                            <a class="sortlink" {{action onSort context="column.name"}}>{{column.label}}</a> \
                            <div class="dg-header-widget icon-sort-wrapper">\
                                <span {{bindAttr class="column.sortClass :dg-header-widget :icon-sort" }}></span>\
                            </div> \
                        {{else}} \
                            {{column.label}} \
                        {{/if}}\
                        <div class="dg-header-widget icon-filter-wrapper">\
                            {{#if view.filterable}} \
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
                            {{/if}} \
                        </div>\
                    </div> \
                </th> \
            {{/each}} \
        </tr>',

    footerTemplate: 
        '{{#if hasSumableColumns}} \
            <tr> \
                {{#each sum in computedSums}} \
                    <th {{bindAttr class="sum.css"}}>{{sum.value}}</th> \
                {{/each}} \
            </tr> \
        {{/if}}',

    colgroup: function() {
        return '<colgroup>' + '<col/>'.repeat(this.get('columnsForDisplay').get('length')) + '</colgroup>';
    }.property(),

    data: [],
    modelType: null,
    columns: null,
    custom: {},
    defaultSort: null,
    sessionBucket: null,
    columnsClassNames: null,
    filterable: true,
    copyToClipboardEnabled: true,
    columnPickerEnabled: true,
    resizableColumns: false,
    widthFixedColumns: true,

    classNames: ['datagrid'],
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
        return this.get('columnsForDisplay').filter(function(col) {
          return col.get('displayed') || ! col.get('hideable');
        });
    }.property('columnsForDisplay.@each.displayed'),

    filters: function() {
        return this.get('columnsForDisplay').map(function(column) {
            if (column.get('filterable') === true)
                return column.get('filter');
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

    hasSumableColumns: function() {
        return this.get('displayedData').get('length') !== 0 && this.get('columnsForDisplay').filterProperty('sumable').get('length') !== 0;
    }.property('columnsForDisplay.@each.sumable', 'displayedData'),

    computedSums: function() {
        if (this.get('displayedData').get('length') === 0) return [];
        var sum, sums = [];
        this.get('columnsForDisplay').forEach(function(column) {
            if (!column.get('sumable')) sums.push({ css: column.get('classNames'), value: ''});
            else {
                sum = this.computeSum(column.get('name'));
                if (column.get('format')) sum = column.get('format')(sum);
                sums.push({ css: column.get('classNames'), value: sum});
            }
        }, this);
        return sums;
    }.property('columnsForDisplay', 'displayedData'),

    hasFormatableColumns: function() {
        return this.get('columnsForDisplay').filterProperty('format').get('length') !== 0;
    }.property('columnsForDisplay.@each.format').cacheable(),

    formatableColumns: function() {
        return this.get('columnsForDisplay').filterProperty('format');
    }.property('columnsForDisplay'),

    init: function() {
        this._super();

        this.setI18nStrings();

        if (this.get('copyToClipboardEnabled')) {
            Ember.warn(
                'Cabernet uses ZeroClipboard for copy-to-clipboard feature, but it was not found. Make sure you included the dependency.',
                window.ZeroClipboard !== undefined
            );
        }

        var initialSort = this.get('defaultSort');
        if (this.shouldPersistParams()) {
            var persistedSort = this.retrieveParam('sort');
            if (!Ember.none(persistedSort)) initialSort = persistedSort;
        }
        this.setInitialSort(initialSort);

        this.refreshDisplayedData();

        this.addObserver('displayedData', function displayedDataChanged() {
            this.renderGrid();
            this.get('columnsForDisplay').filterProperty('displayed', false).forEach(function(col) {
              this.toggleColumnCells(this.getColumnIndex(col.get('name')));
            }, this);
        });
    },

    didInsertElement: function() {
        this.renderGrid();
        this.fixColumnsWidth();
        this.initColumnResizing();
        this.initColumnHiding();
        
        /*var that = this;
        this.$('thead > tr').sortable({
            axis: 'x',
            cursor: 'pointer',
            helper: 'clone',
            containment: 'parent',
            placeholder: 'ui-state-highlight',
            scroll: true,
            tolerance: 'pointer',
            update: that.onColumnSort
        });*/
    },

    renderGrid: function() {
        if (this.get('displayedData').get('length') === 0) {
            this.$('tbody').replaceWith(this.get('emptyTemplate')({ 
                columnCount: this.get('columnsForDisplay').get('length') + 1
            }));
        } else {
            this.$('tbody').replaceWith(this.get('gridTemplate')({ data: this.applyFormatting(this.get('displayedData')) }));

            // Workaround for the element:first css selector
            this.$("tbody tr:first").addClass("row-0");
            this.$("tr > td:eq(0), tr > th:eq(0)").addClass("cell-0");
        }
        this.didRenderGrid();
    },

    didRenderGrid: function() {

    },

    emptyTemplate: function() {
        return Cabernet.Handlebars.compile('<tbody><tr><td class="datagrid-empty" colspan="{{columnCount}}">{{t "cabernet.datagrid.empty"}}</td></tr></tbody>');
    }.property(),

    gridTemplate: function() {
        var custom, inner, css, html = [],
            columnCount = this.get('columnsForDisplay').get('length');
        
        this.get('columnsForDisplay').forEach(function(col, index) {
            custom = this.getCustomDisplay(col.name);
            inner = (custom !== null) ? custom : '{{this.'+col.name+'}}';
            css = (!Ember.empty(col.get('classNames'))) ? ' class="'+col.get('classNames')+'"' : '';
            html.push('<td'+css+'>'+inner+'</td>');
        }, this);
        
        return Cabernet.Handlebars.compile('<tbody>{{#list data}}<tr>'+html.join('')+'</tr>{{/list}}</tbody>');
    }.property('columnsForDisplay').cacheable(),

    getCustomDisplay: function(columnName) {
        if (!this.get('custom').hasOwnProperty(columnName)) return null;
        return this.get('custom')[columnName];
    },

    refreshDisplayedData: function() {
        this.set('displayedData', this.applySort(this.applyFilters(this.get('data'))));
    },

    fixColumnsWidth: function() {
        if (this.get('widthFixedColumns') === false) return;

        var col, table = this.$('table');
        this.$('thead th').each(function(index) {
            col = table.find("colgroup > col:nth-child(" + (index + 1) + ")");
            col.css('width', $(this).width()+'px');
        });
        this.$('table').css('tableLayout', 'fixed')
    },

    initColumnResizing: function() {
        if (this.get('resizableColumns') === false) return;

        var table = this.$('table');
        this.$('div.header-wrapper').each(function(index) {
            $(this).resizable({
                handles: "e",

                // set correct COL element and original size
                start: function(event, ui) {
                    var colIndex = index + 1;
                    colElement = table.find("colgroup > col:nth-child(" +
                    colIndex + ")");

                    // get col width (faster than .width() on IE)
                    colWidth = parseInt(colElement.get(0).style.width, 10);
                    originalSize = ui.size.width;
                },

                // set COL width
                resize: function(event, ui) {
                    var resizeDelta = ui.size.width - originalSize;

                    var newColWidth = colWidth + resizeDelta;
                    colElement.width(newColWidth);

                    // height must be set in order to prevent IE9 to set wrong height
                    //$(this).css("height", "auto");
                }
            });
        });
    },

    initColumnHiding: function() {
        this.get('columnsForDisplay').filterProperty('displayed', false).forEach(function(col) {
            this.toggleColumn(col.get('name'));
        }, this);

        if (this.shouldPersistParams()) {
            var previouslyDisplayed = this.retrieveParam('displayedColumns');
            if (!Ember.none(previouslyDisplayed)) {
                this.get('columnsForDisplay').forEach(function(col) {
                    if (!previouslyDisplayed.contains(col.get('name'))) {
                        col.set('displayed', false);
                    }
                });
            }
        }
        this.addObserver('displayedColumns', function displayedColumnsChanged() {
            this.saveParam('displayedColumns', this.get('displayedColumns').mapProperty('name'));
        });
    },

   toggleColumn: function(columnName) {
     var index = this.getColumnIndex(columnName);
     this.toggleColumnHeaders(index);
     this.toggleColumnCells(index);
   },

   toggleColumnHeaders: function(index) {
     this.$('th:eq('+index+')').toggle();
   },

   toggleColumnCells: function(index) {
     this.$('td:nth-child('+(index+1)+')').toggle();
   },

    getColumnIndex: function(columnName) {
        var colIndex;
        this.get('columnsForDisplay').forEach(function(col, index) {
            if (col.get('name') == columnName) {
                colIndex = index;
                return;
            }
        });
        return colIndex;
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
              direction  = (actualSort === 'up') ? 'down' : 'up';
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
            if (aValue instanceof Date) aValue = aValue.getTime();
            if (bValue instanceof Date) bValue = bValue.getTime();
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

    applyFormatting: function(data) {
        if (!this.get('hasFormatableColumns')) return data;
        var formatableColumns = this.get('formatableColumns');
        if (formatableColumns.get('length') === 0) return data;
        var ret = [], rowCopy;
        data.forEach(function(row) {
            rowCopy = Ember.copy(row);
            formatableColumns.forEach(function(col) {
                rowCopy[col.get('name')] = col.get('format')(rowCopy[col.get('name')], rowCopy);
            });
            ret.push(rowCopy);
        });
        return ret;
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

    computeSum: function(columnName) {
        return this.get('displayedData').mapProperty(columnName).reduce(function(previous, current) {
            if (previous === undefined) return current; // Because IE is a bitch...
            return previous + current;
        });
    },

    generateTSV: function() {
        var contents = '';
        var keys = [];
        this.get('columnsForDisplay').forEach(function(column, index) {
            keys.push(column.get('label'));
        });

        var datas = this.get('displayedData').toArray();
        for (var rowIndex = 0; rowIndex < datas.length; rowIndex++) {
            var row = datas[rowIndex];
            var values = [];

            this.get('columnsForDisplay').forEach(function(column, index) {
                var item = Ember.get(row, column.get('name')),
                    format = column.get('format');
                if (format) item = format(item, row);
                values.push(item);
            });
            contents += values.join("\t") + "\r\n";
        }
        return keys.join("\t") + "\r\n" + contents;
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

    expandColumnsDefinition: function() {
        if (this.get('columns') === null) {
            // TODO : add a check on 'modelType'
           this.set('columns', this.getColumnsFromModel());
        }

        var col, jsonValue, cols = [], data = this.get('data'), colsDef = this.get('columns'),
            appliedFilters  = this.shouldPersistParams() ? this.retrieveParam('filters') : null,
            previouslyFiltered = !Ember.none(appliedFilters) ? appliedFilters.mapProperty('column') : null;

        colsDef.forEach(function(column) {
            col = Cabernet.Datagrid.Column.createFromOptions(this, column, data);
            if (!Ember.none(previouslyFiltered) && previouslyFiltered.contains(col.get('name'))) {
                jsonValue = appliedFilters.findProperty('column', col.get('name')).value;
                col.get('filter').set('value', col.get('filter').hydrateValue(jsonValue));
            }
            cols.pushObject(col);
        }, this);

        Ember.warn("'columnsClassNames' option is deprecated. Use 'classNames' option per column instead.", this.get('columnsClassNames') === null);
        if (this.get('columnsClassNames') !== null) {
            var classNames = this.get('columnsClassNames');
            for (var colName in classNames) cols.findProperty('name', colName).set('classNames', classNames[colName]);
        }

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
    },

    onClipboardClick: Ember.K
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
    hiddenInColumnPicker: false,
    sortable: true,
    sumable: false,
    format: false,
    classNames: '',
    controller: null,

    displayedChanged: function() {
      if(this.get('hideable')) {
        this.get('controller').toggleColumn(this.get('name'));
      }
    }.observes('displayed'),

    sortClass: function() {
        var sortDir = this.get('sort');
        return sortDir;
    }.property('sort')
});

Cabernet.Datagrid.Column.reopenClass({
    createFromOptions: function(controller, options, data) {
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

            if (options.type === Date || filterOpts.type == 'daterange') {
                Ember.warn("Column '" + options.name + "' has been defined as of Date type and/or 'daterange' filter but the data provided seems not to be of Date type. " +
                    "Filtering and sorting may not behave properly", !Ember.empty(data) && data.get('firstObject')[options.name] instanceof Date);
            }

            if (options.format) filterOpts.format = options.format;

            options.filter = Cabernet.Datagrid.Filter.createFromOptions(filterOpts, data);
        }

        options.controller = controller;

        return this.create(options);
    }
});

Cabernet.Datagrid.Filter = Ember.Object.extend({
    column: '',
    value: '',
    format: false,

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

    hydrateValue: function(value) {
        return value;
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

    formattedSelectedMax: function() {
        if (this.get('format') !== false) return this.get('format')(this.get('selectedMax'));
        return this.get('selectedMax');
    }.property('selectedMax'),

    selectedMin: function() {
        return !Ember.empty(this.get('value')) ? this.get('value')[0] : this.get('min');
    }.property('value'),

    formattedSelectedMin: function() {
        if (this.get('format') !== false) return this.get('format')(this.get('selectedMin'));
        return this.get('selectedMin');
    }.property('selectedMin'),

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
        var v, value,
            min = !Ember.empty(this.get('value')[0]) ? this.get('value')[0].getTime() : null,
            max = !Ember.empty(this.get('value')[1]) ? this.get('value')[1].getTime() : null;
        return data.filter(function(item, index) {
            v = this.getValueFor(item);
            value = v instanceof Date ? v.getTime() : v;
            return (min === null || value >= min) && (max === null || value <= max);
        }, this);
    },

    hydrateValue: function(value) {
        if (!Ember.empty(value[0])) value[0] = new Date(Date.parse(value[0]));
        if (!Ember.empty(value[1])) value[1] = new Date(Date.parse(value[1]));
        return value;
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
    contentTemplate: '<p>{{t "cabernet.datagrid.fromValue"}} {{filter.formattedSelectedMin}} \
        {{t "cabernet.datagrid.toValue"}} {{filter.formattedSelectedMax}}</p><div class="slider-range"></div>',

    applyFilter: function(value) {
        this.get('filter').set('value', value);
    },

    didInsertElement: function() {
        var that = this;
        this.$('div.slider-range').slider({
            range: true,
            min: this.get('filter').get('min'),
            max: this.get('filter').get('max'),
            values: [this.get('filter').get('selectedMin'), this.get('filter').get('selectedMax')],
            step: this.get('filter').get('step'),
            slide: function(event, ui) {
                that.get('filter').set('value', ui.values);
            }
        });
    }
});

Cabernet.Datagrid.DaterangeFilterView = Cabernet.Datagrid.FilterView.extend({
    contentTemplate: '<p>{{t "cabernet.datagrid.fromDate"}} <input type="text" class="min-date" /> \
        {{t "cabernet.datagrid.toDate"}} <input type="text" class="max-date" /></p>',

    didInsertElement: function() {
        var that = this,
            minDateInput = this.$('input.min-date'),
            maxDateInput = this.$('input.max-date'),
            filterValue  = this.get('filter').get('value');
        minDateInput.datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1,
            dateFormat: 'yy-mm-dd',
            onClose: function(selectedDate) {
                maxDateInput.datepicker("option", "minDate", selectedDate);
            },
            onSelect: function() {
                that.get('filter').set('selectedMin', minDateInput.datepicker('getDate'));
            }
        });
        if (Ember.isArray(filterValue) && !Ember.empty(filterValue[0])) {
            minDateInput.datepicker('setDate', filterValue[0]);
        }
        maxDateInput.datepicker({
            defaultDate: "+1w",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1,
            dateFormat: 'yy-mm-dd',
            onClose: function(selectedDate) {
                minDateInput.datepicker("option", "maxDate", selectedDate);
            },
            onSelect: function() {
                that.get('filter').set('selectedMax', maxDateInput.datepicker('getDate'));
            }
        });
        if (Ember.isArray(filterValue) && !Ember.empty(filterValue[1])) {
            maxDateInput.datepicker('setDate', filterValue[1]);
        }
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
        this.get('parentView').toggle();
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

Cabernet.Datagrid.ClipboardView = Ember.View.extend({
    classNames: ['clipboard'],
    template: Ember.Handlebars.compile(
        '<div class="clipboard-wrapper" style="position:relative"> \
            <div class="clipboard-button">{{t "cabernet.datagrid.copyToClipboard"}}</div> \
        </div>'
    ),

    didInsertElement: function() {
        var clipClient = new ZeroClipboard.Client();
        clipClient.setText('');
        clipClient.setHandCursor(true);
        clipClient.setCSSEffects(true);
        clipClient.glue(this.$('div.clipboard-button').get(0), this.$('div.clipboard-wrapper').get(0));

        this.set('clipClient', clipClient);

        var that = this;
        this.get('clipClient').addEventListener('mouseDown', function(client) {
            that.get('clipClient').setText(that.get('parentView').generateTSV());
            that.get('grid').onClipboardClick();
        });
    }
});

Cabernet.Datagrid.ColumnpickerView = Cabernet.Popover.extend({
    classNames: ['columnpicker'],
    placement: 'above right',
    collision: 'none flip',
    withArrow: false,
    linkTemplate: '<a class="toggle" {{action "toggle"}}>{{t "cabernet.datagrid.options"}}</a>',
    contentTemplate: '{{view Ember.CollectionView tagName="ul" class="inputs-list"\
                            itemViewClass="Cabernet.Datagrid.ColumnpickerElement" contentBinding="columns"}}'
});

Cabernet.Datagrid.ColumnpickerElement = Ember.View.extend({
    template: Ember.Handlebars.compile(
        '<label> \
        {{#unless content.hiddenInColumnPicker}} \
            {{#if content.hideable}} \
                {{view Ember.Checkbox checkedBinding="content.displayed"}} \
            {{else}} \
                {{view Ember.Checkbox checkedBinding="content.displayed" disabled="disabled"}} \
            {{/if}} \
            <span>{{content.label}}</span> \
        {{/unless}} \
        </label>'
    )
});
