/* Written by Keith Wood (kbwood{at}iinet.com.au) and Stéphane Nahmani (sholby@sholby.net). */
define(['jQueryDatepickerLang'], function() {
    jQuery(function($){
        $.datepicker.regional['en'] = $.datepicker.regional[''];
        $.datepicker.regional['en'].dateFormat = 'yy-mm-dd'
    });
});
