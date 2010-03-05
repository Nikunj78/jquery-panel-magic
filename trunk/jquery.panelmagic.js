/**
 * jQuery.panelmagic.js
 * Copyright (c) 2010 Craig Hoover - crh3675(at)gmail(dot)com | http://standardscompliance.com
 * Dual licensed under MIT and GPL.
 * Date: 3/5/2010
 * @author Craig Hoover
 * @version 1.0
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
		$jq('body').css({padding:0,margin:0,overflow:'hidden'});
		if($jq.browser.msie) $jq(document.documentElement).css({overflow:'hidden'});
		
		// our options that users can configure
		this.options = {
			openingPanel:null,
			scrollTimer:1500,
			scrollEasing:null,
			panelClass:'panel',
			panelPreviews:true,
			panelPreviewScale: 1.5,
			panelURLParam: 'panel',
			gridURLParam:'grid',
			previewPause:150,
			gridLoader:null,
			gridLoaderOpacity:1,
			gridLoaderOffset:{top:10,right:10,bottom:'none',left:'none'},
			resizeTimer:1000, // pause before running resize event
			beforeRestorePanels:function(){},
			afterRestorePanels:function(){},
			afterLoadGrid:function(){},
			afterLoadPanel:function(){}
		};
		
		$jq.extend(this.options,ops);
		
		// object private properties
		this._resizeTimer = null;
		this._windowWidth = parseFloat($jq(window).width());
		this._windowHeight = parseFloat($jq(window).height());
		this._windowResized = false;
		this._gridActive = false;
		this._gridPanels = $jq(('.'+this.options.panelClass));
		this._gridMatrix = this.calcMatrix.call(this);
		this._currentPanel = null;
		this._previewTimer = null;
		this._matrixScale = 1;
		
		// set this thing up!
		this.setup.call(this);		
	};

	// matrix calculations
	this.calcMatrix = function()
	{
		for(i=1;i<=this._gridPanels.length;i++)
		{		
			var sq = Math.pow(i,2);
			switch(true)
			{
				case (sq == this._gridPanels.length) : return {cols:i, rows:i}; 
				case (sq > this._gridPanels.length) : return {cols:i, row:i--}; 
			}
		}			
	};

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
		var inst = this;
		var rows = inst._gridMatrix.cols;
		var cols = inst._gridMatrix.rows;
		var idx = 0;

		// establish rows
		for(r=1;r<=rows;r++)
		{				
			var top = (r-1) * inst._windowHeight;

			// establish columns
			for(c=1;c<=cols;c++)
			{
				var left = (c-1) * inst._windowWidth;
				var $panel = $jq(inst._gridPanels[idx]);

				if($panel.length == 0) break;

				// remove our borders and padding from width
				var off = inst.getPanelOffsets.call($panel);
				var width = inst._windowWidth - off.left - off.right;
				var height = inst._windowHeight - off.top - off.bottom;
				var $panel = $jq(inst._gridPanels[idx]).css({width:width,height:height,display:'block',position:'absolute'});	
				panel = $panel.get(0);
				panel.defaultTop = top;
				panel.defaultLeft = left;
				idx++;				
					
				$panel.css({top:top,left:left});
				
				panel.oldOffsetTop = panel.offsetTop;
				panel.oldOffsetLeft = panel.offsetLeft;				
				
				if(idx == inst._gridPanels.length)
				{
					if(callback) callback.call(inst);
				}			
			}				
		}		
	}

	// set panels in matrix
	this.setup = function()
	{			
		var inst = this;		
		
		// init grid loader
		if(inst.options.gridLoader)
		{
			var $ldr = $jq(inst.options.gridLoader);
			$ldr.css({display:'none',position:'absolute'}).bind('click', function(){ 
				$jq(this).fadeOut('fast'); inst.showGrid.call(inst,inst)
			}, false);
		}
		
		// bind a resize event to the window to handle redraw			
		$jq(window).bind('resize', function(){ 
			window.clearTimeout(inst._resizeTimer);
			inst._resizeTimer = window.setTimeout(function(){
				if(inst._windowWidth != parseInt($jq(window).width()) && inst._windowHeight != parseInt($jq(window).height()))
				{
					window.location.reload();					
				}
			}, inst.options.resizeTimer);
		});
		
		inst.positionPanels.call(inst ,function(){

			// set opening panel
			inst._currentPanel = inst.options.openingPanel ? $jq(inst.options.openingPanel) : inst._gridPanels[0];
			
			// bind events
			inst._gridPanels.css({display:'block'}).bind('mousedown', {inst:inst}, this.setPanelActive );
				
			// check if they want a preview
			if(inst.options.panelPreviews) inst._gridPanels.bind('mouseover', {inst:inst}, this.showPanelPreview );
			
			// show grid if url matches
			var re = new RegExp(inst.options.gridURLParam + '=true');
			if(window.location.href.match(re))
			{
				inst.showGrid.call(inst,inst);
			}
			else
			{	
				var re = new RegExp(inst.options.panelURLParam + '=(.*)');
				if(window.location.href.match(re))
				{
					inst._currentPanel = $jq('#' + window.location.href.match(re)[1]);
				}				
				// go to opening panel
				$jq.scrollTo(inst._currentPanel,inst.options.scrollTimer,{easing:inst.options.scrollEasing, onAfter:function(){
					// reposition our menuloader after panel is selected
					inst.repositionMenuLoader.call(inst);
				}});	
			}
		});
	};
	
	this.showPanelPreview = function(event)
	{
		var inst = event.data.inst;
		
		// hide panel previews
		inst.hidePanelPreviews.call(inst);
		
		if (inst._gridActive )
		{					
			// our current calculated transform levels
			var transform = $jq('body').css('MozTransform') || $jq('body').css('WebkitTransform');
			var ratio = parseFloat(transform.match(/\d\.?\d+/)[0]);
			var panel = this;				
			
			// clear preview timer
			clearTimeout(inst._previewTimer);
			
			// create our preview for the grid layout
			inst._previewTimer = setTimeout(function(){
				
				// make sure they are still hidden since we are in a timer
				inst.hidePanelPreviews.call(inst);
			
				var $panel = $jq(panel);
				var $clone = $jq(panel).clone(true);
				var clone = $clone.get(0);			
				var upscale = inst.options.panelPreviewScale;
				var ww = inst._windowWidth * inst._gridMatrix.cols; // total stage width with all panels
				var wh = inst._windowHeight * inst._gridMatrix.rows; // total stage height with all panels
				var pw = parseFloat(panel.offsetWidth), pwr = pw * ratio, cw = pwr * upscale;
				var ph = parseFloat(panel.offsetHeight), phr = ph * ratio, ch = phr * upscale;
			
				// do our best to keep previews within the window
				var nl = parseFloat(panel.oldOffsetLeft) - (cw - pwr/2);		
				nl = nl < 0 ? 0 : nl; nl = nl + cw >= ww ? ww - cw : nl;

				var nt = parseFloat(panel.oldOffsetTop) - (ch - phr/2);	
				nt = nt < 0 ? 0 : nt; nt = nt + ch >= wh ? wh - ch : nt;				
				
				clone.parentPanel = panel; // store a reference to the main panel
								
				// give our clone some new styles
				$clone
					.css({ 
						position:'absolute',
						left: nl,
						top: nt,
						MozTransformOrigin:'0% 0%',
						MozTransform:'scale('+upscale+')',
						webkitTransformOrigin:'0% 0%',
						webkitTransform:'scale('+upscale+')',
						zIndex:10000,
						display:'none'
					})
					.unbind('mouseover') // removes inherited event
					.unbind('mousedown') // removes inherited event
					.bind('mousedown',function(){ $jq(this.parentPanel).trigger('mousedown')});
		
				panel.panelPreview = clone; // store a refernece to the clone with the panel
		
				$jq('body').append($clone);		
				
				if($jq.browser.msie)
				{
					var nl = parseFloat(panel.oldOffsetLeft);
					nl = nl * inst._matrixScale; nw = pw * inst._matrixScale; pw = nw * upscale;df = pw - nw; nl = nl - df/2;
					
					var nt = parseFloat(panel.oldOffsetTop);
					nt = nt * inst._matrixScale; nh = ph * inst._matrixScale; ph = nh * upscale; df = ph - nh; nt = nt - df/2;
					
					nl = nl < 0 ? 0 : nl; nl = nl + nw > inst._windowWidth ? inst._windowWidth - nw : nl; nt = nt < 0 ? 0 : nt;
					nt = nt + nh > inst._windowHeight ? inst._windowHeight - nh : nt;
							
					$clone.css({display:'block',left:nl,top:nt}).IEMatrixScale({scale:inst._matrixScale * upscale,expr:'*='});
					$clone.fadeIn('fast');
				}
				else
				{
					$clone.fadeIn('fast');
				}
				
				
			}, inst.options.previewPause);
		}
	}
	
	this.hidePanelPreviews = function()
	{
		var inst = this;
		
		if (inst._gridActive )
		{
			for(i=0;i < inst._gridPanels.length;i++)
			{	
				var panel = inst._gridPanels[i];
				if(panel.panelPreview) 
				{
					$jq(panel.panelPreview).stop().remove();
					panel.panelPreview = null;
				}
			}
		}			
	}
	
	this.resizeWait = function(callback)
	{	
		var inst = this;
		
		if(inst._resizeTimer == null)
		{
			inst._resizeTimer = setInterval(function(){				
				if($jq(window).width() == inst._windowWidth)
				{
					clearInterval(inst._resizeTimer);
					callback.call(inst);
					inst._resizeTimer = null;
					inst._windowWidth = $jq(window).width();
				}
			}, inst.options.resizeTimer);
		}		
	}
	
	this.setPanelActive = function(event)
	{
		var inst = event.data.inst;
		var panel = event.target;
		
		if($jq.browser.msie) var panel = inst.findPanel(event.target);
				
		if(inst._gridActive)
		{						
			$node = $jq(panel);
			inst._gridActive = false;
			
			inst.hidePanelPreviews.call(inst);			
			
			if(panel.panelPreview) $jq(panel.panelPreview).remove();			
			
			inst.hideGridLayout.call(inst, panel);
			
			var loc = window.location.href;
			window.location = loc.substr(0,loc.indexOf('#')) + '#/'+inst.options.panelURLParam+'=' + $jq(panel).attr('id');

	
			event.stopPropagation();
			event.preventDefault();
			return false;		
		}		
	}


	// bring us back to our regular display
	this.hideGridLayout = function(newPanel)
	{
		var inst = this;  
		var len = inst._gridPanels.length;
		var cnt = 0;
		
		inst.hidePanelPreviews.call(inst);	
		
		inst._gridPanels.fadeOut('fast',function(){
			cnt++;

			if(cnt == len)
			{				
				$jq('body').css({
					MozTransformOrigin:'0% 0%',
					MozTransform:'scale(1)',
					webkitTransformOrigin:'0% 0%',
					webkitTransform:'scale(1)'
				});
				
				if($jq.browser.msie)
				{					
					$jq('.panel').each(function(i){
						var $panel = $jq(this);	
						$panel.IEMatrixScale({scale:1,expr:'='});	
						$jq(this).css({left: this.origLeft,top:this.origTop});
					});		
				}

				inst.options.beforeRestorePanels.call(inst);	
								
				var xcnt = 0;
				inst._gridPanels.css({cursor:'auto'}).fadeIn('fast',function(){
					xcnt++;
					if(xcnt == len)
					{
						inst._gridActive = false;
						$jq.scrollTo(inst._currentPanel,0); // restore to last known panel
										
						inst._currentPanel = newPanel; // reset current panel
						
						// now scroll to our current panel
						$jq.scrollTo(inst._currentPanel, inst.options.scrollTimer, {easing:inst.options.scrollEasing, onAfter:function(){
							inst.repositionMenuLoader.call(inst);
							inst.options.afterRestorePanels.call(inst); // random callback		
						}});	
					}
				});				
			}		
		});
	};
	

	this.repositionMenuLoader = function()
	{
		var inst = this;
		
		if(inst.options.gridLoader)
		{
			var $el = $jq(inst._currentPanel);
			var $cnt = $jq(inst.options.gridLoader);
			var sl = $el.get(0).offsetLeft, st = $el.get(0).offsetTop, sw = $jq(window).width(), sh = $jq(window).height();
			var cw = $cnt.width(), ch = $cnt.height();
			var offsets = {};
			
			if(inst.options.gridLoaderOffset)
			{
				var o = inst.options.gridLoaderOffset;
				
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
				opacity:inst.options.gridLoaderOpacity,
				top: offsets.top,
				left: offsets.left
			}).fadeIn();
			
		}		
	}
	
	// loads a panel into view
	this.loadPanel = function(panel)
	{
		var $panel = $jq(panel);
		var inst = this;
		$panel = inst.findPanel($panel);
		
		inst._currentPanel = $panel;
		
		if($panel.is(('.'+inst.options.panelClass)))
		{			
			var loc = String(window.location);
			window.location = loc.substr(0,loc.indexOf('#')) + '#/'+inst.options.panelURLParam+'=' + $panel.attr('id');
			
			inst.scrollTo($panel, inst.options.scrollTimer,{easing:inst.options.scrollEasing,onAfter:function(){
				inst.repositionMenuLoader.call(inst);
				inst.options.afterLoadPanel.call(inst, $panel.get(0));
				
			}});
		}
		else
		{
			console.log('accessing invalid panel');
		}		
	};

	//  scales the interface and redraws all pages on screen
	this.drawGridLayout = function()
	{  
		var inst = this;

		var scale = (inst._windowHeight/(inst._gridMatrix.cols * inst._windowHeight));
		var iter = inst._gridMatrix.rows * (inst._windowWidth * scale);
		var diff = (inst._windowWidth - iter)/2;
		var origin = diff + (diff * scale);
		origin = Math.round(((origin / inst._windowWidth) * 100)*100)/100;
		
		inst._gridActive = true;
		inst._matrixScale = scale;

		inst._gridPanels.css({display:'block',cursor:'pointer'});

		// for FF, Safari
		$jq('body').css({
			MozTransformOrigin:origin+'% 50%',
			MozTransform:'scale('+ scale +')',
			WebkitTransformOrigin:origin+'% 0%',	
			WebkitTransform:'scale('+scale+')'
		}).attr({scrollTop:0,scrollLeft:0});
		
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
				var xadd = (parseFloat($jq(window).width()) - ((this.offsetWidth * scale) * inst._gridMatrix.cols))/2;
				
				$jq(this).css({left:cssleft + xadd,top:csstop});
			});	
			
			$jq(document.documentElement).attr({scrollTop:0,scrollLeft:0});	
		}

		
		inst._windowResized = false;

	};

	// traverse the dom and find the panel
	this.findPanel = function(element)
	{
		var inst = this;
		var el = $jq(element);
		while(!el.is(('.'+inst.options.panelClass)))
		{
			el = el.parent();
		}
		return el;
	}

	// show the overview for the site
	this.showGrid = function(inst)
	{
		var inst = inst;
		var loc = String(window.location);
		window.location = loc.substr(0,loc.indexOf('#')) + '#/'+inst.options.gridURLParam+'=true';
		//inst._currentPanel = inst.findPanel(caller);

		if(!inst._gridActive)
		{
			var cnt = 0;				
				
			inst._gridPanels.fadeOut('fast',function(){
				if(cnt == inst._gridPanels.length -1)
				{

					inst.drawGridLayout.call(inst);	
					inst._gridPanels.fadeIn('fast',function(){
						inst.options.afterLoadGrid.call(inst);
					});	   
				}
				cnt++;
			});			
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
