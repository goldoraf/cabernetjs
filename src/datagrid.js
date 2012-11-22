Ember.ENV.RAISE_ON_DEPRECATION = false;
if (Em.I18n !== undefined) {
    Cabernet.translate = Em.I18n.t;
} else {
    Cabernet.translate = Ember.String.loc;
}

Cabernet.Datagrid = Ember.View.extend({
    
    template: Ember.Handlebars.compile(
        '   <div><div class="datagrid-header">\
                    {{view Cabernet.Datagrid.Columnpicker columnsBinding="columnsForDisplay"}}\
                    <div id="clipboard-wrapper" style="position: relative" class="table-header-add-on"><a id="clipboard-button">Copy</a></div>\
                </div>\
                <div><table> \
                <thead> \
                    <tr> \
                        {{#each column in displayedColumns}} \
                            <th {{bindAttr class="column.sortClass" }}>\
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
                                {{/if}} \
                                <a class="sortlink" {{action onSort context="column.name"}}>{{column.label}}</a> \
                            </th> \
                        {{/each}} \
                    </tr> \
                </thead> \
                <tbody /> \
            </table></div></div> \
        '),

    data: [],
    modelType: null,
    columns: null,
    custom: {},
    defaultSort: null,
    emptyText: 'No results found',
    sessionBucket: null,

    classNames: ['datagrid'],
    columnsClassNames: {},
    displayedData: [],
    clipClient: null,

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
        this.applyFilters();
        //if (this.shouldPersistParams()) this.persistFilters();
    }.observes('appliedFilters.@each'),

    init: function() {
        this._super();
        
        this.addObserver('displayedColumns', function displayedColumnsChanged() {
            this.saveParam('displayedColumns', this.get('displayedColumns').mapProperty('name'));
            this.renderGrid();
        });

        this.set('displayedData', this.get('data'));
        if (this.shouldPersistParams()) {
            var persistedSort = this.retrieveParam('sort');
            if (!Ember.none(persistedSort)) this.set('defaultSort', persistedSort);
        }
        this.applyDefaultSort();
        this.addObserver('displayedData', function displayedDataChanged() {
            this.renderGrid();
        });

    },

    didInsertElement: function() {
        this.renderGrid();
        var newClipClient = new ZeroClipboard.Client();
        this.set("clipClient", newClipClient);
        this.get("clipClient").setText( '' );
        this.get("clipClient").setHandCursor( true );
        this.get("clipClient").setCSSEffects( true );

        var that = this;
        this.get("clipClient").addEventListener( 'mouseDown', function(clipClient) {
            that.copyToClipboard();
        });

        this.get("clipClient").glue('clipboard-button', 'clipboard-wrapper') ;
    },

    renderGrid: function() {
        if (this.get('displayedData').get('length') === 0) {
            this.$('tbody').replaceWith(this.get('emptyTemplate')({ 
                columnCount: this.get('displayedColumns').get('length'),
                emptyText: this.get('emptyText')
            }));
        } else
            this.$('tbody').replaceWith(this.get('gridTemplate')({ data: this.get('displayedData') }));
    },

    emptyTemplate: function() {
        return Handlebars.compile('<tbody><tr><td class="datagrid-empty" colspan="{{columnCount}}">{{emptyText}}</td></tr></tbody>');
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

    applyFilters: function() {
        var data = this.get('data');
        this.get('appliedFilters').forEach(function(filter) {
            data = filter.apply(data);
        });
        this.set('displayedData', data);
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
    },

    onSort: function(event) {
        this.sort(event.context);
    },

    sort: function(columnName, direction) {
        var column = this.get('columnsForDisplay').findProperty('name', columnName);
        if (direction === undefined) {
            var actualSort = column.get('sort'),
                direction  = (actualSort === 'down') ? 'up' : 'down';
        }

        this.get('columnsForDisplay').setEach('sort', false);
        column.set('sort', direction);
        
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

    copyToClipboard: function() {
        var tsv = this.generateTSV();
        this.get("clipClient").setText(tsv);
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

        options.label = options.label || Cabernet.translate(options.name);
        options.type = options.type || String;

        if (!options.hasOwnProperty('filterable') || options.filterable === true) {
            var filterOpts = options.filter || { type: 'text' };
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
    view: Cabernet.Datagrid.TextFilterView,

    apply: function(data) {
        var regex = new RegExp(this.get('value'), 'i', 'g');
        return data.filter(function(item) {
            return this.getValueFor(item).toString().match(regex);
        }, this);
    }
});

Cabernet.Datagrid.PickFilter = Cabernet.Datagrid.Filter.extend({
    type: 'pick',
    view: Cabernet.Datagrid.PickFilterView,
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
    view: Cabernet.Datagrid.RangeFilterView,

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
    view: Cabernet.Datagrid.DaterangeFilterView,
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

Cabernet.Datagrid.FilterView = Cabernet.Popover.extend({
    classNames: ['filter'],
    placement: 'below',
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
    contentTemplate: '<p>From {{filter.selectedMin}} to {{filter.selectedMax}}</p><div class="slider-range"></div>',

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
    contentTemplate: '<p>From {{view Ember.TextField classNames="min-date" valueBinding="filter.selectedMin"}} \
        to {{view Ember.TextField classNames="max-date" valueBinding="filter.selectedMax"}}</p>',

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
    contentTemplate: '{{view Cabernet.Datagrid.FilterTextField}}',

    applyFilter: function(value) {
        this.get('filter').set('value', value);
    },

    toggle: function(e) {
        this._super(e);
        var field = this.$('input');
        if (field.is(':visible')) field.focus();
    }
});

Cabernet.Datagrid.FilterTextField = Ember.TextField.extend({
    insertNewline: function() {
        this.get('parentView').applyFilter(this.get('value'));
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
            {{#if content.hideable}} \
                {{view Ember.Checkbox checkedBinding="content.displayed"}} \
            {{else}} \
                {{view Ember.Checkbox checkedBinding="content.displayed" disabled="disabled"}} \
            {{/if}} \
            <span>{{content.label}}</span> \
        </label>'
    )
});
