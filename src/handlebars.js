Cabernet.Handlebars = Ember.create(Handlebars);
Cabernet.Handlebars.helpers = Ember.create(Handlebars.helpers);

/**
  Override the JavaScript compiler for Handlebars.
*/
Cabernet.Handlebars.JavaScriptCompiler = function() {};
Cabernet.Handlebars.JavaScriptCompiler.prototype = Ember.create(Handlebars.JavaScriptCompiler.prototype);
Cabernet.Handlebars.JavaScriptCompiler.prototype.compiler = Cabernet.Handlebars.JavaScriptCompiler;
Cabernet.Handlebars.JavaScriptCompiler.prototype.namespace = "Cabernet.Handlebars";

Cabernet.Handlebars.JavaScriptCompiler.prototype.nameLookup = function(parent, name, type) {
  var basicLookup = Handlebars.JavaScriptCompiler.prototype.nameLookup(parent, name, type);
  return '(' + parent + " instanceof Ember.Object) ? " + parent + ".get('" + name + "') : " + basicLookup;
}

Cabernet.Handlebars.compile = function(string, options) {
  options = options || {};

  var compiled;
  function compile() {
    var ast = Handlebars.parse(string);
    var environment = new Handlebars.Compiler().compile(ast, options);
    var templateSpec = new Cabernet.Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);
    return Handlebars.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  return function(context, options) {
    if (!compiled) {
      compiled = compile();
    }
    return compiled.call(this, context, options);
  };
};

Cabernet.Handlebars.registerHelper('list', function(context, options) {
  var fn = options.fn;
  var ret = "";

  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      ret = ret + fn(context[i]);
    }
  }
  return ret;
});

var i18nHelper = function(key, options) {
  var context = this;
  return Cabernet.I18n.translate(key);
}

Cabernet.Handlebars.registerHelper('t', i18nHelper);
Ember.Handlebars.registerHelper('t', i18nHelper);