window.Cabernet = Ember.Namespace.create({
  CURRENT_API_REVISION: 1
});

if (Em.I18n !== undefined) {
    Cabernet.I18n = Ember.Object.create({
        translate: Em.I18n.t,

        addMessage: function(k, string) {
            Em.I18n.translations[k] = string;
        }
    });
} else {
    Cabernet.I18n = Ember.Object.create({
        translate: Ember.String.loc,

        addMessage: function(k, string) {
            Ember.STRINGS[k] = string;
        }
    });
}
