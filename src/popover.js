Cabernet.Popover = Ember.View.extend({
    linkText: '',
    defaultLinkTemplate: '<a {{action "toggle"}}>{{linkText}}</a>',
    linkTemplate: null,
    contentTemplate: '',
    placement: 'below',
    withArrow: true,

    init: function() {
        this.set('template', this.generateTemplate());
        return this._super();
    },

    toggle: function(e) {
        if (e) e.stopPropagation();

        var popover = this.$('div.popover');
        popover.toggle();
        if (popover.is(':visible')) {
            $('div.popover.active').removeClass('active').hide();
            popover.addClass('active');
            var params = this.getPositionParams(popover);
            popover.position({
                of: this.positionRelativeTo(),
                my : params.my,
                at: params.at,
                offset: params.offset
            });
            if (this.get('withArrow') && params.arrowLeft !== undefined) popover.children('div.arrow').css('left', params.arrowLeft);
            
            popover.bind('clickoutside', function(e) {
                $(this).removeClass('active').hide().unbind('clickoutside');
            });
        } else {
            popover.removeClass('active').hide().unbind('clickoutside');
        }
    },

    positionRelativeTo: function() {
        return this.$('a');
    },

    generateTemplate: function() {
        var linkTmpl = Ember.none(this.get('linkTemplate')) ? this.get('defaultLinkTemplate') : this.get('linkTemplate');
        var placementClass = this.get('placement');
        if (placementClass == 'below left' || placementClass == 'below right') placementClass = 'below';
        else if (placementClass == 'above left' || placementClass == 'above right') placementClass = 'above';
        return Ember.Handlebars.compile(
            linkTmpl +
            '<div class="popover ' + placementClass + '">' +
                (this.get('withArrow') ? '<div class="arrow"></div>' : '') +
                '<div class="inner"> \
                    <div class="content">' +
                        this.get('contentTemplate') +
                    '</div> \
                </div> \
            </div>');
    },

    getPositionParams: function(popoverElt) {
        var width = popoverElt.css('width').replace(/px/, '');
        var params = {
            'right': { my: 'left', at: 'right', offset: '0' },
            'below': { my: 'top', at: 'bottom', offset: '0' },
            'above': { my: 'bottom', at: 'center', offset: '0' },
            'left': { my: 'right', at: 'left', offset: '0' },
            'below right': { my: 'left top', at: 'center bottom', offset: '0', arrowLeft: '20px' },
            'below left' : { my: 'right top', at: 'right bottom', offset: '20 0', arrowLeft: width - 20 + 'px' },
            'above right': { my: 'left bottom', at: 'center top', offset: '0', arrowLeft: '20px' }
        }
        return params[this.get('placement')];
    }
});