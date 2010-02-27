/**
 * jQuery.panelmagic.js
 * Copyright (c) 2010 Craig Hoover - crh3675(at)gmail(dot)com | http://standardscompliance.com
 * Dual licensed under MIT and GPL.
 * Date: 2/27/2010
 * @author Craig Hoover
 * @version BETA
 * 
 * http://code.google.com/p/jquery-panel-magic/
 */

var $jq = {};
$jq = jQuery.noConflict(true);	

/**
 * jQuery.ScrollTo - Easy element scrolling using jQuery.
 * Copyright (c) 2007-2009 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 5/25/2009
 * @author Ariel Flesler
 * @version 1.4.2
 *
 * http://flesler.blogspot.com/2007/10/jqueryscrollto.html
 */
if(typeof $jq.scrollTo != 'function'){
;(function(d){var k=d.scrollTo=function(a,i,e){d(window).scrollTo(a,i,e)};k.defaults={axis:'xy',duration:parseFloat(d.fn.jquery)>=1.3?0:1};k.window=function(a){return d(window)._scrollable()};d.fn._scrollable=function(){return this.map(function(){var a=this,i=!a.nodeName||d.inArray(a.nodeName.toLowerCase(),['iframe','#document','html','body'])!=-1;if(!i)return a;var e=(a.contentWindow||a).document||a.ownerDocument||a;return d.browser.safari||e.compatMode=='BackCompat'?e.body:e.documentElement})};d.fn.scrollTo=function(n,j,b){if(typeof j=='object'){b=j;j=0}if(typeof b=='function')b={onAfter:b};if(n=='max')n=9e9;b=d.extend({},k.defaults,b);j=j||b.speed||b.duration;b.queue=b.queue&&b.axis.length>1;if(b.queue)j/=2;b.offset=p(b.offset);b.over=p(b.over);return this._scrollable().each(function(){var q=this,r=d(q),f=n,s,g={},u=r.is('html,body');switch(typeof f){case'number':case'string':if(/^([+-]=)?\d+(\.\d+)?(px|%)?$/.test(f)){f=p(f);break}f=d(f,this);case'object':if(f.is||f.style)s=(f=d(f)).offset()}d.each(b.axis.split(''),function(a,i){var e=i=='x'?'Left':'Top',h=e.toLowerCase(),c='scroll'+e,l=q[c],m=k.max(q,i);if(s){g[c]=s[h]+(u?0:l-r.offset()[h]);if(b.margin){g[c]-=parseInt(f.css('margin'+e))||0;g[c]-=parseInt(f.css('border'+e+'Width'))||0}g[c]+=b.offset[h]||0;if(b.over[h])g[c]+=f[i=='x'?'width':'height']()*b.over[h]}else{var o=f[h];g[c]=o.slice&&o.slice(-1)=='%'?parseFloat(o)/100*m:o}if(/^\d+$/.test(g[c]))g[c]=g[c]<=0?0:Math.min(g[c],m);if(!a&&b.queue){if(l!=g[c])t(b.onAfterFirst);delete g[c]}});t(b.onAfter);function t(a){r.animate(g,j,b.easing,a&&function(){a.call(this,n,b)})}}).end()};k.max=function(a,i){var e=i=='x'?'Width':'Height',h='scroll'+e;if(!d(a).is('html,body'))return a[h]-d(a)[e.toLowerCase()]();var c='client'+e,l=a.ownerDocument.documentElement,m=a.ownerDocument.body;return Math.max(l[h],m[h])-Math.min(l[c],m[c])};function p(a){return typeof a=='object'?a:{top:a,left:a}}})($jq);
}

// main panelMagic logic
$jq.panelMagic = function(ops)
{		
	// initializer
	this.init = function(ops)
	{
		$jq('body').css({overflow:'hidden',overflowX:'hidden',overflowY:'hidden'});
		
		this.options = {
			openingPanel:null,
			scrollTimer:1500,
			scrollEasing:null,
			panelClass:'panel',
			gridLoader:null,
			gridLoaderOpacity:1,
			gridLoaderOffset:{top:10,right:10,bottom:'none',left:'none'},
			resizeTimer:500, // pause before running resize event
			beforeRestorePanels:function(){},
			afterRestorePanels:function(){},
			afterLoadOverview:function(){},
			afterLoadPanel:function(){}
		};
		
		$jq.extend(this.options,ops);
		
		// object private properties
		this.resizeTimer = null;
		this.windowWidth = $jq(window).width();
		this.windowOldHeight = 0;
		this.windowOldWidth = 0;		
		this.windowResized = false;
		this.gridActive = false;
		this.gridPanels = $jq(('.'+this.options.panelClass));
		this.gridMatrix = this.calcMatrix.call(this);
		this.firstLoad = true;
		this.currentPanel = null;
		this.setup.call(this);		
	};

	// matrix calculations
	this.calcMatrix = function()
	{
		for(i=1;i<=this.gridPanels.length;i++)
		{		
			var sq = Math.pow(i,2);
			if(sq == this.gridPanels.length)
			{
				return [i,i];
			}
			else if(sq > this.gridPanels.length)
			{
				return [i, i--];
			} 
		}			
	};
	
	this.initGridLoader = function()
	{
		var $inst = this;
		
		if($inst.options.gridLoader)
		{
			var $ldr = $jq($inst.options.gridLoader);
			$ldr.css({display:'none',position:'absolute'}).bind('click', function(){ 
				$jq(this).fadeOut('fast'); $inst.showOverview.call($inst,$inst)
			}, false);
		}
	}

	// retrieve paddings and borders to substract from our abs positioned elements
	this.getPanelOffsets = function()
	{
		$panel = $jq(this);
		var offsets = {top:0,right:0,bottom:0,left:0};

		$jq(['border%sWidth','padding%s']).each(function(){
			offsets.left 	+= parseInt($panel.css(this.replace('%s','Left')) || 0);
			offsets.right 	+= parseInt($panel.css(this.replace('%s','Right')) || 0);
			offsets.top 	+= parseInt($panel.css(this.replace('%s','Top')) || 0);
			offsets.bottom += parseInt($panel.css(this.replace('%s','Bottom')) || 0);
		});

		return offsets;
	};

	this.positionPanels = function(callback)
	{
		var $inst = this;
		$inst.sw = parseInt($jq(window).width()), $inst.sh = parseInt($jq(window).height());
		var rows = $inst.gridMatrix[0];
		var cols = $inst.gridMatrix[1];
		var idx = 0;

		// establish rows
		for(r=1;r<=rows;r++)
		{				
			var top = (r-1) * $inst.sh;

			// establish columns
			for(c=1;c<=cols;c++)
			{
				var left = (c-1) * $inst.sw;
				var $panel = $jq($inst.gridPanels[idx]);

				if($panel.length == 0) break;

				// remove our borders and padding from width
				var off = $inst.getPanelOffsets.call($panel);
				var width = $inst.sw - off.left - off.right;
				var height = $inst.sh - off.top - off.bottom;
				var $panel = $jq($inst.gridPanels[idx]).css({width:width,height:height,display:'none',position:'absolute'});	
				$panel.get(0).defaultTop = top;
				$panel.get(0).defaultLeft = left;
				idx++;
				
				// pass idx into anonymous function as we need a new scope
				// otherwise idx is always the max value
				(function(idx){
					$panel.animate({top:top,left:left},100, function(){
						if(idx == $inst.gridPanels.length)
						{
							$inst.windowOldWidth = width;
							$inst.windowOldHeight = height;
							
							if(callback) callback.call($inst);
						}
					});	
				})(idx);			
			}				
		}		
	}

	// set panels in matrix
	this.setup = function()
	{			
		var $inst = this;		
		$inst.positionPanels.call($inst ,function(){

			// set opening panel
			$inst.currentPanel = $inst.options.openingPanel ? $jq($inst.options.openingPanel) : $inst.gridPanels[0];
			$inst.gridPanels.css({display:'block'}).bind('mousedown', {inst:$inst}, this.setPanelActive );
		
			// go to opening panel
			$jq.scrollTo($inst.currentPanel,$inst.options.scrollTimer,{easing:$inst.options.scrollEasing,onAfter:function(){

				// reposition our menuloader after panel is selected
				$inst.repositionMenuLoader.call($inst);
				
				// bind a resize event to the window to handle redraw
				$jq(window).bind('resize', function(){ 
					$inst.windowResized = true; 
					$inst.windowWidth = $jq(window).width();
					
					// we have a custom resize to stop flickering
					// upon complete, executes the function called to it					
					$inst.resizeWait(function(){
						var $inst = this;
						
						// when gridActive, fix scale of panel grid
						if($inst.gridActive) 
						{ 
								$inst.redrawGridLayout.call($inst);
						}
						else
						{
							// not gridActive, reposition panels
							$inst.positionPanels.call($inst,function(){
								$inst.gridPanels.show();
								$panel = $jq($inst.currentPanel);
							
								$jq('body').attr({
									scrollTop:0, // must have this
									scrollLeft:0 // must have this
								});

								$jq('body').scrollTo($panel, 500);	
								
								// don't forget our menu loader
								$inst.repositionMenuLoader.call($inst);
																				
							}); 
						} 
					});
				});
			}});	
		});
		
		$inst.initGridLoader();
	};
	
	this.resizeWait = function(callback)
	{	
		var $inst = this;
		
		if($inst.resizeTimer == null)
		{
			$inst.resizeTimer = setInterval(function(){				
				if($jq(window).width() == $inst.windowWidth)
				{
					clearInterval($inst.resizeTimer);
					callback.call($inst);
					$inst.resizeTimer = null;
					$inst.windowWidth = $jq(window).width();
				}
			}, $inst.options.resizeTimer);
		}		
	}
	
	this.setPanelActive = function(event)
	{
		var $inst = event.data.inst;
				
		if($inst.gridActive)
		{
			$node = $jq(this);
			event.stopPropagation();
			event.preventDefault();
			$inst.currentPanel = $jq(this);
			$inst.hideGridLayout.call($inst);
			return false;		
		}		
	}

	// bring us back to our regular display
	this.hideGridLayout = function()
	{
		var $inst = this;  
		var len = $inst.gridPanels.length;
		var cnt = 0;
		
		$inst.gridPanels.fadeOut('fast',function(){
			cnt++;

			if(cnt == len)
			{
				$jq('body').css({
					MozTransformOrigin:'0% 0%',
					MozTransform:'scale(1)',
					WebkitTransformOrigin:'0% 0%',
					WebkitTransform:'scale(1)'
				}).attr({
					scrollTop:0, // must have this
					scrollLeft:0 // must have this
				});
				
				if($jq.browser.msie)
				{					
					$jq('.panel').each(function(i){
						var $panel = $jq(this);	
						$panel.IEMatrixScale({scale:1,expr:'='});	
						$jq(this).css({left: this.origLeft,top:this.origTop});
					});		
				}

				$inst.options.beforeRestorePanels.call($inst);	
				
				var xcnt = 0;
				$inst.gridPanels.css({cursor:'auto'}).fadeIn('fast',function(){
					xcnt++;
					if(xcnt == len)
					{
						$inst.gridActive = false;
						$inst.options.afterRestorePanels.call($inst);
						$jq.scrollTo('#'+$inst.currentPanel.attr('id'), $inst.options.scrollTimer, {easing:$inst.options.scrollEasing, onAfter:function(){
							$inst.repositionMenuLoader.call($inst);
						}});	
					}
				});				
			}		
		});
	};
	
	this.repositionMenuLoader = function()
	{
		var $inst = this;
		
		if($inst.options.gridLoader)
		{
			var $el = $jq($inst.currentPanel);
			var $cnt = $jq($inst.options.gridLoader);
			var sl = $el.get(0).offsetLeft, st = $el.get(0).offsetTop, sw = $jq(window).width(), sh = $jq(window).height();
			var cw = $cnt.width(), ch = $cnt.height();
			var offsets = {};
			
			if($inst.options.gridLoaderOffset)
			{
				var o = $inst.options.gridLoaderOffset;
				
				if (o.left && String(o.left).match(/none|auto/)) offsets.left = 'auto'; 				
				if (o.left && !isNaN(o.left)) offsets.left = sl + o.left;	
	
				if (o.right && String(o.right).match(/none|auto/)) offsets.right = 'auto'; 				
				if (!isNaN(o.right)) offsets.left = sl + sw - cw - o.right;	
					
				if (o.top && String(o.top).match(/none|auto/)) offsets.top = 'auto'; 				
				if (!isNaN(o.top)) offsets.top = st + o.top;			
				
				if (o.bottom && String(o.bottom).match(/none|auto/)) offsets.bottom = 'auto'; 				
				if (!isNaN(o.bottom)) offsets.top = st + sh - o.bottom - ch;									
			}						
			
			$cnt.css({
				opacity:$inst.options.gridLoaderOpacity,
				top: offsets.top,
				left: offsets.left
			}).fadeIn();
			
		}		
	}
	
	// loads a panel into view
	this.loadPanel = function(panel)
	{
		var $panel = $jq(panel);
		var $inst = this;
		$inst.currentPanel = $inst.findPanel($panel);
		
		if($panel.is(('.'+$inst.options.panelClass)))
		{			
			$inst.scrollTo($panel, $inst.options.scrollTimer,{easing:$inst.options.scrollEasing,onAfter:function(){
				$inst.repositionMenuLoader.call($inst);
				$inst.options.afterLoadPanel.call($inst, $panel.get(0));
			}});
		}
		else
		{
			console.log('accessing invalid panel');
		}		
	};

	//  scales the interface and redraws all pages on screen
	this.redrawGridLayout = function()
	{  
		var $inst = this;

		var wh = parseInt($jq(window).height());
		var ww = parseInt($jq(window).width());
		var scale = (wh/($inst.gridMatrix[0] * $inst.sh));
		var iter = $inst.gridMatrix[1] * ($inst.sw * scale);
		var diff = (ww - iter)/2;
		var origin = diff + (diff * scale);
		origin = Math.round(((origin / ww) * 100)*100)/100;

		$inst.gridPanels.css({opacity:1,display:'block',cursor:'pointer'});

		// for FF, Safari
		$jq('body').css({
			MozTransformOrigin:origin+'% 50%',
			MozTransform:'scale('+ scale +')',
			webkitTransformOrigin:origin+'% 0%',	
			webkitTransform:'scale('+scale+')'
		}).attr({
			scrollTop:0, // must have this
			scrollLeft:0 // must have this
		});	  
		
		// As always, something special for IE
		if($jq.browser.msie)
		{
			$jq('.panel').each(function(i){
				
				var $panel = $jq(this);		
				if(!this.origTop) this.origTop = parseFloat(this.offsetTop);
				if(!this.origLeft) this.origLeft = parseFloat(this.offsetLeft);
				cssleft = this.origLeft * scale, csstop = this.origTop * scale;
				
				$panel.IEMatrixScale({scale:scale,expr:'*='});	
				
				// get the difference of the resized window according to the new
				// sizes of the elements and add to left position - keeps them centered
				var xadd = (parseFloat($jq(window).width()) - ((this.offsetWidth * scale) * $inst.gridMatrix[0]))/2;
				
				$jq(this).css({left:cssleft + xadd,top:csstop});
			});		
		}

		$inst.gridActive = true;
		$inst.windowResized = false;

	};

	// traverse the dom and find the panel
	this.findPanel = function(element)
	{
		var $inst = this;
		var el = $jq(element);
		while(!el.is(('.'+$inst.options.panelClass)))
		{
			el = el.parent();
		}
		return el;
	}

	// show the overview for the site
	this.showOverview = function(inst)
	{
		var $inst = inst;
		//$inst.currentPanel = $inst.findPanel(caller);

		if(!$inst.gridActive)
		{
			if($inst.firstLoad && $inst.options.showOverviewOnload)
			{
				$inst.redrawGridLayout.call($inst);	
				$inst.gridActive = true;      	      
				$inst.gridPanels.fadeIn('fast');	
				$inst.firstLoad = false;
				$inst.options.afterLoadOverview.call($inst);	
			}
			else
			{
				var cnt = 0;				
					
				$inst.gridPanels.fadeOut('fast',function(){
					if(cnt == $inst.gridPanels.length -1)
					{
						$inst.redrawGridLayout.call($inst);	
						$inst.gridActive = true;      	      
						$inst.gridPanels.fadeIn('fast',function(){
							$inst.options.afterLoadOverview.call($inst);
						});	   
					}
					cnt++;
				});
			}
		}
		else
		{
			$inst.hideGridLayout.call($inst);
		}
	};

	// initialize
	this.init.call(this, ops);		

	return this;			
}

// Ie needs some special function to duplicate the same CSS
// functions we have with Firefox and Safari
$jq.fn.IEMatrixScale = function(ops)
{
	var defaults = {scale:1,expr:'='}
	$jq.extend(defaults,ops);

	$jq(this).each(function(){
		this.style.filter = "progid:DXImageTransform.Microsoft.Matrix()";
		eval("this.filters.item(0).M11 "+defaults.expr+defaults.scale+";");
		eval("this.filters.item(0).M12 "+defaults.expr+defaults.scale+";");
		eval("this.filters.item(0).M21 "+defaults.expr+defaults.scale+";");
		eval("this.filters.item(0).M22 "+defaults.expr+defaults.scale+";");		
		return this;
	});
}
