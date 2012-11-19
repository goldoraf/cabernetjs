Cabernet.DatagridFilter = Ember.Object.extend({
    column: '',
    value: '',
    controller: null,

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
    }.property('value'),
});

Cabernet.DatagridFilter.reopenClass({
    createFromOptions: function(options, controller) {
        var klassName = 'Datagrid' + options.type.charAt(0).toUpperCase() + options.type.slice(1) + 'Filter',
            klass = Cabernet[klassName];
        if (klass.hasOwnProperty('expandOptions')) options = klass.expandOptions(options);
        options.controller = controller;
        return klass.create(options);
    }
});

Cabernet.DatagridTextFilter = Cabernet.DatagridFilter.extend({
    type: 'text',
    //view: Cabernet.DatagridTextFilterView,

    apply: function(data) {
        var regex = new RegExp(this.get('value'), 'i', 'g');
        return data.filter(function(item) {
            return this.getValueFor(item).toString().match(regex);
        }, this);
    }
});

Cabernet.DatagridPickFilter = Cabernet.DatagridFilter.extend({
    type: 'pick',
    //view: Cabernet.DatagridPickFilterView,

    init: function() {
        this._super();
        if (this.get('values') === null) {
            this.addObserver('controller.data', function controllerDataChanged() {
                this.set('values', this.get('controller').get('data').mapProperty(this.get('column')).uniq());
            });
        }
    },

    apply: function(data) {
        var value;
        return data.filter(function(item) {
            return this.get('value').contains(this.getValueFor(item));
        }, this);
    },

    applied: function() {
        return Ember.isArray(this.get('value')) 
            && this.get('values').get('length') != this.get('value').get('length');
    }.property('value'),
});

Cabernet.DatagridPickFilter.reopenClass({
    expandOptions: function(options) {
        options.values = options.values || null;
        return options;
    }
});

Cabernet.DatagridRangeFilter = Cabernet.DatagridFilter.extend({
    type: 'range',
    //view: Cabernet.DatagridRangeFilterView,

    init: function() {
        this._super();
        if (this.get('max') === null && this.get('max') === null) {
            this.addObserver('controller.data', function controllerDataChanged() {
                this.set('max', Math.max.apply(Math, this.get('controller').get('data').mapProperty(this.get('column'))));
                this.set('min', Math.min.apply(Math, this.get('controller').get('data').mapProperty(this.get('column'))));
            });
        }
    },

    selectedMax: function() {
        return !Ember.empty(this.get('value')) ? this.get('value')[1] : this.get('max');
    }.property('value', 'max'),

    selectedMin: function() {
        return !Ember.empty(this.get('value')) ? this.get('value')[0] : this.get('min');
    }.property('value', 'min'),

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
    }.property('value'),
});

Cabernet.DatagridRangeFilter.reopenClass({
    expandOptions: function(options) {
        options.max = options.max || null;
        options.min = options.min || null;
        options.step = options.step || 1;
        return options;
    }
});

Cabernet.DatagridDaterangeFilter = Cabernet.DatagridFilter.extend({
    type: 'datarange',
    //view: Cabernet.DatagridDaterangeFilterView,
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
    }.property('value'),
});