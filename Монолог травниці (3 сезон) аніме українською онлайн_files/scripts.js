var c_cache=[];
function RunAjaxJS(a,b){var c=new Date,d=!1,c=c.getTime(),e=/<script.*?>(.|[\r\n])*?<\/script>/ig,f=e.exec(b);if(null!=f){for(var g=Array(f.shift()),d=!0;f;)f=e.exec(b),null!=f&&g.push(f.shift());for(e=0;e<g.length;e++)b=b.replace(g[e],'<span id="'+c+e+'" style="display:none;"></span>')}$("#"+a).html(b);if(d){d=/<script.*?>((.|[\r\n])*?)<\/script>/ig;for(e=0;e<g.length;e++){var h=document.getElementById(c+""+e),f=h.parentNode;f.removeChild(h);d.lastIndex=0;h=d.exec(g[e]);f=f.appendChild(document.createElement("script"));f.text=
h[1];h=g[e].substring(g[e].indexOf(" ",0),g[e].indexOf(">",0)).split(" ");if(1<h.length)for(var j=0;j<h.length;j++)if(0<h[j].length){var i=h[j].split("=");i[1]=i[1].substr(1,i[1].length-2);f.setAttribute(i[0],i[1])}}}}

$(function() {

			$('#carousel ul').carouFredSel({
				prev: '#prev',
				next: '#next',
				pagination: "#pager",
				auto: true,
				scroll: 1000,
				pauseOnHover: true
			});

		});

jQuery.fn.xcolor = function(options){
 
var options = jQuery.extend({
  bgOdd: 'none',
  bgEven: '#f3f3f3',
},options);
 
return this.each(function() {
  jQuery(this).find('tr:even td')
    .css('background-color', options.bgEven)

  jQuery(this).find('tr:odd td')
    .css('background-color', options.bgOdd)
});
 
};  

$(document).ready(function() {
			
			$('.carousel').elegantcarousel({
					delay:150,
					fade:300,
					slide:500,
					effect:'fade',		  			//  fade, slide			  
					orientation:'horizontal',		//	horizontal, vertical
					captionFade: 150,
					loop: true,					//	false, true
					autoplay: true,					// 	false, true
					time: 10000
			});
			
			
			// horizontal center of the main  
			function center_main() {
				var window_height = $(window).height();
				var main_height = parseInt($('#main').css('height'));
				var main_height_margin = (window_height - main_height) / 2;
				$('#main').css('top',Math.floor(main_height_margin));
			}
			center_main();
	
		});

$(function() {

	function createCookie(name,value,days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
		}
		else var expires = "";
		document.cookie = name+"="+value+expires+"; path=/";
	}
	function readCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	}
	function eraseCookie(name) {
		createCookie(name,"",-1);
	}

	$('.inc_tab ul.controls').each(function(i) {
		var cookie = readCookie('tabCookie'+i);
		if (cookie) $(this).find('li').eq(cookie).addClass('current').siblings().removeClass('current')
			.parents('div.inc_tab').find('div.case').hide().eq(cookie).show();
	})

	$('.inc_tab ul.controls').delegate('li:not(.current)', 'click', function() {
		$(this).addClass('current').siblings().removeClass('current')
			.parents('div.inc_tab').find('div.case').hide().eq($(this).index()).fadeIn();
		var ulIndex = $('.inc_tab ul.controls').index($(this).parents('.inc_tab ul.controls'));
		eraseCookie('tabCookie'+ulIndex);
		createCookie('tabCookie'+ulIndex, $(this).index(), 365);
	}).delegate('li.current', 'click', function() {
		$(this).parents('div.inc_tab').find('div.case').slideUp()
		$(this).removeClass('current');
		eraseCookie('tabCookie'+0);
	});


});

$(function() {
	$(".fade").css("opacity", "1");
	$(".fade").hover(function () {
		$(this).stop().fadeTo(300, 0.65);
	},
	function () {
		$(this).stop().fadeTo(300, 1);
	});
});


$(function() {
$(".fade2").css("opacity","0");
$(".fade2").hover(function () {
$(this).stop().animate({
opacity: 1
}, "slow");
},
function () {
$(this).stop().animate({
opacity: 0
}, "slow");
});
});

(function ($) {
	
	$(document).ready(function() {
        $("a").easyTooltip();
        $("img").easyTooltip();
    });
	
	$.fn.easyTooltip = function (b) {
		var c = {
			xOffset: 12,
			yOffset: 20,
			tooltipId: "easyTooltip",
			clickRemove: false,
			content: "",
			useElement: ""
		};
		var b = $.extend(c, b);
		var d;
		this.each(function () {
			var a = $(this).attr("title");
			$(this).hover(function (e) {
				d = (b.content != "") ? b.content : a;
				d = (b.useElement != "") ? $("#" + b.useElement).html() : d;
				$(this).attr("title", "");
				if (d != "" && d != undefined) {
					$("body").append("<div id='" + b.tooltipId + "'><div class='easyTooltip'>" + d + "</div></div>");
					$("#" + b.tooltipId).css("position", "absolute").css("top", (e.pageY - b.yOffset) + "px").css("left", (e.pageX + b.xOffset) + "px").css("display", "none").fadeIn("fast")
				}
			}, function () {
				$("#" + b.tooltipId).remove();
				$(this).attr("title", a)
			});
			$(this).mousemove(function (e) {
				$("#" + b.tooltipId).css("top", (e.pageY - b.yOffset) + "px").css("left", (e.pageX + b.xOffset) + "px")
			});
			if (b.clickRemove) {
				$(this).mousedown(function (e) {
					$("#" + b.tooltipId).remove();
					$(this).attr("title", a)
				})
			}
		})
	}
})(jQuery);

$(document).ready(function(){
	
	// The select element to be replaced:
	var select = $('select.makeMeFancy');

	var selectBoxContainer = $('<div>',{
		width		: select.outerWidth(),
		className	: 'search_sel',
		html		: '<div class="selectBox"></div>'
	});

	var dropDown = $('<ul>',{className:'dropDown'});
	var selectBox = selectBoxContainer.find('.selectBox');
	
	// Looping though the options of the original select element
	
	select.find('option').each(function(i){
		var option = $(this);
		
		if(i==select.attr('selectedIndex')){
			selectBox.html(option.text());
		}
		
		// As of jQuery 1.4.3 we can access HTML5 
		// data attributes with the data() method.
		
		if(option.data('skip')){
			return true;
		}
		
		// Creating a dropdown item according to the
		// data-icon and data-html-text HTML5 attributes:
		
		var li = $('<li>',{
			html:	'<span>'+
					option.data('html-text')+'</span>'
		});
				
		li.click(function(){
			
			selectBox.html(option.text());
			dropDown.trigger('hide');
			
			// When a click occurs, we are also reflecting
			// the change on the original select element:
			select.val(option.val());
			
			return false;
		});
		
		dropDown.append(li);
	});
	
	selectBoxContainer.append(dropDown.hide());
	select.hide().after(selectBoxContainer);
	
	// Binding custom show and hide events on the dropDown:
	
	dropDown.bind('show',function(){
		
		if(dropDown.is(':animated')){
			return false;
		}
		
		selectBox.addClass('expanded');
		dropDown.slideDown();
		
	}).bind('hide',function(){
		
		if(dropDown.is(':animated')){
			return false;
		}
		
		selectBox.removeClass('expanded');
		dropDown.slideUp();
		
	}).bind('toggle',function(){
		if(selectBox.hasClass('expanded')){
			dropDown.trigger('hide');
		}
		else dropDown.trigger('show');
	});
	
	selectBox.click(function(){
		dropDown.trigger('toggle');
		return false;
	});

	// If we click anywhere on the page, while the
	// dropdown is shown, it is going to be hidden:
	
	$(document).click(function(){
		dropDown.trigger('hide');
	});
});

var logopened=false;
$(document).ready(function(){
    $('#logbtn').click(function(){
        if(logopened)
        {
            $('#logform').hide('fast');
            $('#logbtn').removeClass('selected');
        }    
        else
        {
            $('#logform').show('fast');
            $('#logbtn').addClass('selected');
        }
        logopened=!logopened;
        return false;
    });
}).click(function(e){
    if(!logopened)
        return;
    e=e||window.event;
    var target=e.target||e.srcElement;
    while(target)
    {
        if(target==$('#logform').get(0))
            return;
        target=target.parentNode;
    }
    $('#logform').hide('fast');
    $('#logbtn').removeClass('selected');
    logopened=false;    
});


function profileRateStats(id, rating_type) {
                    
    $.post( dle_root + "engine/ajax/controller.php?mod=who_rated", {user_id: id, type:'profile', rating_type: rating_type}, function(data) {
        
        $('#who-rated .all-list').hide();    
        $('#who-rated').append(data);
                    
    });    
                    
}

function who_rated_list(obj, rating_type) {
    
    var id = $(obj).data('commid') ? $(obj).data('commid') : $(obj).data('newsid');
    
    $.post( dle_root + 'engine/ajax/controller.php?mod=who_rated', {id: id, rating_type: rating_type}, function(data){
                    
        $.magnificPopup.open({
            items: {
                src: '<div style="width:500px;background:#FFF;position:relative;margin:0 auto;padding:25px 10px 10px;" class="clrfix">'+data+'</div>'
            },
            type: 'inline',
            mainClass: 'mfp-fade',
            removalDelay: 0,
            overflowY: 'hide',
            closeOnBgClick: true,
            callbacks: {
                open: function() {},
                afterClose: function() {},         
                beforeClose: function() {}
            }        
            });
            
        });
            
        return false;
    
}


$(document).ready(function(){
	
	// The select element to be replaced:
	var select = $('select.story_stat');

	var selectBoxContainer = $('<div>',{
		width		: select.outerWidth(),
		className	: 'stat_sel',
		html		: '<div class="stat_box"></div>'
	});

	var dropDown = $('<ul>',{className:'dropDown'});
	var selectBox = selectBoxContainer.find('.stat_box');
	
	// Looping though the options of the original select element
	
	select.find('option').each(function(i){
		var option = $(this);
		
		if(i==select.attr('selectedIndex')){
			selectBox.html(option.text());
		}
		if(option.data('skip')){
			return true;
		}
		
		var li = $('<li>',{
			html:	'<span>'+
					option.data('html-text')+'</span>'
		});
				
		li.click(function(){
			
			selectBox.html(option.text());
			dropDown.trigger('hide');

			select.val(option.val());
			
			return false;
		});
		
		dropDown.append(li);
	});
	
	selectBoxContainer.append(dropDown.hide());
	select.hide().after(selectBoxContainer);
	
	dropDown.bind('show',function(){
		
		if(dropDown.is(':animated')){
			return false;
		}
		
		selectBox.addClass('expanded');
		dropDown.slideDown();
		
	}).bind('hide',function(){
		
		if(dropDown.is(':animated')){
			return false;
		}
		
		selectBox.removeClass('expanded');
		dropDown.slideUp();
		
	}).bind('toggle',function(){
		if(selectBox.hasClass('expanded')){
			dropDown.trigger('hide');
		}
		else dropDown.trigger('show');
	});
	
	selectBox.click(function(){
		dropDown.trigger('toggle');
		return false;
	});
	
	$(document).click(function(){
		dropDown.trigger('hide');
	});
});