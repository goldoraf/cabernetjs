(function() {
window.Cabernet = Ember.Namespace.create({
  CURRENT_API_REVISION: 1
});

Handlebars.registerHelper('list', function(context, options) {
  var fn = options.fn;
  var ret = "";

  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      ret = ret + fn(context[i]);
    }
  }
  return ret;
});

})();



(function() {
Cabernet.Popover = Ember.View.extend({
    linkText: '',
    defaultLinkTemplate: '<a {{action "toggle"}}>{{linkText}}</a>',
    linkTemplate: null,
    contentTemplate: '',
    placement: 'below',

    init: function() {
        this.set('template', this.generateTemplate());
        return this._super();
    },

    toggle: function(e) {
        if (e) e.stopPropagation();

        var popover = this.$('div.popover');
        popover.toggle();
        if (popover.is(':visible')) {
            $('div.popover.active').removeClass('active').hide();
            popover.addClass('active');
            var params = this.getPositionParams(popover);
            popover.position({
                of: this.$('a'),
                my : params.my,
                at: params.at,
                offset: params.offset
            });
            if (params.arrowLeft !== undefined) popover.children('div.arrow').css('left', params.arrowLeft);
            
            popover.bind('clickoutside', function(e) {
                $(this).removeClass('active').hide().unbind('clickoutside');
            });
        } else {
            popover.removeClass('active').hide().unbind('clickoutside');
        }
    },

    generateTemplate: function() {
        var linkTmpl = Ember.none(this.get('linkTemplate')) ? this.get('defaultLinkTemplate') : this.get('linkTemplate');
        var placementClass = this.get('placement');
        if (placementClass == 'below left' || placementClass == 'below right') placementClass = 'below';
        else if (placementClass == 'above left' || placementClass == 'above right') placementClass = 'above';
        return Ember.Handlebars.compile(
            linkTmpl +
            '<div class="popover ' + placementClass + '"> \
                <div class="arrow"></div> \
                <div class="inner"> \
                    <div class="content">' +
                        this.get('contentTemplate') +
                    '</div> \
                </div> \
            </div>');
    },

    getPositionParams: function(popoverElt) {
        var width = popoverElt.css('width').replace(/px/, '');
        var params = {
            'right': { my: 'left', at: 'right', offset: '0' },
            'below': { my: 'top', at: 'bottom', offset: '0' },
            'above': { my: 'bottom', at: 'center', offset: '0' },
            'left': { my: 'right', at: 'left', offset: '0' },
            'below right': { my: 'left top', at: 'center bottom', offset: '0', arrowLeft: '20px' },
            'below left' : { my: 'right top', at: 'right bottom', offset: '20 0', arrowLeft: width - 20 + 'px' },
            'above right': { my: 'left bottom', at: 'center top', offset: '0', arrowLeft: '20px' },
        }
        return params[this.get('placement')];
    }
});
})();



(function() {
Ember.ENV.RAISE_ON_DEPRECATION = false;
if (Em.I18n !== undefined) {
    Cabernet.translate = Em.I18n.t;
} else {
    Cabernet.translate = Ember.String.loc;
}

Cabernet.Datagrid = Ember.View.extend({
    
    template: Ember.Handlebars.compile(
        '{{#if emptyData}} \
            <div class="datagrid-empty"><p>{{emptyText}}</p></div> \
        {{else}} \
            <table> \
                <thead> \
                    <tr> \
                        {{#each column in displayedColumns}} \
                            <th {{bindAttr class="column.sortClass"}}> \
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
                                {{/if}} \
                                <a class="sortlink" {{action onSort context="column.name"}}>{{column.label}}</a> \
                            </th> \
                        {{/each}} \
                        <th>{{view Cabernet.Datagrid.Columnpicker columnsBinding="columnsForDisplay"}}</th> \
                    </tr> \
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
    columnsClassNames: {},
    displayedData: [],

    emptyData: function() {
        return this.get('displayedData').get('length') === 0;
    }.property('displayedData'),

    columnsForDisplay: function() {
        return this.expandColumnsDefinition();
    }.property().cacheable(),

    displayedColumns: function() {
        return this.get('columnsForDisplay').filterProperty('displayed');
    }.property('columnsForDisplay.@each.displayed'),

    filters: function() {
        return this.get('columnsForDisplay').mapProperty('filter');
    }.property('columnsForDisplay.@each.filter'),

    appliedFilters: function() {
        return this.get('filters').filter(function(item) {
            return !Ember.empty(item.get('value'));
        });
    }.property('filters.@each.value'),

    appliedFiltersChanged: function() {console.log('appliedFiltersChanged');
        this.applyFilters();
        //if (this.shouldPersistParams()) this.persistFilters();
    }.observes('appliedFilters.@each'),

    init: function() {
        this._super();
        
        //this.set('columnsForDisplay', this.expandColumnsDefinition());
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
    },

    renderGrid: function() {
        this.$('tbody').replaceWith(this.get('gridTemplate')({ data: this.get('displayedData') }));
    },

    gridTemplate: function() {
        var custom, inner, css, html = [],
            cssClasses = this.get('columnsClassNames'),
            columnCount = this.get('displayedColumns').get('length');
        
        this.get('displayedColumns').forEach(function(col, index) {
            custom = this.getCustomDisplay(col.name);
            inner = (custom !== null) ? custom : '{{this.'+col.name+'}}';
            css = (cssClasses[col.name] !== undefined) ? ' class="'+cssClasses[col.name]+'"' : '';
            if (col.get('displayed') === true) html.push('<td'+css+(index === (columnCount - 1) ? ' colspan="2">' : '>')+inner+'</td>');
        }, this);
        return Handlebars.compile('<tbody>{{#list data}}<tr>'+html.join('')+'</tr>{{/list}}</tbody>');
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
        if (this.shouldPersistParams()) {
            var previouslyDisplayed = this.retrieveParam('displayedColumns');
        }

        if (this.get('columns') === null) {
            // TODO : add a check on 'modelType'
           this.set('columns', this.getColumnsFromModel());
        }

        var cols = [];
        this.get('columns').forEach(function(columnName) {
            var colDef = (Ember.typeOf(columnName) == 'string') ? { name: columnName } : columnName;
            Ember.assert("Column objects must have a 'name' property", colDef.hasOwnProperty('name'));
            cols.pushObject(Cabernet.Datagrid.Column.create({
                name:  colDef.name,
                label: (colDef.label !== undefined) ? colDef.label : Cabernet.translate(colDef.name),
                type:  (colDef.type !== undefined) ? colDef.type : String,
                displayed: (!Ember.none(previouslyDisplayed)) ? previouslyDisplayed.contains(colDef.name) 
                                                              : ((colDef.displayed !== undefined) ? colDef.displayed : true),
                sort: false,
                filterable: (colDef.filterable !== undefined) ? colDef.filterable : true,
                filterType: (colDef.filterType !== undefined) ? colDef.filterType : 'text',
                filterValues: (colDef.filterType === 'pick') ? this.getDistinctValues(colDef.name) : null
            }));
        }, this);
        return cols;
    },

    getColumnsFromModel: function() {
        var cols = [],
            props = this.get('modelType').__metadata__.definedProperties;
        for (var propName in props) { cols.pushObject({ name: propName, type: props[propName].type }); }
        return cols;
    },

    getDistinctValues: function(columnName) {
        return this.get('data').mapProperty(columnName).uniq();
    }
});

Cabernet.Datagrid.Column = Ember.Object.extend({
    name: '',
    label: '',
    type: String,
    displayed: true,
    sort: false,
    filterable: true,
    filterType: 'text',
    filterValues: null,
    filter: null,

    init: function() {
        this._super();
        switch (this.get('filterType')) {
            case 'pick':
                this.set('filter', Cabernet.Datagrid.PickFilter.create({ column: this.get('name'), values: this.get('filterValues') }));
                break;
            case 'range':
                this.set('filter', Cabernet.Datagrid.RangeFilter.create({ column: this.get('name') }));
                break;
            default:
                this.set('filter', Cabernet.Datagrid.TextFilter.create({ column: this.get('name') }));
                break;
        }
    },

    sortClass: function() {
        var sortDir = this.get('sort');
        if (sortDir === 'up') return 'headerSortUp';
        if (sortDir === 'down') return 'headerSortDown';
        return '';
    }.property('sort')
});

Cabernet.Datagrid.Filter = Ember.Object.extend({
    column: '',
    applied: false,
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

    linkClass: function() {
        var klass = 'filterlink';
        if (this.get('applied')) klass+= ' active';
        return klass;
    }.property('applied')
});

Cabernet.Datagrid.TextFilter = Cabernet.Datagrid.Filter.extend({
    type: 'text',
    view: Cabernet.Datagrid.TextFilterView,

    apply: function(data) {
        var regex = new RegExp(this.get('value'), 'i', 'g');
        return data.filter(function(item) {
            return (item instanceof Ember.Object ? item.get(this.get('column')) : item[this.get('column')]).toString().match(regex);
        }, this);
    }
});

Cabernet.Datagrid.PickFilter = Cabernet.Datagrid.Filter.extend({
    type: 'pick',
    view: Cabernet.Datagrid.PickFilterView,

    apply: function(data) {
        var value;
        return data.filter(function(item) {
            value = (item instanceof Ember.Object ? item.get(this.get('column')) : item[this.get('column')]).toString();
            return this.get('value').contains(value);
        }, this);
    }
});

Cabernet.Datagrid.RangeFilter = Cabernet.Datagrid.Filter.extend({
    type: 'range',
    view: Cabernet.Datagrid.RangeFilterView,

    max: function() {
        return !Ember.empty(this.get('value')) ? this.get('value')[1] : null;
    }.property('value'),

    min: function() {
        return !Ember.empty(this.get('value')) ? this.get('value')[0] : null;
    }.property('value'),

    apply: function(data) {
        var value, min = this.get('value')[0], max = this.get('value')[1];
        return data.filter(function(item) {
            value = (item instanceof Ember.Object ? item.get(this.get('column')) : item[this.get('column')]).toString();
            return value >= min && value <= max;
        }, this);
    }
});

Cabernet.Datagrid.FilterView = Cabernet.Popover.extend({
    classNames: ['filter'],
    placement: 'below',
    linkTemplate: '<a {{bindAttr class="filter.linkClass"}} {{action "toggle"}}>U</a>'
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
        this.get('filter').get('values').forEach(function(v) { distinct.pushObject(Ember.Object.create({ value: v, checked: true })); });
        return distinct;
    }.property().cacheable(),

    didInsertElement: function() {
        this.addObserver('distinctValues.@each.checked', function checkedValuesChanged() {
            var checkedValues = this.get('distinctValues').filterProperty('checked').mapProperty('value');
            this.get('filter').set('value', checkedValues).set('applied', true);
        });
    }
});

Cabernet.Datagrid.RangeFilterView = Cabernet.Datagrid.FilterView.extend({
    contentTemplate: '<p>From {{filter.min}} to {{filter.max}}</p><div class="slider-range"></div>',

    applyFilter: function(value) {
        this.get('filter').set('value', value).set('applied', true);
    },

    didInsertElement: function() {
        var that = this;
        this.$('div.slider-range').slider({
            range: true,
            min: 0,
            max: 200,
            values: [0, 200],
            step: 6,
            slide: function(event, ui) {
                that.get('filter').set('value', ui.values).set('applied', true);
            }
        });
    }
});

Cabernet.Datagrid.TextFilterView = Cabernet.Datagrid.FilterView.extend({
    contentTemplate: '{{view Cabernet.Datagrid.FilterTextField}}',

    applyFilter: function(value) {
        this.get('filter').set('value', value).set('applied', true);
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
            {{view Ember.Checkbox checkedBinding="content.displayed"}} \
            <span>{{content.label}}</span> \
        </label>'
    )
});
})();



(function() {

})();

