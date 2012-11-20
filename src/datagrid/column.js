Cabernet.DatagridColumn = Ember.Object.extend({
    name: '',
    label: '',
    type: String,
    template: null,
    classNames: null,
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
                    default:
                        filterType = 'text';
                        break;
                }
                var filterOpts = { type: filterType };
            }
            if (typeof filterOpts === 'string') filterOpts = { type: filterOpts };
            filterOpts.column = options.name;
            
            options.filter = Cabernet.DatagridFilter.createFromOptions(filterOpts, controller);
        } 

        return this.create(options);
    }
});