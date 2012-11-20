module("Datagrid tests", {
    setup: function() {
        window.Foo = Ember.Namespace.create();

        Foo.User = Syrah.Model.define({
            login: String,
            name: String
        });

        sessionStorage.clear();
    }
});

test("Filter object creation from object (type text)", function() {
    var filter = Cabernet.DatagridFilter.createFromOptions({ type: 'text' });
    ok(filter instanceof Cabernet.DatagridTextFilter);
});

test("Filter object creation from object (type pick)", function() {
   var filter = Cabernet.DatagridFilter.createFromOptions({ type: 'pick', column: 'usertype' }, [
            { login: 'jdoe', usertype: 'admin' }, { login: 'jane', usertype: 'admin' },
            { login: 'jack', usertype: 'user' }, { login: 'joe', usertype: 'root' }
        ]
    );
    ok(filter instanceof Cabernet.DatagridPickFilter);
});

test("Filter object creation from object (type range)", function() {
    var filter = Cabernet.DatagridFilter.createFromOptions({ type: 'range', column: 'balance' }, [
            { account: '123456', balance: 500 }, { account: '123456', balance: 1000 },
            { account: '123456', balance: 100 }, { account: '123456', balance: 1200 }
        ]
    );
    ok(filter instanceof Cabernet.DatagridRangeFilter);
});

test("Filter object creation from object (type daterange)", function() {
    var filter = Cabernet.DatagridFilter.createFromOptions({ type: 'daterange' });
    ok(filter instanceof Cabernet.DatagridDaterangeFilter);
});

test("PickFilter should derive its pickable values from the grid data", function() {
    var controller = Cabernet.DatagridController.create({
        columns: [ { name: 'usertype', filter: { type: 'pick' } } ],
        data: [
            { login: 'jdoe', usertype: 'admin' }, { login: 'jane', usertype: 'admin' },
            { login: 'jack', usertype: 'user' }, { login: 'joe', usertype: 'root' }
        ]
    });
    var filter = controller.get('filters').objectAt(0);
    deepEqual(filter.get('values'), ['admin', 'user', 'root']);
});

test("PickFilter can get its pickable values from the grid config", function() {
    var controller = Cabernet.DatagridController.create({
        columns: [ { name: 'usertype', filter: { type: 'pick', values: ['admin', 'user', 'root'] } } ]
    });
    var filter = controller.get('filters').objectAt(0);
    deepEqual(filter.get('values'), ['admin', 'user', 'root']);
});

test("RangeFilter should derive various options from the grid data", function() {
    var controller = Cabernet.DatagridController.create({
        columns: [ { name: 'balance', filter: { type: 'range' } } ],
        data: [
            { account: '123456', balance: 500 }, { account: '123456', balance: 1000 },
            { account: '123456', balance: 100 }, { account: '123456', balance: 1200 }
        ]
    });
    var filter = controller.get('filters').objectAt(0);
    equal(filter.get('min'), 100);
    equal(filter.get('max'), 1200);
    equal(filter.get('step'), 1);
});

test("RangeFilter can get its various options from the grid config", function() {
    var controller = Cabernet.DatagridController.create({
        columns: [ { name: 'balance', filter: { type: 'range', min: 5, max: 100, step: 5 } } ]
    });
    var filter = controller.get('filters').objectAt(0);
    equal(filter.get('min'), 5);
    equal(filter.get('max'), 100);
    equal(filter.get('step'), 5);
});

test("Filters on columns", function() {

    var grid = Cabernet.DatagridController.create({
        data: [],
        columns: ['simpleByDefault',
            { name: 'filterableByDefaultWithName'},
            { name: 'filterableByText', filter: { type: 'text' } },
            { name: 'filterableByRange', filter: { type: 'range' } },
            { name: 'filterableByDateRange', filter: { type: 'daterange' } },
            { name: 'filterableByPicker', filter: { type: 'pick' } } ]
    });
    equal(grid.get('columnsForDisplay').get('length'), 6);
    equal(grid.get('filters').get('length'), 6);

    ok(grid.get('columnsForDisplay')[0].filter instanceof Cabernet.DatagridTextFilter); // Column simpleByDefault
    ok(grid.get('columnsForDisplay')[1].filter instanceof Cabernet.DatagridTextFilter); // Column filterableByDefaultWithName
    ok(grid.get('columnsForDisplay')[2].filter instanceof Cabernet.DatagridTextFilter); // Column filterableByText
    ok(grid.get('columnsForDisplay')[3].filter instanceof Cabernet.DatagridRangeFilter); // Column filterableByRange
    ok(grid.get('columnsForDisplay')[4].filter instanceof Cabernet.DatagridDaterangeFilter); // Column filterableByDateRange
    ok(grid.get('columnsForDisplay')[5].filter instanceof Cabernet.DatagridPickFilter); // Column filterableByPicker

    for(var i=0; i<grid.get('columnsForDisplay').get('length'); i++) {
        deepEqual(grid.get('filters')[i], grid.get('columnsForDisplay')[i].filter);
    }
});

test("Datagrid can get its columns config from a Syrah model", function() {
    window.Foo = Ember.Namespace.create();
    Foo.Contact = Syrah.Model.define({
        firstname: String,
        lastname: String,
        dob: Date
    });
    var grid = Cabernet.DatagridController.create({
        modelType: 'Foo.Contact'
    });

    equal(grid.get('columnsForDisplay').get('length'), 3);
    equal(grid.get('filters').get('length'), 3);

    ok(grid.get('columnsForDisplay')[0].filter instanceof Cabernet.DatagridTextFilter);
    ok(grid.get('columnsForDisplay')[1].filter instanceof Cabernet.DatagridTextFilter);
    ok(grid.get('columnsForDisplay')[2].filter instanceof Cabernet.DatagridDaterangeFilter);
});

test("No filterable data", function() {

    var grid = Cabernet.DatagridController.create({
        data: [],
        columns: [{name: 'headerColumn', filterable: false} ]
    });
    equal(grid.get('columnsForDisplay').get('length'), 1);
    
    equal(grid.get('filters').get('length'), 0); // No filter because of 'filterable: false' 
    ok(Ember.empty(grid.get('columnsForDisplay')[0].filter));
});

test("Filter data by text", function() {

    var grid = Cabernet.DatagridController.create({
        data: [{"textColumn":"aa"},{"textColumn":"ab"},{"textColumn":"bb"},{"textColumn":"bc"}],
        columns: ['textColumn']
    });
    equal(grid.get('data').get('length'), 4);
    equal(grid.get('displayedData').get('length'), 4);
    
    var filter = grid.get('filters')[0];

    filter.set('value', 'a'); 
    equal(grid.get('data').get('length'), 4); // unchanged
    equal(grid.get('displayedData').get('length'), 2); // Only 'aa' and 'ab'
    equal(grid.get('displayedData')[0].textColumn, "aa");
    equal(grid.get('displayedData')[1].textColumn, "ab");

    filter.set('value', 'aa'); 
    equal(grid.get('displayedData').get('length'), 1); // Only 'aa'
    equal(grid.get('displayedData')[0].textColumn, "aa");

    // Filter by regexp
    filter.set('value', 'c$'); // Ends with 'c'
    equal(grid.get('displayedData').get('length'), 1); // Only 'bc'
    equal(grid.get('displayedData')[0].textColumn, "bc");

    filter.set('value', '^b'); // Begins with 'c'
    equal(grid.get('displayedData').get('length'), 2); // Only 'bb' and bc'
    equal(grid.get('displayedData')[0].textColumn, "bb");
    equal(grid.get('displayedData')[1].textColumn, "bc");
});

test("Filter data by picker(enumerated values)", function() {

    var grid = Cabernet.DatagridController.create({
        data: [{"pickColumn":"A"},{"pickColumn":"B"},{"pickColumn":"A"},{"pickColumn":"C"}],
        columns: [{ name: 'pickColumn', filter: { type: 'pick' }}]
    });
    equal(grid.get('data').get('length'), 4);
    equal(grid.get('displayedData').get('length'), 4);
    
    var filter = grid.get('filters')[0];
    var filterValues = filter.get('values');
    equal(filterValues.get('length'), 3);
    ok(filterValues.contains("A"));
    ok(filterValues.contains("B"));
    ok(filterValues.contains("C"));

    // Filtering
    filter.set('value', ['A']); 
    equal(grid.get('data').get('length'), 4); // unchanged
    equal(grid.get('displayedData').get('length'), 2); 
    equal(grid.get('displayedData')[0].pickColumn, "A");
    equal(grid.get('displayedData')[1].pickColumn, "A");
    
    filter.set('value', ['A', 'B']); 
    equal(grid.get('displayedData').get('length'), 3); 
    equal(grid.get('displayedData')[0].pickColumn, "A");
    equal(grid.get('displayedData')[1].pickColumn, "B");
    equal(grid.get('displayedData')[2].pickColumn, "A");

    // Filter by different value (possible ?)
    filter.set('value', ['D']); 
    equal(grid.get('displayedData').get('length'), 0);
});

test("Filter data by range", function() {

    var grid = Cabernet.DatagridController.create({
        data: [{"rangeColumn":1},{"rangeColumn":"2"},{"rangeColumn":"3"},{"rangeColumn":"4"}],
        columns: [{ name: 'rangeColumn', filter: { type: 'range' }}]
    });
    equal(grid.get('data').get('length'), 4);
    equal(grid.get('displayedData').get('length'), 4);
    
    var filter = grid.get('filters')[0];

    // Filter by min and max
    filter.set('value', ['2', '3']); 
    equal(grid.get('data').get('length'), 4); // unchanged
    equal(grid.get('displayedData').get('length'), 2); // Only '2' and '3'
    equal(grid.get('displayedData')[0].rangeColumn, "2");
    equal(grid.get('displayedData')[1].rangeColumn, "3");

    // Filter by min only
    filter.set('value', ['2', null]); 
    equal(grid.get('displayedData').get('length'), 3); // '2', '3' and '4'
    equal(grid.get('displayedData')[0].rangeColumn, "2");
    equal(grid.get('displayedData')[1].rangeColumn, "3");
    equal(grid.get('displayedData')[2].rangeColumn, "4");

    // Filter by max only
    filter.set('value', [null, '3']); 
    equal(grid.get('displayedData').get('length'), 3); // '1', '2' and '3'
    equal(grid.get('displayedData')[0].rangeColumn, "1");
    equal(grid.get('displayedData')[1].rangeColumn, "2");
    equal(grid.get('displayedData')[2].rangeColumn, "3");
});

test("Filter data by daterange", function() {

    var grid = Cabernet.DatagridController.create({
        data: [ {"daterangeColumn": "2012-01-01"},
                {"daterangeColumn": "2012-02-01"},
                {"daterangeColumn": "2012-04-30"},
                {"daterangeColumn": "2012-07-01"}],
        columns: [{ name: 'daterangeColumn', filter: { type: 'daterange' }}]
    });
    equal(grid.get('data').get('length'), 4);
    equal(grid.get('displayedData').get('length'), 4);
    
    var filter = grid.get('filters')[0];

    // Filter by min and max date values
    filter.set('value', ["2012-01-01", "2012-06-01"]); 
    equal(grid.get('data').get('length'), 4); // unchanged
    equal(grid.get('displayedData').get('length'), 3);
    equal(grid.get('displayedData')[0].daterangeColumn, "2012-01-01");
    equal(grid.get('displayedData')[1].daterangeColumn, "2012-02-01");
    equal(grid.get('displayedData')[2].daterangeColumn, "2012-04-30");

    // Filter by min date value
    filter.set('value', ["2012-03-01", null]); 
    equal(grid.get('displayedData').get('length'), 2);
    equal(grid.get('displayedData')[0].daterangeColumn, "2012-04-30");
    equal(grid.get('displayedData')[1].daterangeColumn, "2012-07-01");

    // Filter by max date value
    filter.set('value', [null, "2012-03-01"]); 
    equal(grid.get('displayedData').get('length'), 2);
    equal(grid.get('displayedData')[0].daterangeColumn, "2012-01-01");
    equal(grid.get('displayedData')[1].daterangeColumn, "2012-02-01");
        
});

test("Display/hide standard columns", function() {

    var grid = Cabernet.DatagridController.create({
        data: [],
        columns: ['First', 'Second', 'Third']
    });
    equal(grid.get('columnsForDisplay').get('length'), 3);
    equal(grid.get('displayedColumns').get('length'), 3);
   
    //Hide 2 columns
    grid.get('columnsForDisplay')[0].set('displayed', false);
    grid.get('columnsForDisplay')[2].set('displayed', false);
    equal(grid.get('displayedColumns').get('length'), 1);

    // Display 1 column
    grid.get('columnsForDisplay')[2].set('displayed', true);
    equal(grid.get('displayedColumns').get('length'), 2);
});

test("Try to display/hide non hideable columns", function() {

    var grid = Cabernet.DatagridController.create({
        data: [],
        columns: [  'First', 
                    {name: 'Second', hideable: false}, 
                    'Third']
    });
    equal(grid.get('columnsForDisplay').get('length'), 3);
    equal(grid.get('displayedColumns').get('length'), 3);
   
    // Hide non hideable column
    grid.get('columnsForDisplay')[1].set('displayed', false); // Useless
    equal(grid.get('displayedColumns').get('length'), 3);

    // Hide hideable column
    grid.get('columnsForDisplay')[2].set('displayed', false); // Yes we can
    equal(grid.get('displayedColumns').get('length'), 2);
});