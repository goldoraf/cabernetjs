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

test("Column definition expanding from a Syrah model", function() {
    var grid = Cabernet.Datagrid.create({
        modelType: Foo.User,
        sessionBucket: 'users'
    });
    deepEqual(grid.get('columnsForDisplay'), [
        Ember.Object.create({
            name: 'login',
            label: 'login',
            type: String,
            displayed: true,
            sort: false,
            filterable: true,
            filterType: 'free'
        }),
        Ember.Object.create({
            name: 'name',
            label: 'name',
            type: String,
            displayed: true,
            sort: false,
            filterable: true,
            filterType: 'free'
        })
    ]);
});

test("Column definition expanding from a column array", function() {
    var grid = Cabernet.Datagrid.create({
        columns: ['login', 'name'],
        sessionBucket: 'users'
    });
    deepEqual(grid.get('columnsForDisplay'), [
        Ember.Object.create({
            name: 'login',
            label: 'login',
            type: String,
            displayed: true,
            sort: false,
            filterable: true,
            filterType: 'free'
        }),
        Ember.Object.create({
            name: 'name',
            label: 'name',
            type: String,
            displayed: true,
            sort: false,
            filterable: true,
            filterType: 'free'
        })
    ]);
});

test("Column definition expanding with column's objects", function() {
    var grid = Cabernet.Datagrid.create({
        columns: [{ name: 'login', label: 'Login', displayed: false, type: 'email' }, 'name'],
        sessionBucket: 'users'
    });
    deepEqual(grid.get('columnsForDisplay'), [
        Ember.Object.create({
            name: 'login',
            label: 'Login',
            type: 'email',
            displayed: false,
            sort: false,
            filterable: true,
            filterType: 'free'
        }),
        Ember.Object.create({
            name: 'name',
            label: 'name',
            type: String,
            displayed: true,
            sort: false,
            filterable: true,
            filterType: 'free'
        })
    ]);
});