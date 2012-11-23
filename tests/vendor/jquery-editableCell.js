(function($) {
    KEYCODE = {
        "esc": 27,
        "enter": 13,
        "ESC": 27,
        "ENTER": 13,
        "TAB": 9,
        "tab": 9
    };
    
    var methods = {
        settings: {},
        
        /**
         * Init the editableCell
         * Default params are : 
         *  - cellSelector -> the given selector to access the cell from the context
         *  - editOn -> the eventType wich trigger the editMode
         *  - saveOn -> complex object defining which event should trigger the save event
         *              - For keypress/keydown event, use "keydown" : [key', 'otherkey', 13], 
         *                  the keydown array can use string representing special char (enter, esc) or keyCode
         *  - abortOn -> save as saveOn
         *  - editClass -> the css class to appply to a cell when in edit mode
         *  - editTemplate -> a template for the edit mode, the only "placeholder" you got is {{value}}
         *                      For exemple, you can use "<textarea>{{value}}</textarea> to replace the cell content with a textearea
         *                          or "<input type='texte' name='whatyouwant' value='{{value}}' /> to replace with an input
         */
        init: function(options) {
            methods.settings = $.extend({
                cellSelector: "td",
                editOn: "dblclick editCell",
                saveOn: {
                    "keydown": ["enter"]
                },
                abortOn: {
                    "keydown": ["esc"],
                    "blur" : true
                },
                editClass: "edit",
                editTemplate: "<textarea>{{value}}</textarea>"
            }, options);
            
            methods.bindEvent.apply(this);
        },
        
        /**
         *  Bind event on the cell(s) given the settings
         */
        bindEvent: function(settings) {
            // Enter edit mode
            $(this).on(methods.settings.editOn, methods.settings.cellSelector, methods.enterEditModeHandler);
            
            /**
             * TODO
             * Crapy - need to find a better way to attach those complex event with keydown
             */
            // Abort editing
            if (methods.settings.abortOn.keydown) {
                var abortKeyList = [];
                $.each(methods.settings.abortOn["keydown"], function(id, value) {
                    if (isNaN(parseInt(value))) {
                        abortKeyList.push(KEYCODE[value]);
                    } else {
                        abortKeyList.push(value);
                    }
                });
                $(this).on("keydown", methods.settings.cellSelector, function(e) {
                    if ($.inArray(e.keyCode, abortKeyList) != -1) {
                        e.preventDefault(); // Prevent the insertion of the \n on submit
                        methods.exitEditMode(e);
                    }
                });
                
                for (eventSpec in methods.settings.abortOn) {
                    if (!eventSpec.match("key")) {
                        $(this).on(eventSpec, methods.settings.cellSelector, methods.exitEditMode);   
                    }
                }
            }
            
            // Save
            if (methods.settings.saveOn.keydown) {
                saveKeyList = [];
                $.each(methods.settings.saveOn.keydown, function(id, value) {
                    if (isNaN(parseInt(value))) {
                        saveKeyList.push(KEYCODE[value]);
                    } else {
                        saveKeyList.push(value);
                    }
                });
                $(this).on("keydown", methods.settings.cellSelector, function(e) {
                    if ($.inArray(e.keyCode, saveKeyList) != -1) {
                        e.preventDefault(); // Prevent the insertion of the \n on submit
                        methods.save(e);
                    }
                });
                for (eventSpec in methods.settings.saveOn) {
                    if (!eventSpec.match("key")) {
                        $(this).on(eventSpec, methods.settings.cellSelector, methods.save);   
                    }
                }
            }
            
            // apply the Save
            $(document).on("saveCell", methods.settings.cellSelector, methods.saveCellHandler);
        }, 
        

        /**
         * save
         * 
         * trigger a saveCell event, eventHandler will recieve as param:
         * e -> the eventFacade
         * oldValue -> the cell value before modification
         * newValue -> the new cell value
         * 
         * the event won't be triggered if there is no real modification
         */
        save: function(e) {
            var $cell = $(e.currentTarget);
            var oldValue = $cell.data("value");
            var newValue = $(e.target).val();
            
            if (oldValue !== newValue)
                $cell.trigger("saveCell", [$cell.data("value"), $(e.target).val()]);
            else
                methods.showMode($cell);
        },
        
        /**
         * saveCellHandler
         * 
         * default handler for the event fired when a cell is saved
         * it apply the new value to the cell
         * You can prevent it if you bind your own saveCell handler and do an event.stopPropagation();
         * 
         * In order for your custom handler to be called before this default, you should use at least a more specifique selector than document
         */
        saveCellHandler: function(e, oldValue, newValue) {
            $(this).data("value", newValue);
            methods.showMode($(this));
        },
        
        /**
         * enterEditModeHandler
         * 
         * this event if fired by the event define by the settings editOn property
         * It save the value, apply classes and change the cell mode
         * then apply the editTemplate to the cell
         */
        enterEditModeHandler: function(e) {
             var $cell = $(e.currentTarget);
             
             // Set the width manually so the cell keep the same size
             $cell.width($cell.width());
        
            // Don't do anything if cell is already in edit mode
            if ($cell.data("mode") === "edit") {
                return;
            }
            
            // Set the edit mode
            $cell.addClass("edit");
            if ($cell.data("value") === undefined) {
                $cell.data("value", $cell.text());   
            }
                
                
            $cell.data("mode", "edit");
            
            var template = methods.settings.editTemplate.replace("{{value}}", $cell.text());
            $cell.html(template);
            $cell.find("textarea, input").select();
        },
        /**
         * exitEditModeHandler
         * 
         * Abort editing the cell, just retrieve the cell from the event
         * then call the showMode
         */
        exitEditMode: function(e) {
            var $cell = $(e.currentTarget);
            methods.showMode($cell);
        },
        /**
         * showMode
         * 
         * given a cell, set it state to show
         */
        showMode: function($cell) {
            // Restore the show mode
            $cell.removeClass("edit");
            $cell.html($cell.data("value"));
            $cell.data("mode", "show");
            $cell.removeClass("error");
            
            // Unbind edit mode event
            $cell.unbind("keydown");
            $cell.unbind("clickoutside");
        }
        
    }
    
    
    $.fn.editableCell = function(method) {
        if ( methods[method] ) {
            return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
          $.error( 'Method ' +  method + ' does not exist on jQuery.tooltip' );
        }
        
        methods.bindEvent(selector, settings);
    }
    
})(jQuery);