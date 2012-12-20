Cabernet.queueManager = Ember.Object.create({
    queues: {},

    getQueue: function(queueName) {
        return this.get("queues")[queueName];
    },

    addQueue: function() {
        var queues = this.get("queues");

        var queueName = this.generateUniqueName();
        var queue = [];

        queues[queueName] = queue;

        return {
            name: queueName,
            data: queues[queueName]
        }
    },

    generateUniqueName: function() {
        var S4 = function ()
        {
            return Math.floor(Math.random() * 0x10000).toString(16);
        };

        return (S4() + "-" + S4() );
    },

    add: function(queueName, item, context) {
        var queue = this.getQueue(queueName);
        if (item instanceof Function)
            queue.push($.proxy(item, context));
        else
            return queue.push(item);

        return queue;
    },

    remove: function(queueName, index) {
        var queue = this.getQueue(queueName);
        queue.splice(index, 1);
    },

    clear: function(queueName) {
        var queue = this.get("queues")[queueName] = [];
        var queue2 = this.get("queues")[queueName];
    },

    assertQueueNameIsPresent: function(queueName) {

        if(queueName == undefined) {
            throw "Missing queue name";
        }
        
        if (!this.get("queues")[queueName]) {
            throw "No such queue";   
        }
    },

    run: function(queueName) {
        this.assertQueueNameIsPresent(queueName);

        var args = Array.prototype.slice.call(arguments);
        args.shift();
        args = [queueName, false].concat(args);
        this.runWithOrder.apply(this, args);
    },

    runFifo: function(queueName) {
        this.assertQueueNameIsPresent(queueName);

        var args = Array.prototype.slice.call(arguments);
        args.shift();
        args = [queueName, true].concat(args);
        this.runWithOrder.apply(this, args);  
    },

    runWithOrder: function(queueName, fifo) {
        var args = Array.prototype.slice.call(arguments);
        
        args.shift();
        args.shift();

        var q = this.getQueue(queueName);
        if (!fifo) {
            q.reverse();
        }

        $.each(
            q, 
            function(index, rollbackFunction) {
                rollbackFunction.apply(this, args);
            }
        );

        this.clear(queueName);
    }
});
