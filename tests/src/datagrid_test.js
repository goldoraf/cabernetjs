module("Datagrid tests", {
    setup:function () {
        window.Foo = Ember.Namespace.create();

        Foo.User = Syrah.Model.define({
            login:String,
            name:String
        });

        sessionStorage.clear();
    }
});

test("Filter object creation from object (type text)", function () {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type:'text' });
    ok(filter instanceof Cabernet.Datagrid.TextFilter);
});

test("Filter object creation from object (type pick)", function () {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type:'pick', column:'usertype' }, [
        { login:'jdoe', usertype:'admin' },
        { login:'jane', usertype:'admin' },
        { login:'jack', usertype:'user' },
        { login:'joe', usertype:'root' }
    ]
    );
    ok(filter instanceof Cabernet.Datagrid.PickFilter);
});

test("Filter object creation from object (type range)", function () {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type:'range', column:'balance' }, [
        { account:'123456', balance:500 },
        { account:'123456', balance:1000 },
        { account:'123456', balance:100 },
        { account:'123456', balance:1200 }
    ]
    );
    ok(filter instanceof Cabernet.Datagrid.RangeFilter);
});

test("Filter object creation from object (type daterange)", function () {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type:'daterange' });
    ok(filter instanceof Cabernet.Datagrid.DaterangeFilter);
});

test("Filter object creation from object (type boolean)", function () {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type:'boolean' });
    ok(filter instanceof Cabernet.Datagrid.BooleanFilter);
});

test("PickFilter should derive its pickable values from the grid data", function () {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type:'pick', column:'usertype' }, [
        { login:'jdoe', usertype:'admin' },
        { login:'jane', usertype:'admin' },
        { login:'jack', usertype:'user' },
        { login:'joe', usertype:'root' }
    ]
    );
    deepEqual(filter.get('values'), ['admin', 'user', 'root']);
});

test("RangeFilter should derive various options from the grid data", function () {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type:'range', column:'balance' }, [
        { account:'123456', balance:500 },
        { account:'123456', balance:1000 },
        { account:'123456', balance:100 },
        { account:'123456', balance:1200 }
    ]
    );
    equal(filter.get('min'), 100);
    equal(filter.get('max'), 1200);
    equal(filter.get('step'), 1);
});

test("Filters on columns", function () {

    var grid = Cabernet.Datagrid.create({
        data:[],
        columns:['simpleByDefault',
            { name:'filterableByDefaultWithName'},
            { name:'filterableByText', filter:{ type:'text' } },
            { name:'filterableByRange', filter:{ type:'range' } },
            { name:'filterableByDateRange', filter:{ type:'daterange' } },
            { name:'filterableByPicker', filter:{ type:'pick' } },
            { name:'filterableByBoolean', filter:{ type:'boolean' } } ]
    });
    equal(grid.get('columnsForDisplay').get('length'), 7);
    equal(grid.get('filters').get('length'), 7);

    ok(grid.get('columnsForDisplay')[0].filter instanceof Cabernet.Datagrid.TextFilter); // Column simpleByDefault
    ok(grid.get('columnsForDisplay')[1].filter instanceof Cabernet.Datagrid.TextFilter); // Column filterableByDefaultWithName
    ok(grid.get('columnsForDisplay')[2].filter instanceof Cabernet.Datagrid.TextFilter); // Column filterableByText
    ok(grid.get('columnsForDisplay')[3].filter instanceof Cabernet.Datagrid.RangeFilter); // Column filterableByRange
    ok(grid.get('columnsForDisplay')[4].filter instanceof Cabernet.Datagrid.DaterangeFilter); // Column filterableByDateRange
    ok(grid.get('columnsForDisplay')[5].filter instanceof Cabernet.Datagrid.PickFilter); // Column filterableByPicker
    ok(grid.get('columnsForDisplay')[6].filter instanceof Cabernet.Datagrid.BooleanFilter); // Column filterableByBoolean

    for (var i = 0; i < grid.get('columnsForDisplay').get('length'); i++) {
        deepEqual(grid.get('filters')[i], grid.get('columnsForDisplay')[i].filter);
    }
});

test("No Filterable datas", function () {

    var grid = Cabernet.Datagrid.create({
        data:[],
        columns:[
            {name:'headerColumn', filterable:false}
        ]
    });
    equal(grid.get('columnsForDisplay').get('length'), 1);

    equal(grid.get('filters').get('length'), 0); // No filter because of 'filterable: false' 
    ok(Ember.empty(grid.get('columnsForDisplay')[0].filter));
});

test("Filter datas by text", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"textColumn":"aa"},
            {"textColumn":"ab"},
            {"textColumn":"bb"},
            {"textColumn":"bc"}
        ],
        columns:['textColumn']
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

test("Filter datas by boolean", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"booleanColumn":true, "valueText":'A'},
            {"booleanColumn":false, "valueText":'B'},
            {"booleanColumn":true, "valueText":'C'}
        ],
        columns:['booleanColumn', 'valueText']
    });
    equal(grid.get('data').get('length'), 3);
    equal(grid.get('displayedData').get('length'), 3);

    var filter = grid.get('filters')[0];

    filter.set('value', true);
    equal(grid.get('data').get('length'), 3); // unchanged
    equal(grid.get('displayedData').get('length'), 2); // Only first ant third
    equal(grid.get('displayedData')[0].valueText, "A");
    equal(grid.get('displayedData')[1].valueText, "C");

    filter.set('value', false);
    equal(grid.get('displayedData').get('length'), 1); // Only second
    equal(grid.get('displayedData')[0].valueText, "B");

    filter.set('value', ''); // Value 'all'
    equal(grid.get('displayedData').get('length'), 3); // All rows
    equal(grid.get('displayedData')[0].valueText, "A");
    equal(grid.get('displayedData')[1].valueText, "B");
    equal(grid.get('displayedData')[2].valueText, "C");
    
});

test("Filter datas by picker(enumerated values)", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"pickColumn":"A"},
            {"pickColumn":"B"},
            {"pickColumn":"A"},
            {"pickColumn":"C"}
        ],
        columns:[
            { name:'pickColumn', filter:{ type:'pick' }}
        ]
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

test("Filter datas by range", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"rangeColumn":1},
            {"rangeColumn":"2"},
            {"rangeColumn":"3"},
            {"rangeColumn":"4"}
        ],
        columns:[
            { name:'rangeColumn', filter:{ type:'range' }}
        ]
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

test("Filter datas by daterange", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"daterangeColumn":new Date("2012-01-01")},
            {"daterangeColumn":new Date("2012-02-01")},
            {"daterangeColumn":new Date("2012-04-30")},
            {"daterangeColumn":new Date("2012-07-01")}
        ],
        columns:[
            { name:'daterangeColumn', filter:{ type:'daterange' }}
        ]
    });
    equal(grid.get('data').get('length'), 4);
    equal(grid.get('displayedData').get('length'), 4);

    var filter = grid.get('filters')[0];

    // Filter by min and max date values
    filter.set('value', [new Date("2012-01-01"), new Date("2012-06-01")]);
    equal(grid.get('data').get('length'), 4); // unchanged
    equal(grid.get('displayedData').get('length'), 3);
    equal(grid.get('displayedData')[0].daterangeColumn.getTime(), new Date("2012-01-01").getTime());
    equal(grid.get('displayedData')[1].daterangeColumn.getTime(), new Date("2012-02-01").getTime());
    equal(grid.get('displayedData')[2].daterangeColumn.getTime(), new Date("2012-04-30").getTime());

    // Filter by min date value
    filter.set('value', [new Date("2012-03-01"), null]);
    equal(grid.get('displayedData').get('length'), 2);
    equal(grid.get('displayedData')[0].daterangeColumn.getTime(), new Date("2012-04-30").getTime());
    equal(grid.get('displayedData')[1].daterangeColumn.getTime(), new Date("2012-07-01").getTime());

    // Filter by max date value
    filter.set('value', [null, new Date("2012-03-01")]);
    equal(grid.get('displayedData').get('length'), 2);
    equal(grid.get('displayedData')[0].daterangeColumn.getTime(), new Date("2012-01-01").getTime());
    equal(grid.get('displayedData')[1].daterangeColumn.getTime(), new Date("2012-02-01").getTime());

});

test("Display/hide standard columns", function () {

    var grid = Cabernet.Datagrid.create({
        data:[],
        columns:['First', 'Second', 'Third']
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

test("Try to display/hide non hideable columns", function () {

    var grid = Cabernet.Datagrid.create({
        data:[],
        columns:[  'First',
            {name:'Second', hideable:false},
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

test("Column sorting for main datatypes", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"id":0, dateValue:"2012-01-01", amountValue:200.00, textValue:"first", intValue:99},
            {"id":1, dateValue:"2012-02-01", amountValue:1000.00, textValue:"aaa", intValue:80},
            {"id":2, dateValue:"2012-04-30", amountValue:50.01, textValue:"test", intValue:40},
            {"id":3, dateValue:"2012-07-01", amountValue:50.00, textValue:"test too", intValue:10}
        ],

        columns:['id', 'dateValue', 'amountValue', 'textValue', 'intValue']
    });


    // Sort by date descending
    grid.sort('dateValue', 'down');

    equal(grid.get('displayedData')[0].id, 3);
    equal(grid.get('displayedData')[1].id, 2);
    equal(grid.get('displayedData')[2].id, 1);
    equal(grid.get('displayedData')[3].id, 0);

    // Sort by amount ascending
    grid.sort('amountValue', 'up');

    equal(grid.get('displayedData')[0].id, 3);
    equal(grid.get('displayedData')[1].id, 2);
    equal(grid.get('displayedData')[2].id, 0);
    equal(grid.get('displayedData')[3].id, 1);

    // Sort by text descending
    grid.sort('textValue', 'down');

    equal(grid.get('displayedData')[0].id, 3);
    equal(grid.get('displayedData')[1].id, 2);
    equal(grid.get('displayedData')[2].id, 0);
    equal(grid.get('displayedData')[3].id, 1);

    // Sort by int ascending
    grid.sort('intValue', 'up');

    equal(grid.get('displayedData')[0].id, 3);
    equal(grid.get('displayedData')[1].id, 2);
    equal(grid.get('displayedData')[2].id, 1);
    equal(grid.get('displayedData')[3].id, 0);
});

test("Column sorting error handling", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"id":0, dateValue:"2012-01-01", amountValue:200.00, textValue:"first", intValue:99},
            {"id":1, dateValue:"2012-02-01", amountValue:1000.00, textValue:"aaa", intValue:80},
            {"id":2, dateValue:"2012-04-30", amountValue:50.01, textValue:"test", intValue:40},
            {"id":3, dateValue:"2012-07-01", amountValue:50.00, textValue:"test too", intValue:10}
        ],

        columns:['id', 'dateValue', 'amountValue', 'textValue', 'intValue']
    });


    // Sort by non existing column
    raises(function () {
            return grid.sort('unknownValue', 'down');
        },
        /undefined/, "error expected with message containing 'undefined'");   
});


test("Copy grid content to TSV", function () {

    var grid = Cabernet.Datagrid.create({
        data:[
            {"id":0, dateValue:"2012-01-01", amountValue:200.00, textValue:"first", intValue:99},
            {"id":1, dateValue:"2012-02-01", amountValue:1000.00, textValue:"aaa", intValue:80},
            {"id":2, dateValue:"2012-04-30", amountValue:50.01, textValue:"test", intValue:40},
            {"id":3, dateValue:"2012-07-01", amountValue:50.00, textValue:"test too", intValue:10}
        ],

        columns:['id', 'dateValue', 'amountValue', 'textValue', 'intValue']
    });


    // Sort by date descending
    var content = grid.generateTSV();
    var expectedContent =
        "id\tdateValue\tamountValue\ttextValue\tintValue\r\n"
            + "0\t2012-01-01\t200\tfirst\t99\r\n"
            + "1\t2012-02-01\t1000\taaa\t80\r\n"
            + "2\t2012-04-30\t50.01\ttest\t40\r\n"
            + "3\t2012-07-01\t50\ttest too\t10\r\n";

    equal(content, expectedContent);
});
