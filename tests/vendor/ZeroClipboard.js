// Simple Set Clipboard System
// Author: Joseph Huckaby
window.ZeroClipboard={version:"1.0.8",clients:{},moviePath:"ZeroClipboard.swf",nextId:1,$:function(a){return typeof a=="string"&&(a=document.getElementById(a)),a.addClass||(a.hide=function(){this.style.display="none"},a.show=function(){this.style.display=""},a.addClass=function(a){this.removeClass(a),this.className+=" "+a},a.removeClass=function(a){var b=this.className.split(/\s+/),c=-1;for(var d=0;d<b.length;d++)b[d]==a&&(c=d,d=b.length);return c>-1&&(b.splice(c,1),this.className=b.join(" ")),this},a.hasClass=function(a){return!!this.className.match(new RegExp("\\s*"+a+"\\s*"))}),a},setMoviePath:function(a){this.moviePath=a},newClient:function(){return new ZeroClipboard.Client},dispatch:function(a,b,c){var d=this.clients[a];d&&d.receiveEvent(b,c)},register:function(a,b){this.clients[a]=b},getDOMObjectPosition:function(a,b){var c={left:0,top:0,width:a.width?a.width:a.offsetWidth,height:a.height?a.height:a.offsetHeight};while(a&&a!=b)c.left+=a.offsetLeft,c.left+=a.style.borderLeftWidth?parseInt(a.style.borderLeftWidth):0,c.top+=a.offsetTop,c.top+=a.style.borderTopWidth?parseInt(a.style.borderTopWidth):0,a=a.offsetParent;return c},Client:function(a){this.handlers={},this.id=ZeroClipboard.nextId++,this.movieId="ZeroClipboardMovie_"+this.id,ZeroClipboard.register(this.id,this),a&&this.glue(a)}},ZeroClipboard.Client.prototype={id:0,title:"",ready:!1,movie:null,clipText:"",handCursorEnabled:!0,cssEffects:!0,handlers:null,zIndex:99,glue:function(a,b,c){this.domElement=ZeroClipboard.$(a),this.domElement.style.zIndex&&(this.zIndex=parseInt(this.domElement.style.zIndex,10)+1),this.domElement.getAttribute("title")!=null&&(this.title=this.domElement.getAttribute("title")),typeof b=="string"?b=ZeroClipboard.$(b):typeof b=="undefined"&&(b=document.getElementsByTagName("body")[0]);var d=ZeroClipboard.getDOMObjectPosition(this.domElement,b);this.div=document.createElement("div");var e=this.div.style;e.position="absolute",e.left=""+d.left+"px",e.top=""+d.top+"px",e.width=""+d.width+"px",e.height=""+d.height+"px",e.zIndex=this.zIndex;if(typeof c=="object")for(var f in c)e[f]=c[f];b.appendChild(this.div),this.div.innerHTML=this.getHTML(d.width,d.height)},getHTML:function(a,b){var c="",d="id="+this.id+"&width="+a+"&height="+b,e=this.title?' title="'+this.title+'"':"";if(navigator.userAgent.match(/MSIE/)){var f=location.href.match(/^https/i)?"https://":"http://";c+="<object"+e+' classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="'+f+'download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0" width="'+a+'" height="'+b+'" id="'+this.movieId+'"><param name="allowScriptAccess" value="always" /><param name="allowFullScreen" value="false" /><param name="movie" value="'+ZeroClipboard.moviePath+'" /><param name="loop" value="false" /><param name="menu" value="false" /><param name="quality" value="best" /><param name="bgcolor" value="#ffffff" /><param name="flashvars" value="'+d+'"/><param name="wmode" value="transparent"/></object>'}else c+="<embed"+e+' id="'+this.movieId+'" src="'+ZeroClipboard.moviePath+'" loop="false" menu="false" quality="best" bgcolor="#ffffff" width="'+a+'" height="'+b+'" name="'+this.movieId+'" allowScriptAccess="always" allowFullScreen="false" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" flashvars="'+d+'" wmode="transparent" />';return c},hide:function(){this.div&&(this.div.style.left="-2000px")},show:function(){this.reposition()},destroy:function(){if(this.domElement&&this.div){this.hide(),this.div.innerHTML="";var a=document.getElementsByTagName("body")[0];try{a.removeChild(this.div)}catch(b){}this.domElement=null,this.div=null}},reposition:function(a){a&&(this.domElement=ZeroClipboard.$(a),this.domElement||this.hide());if(this.domElement&&this.div){var b=ZeroClipboard.getDOMObjectPosition(this.domElement),c=this.div.style;c.left=""+b.left+"px",c.top=""+b.top+"px"}},setText:function(a){this.clipText=a,this.ready&&this.movie.setText(a)},setTitle:function(a){this.title=a,this.ready&&this.movie.setTitle(a)},addEventListener:function(a,b){a=a.toString().toLowerCase().replace(/^on/,""),this.handlers[a]||(this.handlers[a]=[]),this.handlers[a].push(b)},setHandCursor:function(a){this.handCursorEnabled=a,this.ready&&this.movie.setHandCursor(a)},setCSSEffects:function(a){this.cssEffects=!!a},receiveEvent:function(a,b){a=a.toString().toLowerCase().replace(/^on/,"");switch(a){case"load":this.movie=document.getElementById(this.movieId);if(!this.movie){var c=this;setTimeout(function(){c.receiveEvent("load",null)},1);return}if(!this.ready&&navigator.userAgent.match(/Firefox/)&&navigator.userAgent.match(/Windows/)){var c=this;setTimeout(function(){c.receiveEvent("load",null)},100),this.ready=!0;return}this.ready=!0,this.movie.setText(this.clipText),this.movie.setTitle(this.title),this.movie.setHandCursor(this.handCursorEnabled);break;case"mouseover":this.domElement&&this.cssEffects&&(this.domElement.addClass("hover"),this.recoverActive&&this.domElement.addClass("active"));break;case"mouseout":this.domElement&&this.cssEffects&&(this.recoverActive=!1,this.domElement.hasClass("active")&&(this.domElement.removeClass("active"),this.recoverActive=!0),this.domElement.removeClass("hover"));break;case"mousedown":this.domElement&&this.cssEffects&&this.domElement.addClass("active");break;case"mouseup":this.domElement&&this.cssEffects&&(this.domElement.removeClass("active"),this.recoverActive=!1)}if(this.handlers[a])for(var d=0,e=this.handlers[a].length;d<e;d++){var f=this.handlers[a][d];typeof f=="function"?f(this,b):typeof f=="object"&&f.length==2?f[0][f[1]](this,b):typeof f=="string"&&window[f](this,b)}}},typeof module!="undefined"&&(module.exports=ZeroClipboard);