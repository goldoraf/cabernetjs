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
    }.property('value')
});

Cabernet.DatagridFilter.reopenClass({
    createFromOptions: function(options, controller) {
        var klassName = 'Datagrid' + options.type.charAt(0).toUpperCase() + options.type.slice(1) + 'Filter',
            klass = Cabernet[klassName];
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

    values: function() {
        if (Ember.none(this.get('controller').get('data'))) return [];
        return this.get('controller').get('data').mapProperty(this.get('column')).uniq();
    }.property('controller.data'),

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

Cabernet.DatagridRangeFilter = Cabernet.DatagridFilter.extend({
    type: 'range',
    //view: Cabernet.DatagridRangeFilterView,

    step: 1,

    max: function() {
        if (Ember.none(this.get('controller').get('data'))) return null;
        return Math.max.apply(Math, this.get('controller').get('data').mapProperty(this.get('column')));
    }.property('controller.data'),

    min: function() {
        if (Ember.none(this.get('controller').get('data'))) return null;
        return Math.min.apply(Math, this.get('controller').get('data').mapProperty(this.get('column')));
    }.property('controller.data'),

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
    }.property('value')
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
    }.property('value')
});