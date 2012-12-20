module("Queue manager tests", {
	setup: function() {
		window.Foo = Ember.Namespace.create();

		sessionStorage.clear();
	}
});

test("Create a queue", function() {
	var queue = Cabernet.queueManager.addQueue();
	ok(Cabernet.queueManager.getQueue(queue.name) == queue.data);
});

test("Add item to queue", function() {
	var queue = Cabernet.queueManager.addQueue();
	Cabernet.queueManager.add(queue.name, function() { return "new item"}, this);
	ok(queue.data.length == 1);
});

test("Clear queue", function() {
	var queue = Cabernet.queueManager.addQueue();
	Cabernet.queueManager.add(queue.name, function() { return "new item"}, this);
	Cabernet.queueManager.add(queue.name, function() { return "new item"}, this);
	Cabernet.queueManager.add(queue.name, function() { return "new item"}, this);
	Cabernet.queueManager.add(queue.name, function() { return "new item"}, this);
	ok(queue.data.length == 4);
	Cabernet.queueManager.clear(queue.name);
	queue = Cabernet.queueManager.getQueue(queue.name);
	ok(queue.length == 0, "Queue shall be empty, but has length: "+queue.length);
});

test("Remove item from queue", function() {
	var queue = Cabernet.queueManager.addQueue();
	Cabernet.queueManager.add(queue.name, "item1", this);
	Cabernet.queueManager.add(queue.name, "item2", this);
	Cabernet.queueManager.add(queue.name, "item3", this);
	Cabernet.queueManager.add(queue.name, "item4", this);

	Cabernet.queueManager.remove(queue.name, 2);

	var element = ["item1", "item2", "item4"];

	ok(queue.data.length == 3);
	deepEqual(queue.data, element);
});

test("Run LIFO queue", function() {
	var queue = Cabernet.queueManager.addQueue();
	
	var a = { val : 1 };
	var b = { val : 2 };

	Cabernet.queueManager.add(queue.name, function(a,b) { a.val += b.val}, this);
	Cabernet.queueManager.add(queue.name, function(a, b) { b.val += 1}, this);


	Cabernet.queueManager.run(queue.name, a, b);

	ok(a.val == 4, "a shall be 3 but was " + a.val);
	ok(b.val == 3, "b shall be 3 but was " + b.val);

});

test("Run FIFO queue", function() {
	var queue = Cabernet.queueManager.addQueue();
	
	var a = { val : 1 };
	var b = { val : 2 };

	Cabernet.queueManager.add(queue.name, function(a,b) { a.val += b.val}, this);
	Cabernet.queueManager.add(queue.name, function(a, b) { b.val += 1}, this);


	Cabernet.queueManager.runFifo(queue.name, a, b);

	ok(a.val == 3, "a shall be 3 but was " + a.val);
	ok(b.val == 3, "b shall be 3 but was " + b.val);

});

test("Run queue multiple times", function() {
	var queue = Cabernet.queueManager.addQueue();
	var a = 1;

	Cabernet.queueManager.add(queue.name, function() { a = a+1; }, this);

	Cabernet.queueManager.run(queue.name);
	Cabernet.queueManager.run(queue.name);
	Cabernet.queueManager.run(queue.name);

	ok(a == 2, "a shall be 2 but was " + a);
});

test("Run missing queue name", function() {
	var queue = Cabernet.queueManager.addQueue();

	Cabernet.queueManager.add(queue.name, function() { }, this);

	
	raises(
		function() {
			Cabernet.queueManager.run()
		},
		function(error) {
			return error == "Missing queue name";
		},
		"Shall raise a 'Missing queue name' error"
	);

});

test("Run unknown queue", function() {
	var queue = Cabernet.queueManager.addQueue();

	Cabernet.queueManager.add(queue.name, function() { }, this);

	raises(
		function() {
			Cabernet.queueManager.run("John Doe")
		},
		function(error) {
			return error == "No such queue";
		},
		"Shall raise a 'No such queue' error"
	);

});

test("Assert that multiple queues work", function() {
	var queue1 = Cabernet.queueManager.addQueue();
	var queue2 = Cabernet.queueManager.addQueue();

	var a  = 44;

	Cabernet.queueManager.add(queue1.name, function() { a += 10}, this);
	Cabernet.queueManager.add(queue2.name, function() { a -= 10}, this);	

	Cabernet.queueManager.run(queue1.name);

	ok(a == 54);

	Cabernet.queueManager.run(queue2.name);

	ok(a == 44);
});