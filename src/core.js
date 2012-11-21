window.Cabernet = Ember.Namespace.create({
  CURRENT_API_REVISION: 1
});

Cabernet.LOG_ENABLED = true;

Cabernet.log = function(message) {
  if (Cabernet.LOG_ENABLED) Ember.Logger.info(message);
}

if (Em.I18n !== undefined) {
    Cabernet.translate = Em.I18n.t;
} else {
    Cabernet.translate = Ember.String.loc;
}
