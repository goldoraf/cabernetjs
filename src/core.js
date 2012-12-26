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

String.prototype.repeat = function(count) {
    if (count < 1) return '';
    var result = '', pattern = this.valueOf();
    while (count > 0) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result;
};
