window.Cabernet = Ember.Namespace.create({
  CURRENT_API_REVISION: 1
});

Cabernet.LOG_ENABLED = true;

Cabernet.log = function(message) {
  if (Cabernet.LOG_ENABLED) Ember.Logger.info(message);
}

Handlebars.registerHelper('list', function(context, options) {
  var fn = options.fn;
  var ret = "";

  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      ret = ret + fn(context[i]);
    }
  }
  return ret;
});

if (Em.I18n !== undefined) {
    Cabernet.translate = Em.I18n.t;
} else {
    Cabernet.translate = Ember.String.loc;
}
