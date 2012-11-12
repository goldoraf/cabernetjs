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

test("Filter object creation from object", function() {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type: 'text' });
    ok(filter instanceof Cabernet.Datagrid.TextFilter);
});

test("PickFilter should derive its pickable values from the grid data", function() {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type: 'pick', column: 'usertype' }, [
            { login: 'jdoe', usertype: 'admin' }, { login: 'jane', usertype: 'admin' },
            { login: 'jack', usertype: 'user' }, { login: 'joe', usertype: 'root' }
        ]
    );
    deepEqual(filter.get('values'), ['admin', 'user', 'root']);
});

test("RangeFilter should derive various options from the grid data", function() {
    var filter = Cabernet.Datagrid.Filter.createFromOptions({ type: 'range', column: 'balance' }, [
            { account: '123456', balance: 500 }, { account: '123456', balance: 1000 },
            { account: '123456', balance: 100 }, { account: '123456', balance: 1200 }
        ]
    );
    equal(filter.get('min'), 100);
    equal(filter.get('max'), 1200);
    equal(filter.get('step'), 1);
});