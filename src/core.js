window.Cabernet = Ember.Namespace.create({
  CURRENT_API_REVISION: 1
});

Cabernet.LOG_ENABLED = true;

Cabernet.log = function(message) {
  if (Cabernet.LOG_ENABLED) Ember.Logger.info(message);
}

Cabernet.I18n = Ember.Object.create({
    translate: Ember.String.loc,

    addMessage: function(k, string) {
        Ember.STRINGS[k] = string;
    }
});
