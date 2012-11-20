Cabernet.DatagridColumn = Ember.Object.extend({
    name: '',
    label: '',
    type: String,
    displayed: true,
    sort: false,
    filterable: true,
    filter: null,
    hideable: true
});

Cabernet.DatagridColumn.reopenClass({
    createFromOptions: function(options, controller) {
        if (typeof options === 'string') options = { name: options };
        Ember.assert("Column objects must have a 'name' property", options.hasOwnProperty('name'));

        options.label = options.label || Cabernet.translate(options.name);
        options.type = options.type || String;

        if (!options.hasOwnProperty('filterable') || options.filterable === true) {
            var filterOpts = options.filter || { type: 'text' };
            if (typeof filterOpts === 'string') filterOpts = { type: filterOpts };
            filterOpts.column = options.name;
            
            options.filter = Cabernet.DatagridFilter.createFromOptions(filterOpts, controller);
        } 

        return this.create(options);
    }
});