module("Queue manager tests", {
	setup: function() {
		window.Foo = Ember.Namespace.create();

		sessionStorage.clear();
	}
});

test("Create a queue", function() {
	var queue = Cabernet.queue.addQueue("create queue");
	ok(Cabernet.queue.getQueue("create queue") == queue);
});

test("Add item to queue", function() {
	var queue = Cabernet.queue.getQueue("add item to queue");
	Cabernet.queue.add("add item to queue", function() { return "new item"}, this);
	ok(queue.length == 1);
});

test("Clear queue", function() {
	var queue = Cabernet.queue.getQueue("clear queue");
	Cabernet.queue.add("clear queue", function() { return "new item"}, this);
	Cabernet.queue.add("clear queue", function() { return "new item"}, this);
	Cabernet.queue.add("clear queue", function() { return "new item"}, this);
	Cabernet.queue.add("clear queue", function() { return "new item"}, this);
	ok(queue.length == 4);
	queue = Cabernet.queue.clear("clear queue");

	ok(queue == undefined);
});

test("Remove item from queue", function() {
	var queue = Cabernet.queue.getQueue("remove item to queue");
	Cabernet.queue.add("remove item to queue", "item1", this);
	Cabernet.queue.add("remove item to queue", "item2", this);
	Cabernet.queue.add("remove item to queue", "item3", this);
	Cabernet.queue.add("remove item to queue", "item4", this);

	Cabernet.queue.remove("remove item to queue", 2);

	var element = ["item1", "item2", "item4"];

	ok(queue.length == 3);
	deepEqual(queue, element);
});

test("Run LIFO queue", function() {
	var queue = Cabernet.queue.getQueue("run lifo queue");
	
	var a = { val : 1 };
	var b = { val : 2 };

	Cabernet.queue.add("run lifo queue", function(a,b) { a.val += b.val}, this);
	Cabernet.queue.add("run lifo queue", function(a, b) { b.val += 1}, this);


	Cabernet.queue.run("run lifo queue", a, b);

	ok(a.val == 4, "a shall be 3 but was " + a.val);
	ok(b.val == 3, "b shall be 3 but was " + b.val);

});

test("Run FIFO queue", function() {
	var queue = Cabernet.queue.getQueue("run fifo queue");
	
	var a = { val : 1 };
	var b = { val : 2 };

	Cabernet.queue.add("run fifo queue", function(a,b) { a.val += b.val}, this);
	Cabernet.queue.add("run fifo queue", function(a, b) { b.val += 1}, this);


	Cabernet.queue.runFifo("run fifo queue", a, b);

	ok(a.val == 3, "a shall be 3 but was " + a.val);
	ok(b.val == 3, "b shall be 3 but was " + b.val);

});

test("Run queue multiple times", function() {
	var queue = Cabernet.queue.getQueue("run queue multiple times");
	var a = 1;

	Cabernet.queue.add("run queue multiple times", function() { a = a+1; }, this);

	Cabernet.queue.run("run queue multiple times");
	Cabernet.queue.run("run queue multiple times");
	Cabernet.queue.run("run queue multiple times");

	ok(a == 2, "a shall be 2 but was " + a);
});

test("Run missing queue name", function() {
	var queue = Cabernet.queue.getQueue("run missing name");

	Cabernet.queue.add("run missing name", function() { }, this);

	
	raises(
		function() {
			Cabernet.queue.run()
		},
		function(error) {
			return error == "Missing queue name";
		},
		"Shall raise a 'Missing queue name' error"
	);

});

test("Run unknown queue", function() {
	var queue = Cabernet.queue.getQueue("run unknown name");

	Cabernet.queue.add("run unknown name", function() { }, this);

	raises(
		function() {
			Cabernet.queue.run("John Doe")
		},
		function(error) {
			return error == "No such queue";
		},
		"Shall raise a 'No such queue' error"
	);

});

test("Assert that multiple queues work", function() {
	var multiple1 = Cabernet.queue.getQueue("multiple 1");
	var multiple2 = Cabernet.queue.getQueue("multiple 2");

	var a  = 44;

	Cabernet.queue.add("multiple 1", function() { a += 10}, this);
	Cabernet.queue.add("multiple 2", function() { a -= 10}, this);	

	Cabernet.queue.run("multiple 1");

	ok(a == 54);

	Cabernet.queue.run("multiple 2");

	ok(a == 44);
});