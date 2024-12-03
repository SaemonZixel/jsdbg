/* 
 * JSDbg.js IDE
 * 
 * Version: 0.7a
 * License: MIT
 * 
 *  Copyright (c) 2020-2024 Saemon Zixel <saemonzixel@gmail.com>
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
 *  and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

function jsdbg_ide_onclick(event, target) {
	var ev = event || window.event;
	typeof ev == 'string' ? ev = {type: ev, target: (typeof target == 'string'?document.querySelector(target):target)} : ev;
	var trg1 = ev.target || document.body.parentNode;
	if (trg1.nodeType && trg1.nodeType == 9) trg1 = trg1.body.parentNode; // #document
	if (trg1.nodeType && trg1.nodeType == 3) trg1 = trg1.parentNode; // #text
	var trg1p = (trg1.parentNode && trg1.parentNode.nodeType != 9) ? trg1.parentNode : {className:'', nodeName:'', getAttribute:function(){return ''}};
	var trg1pp = (trg1p.parentNode && trg1p.parentNode.nodeType != 9) ? trg1p.parentNode : {className:'', nodeName:'', getAttribute:function(){return ''}};
	
	// удобная функция поиска близкого элемента по BEM
	function find_near(class_name, if_not_found_return, start_node, prefix) {
		// определим префикс блока
		if(!prefix && (prefix = class_name.indexOf('!')+1) > 0) { 
			var prefix1 = class_name.substring(0, prefix-1);
			class_name = prefix1 + class_name.substring(prefix);
		} else
			var prefix1 = prefix || class_name.replace(/^([a-z]+-[^-]+).*$/, '$1');
		var regexp = new RegExp(class_name+'( |$)','');
		
		// поищем среди соседей сначало
		for(var i = 0, root = start_node || trg1; i < root.parentNode.childNodes.length; i++)
			if((root.parentNode.childNodes[i].className||'').match(regexp))
				return root.parentNode.childNodes[i];
		
		// найдём корневой node в блоке, заодно возможно встретим искомый элемент
		for(; root.parentNode.className.indexOf(prefix1) > -1; root = root.parentNode)
			if(root.parentNode.className.indexOf(class_name) > -1 && root.parentNode.className.match(regexp))
				return root.parentNode;
		
		// перебираем всё, что ниже root
		var nodes = root.getElementsByTagName('*');
		for(var i=0; i<nodes.length; i++)
			if(nodes[i].className && nodes[i].className.indexOf(class_name) > -1 && nodes[i].className.match(regexp)) 
				return nodes[i];
			
		return if_not_found_return;
	}

	function code_editor(css_selector_or_node) {
		var editor = typeof css_selector_or_node == 'string'
			? document.querySelector(css_selector_or_node)
			: css_selector_or_node;
		if (!editor) alert('Not found '+css_selector_or_node);
		if (window["ace"]) { 
			editor = ace.edit(editor, {
// 				fontFamily: "monospace",
// 				fontSize: '12px',
				behavioursEnabled: false,
				enableBasicAutocompletion: true
			});
			editor.dataset = editor.container.dataset;
			if(!editor.dataset.aceInitDone) {
				editor.session.setMode("ace/mode/javascript");
				editor.session.setOption("useSoftTabs", false);
				editor.setOption("fontFamily", "monospace");
				editor.setOption("fontSize", '12px');
				editor.setBehavioursEnabled(false);
				editor.enableBasicAutocompletion = true;
				editor.setAutoScrollEditorIntoView(true);
				editor.container.className += ' c-code_editor-textarea';
				editor.dataset.aceInitDone = true;
				editor.$blockScrolling = Infinity;
			};
			editor.setSelectionRange = function(offset_start, offset_end){
				editor.selection.setSelectionRange({
					start: editor.session.doc.indexToPosition(offset_start),
					end: editor.session.doc.indexToPosition(offset_end)
				});
			}
		}
		else
		editor = {
			textarea: editor,
			getValue: function(){
				return this.textarea.value;
			},
			setValue: function(text) {
				this.textarea.value = text;
			},
			dataset: editor.dataset,
			getSelectedText: function() {
				return this.textarea.selectionStart == this.textarea.selectionEnd
					? this.textarea.value
					: this.textarea.value.substring(this.textarea.selectionStart, this.textarea.selectionEnd);
			},
			setSelectionRange: function(start, end){
				this.textarea.setSelectionRange(start, end);
			},
			blur: function() { this.textarea.blur(); },
			focus: function() { this.textarea.focus(); }
		}
		return editor;
	};
	window.code_editor = code_editor;

	// cmd_code_editor_set_breakpoint
	if(trg1.className.indexOf('cmd_code_editor_set_breakpoint') > -1 || trg1p.className.indexOf('cmd_code_editor_set_breakpoint') > -1) {
		var win_id = find_near("c-toolbar", {getAttribute:function(){}}).getAttribute("data-win-id");
		var win = document.getElementById(win_id);
		var method = eval('('+win.dataset.methodFullname+')'); //win.func;
		var editor1 = code_editor('#'+win_id+' .c-code_editor-textarea');

		// ACE
		if(editor1.session) {
			var cursor_pos = editor1.selection.getCursor();
			var text_offset = editor1.session.doc.positionToIndex(cursor_pos);
		}
		// textarea
		else {
			var text_offset = editor1.textarea.selectionStart;
		}
console.log(cursor_pos, text_offset);

		if(!method) return alert('Not found function/method for breakpoint!');

		// начнём список breakpoints для этого метода
		if ('__jsdbg_breakpoints' in method == false)
			method.__jsdbg_breakpoints = [];
		
		// проверим на существующий breakpoint в месте курсора
		if(method.__jsdbg_breakpoints.indexOf(text_offset) > -1)
		{
			// если уже есть breakpoint в этом месте, то удалим
			method.__jsdbg_breakpoints.splice(
				method.__jsdbg_breakpoints.indexOf(text_offset), 1);
			
			// удалим маркер
			if (editor1.session) { // ACE
				var markers = editor1.session.getMarkers();
				for(var f in markers)
					if(markers[f].range
					&& markers[f].range.start.row == cursor_pos.row
					&& markers[f].range.start.column == cursor_pos.column)
						editor1.session.removeMarker(f);
			}
			else {
				// TODO textarea
			}
		}
		else {
		
			// добавим breakpoint
			method.__jsdbg_breakpoints.push(text_offset);

			// добавим маркер
			if(window.ace) {
				var Rng = ace.require("ace/range").Range;
				editor1.session.addMarker(new Rng(cursor_pos.row, cursor_pos.column, cursor_pos.row, cursor_pos.column+1), 'jsdbg-ide-ace-breakpoint', 'text', false);
			}
		}

		// перекомпилируем метод если он скомпилирован
		if(method.__jsdbg_id)
			jsdbg.compileFunc(method, jsdbg.source[method.__jsdbg_id][2]);

		// отразим на кнопке кол-во точек останова
		var set_brkpnt_btn = trg1p.className.indexOf('cmd_code_editor_set_breakpoint') > -1 ? trg1p : trg1;
		if(method.__jsdbg_breakpoints.length)
			set_brkpnt_btn.innerHTML = '<i class="ico-add-brk"></i>Set breakpoint ('+method.__jsdbg_breakpoints.length+')';
		else
			set_brkpnt_btn.innerHTML = '<i class="ico-add-brk"></i>Set breakpoint';
	}

	// cmd_code_editor_inspect_it
	if(trg1.className.indexOf('cmd_code_editor_inspect_it') > -1 || trg1p.className.indexOf('cmd_code_editor_inspect_it') > -1) {
	
		var dbgwin_id = find_near("c-toolbar", {getAttribute:function(){}}).getAttribute("data-win-id");
		var dbgwin = document.getElementById(dbgwin_id);
		var editor = code_editor("#"+dbgwin_id+" .c-code_editor-textarea");
		
		var src = editor.getSelectedText();
		if (src == "") src = editor.getValue();
		
		try {

			// если в дебагере, то запускаем на основе текущего контекста
			if(dbgwin_id.match(/^jsdbg_debugger_/))
			{
				var curr_ctx = dbgwin.curr_ctx || dbgwin.ctx;

				jsdbg.startDebugCtx(curr_ctx, src);
				jsdbg.ctx.__action = 'inspectit';
			}
			else
				jsdbg.startDebug(src);

		} catch(ex) {
			alert(ex+'\n'+ex.stack)
			return;
		}

		// выполняем
		try {
			jsdbg.continue();
			var result = jsdbg.ctx.__t[0];
			
			// удалим дебагер из списка дебагеров
// 			for (var i in jsdbg.debuggers)
// 				if (jsdbg.debuggers[i] == debugger1)
// 					delete jsdbg.debuggers[i];

		// если что-то пошло не так, то покажем дебагер
		} catch(ex) {
			if(ex != "breakpoint!") {
				alert(ex);
				console.info(ex.stack);
			}
			
			var button = document.createElement('BUTTON');
			button.className = "cmd_code_editor_debugger";
			button.innerHTML = "<i></i>Debugger #"+(jsdbg_ide_onclick.debugger_win_next_num++);
			button.ctx = jsdbg.ctx;
			button.ex = ex;
		
			if(document.getElementById("jsdbg_ide_panel")) {
				document.getElementById("jsdbg_ide_panel").insertBefore(button, document.getElementById("jsdbg_ide_panel").firstElementChild);
			}
			else {
				button.className = "c-panel-btn cmd_code_editor_debugger";
				find_near("c-toolbar").appendChild(button);
			}
		
			button.click();
		
			return;
		}

		// откроем инспектор объектов
		jsdbg_ide_onclick({type: 'show_inspector', raw: result, ctx: jsdbg.ctx});
		
		return;
	}
	
	// cmd_code_editor_start_debug
	if(ev.type == 'start_debug'
	|| trg1.className.indexOf('cmd_code_editor_start_debug') > -1
	|| trg1p.className.indexOf('cmd_code_editor_start_debug') > -1)
	{
		if (!ev.src) {
			var win_id = find_near("c-toolbar", {dataset:{}}).dataset.winId;
			var editor = code_editor('#'+win_id+' .c-code_editor-textarea');

			var src = editor.getSelectedText();
			if (src == "") src = editor.getValue();
		}
		else {
			var win_id = '';
			var src = ev.src;
		}

		try {

			// если в дебагере, то запускаем на основе текущего контекста
			if(win_id.match(/^jsdbg_debugger_/))
			{
				dbgwin = document.getElementById(win_id);
				var curr_ctx = dbgwin.curr_ctx || dbgwin.ctx;

				jsdbg.startDebugCtx(curr_ctx, src);
				jsdbg.ctx.__action = 'debugit';
			}
			// class_browser
			else {

				jsdbg.startDebug(src);
			}

		} catch(ex) {
			alert(ex+'\n'+ex.stack)
			return;
		}

		var button = document.createElement('BUTTON');
		button.className = "cmd_code_editor_debugger";
		button.innerHTML = "<i></i>Debugger #"+(jsdbg_ide_onclick.debugger_win_next_num++);
		button.ctx = jsdbg.ctx;

		if(document.getElementById("jsdbg_ide_panel")) {
			document.getElementById("jsdbg_ide_panel").insertBefore(button, document.getElementById("jsdbg_ide_panel").firstElementChild);
		}
		else {
			button.className = "c-panel-btn cmd_code_editor_debugger";
			document.querySelector("#ide_main_window .c-toolbar").appendChild(button);
		}

		button.click();
		return;
	}

	// cmd_code_editor_new_class
	if(trg1.className.indexOf('cmd_code_editor_new_class') > -1 || trg1p.className.indexOf('cmd_code_editor_new_class') > -1) {
		var win_id = find_near("c-toolbar", {dataset:{}}).dataset.winId;
		var win = document.getElementById(win_id);

		if(!win.dataset.fileName)
			return alert('Select file before creating new prototype/class!');

		// запросим имя нового прототипа/класса
		var new_name = prompt('Name:', '');
		if(!new_name) return;

		// сформируем стандартный код
		var editor = code_editor('#'+win_id+" .c-code_editor-textarea");
		editor.setValue("function "+new_name+"(){\n\tthis.initialize();\n}");
		
		// document.querySelector('#'+win_id).dataset.funcName = '';
		// document.querySelector('#'+win_id).dataset.prototypeName = '';
		win.dataset.methodFullname = new_name;

		// добавим в список
		var opt = document.createElement('OPTION')
		opt.dataset.fileName = win.dataset.fileName;
		opt.dataset.prototypeName = new_name;
		opt.innerHTML = new_name;
		win.querySelector('#'+win_id+'_our_classes_'+win.dataset.fileName.replace(/\//g, '_').replace(/\./g, '_')).appendChild(opt);
		// TODO выделить

		// добавим в script-тег
		var script_node = document.querySelector("script[src='"+win.dataset.fileName+"']");
		if(script_node) script_node.dataset.prototypes = (script_node.dataset.prototypes||'')+','+new_name;
	}
	
	// cmd_code_editor_new_method
	if(trg1.className.indexOf('cmd_code_editor_new_method') > -1 || trg1p.className.indexOf('cmd_code_editor_new_method') > -1) {
		var win_id = find_near("c-toolbar", {dataset:{}}).dataset.winId;
		var win = document.getElementById(win_id);

		if(!win.dataset.fileName || !(win.dataset.methodFullname||'').match(/^[a-zA-Z0-9_]+/))
			return alert('Select file and prototype/class before creating new method!');

		// запросим имя нового метода
		var new_method_name = prompt('Method name:', '');
		if(!new_method_name) return;

		// укажем полное название метода
		if(win.querySelector('#'+win_id+'_object_methods.selected'))
			win.dataset.methodFullname = win.dataset.methodFullname.match(/^[a-zA-Z0-9_]+/)[0]+'.prototype.'+new_method_name;
		else
			win.dataset.methodFullname = win.dataset.methodFullname.match(/^[a-zA-Z0-9_]+/)[0]+'.'+new_method_name;

		// выведем код
		jsdbg_ide_onclick({
			type: 'load_method_to_editor',
			target: win,
			text: "function () {\n\t\n}"
		});
	}

	// .cmd_code_editor_load_and_activate_ACE
	if(ev.type == "click" && trg1.className.indexOf("cmd_code_editor_load_and_activate_ACE") > -1) {
		var ace_basePath = "//cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/";
		if(document.location.host.match(/(\.loc|\.localhost|test|y777.ru)$/)) ace_basePath = "/";
		var ace_tag = document.getElementById("ace_js");
		if (!ace_tag) {
			ace_tag = document.createElement("SCRIPT");
			ace_tag.id = "ace_js";
			ace_tag.type = "text/javascript";
			ace_tag.src = ace_basePath + "ace.js";
			ace_tag.onload = function(){ 
				console.log("Ace loaded!"); 
				ace.config.set("basePath", ace_basePath);
				var list = document.querySelectorAll('.c-code_editor-textarea');
				for (var i=0; i<list.length; i++)
					code_editor(list[i]);
// 				var editor = ace.edit("jsdbg_class_browser_1_code_editor");
// 				editor.session.setMode("ace/mode/javascript");
// 				editor.session.setOption("useSoftTabs", false);
// 				editor.setOption("fontFamily", "monospace");
// 				editor.setBehavioursEnabled( true );
			};
			document.querySelector("head").insertBefore(ace_tag, document.querySelector("head > script"));
		}
	}

	// [init_css]
	if(ev.type == 'init_css') {
		var style_tag = document.getElementById("jsdbg-ide-js-css");
		if(!style_tag) {
			style_tag = document.createElement("STYLE");
			style_tag.id = "jsdbg-ide-js-css";
			style_tag.type = "text/css";
			style_tag.appendChild(
				document.createTextNode(jsdbg_ide_onclick.css_styles));
			document.querySelector("head").insertBefore(style_tag, document.querySelector("head > style"));
		}
		
		// стили окон тоже подключим
		win_onmouse({type: 'init_win_css'});
	}
	
	// [show_hide_jsdbg_ide]
	if(ev.type == "show_hide_jsdbg_ide") 
	{
		// потключим стили оформления (если ещё нет)
		jsdbg_ide_onclick({type: 'init_css'});
		
		// пикажем окно Class Browser
		jsdbg_ide_onclick({type:'cmd_code_editor_show_class_browser'});
		return;
		
		// build and show IDE interface
		var ide_win = document.getElementById("ide_main_window");
		if ( ! ide_win) {
			var div = document.createElement("DIV");
			div.innerHTML = '<div id="ide_main_window" class="c-code_editor" style="width:100%;height:100%;position:fixed;top:0;left:0;right:0;bottom:0;display:none;background:white">'+
			'<pre id="ide_main_window_brkpnts" class="c-code_editor-bg" style="height:100%;width:100%;border-top:26px solid transparent;display:block;background:white;position:absolute;top:0;left:0;color:transparent;"></pre>'+
		'<textarea id="ide_main_window_src" class="c-code_editor-textarea" contenteditable="true" data-win-id="ide_main_window" data-file_name-offset="0">'+(window['default_lisp_code']||"")+'</textarea>'+
		'<div class="c-toolbar" style="position:absolute;top:0;width:100%;" data-win-id="ide_main_window">'+
		'<select id="jsdbg_file_list_selector" class="c-toolbar-select" onchange="return jsdbg_ide_onclick(event)"></select>'+
		'<button class="c-toolbar-btn cmd_code_editor_save" title="Save to LocalStorage (Alt+S)"><i class="ico-save"></i>Save</button>'+
		'<span class="c-toolbar-divider"></span>'+
		'<button class="c-toolbar-btn cmd_code_editor_run" title="Execute selected fragment or all text (Alt+R)"><i class="ico-play"></i>RunIt</button>'+
		'<button class="c-toolbar-btn cmd_code_editor_start_debug" title="Start debugging selected fragment or all text (Alt+W)"><i class="ico-bug"></i>DebugIt</button>'+
		'<button class="c-toolbar-btn cmd_code_editor_inspect_it" title="Evalute selected fragment or all text and explore result (Alt+A,Ctrl+I)"><i class="ico-eye"></i>ExploreIt</button>'+
		'<span class="c-toolbar-divider"></span>'+
		'<button class="c-toolbar-btn cmd_code_editor_set_breakpoint" title="Set/unset breakpoint (Alt+T)"><i class="ico-add-brk"></i>Set breakpoint</button>'+
		'<span class="c-toolbar-divider"></span>'+
		'<button class="c-toolbar-btn cmd_code_editor_show_class_browser"  title="Open Class Browser"><i class="ico-class-browser"></i>Class Browser</button>'+
		'<span class="c-toolbar-divider"></span>'+
		'<button class="c-toolbar-btn cmd_code_editor_load_and_activate_ACE"  title="Load and activate ACE.js" style="display:none">Activate highlight</button>'+
		'<button class="c-toolbar-btn" id="ide_main_window_settings" title="Settings" style="display:none"><i class="ico-cog"></i></button>'+
		'<span class="c-toolbar-divider"  style="display:none"></span></div></div>';
		
			document.body.appendChild(div.firstElementChild);
			ide_win = document.getElementById("ide_main_window");
			ide_win.style.display = "block";
		
			jsdbg_ide_onclick({type: "restore_main_window_content"});
			
			// скроем кнопку показа IDE
			(document.getElementById("jsdbg_ide_main_window_show")||{}).innerHTML = "Hide IDE";
		}
		else {
			
			if(ide_win.style.display == "block") {
				// сохроним прокрутку в редакторе
				if (document.getElementById("ide_main_window_src")) {
					document.getElementById("ide_main_window_src").setAttribute("data-scrollTop", document.getElementById("ide_main_window_src").scrollTop);
				}
				
				ide_win.style.display = "none";
				(document.getElementById("jsdbg_ide_main_window_show")||{}).innerHTML = "Show IDE";
			}
			else {
				ide_win.style.display = "block";
				(document.getElementById("jsdbg_ide_main_window_show")||{}).innerHTML = "Hide IDE";
				
				// востановим прокрутку в редакторе
				document.getElementById("ide_main_window_src").scrollTop = parseInt(document.getElementById("ide_main_window_src").getAttribute("data-scrollTop"));
			}
		}
	}

	// [list_files]
	if(ev.type == "list_files") {
		
		// создадим select
		var select1 = document.getElementById("jsdbg_file_list_selector");
		if (!select1) {
			var select1 = document.createElement('SELECT');
			select1.id = 'jsdbg_file_list_selector';
			select1.style.display = 'none';
			document.body.appendChild(select1);
		}
		
		var prototype_to_file_map = {_unrecognized: [], _loading: []};

		// возмём карту соответствий prototype=file
		var files = localStorage.getItem('jsdbg_ide_prototype_to_file_map');
		if(files)
		try {
			prototype_to_file_map = JSON.parse(files);
		}
		catch(ex) {
			console.error(ex);
			alert(ex.stack||ex);
		}
		
		// собираем список file=prototype по тегам script
		var scrpit_nodes = document.getElementsByTagName('SCRIPT');
		for(var i=0; i<scrpit_nodes.length; i++) 
		if(scrpit_nodes[i].hasAttribute('data-classes') || scrpit_nodes[i].hasAttribute('data-prototypes'))
		{
			var list = (scrpit_nodes[i].dataset.classes || scrpit_nodes[i].dataset.prototypes).split(',');
			while(list.length) {
				prototype_to_file_map[list[0]] = scrpit_nodes[i].src.replace(/https?:\/\/[^/]+/, '').replace(/\?.*/, '');
				list.shift();
			}
		}
		// если нету списка, то загрузим файл и поищем сами
		else if(scrpit_nodes[i].dataset.prototypesAuto)
		{
			// добавим в список загружаемых
			prototype_to_file_map['_loading'].push(scrpit_nodes[i].src.replace(/https?:\/\/[^/]+/, '').replace(/\?.*/, ''));

			jsdbg_ide_onclick({
				type: 'get_and_analize_file',
				url: scrpit_nodes[i].src,
				callback: (function(prototype_list){
					this.dataset.prototypes = prototype_list.join(',');
				}).bind(scrpit_nodes[i])
			});
		}
		// остальные в список нераспознанных
		else
		{
			// добавим в список нераспознанных
			prototype_to_file_map['_unrecognized'].push(scrpit_nodes[i].src.replace(/https?:\/\/[^/]+/, '').replace(/\?.*/, ''));
		}

		return prototype_to_file_map;
	}
	
	// [save_file]
	if(ev.type == "save_file")
	{
		// дадим знать, что идёт сохранение
		var trg = trg1p.className.indexOf('cmd_code_editor_save') > -1 ? trg1p : trg1;
		trg.style.opacity = 0.4;
		setTimeout(function(){ trg.style.opacity = null; }, 500);
		
		// содержимое файла
		var file_content = [];
		var file_content_inheritances = [];
		var file_content_inits = [];

		// ищем все прототипы/классы для этого файла
		var prototype_to_file_map = jsdbg_ide_onclick({type: 'list_files'});
		for (var clazz_name in prototype_to_file_map)
		if (prototype_to_file_map[clazz_name] == ev.file_name) try {

			var clazz = window[clazz_name];
			if (!clazz) continue;
			
			// конструктор
			if (clazz.toString().match(/function *\(/))
				file_content.push("if(!window['"+clazz_name+"']) var "+clazz_name+" = "+clazz.toString()+';');
			else
				file_content.push("if(!window['"+clazz_name+"']) "+clazz.toString()+';');
			
			// методы прототипа (static)
			for(var f in clazz) if(f in clazz.__proto__ == false && f != 'prototype' ) {
				if (typeof clazz[f] == 'function')
					file_content.push(clazz_name+'.'+f+' = '+clazz[f].toString()+';');
				// статические свойства не сохраняем (в jsdbg)
				/*else
					file_content.push(clazz_name+'.'+f+' = '+(typeof clazz[f] == 'undefined' ? 'undefined' : JSON.stringify(clazz[f]))+';');*/
			}
			
			// методы объекта
			for(var f in clazz.prototype)
			if(f in clazz.prototype.__proto__ == false
			|| clazz.prototype.__proto__[f] !== clazz.prototype[f]) {
				if (typeof clazz.prototype[f] == 'function')
					file_content.push(clazz_name+'.prototype.'+f+' = '+clazz.prototype[f].toString()+';');
				// свойства в прототипе не сохраняем
				/* else
					file_content.push(clazz_name+'.prototype.'+f+' = '+(typeof clazz.prototype[f] == 'undefined' ? 'undefined' : JSON.stringify(clazz.prototype[f]))+';');*/
			}

			// проверим наследование не от Object
			if(clazz.prototype.__proto__.constructor != Object) {
				var superclazz = clazz.prototype.__proto__.constructor.toString().match(/^function ([^(]+)/);
				if(superclazz) {
					file_content_inheritances.push(clazz_name+'.prototype.__proto__ = '+superclazz[1]+'.prototype;');
					file_content_inheritances.push(clazz_name+'.__proto__ = Object.create('+superclazz[1]+', {constructor: {value: '+clazz_name+', writable: true, configurable: true}});');
				}
			}

			// если есть метод инициализации класса/прототипа, то его надо будет запустить
			if(clazz.init) {
				file_content_inits.push(clazz_name+'.init();');
			}
			
		}
		catch(ex) {
			console.log(ex.stack);
			alert(ex+'\n'+ex.stack)
			return;
		}
			
// 		console.log(file_content);
// 			alert(file_content.join('\n\n'));

		if(file_content.length == 0) return alert('File content is empty! (abort)');

		var xhr = new XMLHttpRequest();
		xhr.open('POST', (jsdbg_ide_onclick.ftp_helper_url || '/ftp-helper.php')+'?STOR=/'+ev.file_name);
		xhr.onreadystatechange = function(event){
			if(xhr.readyState != 4) return;
			alert(xhr.responseText);
		};
		xhr.send(file_content.join('\n\n')+
			'\n\n'+file_content_inheritances.join('\n')+
			'\n\n'+file_content_inits.join('\n'));

		return;
	}
	
	// [get_and_analize_file]
	if(ev.type == "get_and_analize_file") {
		if(!ev.url) return;

		var xhr = new XMLHttpRequest();
		xhr.open("GET", ev.url, true);
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
// 		xhr.setRequestHeader("Origin", document.location.host);
		xhr.onreadystatechange = function(){
			if(xhr.readyState != 4 || xhr.responseText == '') return;
			// console.log(xhr.responseText);
			if(!xhr.responseText) return;

			// ишем объявление прототипов/классов
			var found_list = xhr.responseText.match(/if\(!window\['[a-zA-Z0-9_]+'\]\) function [a-zA-Z0-9_]+/g);
			var prototype_list = [];
			for(var i=0; i<(found_list||[]).length; i++) {
				var prototype_name = found_list[i].substring(found_list[i].lastIndexOf(' ')+1);
				prototype_list.push(prototype_name);
			}

			ev.callback(prototype_list);

			// сохраним в тег script найденные прототипы
			var script_node = document.querySelector("script[src='"+ev.url+"']");
			if(script_node) script_node.dataset.prototypes = prototype_list.join(',');
		};
		xhr.send("");
	}

	// [load_method_to_editor]
	if(ev.type == "load_method_to_editor") {
		var win = trg1;
		var win_id = trg1.id;
		var editor = code_editor('#'+win_id+' .c-code_editor-textarea');

		// загрузим код метода/функции
		editor.setValue((ev.method||ev.text||'').toString(), -1);

		// свернём весь код
		if(ev.foldAll && editor.session)
			editor.session.foldAll();

		// сначало удалим все точки останова в случае ACE
		if(editor.session) {
			var markers = editor.session.getMarkers();
			for(var marker in markers)
				editor.session.removeMarker(marker);
		}

		// отобразить breakpoints
		if(ev.method && ev.method.__jsdbg_breakpoints)
		{
			var set_brkpnt_btn = document.querySelector("#"+win_id+" .cmd_code_editor_set_breakpoint");
			set_brkpnt_btn.innerHTML = '<i class="ico-add-brk"></i>Set breakpoint ('+ev.method.__jsdbg_breakpoints.length+')';

			// расставим маркеры точек останова
			if(editor.session) {
				var Rng = ace.require("ace/range").Range;
				for(var i=0; i<ev.method.__jsdbg_breakpoints.length; i++) {
					var cursor_pos = editor.session.doc.indexToPosition(ev.method.__jsdbg_breakpoints[i]);
					editor.session.addMarker(new Rng(cursor_pos.row, cursor_pos.column, cursor_pos.row, cursor_pos.column+1), 'jsdbg-ide-ace-breakpoint', 'text', false);
				}
			}
		}
		// нет breakpoints
		else {
			var set_brkpnt_btn = document.querySelector("#"+win_id+" .cmd_code_editor_set_breakpoint");
			set_brkpnt_btn.innerHTML = '<i class="ico-add-brk"></i>Set breakpoint';
		}

		// выделим нужный фрагмент
		if(ev.select) {
			var start = ev.select[0];
			var end = ev.select[1];
			editor.setSelectionRange(start, end);
			// в случае textarea нужно фокус ввода переместить в неё
			if(!editor.session) {
				if(editor.blur) editor.blur();
				if(editor.focus) editor.focus();
				editor.setSelectionRange(start, end);
			}
		}

		// обновим заголовок и кнопку (class_browser)
		if(win.id.match(/jsdbg_class_browser_/)) {
			win.querySelector('.win-header-title').innerHTML = 'Class browser: '+win.dataset.methodFullname+'()';
			(document.getElementById(win_id+'_button')||{}).innerHTML = 'CB: '+win.dataset.methodFullname+'()';
		}

		// заголовок окна и кнопки (debugger)
		else {
			win.querySelector('.win-header-title').innerHTML =
			'Debugger #'+win_id.substring(15)+': ' + win.dataset.methodFullname+'()';
			(document.getElementById(win_id+'_button')||{}).innerHTML =
			'DBG#'+win_id.substring(15)+': '+win.dataset.methodFullname+'()';
		}
	}
	
	// .c-object_props
	jsdbg_ide_object_props(ev, trg1, trg1p, trg1pp, find_near);
	
	// .jsdbg-class-browser
	jsdbg_ide_class_browser(ev, trg1, trg1p, trg1pp, find_near, code_editor);
	
	// .jsdbg-ide-debugger
	jsdbg_ide_debugger(ev, trg1, trg1p, trg1pp, find_near, code_editor);
}

jsdbg_ide_onclick.debugger_win_next_num = 1;

document.documentElement.addEventListener("click", jsdbg_ide_onclick);
document.documentElement.addEventListener("input", jsdbg_ide_onclick);

document.addEventListener("DOMContentLoaded", function(event) {
	if(document.readyState != 'complete') return;
	jsdbg_ide_onclick({type: 'DOMContentLoaded', target: document});
});

// Inspector/Watch
function jsdbg_ide_object_props(ev, trg1, trg1p, trg1pp, find_near) {
	
	// [show_inspector]
	if(ev.type == 'show_inspector') 
	{
		var result = ev.raw;
		if(typeof result != 'undefined' && result !== null)
			var result_type = result.__proto__.constructor ? result.__proto__.constructor.name : {}.toString.call(result);
		else
			var result_type = ''+result;
		
		for(var id = 1;;id++)
			if(document.getElementById("jsdbg_ide_inspector_"+id)) continue;
			else break;
		
		var div = document.createElement("DIV");
		div.className = "win jsdbg-ide-inspector win-is-hidden";
		div.id = 'jsdbg_inspector_'+id;
		div.dataset.winSettingsLocalStorage = 'jsdbg_inspector_'+id;
		div.style.width = '460px';
		div.style.height = '570px';
		div.innerHTML = '<div id="jsdbg_inspector_'+id+'_title" class="win-header"><span class="win-header-title">Inspect '+result_type+'</span><a class="win-close-btn" href="javascript:void(0)">x</a></div>'+
		
		'<div id="jsdbg_inspector_'+id+'_raw" class="win-area">'+
		'<textarea class="c-textarea" style="width:100%;height:100%;max-width:100%;box-sizing:border-box;border:0px;position:absolute" data-win-id="jsdbg_inspector_'+id+'"></textarea>'+
		'</div>'+
		
		'<div id="jsdbg_inspector_'+id+'_splitter" class="win-splitter type_horizontal"></div>'+
		
		'<div id="jsdbg_inspector_'+id+'_watch" class="win-area" style="flex:10;-webkit-box-flex:10.0;position:relative;">'+
		'<div class="c-object_props" style="width:100%;height:100%;outl1ine:1px solid silver;position:absolute" data-win-id="jsdbg_inspector_'+id+'"></div>'+
		'</div>'+
		'<div class="win-resizer"></div>';
		document.body.appendChild(div);
		
		// RAW значение
		try {
			document.querySelector("#jsdbg_inspector_"+id+"_raw > textarea").value = (result !== undefined ? result.toString() : "undefined");
		} catch(ex) {
			document.querySelector("#jsdbg_inspector_"+id+"_raw > textarea").value = ({}.toString).apply(result);
		}
		
		// загрузим контекст в watch
		jsdbg_ide_onclick({
			type: 'load', 
			target: document.getElementById("jsdbg_inspector_"+id+'_watch').firstElementChild,
// 					show_toolbar: true,
			object_to_load: result,
			onchange: function(event, state) { return jsdbg_ide_onclick({type:'onchange', target: this.parentNode.firstElementChild, state: state}); }
		});

		win_onmouse({type: 'winshow', target: div});
	}
	
	// [change] .c-object_props
	if(ev.type == 'change' && trg1.className.indexOf('c-object_props') > -1) {
// 		var dbg_id = find_near("c-object_props", {getAttribute:function(){}}).getAttribute("data-win-id");
// 		var debugger1 = document.getElementById(dbg_id).debugger1;
// 		debugger1.ctx[ev.key] = JSON.parse(ev.value);
	
		ev.object[ev.key] = eval("("+ev.value+")");
// 		debugger;
	}
	
	// c-object_props
	if(trg1.className.indexOf('c-object_props') > -1 || trg1p.className.indexOf('c-object_props') > -1) {
		// откорректируем trg1 (иконка в кнопке например)
		trg1 = trg1.className.indexOf('c-object_props') > -1 ? trg1 : trg1p;
		
		// CSS внедрим стили виджита если нет
		if(ev.type == 'load') {
			var style_tag = document.getElementById("c_object_props_css");
			if(!style_tag) {
				style_tag = document.createElement("STYLE");
				style_tag.id = "c_object_props_css";
				style_tag.type="text/css";
				style_tag.appendChild(document.createTextNode(
				".c-object_props { position: relative; }"+
				".c-object_props-cols { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; display: inline-block; vertical-align: top; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; border-top: 32px solid #fff; position: relative; border-bottom: 1px solid silver; }"+
				".c-object_props-cols.mode_without_toolbar { border-top: none; }"+
				/* .c-object_props-col1 { width: 20%; min-height: 100%; display: inline-block; border: 1px solid silver; vertical-align: top; background: #EEE; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; } */
				".c-object_props-col1 { position: absolute; left: 0px; top: 0px; width: 20%; min-height: 100%; display: block; border: 1px solid silver; vertical-align: top; background: #EEE; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; }"+
				/* .c-object_props-col2 { width: 79.9%; min-height: 100%; display: inline-block; border: 1px solid silver; border-left: none; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; } */
				".c-object_props-col2 { position: absolute; left: 20%; top: 0px; right: 0px; min-height: 100%; display: block; border: 1px solid silver; border-left: none; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; }"+
				".c-object_props-key, .c-object_props-value { border-bottom: 1px solid silver; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; padding: 1px 3px; cursor: default; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }"+
				".c-object_props-value:empty { min-height: 1.4em }"+
				".c-object_props-value { white-space: nowrap; overflow: hidden; cursor: text; }"+
				".c-object_props-key.state_active { background: silver; }"+
				".c-object_props-key.mod_error, .c-object_props-value.mod_error { background-color: #f2dede }"+
				".c-object_props-editor { display: none; position: absolute; width: 79.9%; height: 100%; left: 20%; top: 0; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; border-top: 32px solid white; }"+
				".c-object_props-cols.mode_without_toolbar + .c-object_props-editor { border-top: 0; }"+
				".c-object_props-editor-textarea { height: 100%; width: 100%; max-width: 100%; max-height: 100%; border: 1px solid silver; border-left: 0px solid silver; background: white; margin: 0; border-radius: 0px; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; overflow-y: scroll; }"+
				".c-object_props.mod_one_prop > .c-object_props-editor { display: block; }"+
				".c-object_props.mod_one_prop > .c-object_props-cols { width: 20%; }"+
				".c-object_props.mod_one_prop > .c-object_props-cols > .c-object_props-col1 { width: 100%; }"+
				".c-object_props.mod_one_prop > .c-object_props-cols > .c-object_props-col2 { display: none; }"+
				".c-object_props-toolbar { position: absolute; top: 0; left: 0; right: 1px; border: 1px solid #ddd; }"+
				".c-object_props-toolbar-btn { display: inline-block; vertical-align: top; height: 22px; margin: 1px; border: none; background: transparent; }"+
				".c-object_props-toolbar-btn:hover { background: silver; }"+
				".c-object_props-toolbar-btn > i { background: transparent no-repeat 50% 50%; display: inline-block; width: 20px; height: 20px; vertical-align: bottom; }"+
				".c-object_props-toolbar-divider { width: 1px; margin: 1px 1px; overflow: hidden; background-color: #e5e5e5; height: 20px; display: inline-block; vertical-align: middle; }"+
				".c-object_props-editor-btns { position: absolute; right: 2px; bottom: 2px; }"+
				".c-object_props-editor-btn { display: inline-block; }"+
				".c-object_props-btn_back { width: 100%; height: 100%; text-align: left; border-bottom: 1px solid silver; box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box; padding: 1px 3px; cursor: default; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; user-select: none; -webkit-user-select: none; -moz-user-select: none; }"+
				".c-object_props-link { color: -webkit-text; }"));
				document.querySelector("head").insertBefore(style_tag, document.querySelector("head > style"));
			}
		}
		
		// [load]
		if(ev.type == 'load') {
			var root = find_near('c-object_props');
			
			// создадим историю состояний если нет
			if('states' in root == false) {
				root.states = [];
			}
			
			// ...иначе обновим в ней текущее стостояние
			else {
				root.states[0].scrollTop = find_near('c-object_props-cols').scrollTop;
				for(var curr = find_near('c-object_props-col1').firstElementChild; curr; curr = curr.nextElementSibling)
					if(curr.className.indexOf('state_active') > -1) {
						root.states[0].selected_key = curr.innerHTML;
						break;
					}
			}
			
			// загрузим уже существующее состояние
			if("state_to_load" in ev) {
				var obj = ev.state_to_load.object;
			} 
			
			// загрузим новое состояние и новый объект в историю
			else { 
				if("key_to_load" in ev)
					var obj = root.states[0].object[ev.key_to_load];
				else {
					var obj = ev.object_to_load;
					root.states = [];
				}
				
				root.states.unshift({
					object: obj, 
					selected_key: undefined, 
					scrollTop: 0});
				
				delete root.previous_states; // удалим состояния для кнопки "Next"
			}

			var col1_html = [], col2_html = [], col1_end_html = [], col2_end_html = [], row_class = '';
			
			// кнопка назад и путь
			if(root.states.length > 1) {
				var path = [];
				
				var root_obj = root.states[root.states.length-1].object;
				path.push('<a class="c-object_props-link cmd_object_props_prev_state" href="javascript:void('+(root.states.length-2)+')" data-state-num="'+(root.states.length-2)+'">' + (root_obj.toString().indexOf("[object ") === 0 ? root_obj.toString() : ({}).toString.apply(root_obj)) + '</a>');
				
				for(var i = root.states.length-1; i > 0; i--) {
					var num = i - 2;
					path.push('.<a class="c-object_props-link cmd_object_props_prev_state" href="javascript:void('+num+')" data-state-num="'+num+'">' + root.states[i].selected_key + '</a>');
				}
			
				col1_html.push('<div class="c-object_props-btn_back">&larr;..&nbsp;</div>');
				col2_html.push('<div class="c-object_props-value">'+path.join("")+'</div>');
			}
			
			// пригодится для вывода содежимого объектов
			function json_enc(obj, max_deep) {
				switch(typeof obj) {
					case "object":
						if(obj == null) return "null";
						
						if((max_deep == undefined ? 1 : max_deep) < 1) 
							return ({}).toString.apply(obj);
						
						var json = [];
						if(obj instanceof Array) {
							for(var i = 0; i < obj.length; i++)
								json.push(json_enc(obj[i], max_deep-1));
							return '['+json.join(',')+']';
						}
						for(var fname in obj) {
							json.push(fname+": "+json_enc(obj[fname], max_deep-1));
							if (json.length > 15) return JSON.stringify(obj);
						}
						return "{"+json.join(', ')+"}";
					case "number":
						return obj.toString();
					case "boolean":
						return obj ? "true" : "false";
					case "undefined":
						return "undefined";
					default:
						return '"'+String(obj)+'"';
				}
			}
			
			// сгенерируем HTML со содержимым объекта
			var selected_key = ('state_to_load' in ev) ? ev.state_to_load.selected_key : '';
			for(var f in obj)
			/*if (obj instanceof Ctx && f[0] == '_' && f[1] == '_') {
				continue;
			}
			else*/ if(col1_html.length > (root.getAttribute("data-rows-limit")||100)) {
				col1_html.push('<div class="c-object_props-key">&nbsp;</div>');
				col2_html.push('<div class="c-object_props-value">Limit '+(root.getAttribute("data-rows-limit")||100)+' rows excedded!...</div>');
				break;
			}
			else {
				row_class = '';
				
				var col1 = col1_html, col2 = col2_html;
				if (obj instanceof Ctx && f[0] == '_' && f[1] == '_') {
					col1 = col1_end_html;
					col2 = col2_end_html;
				}

				switch(typeof obj[f]) {
					case "undefined":
						col2.push('<div class="c-object_props-value type_undefined" data-key="'+f+'" title="'+(({}).toString.call(obj[f]))+'">&nbsp;</div>');
						break;
					case "string":
						col2.push('<div class="c-object_props-value type_string" data-key="'+f+'" title="'+(({}).toString.call(obj[f]))+'">'+obj[f].replace(/</g, '&lt;').replace(/^ $/, "&nbsp;")+'&nbsp;</div>');
						break;
					case "function":
						col2.push('<div class="c-object_props-value type_func_src" data-key="'+f+'" title="'+(({}).toString.call(obj[f]))+'">'+obj[f].toString().replace(/</g, '&lt;')+'</div>');
						break;
					default:
						try {
							col2.push('<div class="c-object_props-value" data-key="'+f+'" title="'+(({}).toString.call(obj[f]))+'">' +
							json_enc(obj[f],1).replace(/</g, '&lt;') + '</div>');
						} catch(ex) {
							col2.push('<div class="c-object_props-value" data-key="'+f+'" title="!!! Error: '+ex.message+' !!!">'+(({}).toString.call(obj[f]))+'</div>');
							row_class = ' mod_error';
						}
				}
				
				col1.push('<div class="c-object_props-key '+(/*selected_key==f?'state_active':*/'')+row_class+'">'+f+'</div>');
			}
			
			var html = ['<div class="c-object_props-cols '+(ev.show_toolbar?'':'mode_without_toolbar')+'"><div class="c-object_props-col1">',
				col1_html.join('\n'),
				col1_end_html.join('\n'),
				'</div><div class="c-object_props-col2">',
				col2_html.join('\n'),
				col2_end_html.join('\n'),
				'</div></div>',
				'<div class="c-object_props-editor"><textarea class="c-object_props-editor-textarea" onkeyup="console.log(event); if(event.keyCode == 27) jsdbg_ide_onclick({type:\'click\',target:this.parentNode.querySelector(\'.cmd_object_props_discard_changes\')})"></textarea><div class="c-object_props-editor-btns"><button type="button" class="c-object_props-editor-btn cmd_object_props_apply_changes">Apply</button><button type="button" class="c-object_props-editor-btn cmd_object_props_discard_changes">Cancel</button></div></div>'];
			
			/* if(ev.show_toolbar)
				html.push('<div class="c-object_props-toolbar">'+
				'<button class="c-object_props-toolbar-btn cmd_object_props_prev_state"><i class="ico-prev"></i></button>'+
				'<button class="c-object_props-toolbar-btn cmd_object_props_next_state"><i class="ico-next"></i></button>'+
				'<span class="c-object_props-toolbar-divider"></span>'+
				'<button class="c-object_props-toolbar-btn cmd_object_props_apply_changes"><i class="ico-apply"></i>Apply</button>'+
				'<button class="c-object_props-toolbar-btn cmd_object_props_discard_changes"><i class="ico-discard"></i>Discard</button>'+
				'</div>'
				); */
			
			root.innerHTML = html.join('');
			
			// прокрутим список как раньше было
			if('state_to_load' in ev) {
				find_near('c-object_props-cols').scrollTop = ev.state_to_load.scrollTop || 0;
			} 
			
			// уберём редактор
			root.className = root.className.replace(/ *mod_one_prop/, '');
			
			// повесим обработчик 2ного клика
			root.ondblclick = jsdbg_ide_onclick;
			
			// onchange
			root.onchange = ev.onchange;
		}
		
		// [dblclick] .c-object_props-key/-value
		if(ev.type == 'dblclick' && trg1.className.match(/c-object_props-key|c-object_props-value/)) {
			var root = find_near('c-object_props');
			
			// не трогаем пустые строки (limit...)
			if(trg1.innerHTML.match(/^(&nbsp;| *)$/)) return;
			
			// сохраним название поля в которое опускаемся
			root.states[0].selected_key = trg1.innerHTML;
			
			jsdbg_ide_onclick({
				type: "load", 
				target: root, 
				show_toolbar: find_near("c-object_props-toolbar"),
				key_to_load: trg1.innerHTML});
		}
		
		// [click] .c-object_props-value
		if(ev.type == 'click' && trg1.className.match(/c-object_props-value/)) {
			
			// если выделили мышкой текст
			if(window.getSelection().toString() != "")
				return;
			
			// если кликнули по c-object_props-value то переключимся на соответствующий c-object_props-key
			if(trg1.className.indexOf("c-object_props-value") > -1) {
				for(var pos = 0; trg1.previousElementSibling; pos++)
					trg1 = trg1.previousElementSibling;
				trg1 = trg1.parentNode.previousElementSibling.firstElementChild;
				for(;pos > 0 && trg1.nextElementSibling; pos--) 
					trg1 = trg1.nextElementSibling;
			}
			
			for(var curr = trg1.parentNode.firstElementChild; curr; curr = curr.nextElementSibling) {
				if(curr.className.indexOf(' state_active') > -1) {
					// уберём активность
					curr.className = curr.className.replace(/ *state_active/, '');
					
					// если кликнули на активный элемент, уберём редактор и вернёмся в режим списка
					if(curr == trg1) {
						var root = find_near('c-object_props', {previous_states:[], current_state:0});
						root.className = root.className.replace(/ *mod_one_prop/, '');
						continue;
					}
				}

				if(curr == trg1) {
					curr.className += ' state_active';
					
					// загрузим текущее значение в редактор
					var editor = find_near('c-object_props-editor-textarea');
					var root = trg1.parentNode.parentNode.parentNode;
					var state = root.states[0];
					var obj = state.object;
					
					state.selected_key = curr.innerHTML;
					
					// загрузим на редактирование в зависимости от типа
					editor.className = editor.className.replace(/ *type_[-a-z0-9_]+/, '');
					switch(typeof obj[curr.innerHTML]) {
						case 'undefined':
							editor.value = 'undefined';
							editor.className += ' type_undefined';
							break;
						case 'string':
							editor.value = JSON.stringify(obj[curr.innerHTML]);
							editor.className += ' type_string';
							break;
						case 'function':
							editor.value = obj[curr.innerHTML].toString();
							editor.className += ' type_func_src';
							break;
						case 'boolean':
							editor.value = JSON.stringify(obj[curr.innerHTML]);
							editor.className += ' type_boolean';
							break;
						case 'object':
							if(obj[curr.innerHTML] === null) {
								editor.value = JSON.stringify(obj[curr.innerHTML]);
								editor.className += ' type_null';
								break;
							}
							if('length' in obj[curr.innerHTML]) {
								editor.value = JSON.stringify(obj[curr.innerHTML]);
								editor.className += ' type_array';
								break;
							}
						default:
							editor.value = JSON.stringify(obj[curr.innerHTML]);
							editor.className += ' type_'+(typeof obj[curr.innerHTML]);
					}
					
					// покажем редактор
					root.className = root.className.replace(/ *mod_one_prop/, '') + ' mod_one_prop';
					
					// поставим фокус в него
					editor.focus();
				}
			}
			
		}
		
		// [click] .cmd_object_props_prev_state
		// [dblclick] .c-object_props-btn_back
		if(ev.type == 'click' && trg1.className.indexOf('cmd_object_props_prev_state') > -1
		|| (ev.type == 'dblclick' && trg1.className.indexOf('c-object_props-btn_back') > -1)) {
			var root = find_near('c-object_props');
			
			// история состояний пуста
			if((root.states||[]).length == 0) return;
			
			// более предыдущего состояния нет
			if(!root.states[1]) return;
			
			// переключимся на запрошенное состояние по порядковому номеру
			for(var num = trg1.getAttribute("data-state-num") || 0; 
				num >= 0; num--) {
				
				// перенесём текущее состояние вы специальный список для кнопки "Next"
				if('previous_states' in root == false) 
					root.previous_states = [];
				root.previous_states.unshift(root.states.shift());
				
				if(num == 0)
					jsdbg_ide_onclick({type: 'load', target: root, state_to_load: root.states[0]});
			}
		}
		
		// [click] .cmd_object_props_next_state
		if(ev.type == 'click' && trg1.className.indexOf('cmd_object_props_next_state') > -1) {
			var root = find_near('c-object_props');
			
			if('previous_states' in root == false) return;
			if( ! root.previous_states[0]) return;
			
			jsdbg_ide_onclick({type: 'load', target: root, state_to_load: root.previous_states[0]});
			
			// перенесём в стек текущих состояний загруженное состояние
			root.states.unshift(root.previous_states.shift());
		}
		
		// [click] .cmd_object_props_apply_changes
		if(ev.type == 'click' && trg1.className.indexOf('cmd_object_props_apply_changes') > -1) {
			var root = find_near('c-object_props');
			
			if(root.className.indexOf('mod_one_prop') < 0) return;
			
			// так-же надо будет подправить значение в списке
			var list_item = {};
			for(var curr = find_near('c-object_props-col2').firstElementChild; curr; curr = curr.nextElementSibling)
				if(curr.getAttribute('data-key') == root.states[0].selected_key) {
					list_item = curr;
					break;
				}
			
			// запомним старое значение
			var old_value = root.states[0].object[root.states[0].selected_key];
			
			// оповестим об изменении значения в поле
			var editor = find_near('c-object_props-editor-textarea');
			jsdbg_ide_onclick({
				type:'change', 
				target: root,
				editor: editor,
				object: root.states[0].object,
				key: root.states[0].selected_key, 
				value: editor.value, 
				value_type: editor.className.match(/type_[a-z_A-Z0-9]+/)[0],
				value_old: old_value});

			// отобразим новое значение
			switch(editor.className.match(/type_[a-z_A-Z0-9]+/)[0]) {
				case 'type_string':
// 					root.states[0].object[root.states[0].selected_key] = editor.value;
					list_item.innerHTML = eval("("+editor.value+")");
					break;
				case 'type_undefined':
					if(editor.value == 'undefined') {
// 						root.states[0].object[root.states[0].selected_key] = undefined;
						list_item.innerHTML = editor.value;
						break;
					}
				case 'type_func_src':
				default:
// 					root.states[0].object[root.states[0].selected_key] = eval('('+editor.value+')');
					list_item.innerHTML = editor.value;
					break;
			}
			
			// скроем редактор
			root.className = root.className.replace(/ *mod_one_prop/, "");
			
			// уберём state_active
			var list_item = root.querySelector(".c-object_props-key.state_active")||{className:""};
			list_item.className = list_item.className.replace(/ *state_active/," ");
			root.states[0].selected_key = undefined;
		}
		
		// [click] .cmd_object_props_discard_changes
		if(ev.type == 'click' && trg1.className.indexOf('cmd_object_props_discard_changes') > -1) {
			var root = find_near('c-object_props');
			
			if(root.className.indexOf('mod_one_prop') < 0) return;
			root.className = root.className.replace(/ *mod_one_prop/, "");
			
			// уберём state_active
			var list_item = root.querySelector(".c-object_props-key.state_active")||{className:""};
			list_item.className = list_item.className.replace(/ *state_active/," ");
			root.states[0].selected_key = undefined;
			
/*			jsdbg_ide_onclick({
				type: "click",
				target: root.querySelector(".c-object_props-key.state_active")
			});*/
		}
		
	} // c-object_props END
}

function jsdbg_ide_class_browser(ev, trg1, trg1p, trg1pp, find_near, code_editor) {
	
	// cmd_code_editor_show_class_browser
	if(ev.type == 'cmd_code_editor_show_class_browser'
	|| trg1.className.indexOf('cmd_code_editor_show_class_browser') > -1 
	|| trg1p.className.indexOf('cmd_code_editor_show_class_browser') > -1) 
	{
		// нужно показать уже существующее окно?
		if(trg1.dataset.winId) {
			var win = document.getElementById(trg1.dataset.winId);
			if(win) {
				win_onmouse({type: 'winshow', target: win});
				return;
			}
		}
				
		// новое окно -> ищем свободный id
		for(var id = 1;;id++)
			if(document.getElementById("jsdbg_class_browser_"+id)) continue;
			else break;
	
		var win = document.createElement("DIV");
		win.id = 'jsdbg_class_browser_'+id;
		win.className = "win jsdbg-ide-class-browser win-is-hidden";
		win.style.height = '600px';
		win.style.width = '700px';
		win.addEventListener('resize', function(){ 
			var editor = code_editor('#'+win.id+" .c-code_editor-textarea");
			if(editor.resize) {
				editor.resize(true);
				editor.renderer.updateFull(true);
			}
		});
		win.addEventListener('close', function(event){
			// удалим кнопки показа окна
			var btns = document.querySelectorAll(".cmd_code_editor_show_class_browser[data-win-id='"+event.target.id+"']");
			for(var i=0; i<btns.length; i++) 
				btns[i].parentNode.removeChild(btns[i]);
			
		});
		win.dataset.winSettingsLocalStorage = 'jsdbg_class_browser_'+id;
		win.innerHTML = '<div id="jsdbg_class_browser_'+id+'_title" style="height:35px;" class="win-header"><span class="win-header-title">Class Browser #'+id+'</span><a class="win-minimize-btn" href="javascript:void(0)" title="Minimize (ESC)">_</a><a class="win-close-btn" href="javascript:void(0)" title="Close">x</a></div>'+
		
		'<div class="win-area" style="display:flex;display:-webkit-box;min-height:165px;">'+
		
		'<div id="jsdbg_class_browser_'+id+'_class_hierarchy" class="win-area" style="min-wi1dth:300px;min-hei1ght:165px;-moz-box-sizing:border-box;box-sizing:border-box;position:relative"><select style="width:100%;height:100%;background:white;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;left:0;top:0;right:0;bottom:0;" multiple="true">'+
		'<optgroup id="jsdbg_class_browser_'+id+'_js_classes" label="(no file)"></optgroup></select></div>'+
		
		'<div id="jsdbg_class_browser_'+id+'_splitter1" class="win-splitter type_vertical"></div>'+
		
		'<div id="jsdbg_class_browser_'+id+'_class_object_methods" class="win-area" style="min-wid1th:300px;min-hei1ght:165px;-moz-box-sizing:border-box;box-sizing:border-box;position:relative"><select style="width:100%;height:100%;background:white;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;left:0;top:0;right:0;bottom:0;" multiple="true">'+
		'<option id="jsdbg_class_browser_'+id+'_superclass">sepurclass</option>'+
		'<optgroup id="jsdbg_class_browser_'+id+'_class_methods" label="class (static methods)"></optgroup>'+
		'<optgroup id="jsdbg_class_browser_'+id+'_object_methods" label="object"></optgroup>'+
		'</select></div>'+
		'</div>'+
		
		'<div id="jsdbg_class_browser_'+id+'_splitter2" class="win-splitter type_horizontal"></div>'+
		
		'<div class="win-area" style="flex-grow:5;-webkit-box-flex:5.0;position:relative;">'+
		'<div id="jsdbg_class_browser_'+id+'_code_toolbar" style="height:25px;position:absolute;width:100%;overflow:hidden;z-index:1">'+
		'<div class="c-toolbar" data-win-id="jsdbg_class_browser_'+id+'">'+
		'<button class="c-toolbar-btn cmd_code_editor_save" title="Save changes"><i class="ico-save"></i>Save</button>'+
		'<span class="c-toolbar-divider"></span>'+
		'<button class="c-toolbar-btn cmd_code_editor_run" title="Evalute selected fragment"><i class="ico-play"></i>RunIt</button>'+
		'<button class="c-toolbar-btn cmd_code_editor_start_debug" title="Debug selected fragment"><i class="ico-bug"></i>DebugIt</button>'+
		'<button class="c-toolbar-btn cmd_code_editor_inspect_it" title="Evalute selected fragment and explore result"><i class="ico-eye"></i>ExploreIt</button>'+
		'<span class="c-toolbar-divider"></span>'+
		'<button class="c-toolbar-btn cmd_code_editor_set_breakpoint"><i class="ico-add-brk"></i>Set breakpoint</button>'+
		'<span class="c-toolbar-divider"></span>'+
		'<button class="c-toolbar-btn cmd_code_editor_new_class"><i class="ico-plus"></i>Class</button>'+
		'<button class="c-toolbar-btn cmd_code_editor_new_method"><i class="ico-plus"></i>Method</button>'+
		'</div></div>'+
		
		'<div id="jsdbg_class_browser_'+id+'_code" class="c-code_editor" style="/*min-height:345px;*/position:absolute;left:0;top:0;right:0;bottom:0;padding-top:25px;height:100%;box-sizing:border-box;-moz-box-sizing:border-box;">'+
		'<pre id="jsdbg_class_browser_'+id+'_brkpnts" class="c-code_editor-bg" style="height:100%;width:100%;display:block;background:transparent;position:absolute;top:0;left:0;z-index:-1;color:transparent;"></pre>'+
		'<textarea id="jsdbg_class_browser_'+id+'_code_editor" class="c-code_editor-textarea" style="width:100%;height:100%;background:transparent;" placeholder="ALT+Q - Ace.js"></textarea></div>'+
		'</div>'+
		'<div class="win-resizer"></div>';

		document.body.appendChild(win);
		
		// Базовые JS прототипы/классы
		var js_class_names = ["<option>Number</option>", "<option>String</option>", "<option>Boolean</option>", "<option>Symbol</option>", "<option>Date</option>", "<option>Array</option>", "<option>Object</option>", "<option>Function</option>"];
		// пользовательские прототипы
		var prototype_to_file_map = jsdbg_ide_onclick({type: 'list_files'});
		for(var name in window) {
			if(window[name] && window[name].prototype
			&& "QWFPGJLUYARSTDHNEIOZXCVBKMЯЖФПГЙЛУЫЮШЩАРСТДХНЕИОЬЗЧЦВБКМЁЪ".indexOf(name[0]) > -1
			&& !prototype_to_file_map[name]
			) {
				js_class_names.push("<option>"+name+"</option>");
			}
		}
		
		// Gecko specific code
		var window_props = Object.getOwnPropertyNames(window);
		for (var i = 0; i < window_props.length; i++) {
			var name = window_props[i];
			if ((window[name]||{}).prototype 
			&& "QWFPGJLUYARSTDHNEIOZXCVBKM".indexOf(name[0]) > -1 
			&& js_class_names.indexOf("<option>"+name+"</option>") == -1
			&& !prototype_to_file_map[name]
			)
				js_class_names.push("<option>"+name+"</option>");
		}

		// загружаем классы не распределённые по файлам
		var optgroup = document.getElementById("jsdbg_class_browser_"+id+"_js_classes");
		js_class_names.sort();
		optgroup.innerHTML = js_class_names.join("");
		
		// выведем классы по файлам
		var select_classes = optgroup.parentNode;
		var our_optgroups = {};
		for(var protoname in prototype_to_file_map)
		if(protoname && typeof prototype_to_file_map[protoname] == 'string') {
			var file_name = prototype_to_file_map[protoname];

			// создадим optgroup для файла если ещё нет
			if (!our_optgroups[file_name]) {
				our_optgroups[file_name] = document.createElement("OPTGROUP");
				our_optgroups[file_name].id = "jsdbg_class_browser_" + id + "_our_classes_" + file_name.replace(/\//g, '_').replace(/\./g, '_');
				our_optgroups[file_name].label = file_name;
				select_classes.insertBefore(our_optgroups[file_name], select_classes.lastChild);
			}

			// добавим protoype/function в optgroup
			our_optgroups[file_name].appendChild(document.createElement('OPTION'));
			our_optgroups[file_name].lastChild.innerHTML = protoname;
			our_optgroups[file_name].lastChild.dataset.fileName = file_name;
			our_optgroups[file_name].lastChild.dataset.prototypeName = protoname;
		}

		// файлы в процессе загрузки
		for(var i=0; i<(prototype_to_file_map._loading||[]).length; i++) {
			var file_name = prototype_to_file_map._loading[i];
			our_optgroups[file_name] = document.createElement("OPTGROUP");
			our_optgroups[file_name].id = "jsdbg_class_browser_" + id + "_our_classes_" + file_name.replace(/\//g, '_').replace(/\./g, '_');
			our_optgroups[file_name].label = file_name+' (loading...)';
			select_classes.insertBefore(our_optgroups[file_name], select_classes.lastChild);
		}

		// файлы-скрипты не распознаные
		for(var i=0; i<prototype_to_file_map._unrecognized.length; i++) {
			var file_name = prototype_to_file_map._unrecognized[i];
			our_optgroups[file_name] = document.createElement("OPTGROUP");
			our_optgroups[file_name].id = "jsdbg_class_browser_" + id + "_our_classes_" + file_name.replace(/\//g, '_').replace(/\./g, '_');
			our_optgroups[file_name].label = file_name;
			select_classes.insertBefore(our_optgroups[file_name], select_classes.lastChild);
			our_optgroups[file_name].innerHTML = '<option data-file-name="'+file_name+'">[load and analize]</option>';
		}
		
		// покажем окно наконец (чтоб загрузились сохр.настройки окна)
		win_onmouse({type:'winshow', target: win});
		
		// добавим кнопку на панель
		if(document.getElementById("jsdbg_ide_panel") /*&& !document.querySelector("#jsdbg_ide_panel .cmd_code_editor_show_class_browser")*/) {
			var button = document.createElement("BUTTON");
			button.id = 'jsdbg_class_browser_'+id+'_button';
			button.innerHTML = "Class Browser #"+id;
			button.className = "cmd_code_editor_show_class_browser";
			button.dataset.winId = 'jsdbg_class_browser_'+id;
			document.getElementById("jsdbg_ide_panel").insertBefore(button, document.getElementById("jsdbg_ide_panel").firstElementChild);
		}
	}
	
	// #jsdbg_class_browser_NNN_js/our_classes
	if(trg1.nodeName == 'OPTION' && (trg1p.id||"").match(/_(js|our)_classes/)) {
		var win_id = trg1p.id.replace(/_(js|our)_classes.*/, "");
		var win = document.getElementById(win_id);

		// загрузить содержимое скрипта и найти прототипы/классы?
		if (trg1.innerHTML.match(/analize\]/))
		{
			trg1.innerHTML = '[loading...]';
			jsdbg_ide_onclick({
				type: 'get_and_analize_file',
				url: trg1.dataset.fileName,
				callback: (function(prototype_list){
					var options_html = [];
					for(var i=0; i<prototype_list.length; i++) {
						options_html.push('<option data-file-name="'+this.dataset.fileName+'" data-prototype-name="'+prototype_list[i]+'">'+prototype_list[i]+'</option>');
					}
					this.parentNode.innerHTML = options_html.join('');
				}).bind(trg1)
			});

			return;
		}

		var clazz = window[trg1.innerHTML] || (new Function('', '	debugger; // no prototype/class '+trg1.innerHTML+' found!'));
		
		// object methods
		var methods = [];
		var list = Object.getOwnPropertyNames(clazz.prototype||{});
		for(var i = 0; i < list.length; i++)
		if(clazz.prototype[list[i]] instanceof Function) {
			methods.push('<option data-file-name="'+(trg1.dataset.fileName||'')+'" data-method-fullname="'+trg1.innerHTML+'.prototype.'+list[i]+'">'+list[i]+'</option>');
		}
		// ???
		/*if(clazz.prototype && clazz.prototype.__proto__)
		for(var meth_name in clazz.prototype.__proto__)
		if(clazz.prototype.__proto__[meth_name] instanceof Function) {
			methods.push('<option data-file-name="'+(trg1.dataset.fileName||'')+'" data-prototype-name="'+trg1.innerHTML+'" data-func-name="'+meth_name+'">'+meth_name+'</option>');
		}*/
		methods.sort();
		document.getElementById(win_id+"_object_methods").innerHTML = methods.join("");
		
		// class methods
		var methods = [];
		var list = Object.getOwnPropertyNames(clazz);
		for(var i = 0; i < list.length; i++)
		if(clazz[list[i]] instanceof Function) {
			methods.push('<option data-file-name="'+(trg1.dataset.fileName||'')+'" data-method-fullname="'+trg1.innerHTML+'.'+list[i]+'">'+list[i]+'</option>');
		}
		methods.sort();
		document.getElementById(win_id+"_class_methods").innerHTML = methods.join("");
		
		// загрузим код прототипа в редактор кода
		jsdbg_ide_onclick({type: 'load_method_to_editor', target: win, method: clazz});

		// старый механизм
		win.dataset.fileName = trg1.dataset.fileName;
		// win.dataset.prototypeName = trg1.innerHTML;
		// win.dataset.funcName = '';

		// новый механизм
		win.dataset.methodFullname = trg1.innerHTML;

		// обновим заголовок и кнопку
		win.querySelector('.win-header-title').innerHTML = 'Class Browser: '+trg1.innerHTML+'()';
		(document.getElementById(win_id+'_button')||{}).innerHTML = 'CB: '+trg1.innerHTML+'()';

		// уберём выделение пункта в списке методов/свойств
		document.getElementById(win_id+"_class_methods").parentNode.selectedIndex = -1;
	}
	
	// #jsdbg_ide_class_browser_NNN_class/object_methods
	if(trg1.nodeName == 'OPTION' && (trg1p.id||"").match(/_(class|object)_methods/))
	{
		// удаление метода
		if (ev.altKey) {
			if(confirm('Delete method "'+trg1.dataset.methodFullname+'"?')) {
				eval('delete '+trg1.dataset.methodFullname+';');
			}
			// TODO refresh list
			return;
		}

		var win_id = trg1p.id.replace(/_(class|object)_methods/, "");
		var win = document.querySelector('#'+win_id);

		var method_fullname = trg1.dataset.methodFullname;
		var func = eval("("+method_fullname+")");
		
		// старый механизм
		// win.dataset.funcName = func_name.replace('.prototype', '');
		// win.dataset.prototypeName = prototype_name;
		win.dataset.fileName = trg1.dataset.fileName;
		win.func = func; // для breakpoints

		// новый механизм
		win.dataset.methodFullname = trg1.dataset.methodFullname;

		// загрузим исходный код метода в редактор кода
		jsdbg_ide_onclick({
			type: 'load_method_to_editor',
			target: win,
			method: func,
			foldAll: true
		});

		// отметим тип методов (static/prototype)
		jsdbg_ide_onclick({type: 'click', target: trg1p});
	}

	// #jsdbg_ide_class_browser_NNN_class/static or prototype methods
	if(trg1.nodeName == 'OPTGROUP' && (trg1.id||"").match(/_(class|object)_methods/))
	{
		if (trg1.id.match(/class_methods/)) {
			trg1.className = "selected";
			trg1.label = trg1.label.replace('*','')+'*';
			trg1.nextElementSibling.className = "";
			trg1.nextElementSibling.label = trg1.nextElementSibling.label.replace('*', '');
		}
		else {
			trg1.className = "selected";
			trg1.label = trg1.label.replace('*','')+'*';
			trg1.previousElementSibling.className = "";
			trg1.previousElementSibling.label = trg1.previousElementSibling.label.replace('*', '');
		}
	}

	// #jsdbg_class_browser_superclass
	if(trg1.nodeName == 'OPTION' && trg1.id.match(/jsdbg_class_browser_[0-9]+_superclass/)) {
		var win_id = trg1.id.replace(/_superclass/, "");
		var win = document.getElementById(win_id);
		var code_editor = code_editor('#'+win_id+' .c-code_editor-textarea');
		var prototype_name = document.getElementById(win_id).dataset.methodFullname.match(/^[a-zA-Z0-9_]+/);

		code_editor.setValue(window[prototype_name[0]].prototype.__proto__.constructor.toString().match(/^function ([_a-zA-Z0-9]+)/)[1]);

		// отметим, что выбрано наследование
		win.dataset.methodFullname = prototype_name[0]+'.superclass';

		win.querySelector('.win-header-title').innerHTML = 'Class browser: '+win.dataset.methodFullname+'';
		(document.getElementById(win_id+'_button')||{}).innerHTML = 'CB: '+win.dataset.methodFullname+'';

	}

	// cmd_code_editor_save
	if(ev.type == "click"
	&& (trg1.className.indexOf('cmd_code_editor_save') > -1 || trg1p.className.indexOf('cmd_code_editor_save') > -1)
	&& (find_near("c-toolbar", {dataset:{}}).dataset.winId||'').match(/class_browser/)
	) {
 		var win_id = find_near("c-toolbar", {dataset:{}}).dataset.winId;
		var win = document.getElementById(win_id);
		var method_fullname = win.dataset.methodFullname;
		var file_name = win.dataset.fileName || '';

		var editor = code_editor("#"+win_id+" .c-code_editor-textarea");
		var new_code = editor.getValue();

		// var function_header = new_code.match(/^function ([_0-9a-zA-Z]+) *\(/);
		// var prototype_name = win.dataset.prototypeName;
		// var func_name = (win.dataset.methodFullname.match(/[a-zA-Z0-9_]+$/)||[''])[0];

		// superclass
		if(method_fullname.match(/^[a-z0-9_]+\.superclass/i)) {
			var clazz = window[method_fullname.replace(/\.superclass.*/, '')];
			var superclass = new_code || 'Object';
			if(clazz)
			{
				if(!window[superclass]) return alert(superclass+' not found!');

				clazz.prototype.__proto__ = window[superclass].prototype;
				clazz.__proto__ = Object.create(
					window[superclass],
					{constructor: {value: clazz, writable: true, configurable: true}}
				);

				// сохранить в файл
				jsdbg_ide_onclick({
					type: "save_file",
					file_name: file_name,
					target: trg1
				});

				// дальше ничего не обрабатываем
				return;
			}
		}

		// конструктор или новый прототип?
		if(method_fullname.match(/^[a-z0-9_]+$/i))
		{
			var old_class = window[method_fullname];

			// новый прототип?
			if(!old_class) {
				old_class = {};
				// new_code = 'function(' + new_code.substring(method_fullname.length);
				var old_class_prototype = {};
			}
			else {
				// сохранять все старые методы прототипа
				var old_class_prototype = window[method_fullname].prototype;
			}

			// обновляем конструктор
			try {
				eval('window.'+method_fullname+' = '+new_code);
			} catch(ex) {
				console.error(ex);
				alert(ex);
			}

			// восстанавливаем сохранённые методы
			for(var f in old_class)
			if(f != 'prototype' && f in window[method_fullname].__proto__ == false)
				window[method_fullname][f] = old_class[f];
			window[method_fullname].prototype = old_class_prototype;
		}

		// метод
		else if(method_fullname.match(/^[a-z0-9_]+\.[a-z0-9_]+/i))
		{
			try {
				eval(method_fullname+' = '+new_code+';');
			} catch(ex) {
				console.error(ex);
				alert(ex);
			}
		}

		// сохранить в файл
		jsdbg_ide_onclick({
			type: "save_file",
			file_name: file_name,
			target: trg1});

		// обновим список методов
		/*jsdbg_ide_onclick({
			type: 'click',
			target: document.querySelector('#'+win_id + "_class_hierarchy option[data-prototype-name='" + prototype_name  +"']")
		});*/

		return;
	}
}

function jsdbg_ide_debugger(ev, trg1, trg1p, trg1pp, find_near, code_editor) {

	// [open_debugger]
	if(ev.type.indexOf("open_debugger") > -1) {
		var panel = document.getElementById("jsdbg_ide_panel");
		
		// подключим оформление
		jsdbg_ide_onclick({type: 'init_css'});
		
		// поищем кнопку и, если есть, откроем окно дебагера
		for (var ii = 0; ii < panel.childNodes.length; ii++) {
			var button = panel.childNodes[ii];
			if (button.ctx == ev.ctx && ev.ctx) {
				var id = button.id.replace('_button', '');
				if (! document.getElementById(id))
					button.click();
				else
					jsdbg_ide_onclick({
						type: "refresh_debugger",
						dbg_id: id
					});
				return
			}
		}
		var dbg_num = jsdbg_ide_onclick.debugger_win_next_num++;
		
		// иначе добавим кнопку на панель
		var button = document.createElement('BUTTON');
		button.id = "jsdbg_debugger_"+dbg_num+"_button";
		button.className = "cmd_code_editor_debugger";
		button.innerHTML = "<i></i>Debugger #"+dbg_num;
		button.ctx = ev.ctx;

		if(document.getElementById("jsdbg_ide_panel")) {
			panel.insertBefore(button, panel.firstElementChild);
		}
		
		// и нажмём на неё, чтоб дебагер открылся
		button.click();
	}
	
	// [refresh_debugger]
	if(ev.type == "refresh_debugger") {
		var dbg_id = ev.dbg_id || trg1.id;
		var selected_ctx_num = ev.selected_ctx_num;
		var dbg_win = document.getElementById(dbg_id);

		// но цепочку возмём с конца (необходимо если exception был)
		var ctx = dbg_win.ctx;
		while(ctx.__down && ctx.hasOwnProperty('__down')) ctx = ctx.__down;

		// выделенный контекст для начало будет последний в цепочке
		var selected_ctx = ctx;

		// очистим стек вызовов
		var call_stack_select = document.getElementById(dbg_id+'_callstack').firstElementChild;
		call_stack_select.innerHTML = '';
		
		// загрузим свежий стек вызовов
		for(var curr_ctx = ctx; curr_ctx; curr_ctx = curr_ctx.__up) {
			
			// создадим option и заполним её параметрами
			var option = document.createElement('OPTION');
			call_stack_select.appendChild(option);
			option.value = call_stack_select.options.length;
			
			// начнём искать полный путь до метода/функции
			var meth_fullname = '';

			// TODO curr_ctx.__callee.__jsdbg_parent_id

			// new - создание объекта
			if(curr_ctx.this.__proto__ == curr_ctx.__callee.prototype)
			{
				var meth_fullname = curr_ctx.__callee.name;
			}

			// window.function()
			else if(curr_ctx.this == window) {
				if(curr_ctx.__callee.name != '')
					var meth_fullname = curr_ctx.__callee.name;
				else
					for(var meth_name in window)
					if (window[meth_name] == curr_ctx.__callee)
						var meth_fullname = meth_name;
			}

			// static method - метод класса/прототипа?
			else if(typeof curr_ctx.this == 'function')
			{
				for(var meth_name in curr_ctx.this)
				if(curr_ctx.this[meth_name] == curr_ctx.__callee)
				{
					// var meth_fullname = (curr_ctx.name||'?') + '.' + meth_name;

					for(var super_prototype = curr_ctx.this; super_prototype.__proto__ && super_prototype.__proto__.hasOwnProperty; super_prototype = super_prototype.__proto__)
						if(super_prototype.hasOwnProperty(meth_name)) {
							var meth_fullname = (super_prototype.name||'?') + '.' + meth_name;
							break;
						}
				}
			}
			// object method - метод объекта?
			else {
				for(var meth_name in curr_ctx.this)
				if(curr_ctx.this[meth_name] == curr_ctx.__callee)
				{
					// var meth_fullname = (curr_ctx.this.__proto__.constructor.name||'?') + '.' + meth_name;

					for(var super_prototype = curr_ctx.this; super_prototype.__proto__ && super_prototype.__proto__.hasOwnProperty; super_prototype = super_prototype.__proto__)
						if(super_prototype.hasOwnProperty(meth_name)) {
							var meth_fullname = ((super_prototype.constructor||{}).name||'?') + '.prototype.' + meth_name;
							break;
						}
				}
			}

			var option_caption = (meth_fullname||curr_ctx.__func||'?') + ':' + curr_ctx.__ip;

			// надпись - фрагмент кода
			var start_offset = Math.floor(curr_ctx.__ip / 10000);
			if(curr_ctx.__func_id && jsdbg.source[curr_ctx.__func_id])
				option_caption += ' - ' + jsdbg.source[curr_ctx.__func_id][0].substring(start_offset, start_offset+100);
			else if(curr_ctx.__callee)
				option_caption += ' - ' + curr_ctx.__callee.toString();

			// надпись
			option.innerHTML = option_caption.length > 100 
				? option_caption.substring(0, 100) + '...' 
				: option_caption;

			// возмём выделенный контекст если попросили
			if (selected_ctx_num === call_stack_select.options.length-1) { 
				selected_ctx = curr_ctx;
				option.selected = true;
			}
		}
		
		dbg_win.dataset.methodFullname = call_stack_select.options[call_stack_select.selectedIndex].innerHTML.match(/^[^:]+/)[0];
		// dbg_win.func = selected_ctx.__func ? selected_ctx.this[selected_ctx.__func] : undefined; // для breakpoints // переделано на methodFullname
		dbg_win.curr_ctx = selected_ctx; // для restart

		// загрузим контекст/scope в watch
		jsdbg_ide_onclick({
			type: 'load', 
			target: document.getElementById(dbg_id+'_watch').firstElementChild,
			show_toolbar: false,
			object_to_load: selected_ctx,
			clear_before_load: true
		});
		
		dbg_win.className = dbg_win.className.replace(/ *dbg_readonly_code/, ""); // отчистим атрибут только для чтения

		// загрузим код метода в редактор
		jsdbg_ide_onclick({
			type: 'load_method_to_editor',
			target: dbg_win,
			method: selected_ctx.__callee,
			// выделим нужный фрагмент
			select: [Math.floor(selected_ctx.__ip / 10000), selected_ctx.__ip % 10000]
		});
	}

	// [show_debugger_win]
	if(ev.type == "show_debugger_win") 
	{
		var button = trg1;
		var id = (button.innerHTML.match(/#([0-9]+)/) || [0, 1])[1];
		
		var html = [
		'<div id="jsdbg_debugger_'+id+'" class="win jsdbg-ide-debugger win-is-hidden" style="width:640px;height:625px;">',
			'<div id="jsdbg_debugger_'+id+'_title" class="win-header">',
				'<span class="win-header-title">Debugger #'+id+'</span>',
				'<a class="win-minimize-btn" href="javascript:void(0)" title="Minimize (ESC)">_</a><a class="win-close-btn" href="javascript:void(0)" title="Close">x</a>',
			'</div>',
			'<div id="jsdbg_debugger_'+id+'_callstack" class="win-area" style="box-sizing:border-box;height:20px;flex:initial;-webkit-box-flex:initial;">',
				'<select style="width:100%;"></select>',
			'</div>',
		    '<div id="jsdbg_debugger_'+id+'_code_toolbar" class="win-area" style="min-height:20px;flex:initial;-webkit-box-flex:initial;">',
				'<div class="c-toolbar" data-win-id="jsdbg_debugger_'+id+'">'+
				'<button class="c-toolbar-btn cmd_code_editor_save" title="Save changes"><i class="ico-save"></i>Save</button>'+
				'<span class="c-toolbar-divider"></span>'+
				'<button class="c-toolbar-btn cmd_code_editor_step_over" title="Step over"><i class="ico-step_over"></i></button>'+
				'<button class="c-toolbar-btn cmd_code_editor_step_in" title="Step in"><i class="ico-step_in"></i></button>'+
				'<button class="c-toolbar-btn cmd_code_editor_step_out" title="Step out"><i class="ico-step_out"></i></button>'+
				'<button class="c-toolbar-btn cmd_code_editor_restart" title="Restart"><i class="ico-restart"></i></button>'+
				'<span class="c-toolbar-divider"></span>'+
				'<button class="c-toolbar-btn cmd_code_editor_continue" title="Continue"><i class="ico-play"></i></button>'+
				'<button class="c-toolbar-btn cmd_code_editor_run_to_caret" title="Run to caret"><i class="ico-run-to-caret"></i></button>'+
				'<button class="c-toolbar-btn cmd_code_editor_jump_to_caret" title="Jump to caret without executing any code"><i class="ico-jump-to-caret"></i></button>'+
				'<span class="c-toolbar-divider"></span>'+
				'<button class="c-toolbar-btn cmd_code_editor_run" title="Evalute selected fragment"><i class="ico-play"></i>RunIt</button>'+
				'<button class="c-toolbar-btn cmd_code_editor_start_debug" title="Debug selected fragment"><i class="ico-dbg-start"></i>DebugIt</button>'+
				'<button class="c-toolbar-btn cmd_code_editor_inspect_it" title="Evalute selected fragment and explore result"><i class="ico-eye"></i>ExploreIt</button>'+
				'<span class="c-toolbar-divider"></span>'+
				'<button class="c-toolbar-btn cmd_code_editor_set_breakpoint"><i class="ico-add-brk"></i>Set breakpoint</button>'+
				'</div>',
			'</div>',
			'<div id="jsdbg_debugger_'+id+'_code" class="win-area c-code_editor" style="flex:50;-webkit-box-flex:50;position:relative;">'+
				'<pre id="jsdbg_debugger_'+id+'_brkpnts" class="c-code_editor-bg" style="height:100%;width:100%;display:block;background:white;position:absolute;top:0;left:0;z-index:-1;color:transparent;"></pre>'+
				'<textarea id="jsdbg_debugger_'+id+'_code" class="c-code_editor-textarea" style="width:100%;height:100%;background:transparent;position:absolute;top:0;left:0;top:0;bottom:0;right:0;"></textarea>',
			'</div>',
			'<div id="jsdbg_debugger_'+id+'_splitter" class="win-splitter type_horizontal"></div>',
			'<div id="jsdbg_debugger_'+id+'_watch" class="win-area" style="flex:10;-webkit-box-flex:10.0;position:relative;">'+
				'<div class="c-object_props" style="width:100%;height:100%;position:absolute;" data-win-id="jsdbg_debugger_'+id+'"></div>',
			'</div>',
			'<div class="win-resizer"></div>',
		'</div>'
		];
		document.body.insertAdjacentHTML('beforeend', html.join(''));
		var dbg_win = document.getElementById('jsdbg_debugger_'+id);

		// покажем окно
		if(dbg_win.className.indexOf('win-is-hidden')) {
			win_onmouse({
				type: 'winshow',
				target: dbg_win
			});
		}

		// при закрытии окна удаляем кнопку
		button.dataset.winId = 'jsdbg_debugger_'+id;
		dbg_win.addEventListener('close', function(event){
			// удалим кнопки показа окна
			var btns = document.querySelectorAll(".cmd_code_editor_debugger[data-win-id='"+event.target.id+"']");
			for(var i=0; i<btns.length; i++)
				btns[i].parentNode.removeChild(btns[i]);

		});
		
		// привяжем объект для управления дебагом
		dbg_win.ctx = button.ctx;
		dbg_win.ex = button.ex;

		// обновим состояние в окне дебагера
		jsdbg_ide_onclick({
			type: "refresh_debugger",
			target: dbg_win});
	}
	
	// cmd_code_editor_debugger
	if(ev.type == "click" && trg1.className.indexOf('cmd_code_editor_debugger') > -1 || trg1p.className.indexOf('cmd_code_editor_debugger') > -1) {
		var button = trg1p.className.indexOf('cmd_code_editor_debugger') > -1 ? trg1p : trg1;
		var id = button.innerHTML.replace(/.+?#/, '');
		var win = document.getElementById("jsdbg_debugger_"+id);
		if(!win) {
			jsdbg_ide_onclick({
				type: "show_debugger_win",
				target: button
			});
		}
		else if(win.className.indexOf('win-is-hidden') > -1)
			win_onmouse({type: 'winshow', target: win});
		else
			win_onmouse({type: 'winclose', target: win});
		/*else if(win.style.display == "none") {
			win.style.display = "block";
			win.querySelector(".c-code_editor-textarea").focus();
		}
		else 
			win.style.display = "none";*/
	}
	
	// cmd_code_editor_continue
	if(ev.type == "click" && (trg1.className.indexOf('cmd_code_editor_continue') > -1 || trg1p.className.indexOf('cmd_code_editor_continue') > -1))
	{
		var win_id = find_near("c-toolbar", {getAttribute:function(){}}).getAttribute("data-win-id");
		var dbgwin = document.getElementById(win_id);
		
		var curr_ctx = dbgwin.curr_ctx || dbgwin.ctx;
		
		try {
			jsdbg.ctx = curr_ctx;
			jsdbg.continue();

			// закрываем окно дебагера
			win_onmouse({type: 'click', target: dbgwin.querySelector('win-close-btn')});

		} catch(ex) {
			if(ex != "breakpoint!") {
				alert(ex + "\n" + ex.stack);
				console.info(ex.stack);

				dbgwin.ctx = jsdbg.ctx; // контекст где произашёл эксепшен
			}

			jsdbg_ide_onclick({
				type: "refresh_debugger",
				target: dbgwin});
		}
		
		return;
	}
	
	// cmd_code_editor_restart
	if(trg1.className.indexOf('cmd_code_editor_restart') > -1 || trg1p.className.indexOf('cmd_code_editor_restart') > -1) {
		var dbg_id = find_near("c-toolbar", {dataset:{}}).dataset.winId;
		var dbg_win = document.getElementById(dbg_id);
		var curr_ctx = dbg_win.curr_ctx || dbg_win.ctx;
		var editor = code_editor('#'+dbg_id+" .c-code_editor-textarea");
		
		// перезапускаем контекст фунцкиции/метода в начало
		curr_ctx.__restart();

		dbg_win.ctx = dbg_win.curr_ctx;
		delete dbg_win.curr_ctx;
		
		jsdbg_ide_onclick({
			type: "refresh_debugger",
			target: document.getElementById(dbg_id)});
	}
	
	// cmd_code_editor_step_in/over/out
	if(trg1.className.indexOf('cmd_code_editor_step_in') > -1 ||
	trg1p.className.indexOf('cmd_code_editor_step_in') > -1 ||
	trg1.className.indexOf('cmd_code_editor_step_over') > -1 ||
	trg1p.className.indexOf('cmd_code_editor_step_over') > -1 ||
	trg1.className.indexOf('cmd_code_editor_step_out') > -1 ||
	trg1p.className.indexOf('cmd_code_editor_step_out') > -1 ||
	trg1.className.indexOf('cmd_code_editor_run_to_caret') > -1 ||
	trg1p.className.indexOf('cmd_code_editor_run_to_caret') > -1) {
		var dbgwin_id = find_near("c-toolbar", {getAttribute:function(){}}).getAttribute("data-win-id");
		var dbgwin = document.getElementById(dbgwin_id);
		var start_ctx = dbgwin.curr_ctx || dbgwin.ctx;

		// сделаем шаг
		try {
			if(trg1.className.indexOf('cmd_code_editor_step_over') > -1 || trg1p.className.indexOf('cmd_code_editor_step_over') > -1) {
				jsdbg.ctx = start_ctx;
				jsdbg.stepOver();
				dbgwin.ctx = jsdbg.ctx;
			}
			else if(trg1.className.indexOf('cmd_code_editor_step_out') > -1 || trg1p.className.indexOf('cmd_code_editor_step_out') > -1) {
				jsdbg.ctx = start_ctx;
				jsdbg.stepOut();
				dbgwin.ctx = jsdbg.ctx;
			}
			else if(trg1.className.indexOf('cmd_code_editor_step_in') > -1 || trg1p.className.indexOf('cmd_code_editor_step_in') > -1) {
				jsdbg.ctx = start_ctx;
				jsdbg.stepIn();
				dbgwin.ctx = jsdbg.ctx;
			}
			else if(trg1.className.indexOf('cmd_code_editor_run_to_caret') > -1 || trg1p.className.indexOf('cmd_code_editor_run_to_caret') > -1) {

				// узнаем позицию курсора
				var editor1 = code_editor('#'+dbgwin_id+' .c-code_editor-textarea');

				// ACE
				if(editor1.session) {
					var cursor_pos = editor1.selection.getCursor();
					var text_offset = editor1.session.doc.positionToIndex(cursor_pos);
				}
				// textarea
				else {
					var text_offset = editor1.textarea.selectionStart;
				}

				// возмём скомпилированный код и соберём возможные шаги
				var ctx = dbgwin.curr_ctx || dbgwin.ctx;
				var compiled_src = jsdbg.compiled[ctx.__func_id].toString();
				var next_steps = compiled_src.match(/__next_step\([0-9]+/g);

				// ищем наиболее подходящий
				var nearest_ip = [0, 10000], smallest_ip = [0, 10000];
				for(var ii=0; ii<(next_steps||[]).length; ii++)
				{
					var ip = parseInt(next_steps[ii].substring(12));
					var ip_start = Math.floor(ip / 10000);
					var ip_end = ip % 10000;

					// наиблежайшая?
					if(Math.abs(text_offset - ip_start) < nearest_ip[1])
						nearest_ip = [ip, Math.abs(text_offset - ip_start)];

					// покрывающая?
					if(ip_start <= text_offset && ip_end >= text_offset
					&& ip_end - ip_start < smallest_ip[1])
						smallest_ip = [ip, ip_end - ip_start];
				}

				// двигаемся
				if(smallest_ip[0]) {
					jsdbg.ctx = start_ctx;
					jsdbg.continueToIp(smallest_ip[0]);
					dbgwin.ctx = jsdbg.ctx;
				}
				else if(nearest_ip[0]) {
					jsdbg.ctx = start_ctx;
					jsdbg.continueToIp(nearest_ip[0]);
					dbgwin.ctx = jsdbg.ctx;
				}
				else
					return alert('Can`t found suitable step for offset '+text_offset+'!');
			}
		} catch(ex) {
			console.error(ex.stack || ex);
			alert(ex.stack || ex);
			dbgwin.ctx = jsdbg.ctx; // контекст где произашёл эксепшен
		}
		
		// выделяем фрагмент кода текущий
		/*var ide_main_window = document.getElementById(win_id+'_code_editor');
		ide_main_window.setSelectionRange(
			Math.round(debugger1.ctx.__ip/10000), 
			debugger1.ctx.__ip % 10000); */
		
		jsdbg_ide_onclick({
			type: "refresh_debugger",
			target: dbgwin});
	}

	// cmd_code_editor_run - RunIt
	if(ev.type == "click" && (trg1.className.indexOf('cmd_code_editor_run') > -1 || trg1p.className.indexOf('cmd_code_editor_run') > -1)) {
		var win_id = find_near("c-toolbar", {getAttribute:function(){}}).getAttribute("data-win-id");
		var win = document.getElementById(win_id);
		var editor = code_editor('#'+win_id+' .c-code_editor-textarea');
		var src = editor.getSelectedText();
		if (src == "") src = editor.getValue();
		
		try {

			// если в дебагере, то запускаем на основе текущего контекста
			if(win_id.match(/^jsdbg_debugger_/))
			{
				var dbgwin = document.getElementById(win_id);
				var base_ctx = dbgwin.curr_ctx || dbgwin.ctx;

				jsdbg.startDebugCtx(base_ctx, src, base_ctx.this, base_ctx.arguments);
				jsdbg.ctx.__action = 'debugit';
			}
			else
				jsdbg.startDebug(src);

		} catch(ex) {
			alert(ex+'\n'+ex.stack)
			return;
		}

		// выполняем
		try {
			jsdbg.continue();
			var result = jsdbg.ctx.__t[0];

		// если что-то пошло не так, то покажем дебагер
		} catch(ex) {
			if(ex != "breakpoint!") {
				alert(ex);
				console.info(ex.stack);
			}

			var button = document.createElement('BUTTON');
			button.className = "cmd_code_editor_debugger";
			button.innerHTML = "<i></i>Debugger #"+(jsdbg_ide_onclick.debugger_win_next_num++);
			button.ctx = jsdbg.ctx;
			button.ex = ex;
			button.className = "c-panel-btn cmd_code_editor_debugger";
			find_near("c-toolbar").appendChild(button);

			// откроем окно дебагера
			button.click();
			return;
		}

		// заменим перенесём результаты выполнения в основой контекст
		if(base_ctx)
		{
			for(var f in jsdbg.ctx)
				if(f[0] != '_' && f[1] && f[1] != '_')
					base_ctx[f] = jsdbg.ctx[f];

			// обновим окно дебагера
			// TODO обновить watch в окне дебагера
			if(dbgwin)
			jsdbg_ide_onclick({
				type: 'refresh_debugger',
				target: dbgwin
			});
		}

		return;
	}

	// cmd_code_editor_jump_to_caret
	if(ev.type == "click" && (trg1.className.indexOf('cmd_code_editor_jump_to_caret') > -1 || trg1p.className.indexOf('cmd_code_editor_jump_to_caret') > -1)) {
		var dbgwin_id = find_near("c-toolbar", {getAttribute:function(){}}).getAttribute("data-win-id");
		var dbgwin = document.getElementById(dbgwin_id);
		var start_ctx = dbgwin.curr_ctx || dbgwin.ctx;

		// узнаем позицию курсора
		var editor1 = code_editor('#'+dbgwin_id+' .c-code_editor-textarea');

		// ACE
		if(editor1.session) {
			var cursor_pos = editor1.selection.getCursor();
			var text_offset = editor1.session.doc.positionToIndex(cursor_pos);
		}
		// textarea
		else {
			var text_offset = editor1.textarea.selectionStart;
		}

		// возмём скомпилированный код и соберём возможные шаги
		var ctx = dbgwin.curr_ctx || dbgwin.ctx;
		var compiled_src = jsdbg.compiled[ctx.__func_id].toString();
		var next_steps = compiled_src.match(/__next_step\([0-9]+/g);

		// ищем наиболее подходящий
		var nearest_ip = [0, 10000], smallest_ip = [0, 10000];
		for(var ii=0; ii<(next_steps||[]).length; ii++)
		{
			var ip = parseInt(next_steps[ii].substring(12));
			var ip_start = Math.floor(ip / 10000);
			var ip_end = ip % 10000;

			// наиблежайшая?
			if(Math.abs(text_offset - ip_start) < nearest_ip[1])
				nearest_ip = [ip, Math.abs(text_offset - ip_start)];

			// покрывающая?
			if(ip_start <= text_offset && ip_end >= text_offset
			&& ip_end - ip_start < smallest_ip[1])
				smallest_ip = [ip, ip_end - ip_start];
		}

		// переставим
		if(smallest_ip[0])
			ctx.__ip = smallest_ip[0];
		else if(nearest_ip[0])
			ctx.__ip = nearest_ip[0];
		else
			return alert('Can`t found suitable step for offset '+text_offset+'!');

		/*try {

		} catch(ex) {
			console.error(ex.stack || ex);
			alert(ex.stack || ex);
			dbgwin.ctx = jsdbg.ctx; // контекст где произашёл эксепшен
		}*/

		jsdbg_ide_onclick({
			type: "refresh_debugger",
			target: dbgwin});
	}

	// #jsdbg_debugger_NNN_callstack > select
	if(ev.type == 'click' && trg1.nodeName == 'SELECT' && (trg1p.id||'').indexOf('_callstack') > -1) {
		jsdbg_ide_onclick({
			type: "refresh_debugger",
			target: document.getElementById(trg1p.id.replace('_callstack','')),
			selected_ctx_num: trg1.selectedIndex});
	}

	// cmd_code_editor_save
	if(ev.type == "click"
	&& (trg1.className.indexOf('cmd_code_editor_save') > -1 || trg1p.className.indexOf('cmd_code_editor_save') > -1)
	&& (find_near("c-toolbar", {dataset:{}}).dataset.winId||'').match(/debugger_/)
	) {
 		var dbg_id = find_near("c-toolbar", {dataset:{}}).dataset.winId;
		var dbg_win = document.getElementById(dbg_id);
		var editor = code_editor("#"+dbg_id+" .c-code_editor-textarea");
		var new_code = editor.getValue();

		var ctx = dbg_win.curr_ctx || dbg_win.ctx;

		var func_id = ctx.__func_id;
		var func = jsdbg.source[func_id];

		// применяем изменения
		var new_func = false;
		try {

		if(func[2])
		{
			// static method
			if (func[2] instanceof Function)
			for (var meth_name in func[2]) // TODO hasOwnProperty
			if (func[2][meth_name] == func[1]) {
				new_func = func[2][meth_name] = eval('('+new_code+')');
				var prototype = func[2];
				break;
			}

			// object method
			if(!new_func)
			for (var meth_name in func[2].constructor.prototype) // перебираем все методы объекта
			if (func[2].constructor.prototype[meth_name] == func[1])
			{
				// ищем у какого именно прототипа/класса этот метод?
				for(var obj_meths = func[2].constructor.prototype; obj_meths.__proto__;
					obj_meths = obj_meths.__proto__)
					if(obj_meths.hasOwnProperty(meth_name)) {
						new_func = obj_meths[meth_name] = eval('('+new_code+')');
						var prototype = obj_meths.constructor;
						break;
					}
			}

			if(new_func) {

				// если применили изменения, то найдём и сохраним в файл
				var prototype_to_file_map = jsdbg_ide_onclick({type: 'list_files'});
				for(var protoname in prototype_to_file_map)
				if(window[protoname] == prototype)
				{
					// сохранить в файл
					jsdbg_ide_onclick({
						type: "save_file",
						file_name: prototype_to_file_map[protoname],
						target: trg1
					});
					break;
				}

				if(window[protoname] != prototype)
					alert('File to save not found!');

				// перекомпилируем в jsdbg
				jsdbg.compileFunc(new_func, func[2]);

				// обновим контекст
				ctx.__callee = new_func;
				ctx.__func_id = new_func.__jsdbg_id;

				// TODO Если контекст в цепочки контектов, то надо обрезать
				if(dbg_win.ctx != ctx) {
					delete ctx.__down;
					dbg_win.ctx = ctx;
				}

				// рестартуем в дебаггере контекст
				jsdbg_ide_onclick({
					type: 'click',
					target: dbg_win.querySelector('.cmd_code_editor_restart')
				});
			}
		}
		else {
			// function/constructor
			for(var func_name in window)
			if(window[func_name] == func[1])
			{
				// надо сохранить страрые методы если класс
				var old_class = window[func_name];
				var old_class_prototype = old_class.prototype;

				// применим новый конструктор
				new_func = eval('window.'+func_name+' = '+new_code.replace(/function[^(]+/, 'function'));

				// восстанавливаем сохранённые методы
				for(var f in old_class)
				if(f != 'prototype' && f in new_func.__proto__ == false)
					new_func[f] = old_class[f];
				new_func.prototype = old_class_prototype;

				// сохраним в файл изменения
				var prototype_to_file_map = jsdbg_ide_onclick({type: 'list_files'});
				for(var protoname in prototype_to_file_map)
				if(window[protoname] == func[1])
				{
					// сохранить в файл
					jsdbg_ide_onclick({
						type: "save_file",
						file_name: prototype_to_file_map[protoname],
						target: trg1
					});
				}

				// перекомпилируем в jsdbg
				jsdbg.compileFunc(new_func);

				// TODO рестартуем в дебаггере контекст
			}
		}
		} catch(ex) {
			console.error(ex, ex.stack);
			alert(ex);
		}

		// обновим список методов
		/*jsdbg_ide_onclick({
			type: 'click',
			target: document.querySelector('#'+win_id + "_class_hierarchy option[data-prototype-name='" + prototype_name  +"']")
		});*/

		return;
	}
}

function jsdbg_ide_onkey(event) {
	var ev = event || window.event;
	var trg1 = ev.target || document.body.parentNode;
	if (trg1.nodeType && trg1.nodeType == 9) trg1 = trg1.body.parentNode; // #document
    if (trg1.nodeType && trg1.nodeType == 3) trg1 = trg1.parentNode; // #text
	var trg1p = (trg1.parentNode && trg1.parentNode.nodeType != 9) ? trg1.parentNode : {className:'', nodeName:'', getAttribute:function(){return ''}};
	var trg1pp = (trg1p.parentNode && trg1p.parentNode.nodeType != 9) ? trg1p.parentNode : {className:'', nodeName:'', getAttribute:function(){return ''}};
	// console.log(event);
	
	// [textarea] ТАВ
	if(ev.keyCode == 9 && ev.type == "keydown") {
// 				document.execCommand("styleWithCSS", true, null);
	
		if(trg1.nodeName = "TEXTAREA") {
			var textEvent = document.createEvent("TextEvent");
			if (textEvent.initTextEvent) {
				textEvent.initTextEvent("textInput", true, true, null, "\t");
				trg1.dispatchEvent(textEvent);
			} 
			
			// для старых броузеров по старому
			else {
				var cursor_pos = trg1.selectionStart;
				trg1.value = trg1.value.substring(0, trg1.selectionStart) + '\t' + trg1.value.substring(trg1.selectionStart);
				trg1.selectionStart = trg1.selectionEnd = cursor_pos + 1;
			}
				
			if(ev.stopPropagation) ev.stopPropagation();
			else ev.cancelBubble = true;
		
			if(ev.preventDefault) ev.preventDefault();
			else ev.returnValue = false;
		
			return false;
		}
	
		if(ev.shiftKey)
			document.execCommand('outdent', true, null);
		else
			document.execCommand('indent', true, null);

		if(ev.stopPropagation) ev.stopPropagation();
		else ev.cancelBubble = true;
		
		if(ev.preventDefault) ev.preventDefault();
		else ev.returnValue = false;
		
		return false;
	}

	// [win] ESC
	if(ev.keyCode == 27 && ev.type == "keydown") {
		var windows = document.querySelectorAll(".win");
		for(var i = windows.length-1; i >= 0 ; i--)
			if(windows[i].className.indexOf('win-is-hidden') < 0) {
				if(windows[i].querySelector(".win-minimize-btn"))
					jsdbg_ide_onmouse({type: "mouseup", target: windows[i].querySelector(".win-minimize-btn")});
				else
					jsdbg_ide_onmouse({type: "mouseup", target: windows[i].querySelector(".win-close-btn")});
				return;
			}

		// если нету окон, то скроем IDE
		jsdbg_ide_onclick({type: "show_hide_jsdbg_ide"});
	}
	
	// [textarea] ALT+A,CTR+I - InstpectIt
	if(ev.keyCode == 65 && ev.type == "keydown" && ev.altKey 
	|| ev.keyCode == 73 && ev.type == "keydown" && ev.ctrlKey
	&& ev.shiftKey == false) {
		jsdbg_ide_onclick({
			type:"click", 
			target: (document.getElementById(trg1.id.replace(/_(src|code_editor)$/, ""))||{querySelector:function(){}}).querySelector(".cmd_code_editor_inspect_it")});
	}
	
	// [textarea] ALT+R - DoIt
	if(ev.keyCode == 84 && ev.type == "keydown" && ev.altKey) {
		jsdbg_ide_onclick({
			type:"click", 
			target: (document.getElementById((ev.target.id).replace(/_src$/, ""))||{querySelector:function(){}}).querySelector(".cmd_code_editor_run")});
	}
	
	// [textarea] ALT+W - DebugIt
	if(ev.keyCode == 87 && ev.type == "keydown" && ev.altKey) {
		jsdbg_ide_onclick({
			type:"click", 
			target: (document.getElementById((ev.target.id).replace(/_src$/, ""))||{querySelector:function(){}}).querySelector(".cmd_code_editor_start_debug")});
	}
	
	// [textarea] ALT+S - Save
	if(ev.keyCode == 83 && ev.type == "keydown" && ev.altKey) {
		jsdbg_ide_onclick({
			type:"click", 
			target: (document.getElementById((ev.target.id).replace(/_src$/, ""))||{querySelector:function(){}}).querySelector(".cmd_code_editor_save")});
	}
	
	// [textarea] ALT+T - Set/unset breakpoint
	if(ev.keyCode == 116 && ev.type == "keydown" && ev.altKey) {
		jsdbg_ide_onclick({
			type:"click", 
			target: (document.getElementById((ev.target.id).replace(/_src$/, ""))||{querySelector:function(){}}).querySelector(".cmd_code_editor_set_breakpoint")});
	}

	// ALT+Q - Ace.js
	if(ev.keyCode == 81 && ev.type == "keydown" && ev.altKey) {
		jsdbg_ide_onclick({type: "click", target: {className: "cmd_code_editor_load_and_activate_ACE"}});
	}

	// ALT-L - Prototype to file map
	if(ev.keyCode == 76 && ev.type == "keydown" && ev.altKey) {
		var new_value = prompt('Prototype to file map: ', localStorage.getItem('jsdbg_ide_prototype_to_file_map')||'');
		if (new_value) {
			new_value = eval('('+new_value+')');
			localStorage.setItem('jsdbg_ide_prototype_to_file_map', JSON.stringify(new_value));
		}
	}
}

document.documentElement.addEventListener("keyup", jsdbg_ide_onkey);
document.documentElement.addEventListener("keypress", jsdbg_ide_onkey);
document.documentElement.addEventListener("keydown", jsdbg_ide_onkey);
document.documentElement.addEventListener("change", jsdbg_ide_onkey);

	
function jsdbg_ide_onmouse(event) {
	var ev = event || window.event || { type:'', target: document.body.parentNode };
    var trg1 = ev.target || ev.srcElement || document.body.parentNode;
	if (trg1.nodeType && trg1.nodeType == 9) trg1 = trg1.body.parentNode; // #DOCUMENT
    if (trg1.nodeType && trg1.nodeType == 3) trg1 = trg1.parentNode; // #TEXT
	var trg1p = (trg1.parentNode && trg1.parentNode.nodeType != 9) ? trg1.parentNode : {className:'', nodeName:'', getAttribute:function(){return ''}};

	// mouseout-window
	if( ev.type == "mouseout" && ev instanceof Event) {
		e = ev.originalEvent || ev; // if jQuery.Event
		active_node = (e.relatedTarget) ? e.relatedTarget : e.toElement;
		if(!active_node) {
// 				html_onmouse({type:'mouseout-window',target:(document.body||{}).parentNode||window});
			jsdbg_ide_onmouse({type:"mouseout-window", target: trg1});
			return;
		}
	}
	
	function find_near(class_name, if_not_found_return, start_node, prefix) {
		// определим префикс блока
		if(!prefix && (prefix = class_name.indexOf('!')+1) > 0) { 
			var prefix1 = class_name.substring(0, prefix-1);
			class_name = prefix1 + class_name.substring(prefix);
		} else
			var prefix1 = prefix || class_name.replace(/^([a-z]+-[^-]+).*$/, '$1');
			
		// найдём корневой node в блоке
		for(var root = start_node || trg1; root.nodeName != 'HTML' && root.parentNode.className.indexOf(prefix1) > -1; root = root.parentNode);
		
		if(root.className.indexOf(class_name) > -1) return root;
		
		var nodes = root.getElementsByTagName('*');
		for(var i=0; i<nodes.length; i++)
			if(nodes[i].className && nodes[i].className.indexOf(class_name) > -1) 
				return nodes[i];
			
		return if_not_found_return;
	}

	// show breakpoints background
	if((ev.type == "mouseover" || ev.type == "mouseout" || ev.type == "mouseout-window") && (trg1.className.indexOf("c-toolbar-btn cmd_code_editor_set_breakpoint") > -1 || trg1p.className.indexOf("c-toolbar-btn cmd_code_editor_set_breakpoint") > -1)) {
return;
		var win_id = find_near("c-toolbar", {getAttribute:function(){}}).getAttribute("data-win-id");
		var textarea = document.getElementById(win_id).querySelector(".c-code_editor-textarea");
		var file_name = textarea.getAttribute("data-file-name") || document.getElementById("jsdbg_file_list_selector").value;
		file_name = file_name == "(new...)" ? "(no file)" : file_name;
		var file_name_offset = parseInt(textarea.getAttribute("data-file_name-offset") || "0")
		
		// скроем подложку с breakpoints
		if(ev.type == "mouseout") {
			(textarea.previousElementSibling||{style:{}}).style.display = "none";
			return;
		}
		
		// если ничего не выделено, то покажем breakpoints
		/*if(file_name in littleLisp.breakpoints) {
			var points = [];
			for(var brk in littleLisp.breakpoints[file_name])
				points.push(brk);
			points.sort();
			
			var result = textarea.value;
			for(var i = points.length-1; i >= 0; i--) {
				var off = (points[i]*1 >> 16) - file_name_offset;
				var len = points[i]*1 & 65535;
				result = result.substring(0, off) + "<strike style=\"background:red\">" + result.substring(off, off+len) + "</strike>" + result.substring(off+len);
			}
			
			textarea.previousElementSibling.innerHTML = result;
		}*/
		
		textarea.previousElementSibling.style.display = "block";
		textarea.previousElementSibling.scrollTop = textarea.scrollTop;
	}
}

// jsdbg_ide_onmouse.cursor = {};
/*
document.documentElement.addEventListener("mousedown", jsdbg_ide_onmouse);
document.documentElement.addEventListener("mousemove", jsdbg_ide_onmouse);
document.documentElement.addEventListener("mouseup", jsdbg_ide_onmouse);
document.documentElement.addEventListener("mouseout", jsdbg_ide_onmouse);
document.documentElement.addEventListener("mouseover", jsdbg_ide_onmouse);
*/
// кнопка показа IDE
document.addEventListener('DOMContentLoaded', function(){
if (!document.getElementById("jsdbg_ide_main_window_show")) {
	var div = document.createElement("DIV");
	div.id = "jsdbg_ide_panel";
	div.setAttribute("style", "position:fixed; right: 2px; bottom: 2px; display: block; z-index: 999; text-align: right;");
	div.innerHTML = '<button id="jsdbg_ide_main_window_show" onclick="jsdbg_ide_onclick({type: \'show_hide_jsdbg_ide\'})">New Class Browser</button><button id="" onclick="jsdbg_ide_onclick({type:\'show_debugger_win\', target: this})" style="display:none">New Debgger</button>';
	
	try {
		document.querySelector("body").appendChild(div);
	}
	catch(ex) {
		try { 
			document.querySelector("html").appendChild(div);
		} catch(ex2) {
			alert(ex2);
			console.log(ex2);
		}
	}
}
});

function win_onmouse(event) {
	var ev = event || window.event || { type:'', target: document.body.parentNode };
    var trg1 = ev.target || ev.srcElement || document.body.parentNode;
	if (trg1.nodeType && trg1.nodeType == 9) trg1 = trg1.body.parentNode; // #DOCUMENT
    if (trg1.nodeType && trg1.nodeType == 3) trg1 = trg1.parentNode; // #TEXT
	var trg1p = (trg1.parentNode && trg1.parentNode.nodeType != 9) ? trg1.parentNode : {className:'', nodeName:'', getAttribute:function(){return ''}};

	// mouseout-window
	if( ev.type == "mouseout" && ev instanceof Event) {
		e = ev.originalEvent || ev; // if jQuery.Event
		active_node = (e.relatedTarget) ? e.relatedTarget : e.toElement;
		if(!active_node) {
// 				html_onmouse({type:'mouseout-window',target:(document.body||{}).parentNode||window});
			win_onmouse({type:"mouseout-window", target: trg1});
			return;
		}
	}
	
	function find_near(class_name, if_not_found_return, start_node, prefix) {
		// определим префикс блока
		if(!prefix && (prefix = class_name.indexOf('!')+1) > 0) { 
			var prefix1 = class_name.substring(0, prefix-1);
			class_name = prefix1 + class_name.substring(prefix);
		} else
			var prefix1 = prefix || class_name.replace(/^([a-z]+-[^-]+).*$/, '$1');
			
		// найдём корневой node в блоке
		for(var root = start_node || trg1; root.nodeName != 'HTML' && root.parentNode.className.indexOf(prefix1) > -1; root = root.parentNode);
		
		if(root.className.indexOf(class_name) > -1) return root;
		
		var nodes = root.getElementsByTagName('*');
		for(var i=0; i<nodes.length; i++)
			if(nodes[i].className && nodes[i].className.indexOf(class_name) > -1) 
				return nodes[i];
			
		return if_not_found_return;
	}

	if(ev.type == 'init_win_css') {
		var style_tag = document.getElementById("win-css");
		if(!style_tag) {
			style_tag = document.createElement("STYLE");
			style_tag.id = "win-css";
			style_tag.type = "text/css";
			style_tag.appendChild(
				document.createTextNode(win_onmouse.win_css_styles));
			document.querySelector("head").insertBefore(style_tag, document.querySelector("head > style"));
		}
	}
	
	// .win/.win-header [mousedown]
	if(ev.type == 'mousedown' && trg1.className.indexOf('win-header') > -1) {
		var ev_pageX = ev.pageX || (ev.clientX+document.documentElement.scrollLeft);
		var ev_pageY = ev.pageY || (ev.clientY+document.documentElement.scrollTop);

		// найдём правильный заголовок окна и само окно для перетаскивания
		for(var trg = trg1; trg.className.indexOf('win-header') > -1;)
			trg = trg.parentNode;
	
		// отменим всплытие, и запретим выделение
		if(ev.stopPropagation) ev.stopPropagation();
		else ev.cancelBubble = true;
		document.ondragstart = function(){ return false; }
		document.body.onselectstart = function() { return false } // IE8
		ev.preventDefault(); // new browsers
		
		// стартовые кординаты мыши
		win_onmouse.startPoint = [ev_pageX, ev_pageY, ev.clientX, ev.clientY];
		
		var trg_offset = trg.getBoundingClientRect();
		var trg_style = trg.currentStyle || window.getComputedStyle(trg, null);
		var start_params = [
			trg.offsetHeight, trg.offsetWidth,
			parseInt(trg_style.left == 'auto' ? '0' : trg_style.left),
			parseInt(trg_style.top == 'auto' ? '0' : trg_style.top),
			trg_offset.left, trg_offset.top,
			Math.round(trg_offset.left) + (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0),
			Math.round(trg_offset.top) + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0),
		];
		win_onmouse.startParams = start_params;
		trg.style.position = trg_style.position;
		
		win_onmouse.win = trg;
		return false; // подавим активацию выделения
	}
	
	// .win [mousemove]
	if(ev.type == 'mousemove' && win_onmouse.win) {
		var trg = win_onmouse.win;
		var base_point = win_onmouse.startPoint;
		var start_params = win_onmouse.startParams;
		switch(trg.style.position) {
			case 'fixed':
				trg.style.left = start_params[4]+ev.clientX-base_point[2]+'px';
				trg.style.top = start_params[5]+ev.clientY-base_point[3]+'px';
				break;
			default:
			case 'static':
				trg.style.position = 'relative';
			case 'relative':
			case 'absolute':
				var ev_pageX = ev.pageX || (ev.clientX+document.documentElement.scrollLeft);
				var ev_pageY = ev.pageY || (ev.clientY+document.documentElement.scrollTop);
				trg.style.left = start_params[2]+ev_pageX-base_point[0]+'px';
				trg.style.top = start_params[3]+ev_pageY-base_point[1]+'px';
				break;
		}
		
		if(ev.stopPropagation) ev.stopPropagation();
		else ev.cancelBubble = true;
	}

	// .win [mouseup]
	if(ev.type == 'mouseup' && win_onmouse.win) {
		var win = win_onmouse.win; 

		// "поднимем" окно среди окон
		var zindex = 99;
		var wins = document.querySelectorAll('.win');
		for(var i=0; i<wins.length; i++)
			zindex = Math.max(parseInt(wins[i].style.zIndex || '1'), zindex);
		win.style.zIndex = zindex+1;
		
		// сохраним параметры окна, если указано где
		if(win.dataset.winSettingsLocalStorage) {
			var key = win.dataset.winSettingsLocalStorage;
			var win_settings = JSON.parse(localStorage[key]||'{}') || {};
			win_settings.height = parseInt(win.style.height);
			win_settings.width = parseInt(win.style.width);
			win_settings.top = parseInt(win.top);
			win_settings.left = parseInt(win.left);
			localStorage[key] = JSON.stringify(win_settings);
		}
		
		delete win_onmouse.win;
		delete win_onmouse.startPoint;
		delete win_onmouse.startParams;
		
		document.ondragstart = null;
		document.body.onselectstart = null; // IE8
	}
	
	// .win-resizer [mousedown]
	if(ev.type == 'mousedown' && trg1.className.indexOf('win-resizer') > -1) {
		
		// стартовые кординаты мыши
		trg1.mousedownPoint = [(ev.pageX || (ev.clientX+document.documentElement.scrollLeft)), (ev.pageY || (ev.clientY+document.documentElement.scrollTop))];
		delete trg1.startSize;
		
		win_onmouse.win_resizer = trg1;
		
		// запретим выделение
		document.body.onselectstart = function() { return false } // old IE
		document.ondragstart = function(){ return false; } // old browsers
		ev.preventDefault();
	}
	
	// .win-resizer [mousemove]
	if(ev.type == 'mousemove' && win_onmouse.win_resizer) {
		var trg = win_onmouse.win_resizer || trg1;
		var parent_div = trg.parentNode;
		var ev_pageX = ev.pageX || (ev.clientX+document.documentElement.scrollLeft);
		var ev_pageY = ev.pageY || (ev.clientY+document.documentElement.scrollTop);
		
		var start_point = trg.mousedownPoint;
		if(!start_point) trg.mousedownPoint = (start_point = [ev_pageX||0, ev_pageY||0]);
			
		var start_size = trg.startSize;
		if(!start_size) trg.startSize = (start_size = [trg.parentNode.offsetWidth, trg.parentNode.offsetHeight]);
		
		// новая ширина, но не менее минимальной у окна если задана
		var new_width = parseInt((trg.parentNode.currentStyle || window.getComputedStyle(trg.parentNode, null)).minWidth||'0');

		new_width = Math.max(new_width, parseInt(start_size[0]) + (ev_pageX||0) - parseInt(start_point[0]));
		
		var new_height = Math.max(0, parseInt(start_size[1]) + (ev_pageY||0) - parseInt(start_point[1]));
		
		parent_div.style.width = new_width + 'px';
		parent_div.style.height = new_height + 'px';
	}
	
	// [winresize] ?
	if(ev.type == 'winresize' /*&& trg1.className.indexOf('win-resizer') > -1*/) {
		var parent_div = trg1;
		var new_width = ev.width || ev.new_width || parseInt(parent_div.style.width || (parent_div.offsetWidth+''));
		var new_height = ev.height || ev.new_height || parseInt(parent_div.style.height || (parent_div.offsetHeight+''));

		parent_div.style.width = new_width + 'px';
		parent_div.style.height = new_height + 'px';
		
		parent_div.dispatchEvent(new Event('resize'));
	}
	
	// .win-resizer [mouseup]
	if((ev.type == 'mouseup' || ev.type == 'mouseout-window') && win_onmouse.win_resizer) 
	{
		var win = trg1.parentNode;
		
		// сохраним параметры окна, если указано где
		if(win.dataset.winSettingsLocalStorage) {
			var key = win.dataset.winSettingsLocalStorage;
			var win_settings = JSON.parse(localStorage[key]||'{}') || {};
			win_settings.height = parseInt(win.style.height);
			win_settings.width = parseInt(win.style.width);
			localStorage[key] = JSON.stringify(win_settings);
		}
		
		delete win_onmouse.win_resizer.startSize;
		delete win_onmouse.win_resizer.mousedownPoint;
		delete win_onmouse.win_resizer;
		
		win.dispatchEvent(new Event('resize'));
	}
	
	// .win-minimize-btn, .win-minimize-button
	if(ev.type == 'mouseup' && (trg1.className.indexOf('win-minimize-btn') > -1 || trg1.className.indexOf('win-minimize-button') > -1)) {
		var trg = trg1.parentNode;
		while(trg.parentNode.className.indexOf('win') > -1) trg = trg.parentNode;
		trg.className += " win-is-hidden";
	}
	
	// [winshow]
	if(ev.type == 'winshow') {
		if(!document.querySelector('style#win-css'))
			win_onmouse({type: 'init_win_css'});
		
		// восстановим положение и размеры окна
		if(trg1.dataset.winSettingsLocalStorage) {
			var key = trg1.dataset.winSettingsLocalStorage;
			var win_settings = JSON.parse(localStorage[key]||'{}') || {};
console.log(JSON.stringify(win_settings));
			trg1.height = win_settings.height;
			trg1.width = win_settings.width;
			trg1.top = win_settings.top;
			trg1.left = win_settings.left;
			if(ev['position']) delete ev['position'];
		}
		
		// уберём класс скрытия
		if(trg1.className.indexOf('win-is-hidden') > -1)
			trg1.className = trg1.className.replace(/win-is-hidden( |$)/,'');
		
		// выровняем по центру если попросили
		if(!ev['position'] || ev.position == 'center' || ev.position == 'center center') {
			trg1.style.left = (window.innerWidth - trg1.offsetWidth) / 2 + 'px';
			trg1.style.top = (window.innerHeight - trg1.offsetHeight) / 2 + 'px';
		}
		
		// покажем тёмный фон если попросили
		if(ev['with_background']) {
			var cover = document.getElementById('win_backcover') || document.createElement('DIV');
			cover.style.cssText = 'height: 100%;left:0;position:fixed;top:0;width:100%;z-index:1; background:'+(typeof ev['with_background'] == 'boolean' ? 'rgba(0, 0, 0, 0.7)' : ev['with_background']);
			
			if( ! cover.id) {
				cover.id = 'win_backcover';
				document.body.appendChild(cover);
			}
		}
		
		// z-index
		var max_zIndex = 1;
		var wins = document.querySelectorAll('.win');
		for(var i=0; i<wins.length; i++)
			if(parseInt(wins[i].style.zIndex) > max_zIndex)
				max_zIndex = parseInt(wins[i].style.zIndex);
		trg1.style.zIndex = max_zIndex+1;
	}
	
	// .win-close-btn, .win-close-button
	if(ev.type == 'mouseup' && (trg1.className.indexOf('win-close-btn') > -1 || trg1.className.indexOf('win-close-button') > -1)) {
		var trg = trg1;
		while(trg.parentNode.className.indexOf('win') > -1) 
			trg = trg.parentNode;
		
		return win_onmouse({type:'winclose', target: trg});
	}
	
	// [winclose]	
	if(ev.type == "winclose") 
	{
		var win = trg1;
		
		// удалим связанную кнопку с этим окном
		/*if (win.button && win.button.parentNode)
			win.button.parentNode.removeChild(win.button);*/
		
		win.dispatchEvent(new Event('close'));
		
		// удалим окно
		win.parentNode.removeChild(win);
	}
	
	// .win-splitter [mousedown]
	if(ev.type == 'mousedown' && trg1.className.indexOf('win-splitter') > -1) {
		
		// стартовые кординаты мыши
		trg1.mousedownPoint = [(ev.pageX || (ev.clientX+document.documentElement.scrollLeft)), (ev.pageY || (ev.clientY+document.documentElement.scrollTop))];
		
		// стартовое положение
// 		trg1.startLeftTop = [parseInt(trg1.style.left), parseInt(trg1.style.top)];
		
		// стартовые размеры
		trg1.prevSize = [trg1.previousElementSibling.offsetWidth, trg1.previousElementSibling.offsetHeight];
		trg1.nextSize = [trg1.nextElementSibling.offsetWidth, trg1.nextElementSibling.offsetHeight];
		
		// найдём родительское окно
		for(trg1.win = trg1.parentNode; 
			!trg1.win.className.match(/win( |$)/); 
			trg1.win = trg1.win.parentNode)
			if(trg1.win.parentNode.nodeType != 1) break;

		// сгенерируем уникальный id если нет
		trg1.id ? trg1.id : (trg1.id = trg1.win.id+'_splitter'+(new Date())*1);
			
		// запомним, кого мы перетаскиваем
		win_onmouse.dragging_splitter = trg1;
			
		// запретим выделение
		document.body.onselectstart = function() { return false }
		document.ondragstart = function(){ return false; }
		
		// подавляем начало выделения мышью
		if(ev.preventDefault) ev.preventDefault();
		else ev.returnValue = false;
	}

	// .win-splitter [mousemove]
	if(ev.type == 'mousemove' && win_onmouse['dragging_splitter']) 
	{
		var ev_pageX = ev.pageX || (ev.clientX+document.documentElement.scrollLeft);
		var ev_pageY = ev.pageY || (ev.clientY+document.documentElement.scrollTop);
	
		var trg = win_onmouse['dragging_splitter'];
		var mousedown_point = trg.mousedownPoint || [ev_pageX||0, ev_pageY||0];
		
		var prev = trg.previousElementSibling;
		var next = trg.nextElementSibling;
		var is_updown = trg.className.indexOf('type_horizontal') > -1;
		
		var next_style = undefined;
		if (!next.start_flex) {
			if(next.style.webkitBoxFlex || next.style.flexGrow) 
				next.start_flex = next.style.webkitBoxFlex || next.style.flexGrow;
			else {
				var next_style = next.currentStyle || window.getComputedStyle(next, null);
				next.start_flex = next_style.webkitBoxFlex || next_style.flexGrow;
			}
console.log("next.start_flex="+next.start_flex);
		}
		if (is_updown && !next.start_size) {
			if(next.style.height !== '')
				next.start_size = parseInt(next.style.height);
			else {
				var next_style = next_style || next.currentStyle || window.getComputedStyle(next, null);
				next.start_size = parseInt(next_style.height);
			}
console.log("next.start_size="+next.start_size);
		}
		else if(!is_updown && !next.start_size) {
			if(next.style.width !== '')
				next.start_size = parseInt(next.style.width);
			else {
				next_style = next.currentStyle || window.getComputedStyle(next, null);
				next.start_size = parseInt(next_style.width);
			}
console.log("next.start_size="+next.start_size);
		}
		var prev_style = undefined;
		if (!prev.start_flex) {
			if(prev.style.flex || prev.style.webkitBoxFlex) 
				prev.start_flex = prev.style.flexGrow || prev.style.webkitBoxFlex;
			else {
				var prev_style = prev_style || prev.currentStyle || window.getComputedStyle(prev, null);
				prev.start_flex = prev_style.flexGrow || prev_style.webkitBoxFlex;
			}
console.log("prev.start_flex="+prev.start_flex);
		}
		if (is_updown && !prev.start_size) {
			if(prev.style.height !== '')
				prev.start_size = parseInt(prev.style.height);
			else {
				var prev_style = prev_style || prev.currentStyle || window.getComputedStyle(prev, null);
				prev.start_size = parseInt(prev_style.height);
			}
console.log("prev.start_size="+prev.start_size);
		}
		else if (!is_updown && !prev.start_size) {
			if(prev.style.width !== '')
				prev.start_size = parseInt(prev.style.width);
			else {
				var prev_style = prev_style || prev.currentStyle || window.getComputedStyle(prev, null);
				prev.start_size = parseInt(prev_style.width);
			}
console.log("prev.start_size="+prev.start_size);
		}
		
		// вверх/вниз
		if(is_updown) 
		{
			// вычесляем отклонение
			var delta_y = ev_pageY - mousedown_point[1];
			if (delta_y > 0) {  // вниз
				var next_k = Math.abs(trg.nextSize[1]-delta_y) / trg.nextSize[1];
				var prev_k = Math.abs(trg.prevSize[1]+delta_y) / trg.prevSize[1];
			}
			else {
				var next_k = Math.abs(trg.nextSize[1]-delta_y) / trg.nextSize[1];
				var prev_k = Math.abs(trg.prevSize[1]+delta_y) / trg.prevSize[1];
			}
// console.log(next_k, prev_k);
// next.innerHTML = next_k; prev.innerHTML = prev_k; prev.parentNode.firstElementChild.innerHTML = delta_y;

			if (next.start_flex) {
				next.style.flex = next.start_flex * next_k;
				next.style.webkitBoxFlex = next.start_flex * next_k;
			}
			else {
				next.style.height = next.start_size * next_k + 'px';
			}
			if (prev.start_flex) {
				prev.style.flex = prev.start_flex * prev_k;
				prev.style.webkitBoxFlex = prev.start_flex * prev_k;
			}
			else {
				prev.style.height = prev.start_size * prev_k + 'px';
			}
		}
		// влево/вправо
		else {
			// вычесляем отклонение
			var delta_x = ev_pageX - mousedown_point[0];
			if (delta_x > 0) {  // вправо
				var next_k = Math.abs(trg.nextSize[0]-delta_x) / trg.nextSize[0];
				var prev_k = Math.abs(trg.prevSize[0]+delta_x) / trg.prevSize[0];
			}
			else {
				var next_k = Math.abs(trg.nextSize[0]-delta_x) / trg.nextSize[0];
				var prev_k = Math.abs(trg.prevSize[0]+delta_x) / trg.prevSize[0];
			}
// next.innerHTML = next_k; prev.innerHTML = prev_k; prev.parentNode.parentNode.firstElementChild.innerHTML = delta_x;
			if (next.start_flex) {
				next.style.flex = next.start_flex * next_k;
				next.style.webkitBoxFlex = next.start_flex * next_k;
			}
			else {
				next.style.width = next.start_size * next_k + 'px';
			}
			if (prev.start_flex) {
				prev.style.flex = prev.start_flex * prev_k;
				prev.style.webkitBoxFlex = prev.start_flex * prev_k;
			}
			else {
				prev.style.width = prev.start_size * prev_k + 'px';
			}
		}
		
	}
	
	// .win-splitter [mouseup][mouseout]
	if((ev.type == 'mouseup' || ev.type == 'mouseout-window') && win_onmouse['dragging_splitter']) {
		delete win_onmouse.dragging_splitter.nextElementSibling.start_size;
		delete win_onmouse.dragging_splitter.nextElementSibling.start_flex;
		delete win_onmouse.dragging_splitter.previousElementSibling.start_size;
		delete win_onmouse.dragging_splitter.previousElementSibling.start_flex;
		delete win_onmouse.dragging_splitter;
	}
	
}

document.documentElement.addEventListener("mousedown", win_onmouse);
document.documentElement.addEventListener("mousemove", win_onmouse);
document.documentElement.addEventListener("mouseup", win_onmouse);
document.documentElement.addEventListener("mouseout", win_onmouse);
// document.documentElement.addEventListener("mouseover", win_onmouse);

jsdbg_ide_onclick.css_styles = 
".cmd_code_editor_debugger > i {  background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCI+CiAgICA8cGF0aCBkPSJNIDguOTA2MjUgMiBMIDcuNzE4NzUgMy41OTM3NSBMIDkuMjUgNC43NSBDIDkuMDgzOTE2NyA1LjEyNzc5NjkgOSA1LjU0OTE0NjkgOSA2IEwgMTUgNiBDIDE1IDUuNTY0OTExIDE0LjkzNjQ2OSA1LjE0ODg0OSAxNC43ODEyNSA0Ljc4MTI1IEwgMTYuMzQzNzUgMy42MjUgTCAxNS4xNTYyNSAyIEwgMTMuMzc1IDMuMzQzNzUgQyAxMi45NjIzMTYgMy4xMzU0MTU5IDEyLjUwODIzNCAzIDEyIDMgQyAxMS41MDc1MyAzIDExLjA1OTcwNSAzLjExNjE4OSAxMC42NTYyNSAzLjMxMjUgTCA4LjkwNjI1IDIgeiBNIDggNyBDIDcuNDQ1NTkzOSA3IDYuOTU2OTI3NyA3LjY3ODM5MjkgNi41OTM3NSA4Ljc4MTI1IEwgNC4xNTYyNSA3LjM3NSBMIDMuMTU2MjUgOS4wOTM3NSBMIDYuMTI1IDEwLjgxMjUgQyA2LjAzNjUxODUgMTEuNDg4NDE2IDYgMTIuMjMyODUxIDYgMTMgTCAzIDEzIEwgMyAxNSBMIDYuMTI1IDE1IEMgNi4yNDIyMDE3IDE1Ljc5NzI3OSA2LjQzOTA0NTcgMTYuNDgxMzQ0IDYuNjg3NSAxNy4wNjI1IEwgNC4wOTM3NSAxOS4wMzEyNSBMIDUuMzEyNSAyMC42MjUgTCA3Ljc4MTI1IDE4Ljc1IEMgOC42NzI0NzAzIDE5LjY3OTAzOSA5LjgyMjE1NTIgMjAuMTg2MDM0IDExIDIwLjU5Mzc1IEwgMTEgMTMgTCAxMyAxMyBMIDEzIDIwLjY4NzUgQyAxNC40NDM3NSAyMC4yNSAxNS41ODMzNzQgMTkuNzc2ODA3IDE2LjQwNjI1IDE4LjkwNjI1IEwgMTguNzE4NzUgMjAuNjU2MjUgTCAxOS45Mzc1IDE5LjA5Mzc1IEwgMTcuNDM3NSAxNy4xNTYyNSBDIDE3LjY1NjQ0MiAxNi41NTI0ODMgMTcuNzgzOTc3IDE1Ljg0ODM5IDE3Ljg3NSAxNSBMIDIxIDE1IEwgMjEgMTMgTCAxOCAxMyBDIDE4IDEyLjIwODk1NiAxNy45Mzc1MzggMTEuNDQzMTY2IDE3Ljg0Mzc1IDEwLjc1IEwgMjAuNzUgOS4wNjI1IEwgMTkuNzUgNy4zMTI1IEwgMTcuMzc1IDguNjg3NSBDIDE3LjAxNDY1NiA3LjY0MjgyMDggMTYuNTM3NjAyIDcgMTYgNyBMIDggNyB6Ii8+Cjwvc3ZnPgo=') !important; margin-right: 1px; background-size: 20px 20px; }\n"+

".ico-add-brk { margin-right: 1px; background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjIwIiB3aWR0aD0iMjAiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDIwIDIwIj4KPHBhdGggZD0ibTEuMTIzMSA5LjM5NzZoMTEuMzIxbDIuNjgwNiAzLjAyNS0yLjY4MDYgMi45MzUxaC0xMS4zMjF6Ii8+CjxwYXRoIGQ9Im0xNC4xMTcgNi4zODU1aDIuMDEwNnYtMS45OTMyaC45ODc5NHYxLjk5MzJoMi4wMDE5di45OTY2MWgtMi4wMDE5djIuMDE5MmgtLjk4Nzk0di0yLjAxOTJoLTIuMDEwNnoiLz4KPC9zdmc+Cg==') !important; }\n"+

".ico-eye { background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDIwIDIwIj48cGF0aCBkPSJtMTAgNC41NDU1Yy0zLjYzNjQgMC02Ljc0MTggMi4yNjE4LTggNS40NTQ1IDEuMjU4MiAzLjE5MjcgNC4zNjM2IDUuNDU0NSA4IDUuNDU0NXM2Ljc0MTgtMi4yNjE4IDgtNS40NTQ1Yy0xLjI1ODItMy4xOTI3LTQuMzYzNi01LjQ1NDUtOC01LjQ1NDV6bTAgOS4wOTA5Yy0yLjAwNzMgMC0zLjYzNjQtMS42MjkxLTMuNjM2NC0zLjYzNjRzMS42MjkxLTMuNjM2NCAzLjYzNjQtMy42MzY0IDMuNjM2NCAxLjYyOTEgMy42MzY0IDMuNjM2NC0xLjYyOTEgMy42MzY0LTMuNjM2NCAzLjYzNjR6bTAtNS44MTgyYy0xLjIwNzMgMC0yLjE4MTguOTc0NTUtMi4xODE4IDIuMTgxOCAwIDEuMjA3My45NzQ1NSAyLjE4MTggMi4xODE4IDIuMTgxOCAxLjIwNzMgMCAyLjE4MTgtLjk3NDU1IDIuMTgxOC0yLjE4MTggMC0xLjIwNzMtLjk3NDU1LTIuMTgxOC0yLjE4MTgtMi4xODE4eiIvPjwvc3ZnPgo=') !important; margin: 0 2px 0 -4px; }\n"+

".cmd_code_editor_start_debug > i { background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjE4IiB3aWR0aD0iMTgiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDI0IDI0Ij4KPHBhdGggZD0ibTYuNjc5NyAxLjA3NjJsLS44OTA2IDEuMTk1MyAxLjE0ODQuODY3MmMtLjEyNDYuMjgzMy0uMTg3NS41OTkzLS4xODc1LjkzNzVoNC41YzAtLjMyNjMtLjA0OC0uNjM4NC0uMTY0LS45MTQxbDEuMTcyLS44NjcyLS44OTEtMS4yMTg3LTEuMzM2IDEuMDA3OGMtLjMwOTMtLjE1NjMtLjY0OTgtLjI1NzgtMS4wMzEtLjI1NzgtLjM2OTQgMC0uNzA1Mi4wODcxLTEuMDA3OC4yMzQzbC0xLjMxMjUtLjk4NDN6bS0uNjc5NyAzLjc1Yy0uNDE1OCAwLS43ODIzLjUwODgtMS4wNTQ3IDEuMzM1OWwtMS44MjgxLTEuMDU0Ny0wLjc1IDEuMjg5MSAyLjIyNjYgMS4yODljLS4wNjY0LjUwNzAtLjA5MzggMS4wNjUzLS4wOTM4IDEuNjQwN2gtMi4yNXYxLjQ5OThoMi4zNDM4Yy4wODc5LjU5OC4yMzU1IDEuMTExLjQyMTggMS41NDdsLTEuOTQ1MyAxLjQ3Ny45MTQxIDEuMTk1IDEuODUxNS0xLjQwNmMuNjY4NS42OTYgMS41MzA3IDEuMDc3IDIuNDE0MSAxLjM4MnYtNi4wNjJoMS41di4wMDk4bDMuOTE2IDEuODU3MmgyLjA4NHYtMS40OTk4aC0yLjI1YzAtLjU5MzMtLjA0Ny0xLjE2NzctLjExNy0xLjY4NzVsMi4xNzktMS4yNjU3LS43NTAtMS4zMTI1LTEuNzgxIDEuMDMxM2MtLjI3MC0uNzgzNS0uNjI4LTEuMjY1Ni0xLjAzMS0xLjI2NTZoLTZ6IiB0cmFuc2Zvcm09InNjYWxlKDEuMzMzMykiLz4KPHBhdGggZD0ibTIxLjc4NiAxOC40NS05LjMzMzMtNS4zMzMzdjEwLjY2NyIvPgo8L3N2Zz4K') !important; }\n"+

".cmd_code_editor_show_class_browser > i { margin: 0 2px 0 -4px; background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggZD0ibSAyLjAxODUsMTYgMTUuOTYzLDAgMCwtNi4wOTIzNTQxIC0xNS45NjMsMCB6IG0gMCwtNy42MDkwOTU5IDcuMTk4MjgxNSwwIEwgOS4yMTY3ODE1LDQgMi4wMTg1LDQgWiBNIDEwLjgyNjIxOSw0IGwgMCw0LjM5MDkwNDEgNy4xNTUyODEsMCBMIDE3Ljk4MTUsNCBaIi8+PC9zdmc+Cg==') !important; }\n"+

".ico-discard { background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wsdFwII35vlTAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAmUlEQVQY023PsQ2CQBQG4I8LvYPYkLgArRXBCbR0Kp0AYkXLCDQkdG5g4gJg4RkJub+6vPte8r8Mjqf6hgJl17TvONuhx9A17SWL6OybAWV893EZ7jkO/ikisEJwCKgxbvAajagDnqg2eI0qPEPXtDNeWBJwwatr2jlbXVdIZ0AZEmhMdO4DpkSnbecpxxUB+1/x+FnhEReuH/OUL1Zkgg+nAAAAAElFTkSuQmC') !important; }"+

".ico-save { background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAYAAABy6+R8AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAB3RJTUUH4AcFCy4mijH+MAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAvklEQVQoz2OcM2eOZ19v77YfP34w8PDwMDAzMzOgg1+/fjFISEgwbNy0iY+bm5uBQU5W9r+IsPB/EWHh/+fPn/+PDcyfP/+/iLDw//i4uP///v1jY/r27RsDLuDi7Mzg4uwM52/dupWhv69vKhMDiWDbtm0pJGtiYGBgQNF0/do1FMk9e/cy7N6zh+HG9eso4owiwsL/SbFFX1+fgXLnDUJNHBwcJGng4ORkYCqvqAhiZ2cnSoOAgABDdnZ2KgCnNkvad65KiwAAAABJRU5ErkJggg==') !important; }"+

".ico-play { background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyLjgybW0iIGhlaWdodD0iMi44Mm1tIiB2aWV3Qm94PSIwIDAgMTAgMTAiPjxwYXRoIGQ9Im0gMTAsNSAtMTAsLTUgMCwxMCIvPjwvc3ZnPgo=') !important; }"+

".ico-plus { background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDIwIDIwIj48cGF0aCBkPSJtMTAuNzY3IDVoLTEuNTM0djQuMjMzaC00LjIzM3YxLjUzNGg0LjIzM3Y0LjIzM2gxLjUzNHYtNC4yMzNoNC4yMzN2LTEuNTM0aC00LjIzM3YtNC4yMzN6Ii8+PC9zdmc+Cg==') !important; }"+

".cmd_code_editor_restart > i { margin: 0 -4px; background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDIwIDIwIj48cGF0aCBkPSJtMTAgMy40MTQydjJjLTIuNzYgMC01IDIuMjQtNSA1czIuMjQgNSA1IDUgNS0yLjI0IDUtNWgtMS44NGMtLjA0IDEuNzItMS40MyAzLjA5LTMuMTYgMy4wOS0xLjc1IDAtMy4xNi0xLjQtMy4xNi0zLjE1czEuNDEtMy4xNiAzLjE2LTMuMTZ2Mi4yMmw0LjUtMy00LjUtM3oiLz48L3N2Zz4K') !important; }\n"+

".ico-step_over { margin: 0 -4px; background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1LjAxNDA4OTZtbSIgaGVpZ2h0PSIyLjcyNDk5MDFtbSIgdmlld0JveD0iMCAwIDE3Ljc2NjQ1OSA5LjY1NTQ3NjgiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEuMTg3NTc3NWUtOCwtMTA0Mi43MDY3KSI+PHBhdGggZD0ibSA1Ljk0NjQ1OTQsMTA0OS44NjIyIGMgMCwxLjEgMC45LDIgMiwyIDEuMSwwIDIsLTAuOSAyLC0yIDAsLTEuMSAtMC45LC0yIC0yLC0yIC0xLjEsMCAtMiwwLjkgLTIsMiIgaWQ9InBhdGgzNjEzIi8+PHBhdGggZD0ibSAxLjE5NjQ1OTQsMTA1MC4zOTIyIGMgMi41NSwtOC40MyAxMS4zOTk5OTk2LC04LjczIDEzLjkzOTk5OTYsMCIgc3R5bGU9ImZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6Mi41Ii8+PHBhdGggZD0ibSAxNS42MjY0NTksMTA1Mi4zNjIyIC00LjU0LC0yLjc2IDYuNjgsLTIuMSIvPjwvZz48L3N2Zz4K') !important; }"+

".ico-step_out { margin: 0 -4px; background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyLjU0bW0iIGhlaWdodD0iMy42NjhtbSIgdmlld0JveD0iMCAwIDguOTkgMTMiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEuMTg3NTc3M2UtOCwtMTAzOS4zNjIyKSI+PHBhdGggZD0ibSAyLjUsMTA1MC4zNjIyIGMgMCwxLjEgMC45LDIgMiwyIDEuMSwwIDIsLTAuOSAyLC0yIDAsLTEuMSAtMC45LC0yIC0yLC0yIC0xLjEsMCAtMiwwLjkgLTIsMiIvPjxwYXRoIGQ9Im0gNC41LDEwMzkuMzYyMiAtNC41MCw0IEwgMywxMDQzLjM2MjIgbCAwLDQgMywwIDAsLTQgMywwIC00LjUsLTQgeiIvPjwvZz48L3N2Zz4K') !important; }"+

".ico-step_in { margin: 0 -4px; background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyLjU0bW0iIGhlaWdodD0iMy42NjhtbSIgdmlld0JveD0iMCAwIDguOTkgMTMiPjxwYXRoIGQ9Ik0gMi40OSwxMC45OSBDIDIuNDksMTIuMDkgMy4zOSwxMyA0LjQ5LDEzIGMgMS4xLDAgMiwtMC45IDIsLTIuMDAwNDg1IDAsLTEuMTAgLTAuOTAsLTIgLTIsLTIgLTEuMSwwIC0yLDAuOSAtMiwyIi8+PHBhdGggZD0ibSAyLjk5LDAgMCw0IC0zLDAgNC41LDQgNC41LC00IC0zLDAgMCwtNCAtMywwIHoiLz48L3N2Zz4K') !important; }"+

".ico-replay { background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAyMCAyMCI+CjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIuMTY5NSAxLjgzMDUpIj4KPHBhdGggZD0ibTIuNTg1OCAxMy44OTFjLTEuNTg5OC0xLjQ2Mi0yLjU4NTgtMy41Ni0yLjU4NTgtNS44OTEgMC00LjQyIDMuNTgtOCA4LThzOCAzLjU4IDggOC0zLjU4IDgtOCA4di0xLjZjMy41MjggMCA2LjQtMi44NzIgNi40LTYuNHMtMi44NzItNi40LTYuNC02LjQtNi40IDIuODcyLTYuNCA2LjRjMCAxLjkzNTcuODY0NjEgMy42NzQgMi4yMjc4IDQuODQ4N2wxLjY5MjUtMS40Mi4wMTUxIDQuNDYzLTQuMzkyNS0uNzkwIDEuNDQyOS0xLjIxMXptMy45MjA5LTIuNDYyIDQuNTcxMy0zLjQyOS00LjU3MTMtMy40Mjg2djYuODU3MXoiLz48L2c+Cjwvc3ZnPgo=') !important; }"+

".ico-run-to-caret { background-image: url('data:image/svg+xml;utf8,<svg width=\"12.44\" height=\"10.26\" viewBox=\"0 0 3.29 2.71\" xmlns=\"http://www.w3.org/2000/svg\"><path style=\"fill:black;\" d=\"M 0,2.60 V 0.128 L 2.53,1.36 Z\"/><path style=\"stroke:black;stroke-width:0.4;\" d=\"M 2.82,0.07 V 2.702\"/><path style=\"stroke:black;stroke-width:0.317;\" d=\"M 2.345,0.16 H 3.3\"/><path style=\"stroke:black;stroke-width:0.317;\" d=\"M 2.345,2.557 H 3.3\"/></svg>') !important; margin: 0 -3px 0 -4px; }\n"+

".ico-jump-to-caret { background-image: url('data:image/svg+xml;utf8,<svg width=\"15.21\" height=\"10.56\" viewBox=\"0 0 4.025 2.8\" xmlns=\"http://www.w3.org/2000/svg\"><path style=\"stroke:black;stroke-width:0.423;\" d=\"M 2.00,0.109 V 2.741\"/><path style=\"stroke:black;stroke-width:0.4;\" d=\"M 1.524,0.2 H 2.47\"/><path style=\"stroke:black;stroke-width:0.4;\" d=\"M 1.52,2.6 H 2.47\"/><path style=\"fill:#808080;\" d=\"m 0.03742967,1.2267489 v 0.346225 H 0.888822 L 0.8895229,2.1704206 1.7794005,1.3979365 0.886667,0.62331218 0.89083431,1.2267489 Z\"/><path style=\"fill:#808080;\" d=\"m 3.9691466,1.2243034 v 0.346221 H 3.1196631 V 2.1543092 L 2.2282296,1.3990421 3.1196631,0.68830075 V 1.2243034 Z\"/></svg>') !important; margin: 0 -4px; }\n"+

".ico-cog { background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDIwIDIwIj48cGF0aCBkPSJtMTAuMTA0IDEyLjE3MmMtMS4xOCAwLTIuMTMtLjk2LTIuMTMtMi4xMyAwLTEuMTguOTYtMi4xMyAyLjEzLTIuMTMgMS4xOCAwIDIuMTMuOTYgMi4xMyAyLjEzIDAgMS4xOC0uOTYgMi4xMy0yLjEzIDIuMTNtOC0zLjczLTIuOTMtLjUzIDEuNzItMi4zOS0yLjI2LTIuMjYtMi40NiAxLjc5LS40Ny0zaC0zLjJsLS40IDMuMTMtMi41My0xLjkyLTIuMjYgMi4yNiAxLjk5IDIuNTktMy4yLjMzdjMuMmwzLjMzLjMzLTIuMTIgMi41OSAyLjI2IDIuMjYgMi41My0yLjEyLjQgMy4zM2gzLjJsLjQtMy4yIDIuNTMgMS45OSAyLjI2LTIuMjYtMS43OS0yLjQ1IDMtLjQ3di0zLjJ6Ii8+PC9zdmc+Cg==') !important; }"+
		
".c-toolbar { background: white; border: 1px solid #ddd; box-sizing: border-box; white-space: nowrap; overflow-y: hidden; }"+
".c-toolbar-btn { display: inline-block; vertical-align: top; height: 22px; margin: 1px; border: none; background: transparent; line-height: 20px; }"+
".c-toolbar-btn:hover { background: silver; cursor: pointer; }"+
".c-toolbar-btn > i, .ico-apply { background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAALCAYAAACksgdhAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wsdFwECFGNfkQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAqklEQVQoz5XRPU4CYRAG4OcDeiylpLAgFHgEWmkUTmBjjUcgnICT7EK1lHsEGiKFicZ4gb0A2owF8pPlbed9kslMUiMPk3EbC7wWWV6lmqDEPTYYNq8AcItOugLAFqNWFAaY4bnI8uoCeMR3ClDiJnZ+wvIM+CiyfN/CPIAofv7b9ABAA9MYnMoR+ENfMdjWAZDiEA10sUL/EoAmvL/tfu56vQrr+MXLOQC/RH9Eb3kwTjIAAAAASUVORK5CYII='); background-position: 50% 50%; background-repeat: no-repeat; display: inline-block; width: 20px; height: 20px; vertical-align: bottom; }"+
".c-toolbar-select, .c-toolbar-input { display: inline-block; vertical-align: top; height: 22px; margin: 1px; background: transparent; line-height: 20px; }"+
".c-toolbar-divider { width: 1px; margin: 1px 1px; overflow: hidden; background-color: #e5e5e5; height: 20px; display: inline-block; vertical-align: middle; }\n"+

"#jsdbg_ide_main_window_show_hide { position:absolute; right: 0; top: 0; width: 30px; height: 25px;  border: none; border-left: 1px solid #e5e5e5; /* background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgdmVyc2lvbj0iMS4xIj48cGF0aCBkPSJtIDE1LDYuMzI5OTk5OCAtMS4zMywtMS4zMyAtMy42NywzLjY3IC0zLjY2OTk5OTksLTMuNjcgLTEuMzMsMS4zMyAzLjY3LDMuNjcwMDAwMiAtMy42NywzLjY3IDEuMzMsMS4zMyBMIDEwLDExLjMzIDEzLjY3LDE1IDE1LDEzLjY3IDExLjMzLDEwIDE1LDYuMzI5OTk5OCBaIiAvPjwvc3ZnPgo=') 50% 50% no-repeat; */ background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDIwIDIwIj48cmVjdCB5PSIxMyIgeD0iNCIgd2lkdGg9IjEyIiByeT0iMCIgaGVpZ2h0PSIyIiAvPjwvc3ZnPgo=') 50% 50% no-repeat; }"+
"#jsdbg_ide_main_window_show_hide:hover { background-color: silver; } "+

".cmd_code_editor_continue > i { margin: 0 -4px; }"+
".cmd_code_editor_next_step > i { margin: 0 -4px; background-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyLjU0bW0iIGhlaWdodD0iMy42NjhtbSIgdmlld0JveD0iMCAwIDguOTkgMTMiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEuMTg3NTc3M2UtOCwtMTAzOS4zNjIyKSI+PHBhdGggZD0ibSAyLjUsMTA1MC4zNjIyIGMgMCwxLjEgMC45LDIgMiwyIDEuMSwwIDIsLTAuOSAyLC0yIDAsLTEuMSAtMC45LC0yIC0yLC0yIC0xLjEsMCAtMiwwLjkgLTIsMiIvPjxwYXRoIGQ9Im0gMywxMDM5LjM2MjIgMCw0IC0zLDAgTCA0LjUsMTA0Ny4zNjIyIGwgNC41LC00IC0zLDAgMCwtNCAtMywwIHoiLz48L2c+PC9zdmc+Cg=='); }\n"+

"#jsdbg_ide_main_window_show { /* position:fixed; right: 2px; bottom: 2px; display: block;*/ }"+

"#ide_main_window_settings { position:absolute; right: 0px; top: 0px; border: none; border-left: 1px solid #e5e5e5; padding-left: 3px; padding-right: 3px; }"+
"#ide_main_window_settings:hover, #ide_main_window_settings:hover > i { background-color: silver; opacity: 1; }"+
"#ide_main_window_settings > i { opacity: 0.2; width: 18px; }\n"+

".c-code_editor-bg, .c-code_editor-textarea { font: 13px/16px monospace; padding: 2px; margin:0; border: 1px solid silver; -moz-box-sizing:border-box; box-sizing: border-box; overflow: auto; white-space: pre-wrap; word-wrap: break-word; }"+

"#ide_main_window_src { height:100%; width:100%; border-top:26px solid transparent; display:block; background:transparent; position:relative; }\n"+

".ace_editor { height:100%; width:100%; margin: 0; }\n"+
"#ide_main_window > .ace_editor { border-top:26px solid transparent; display:block; }\n"+
".jsdbg-ide-class-browser .ace_editor { border: 1px solid silver; box-sizing: border-box; }"+
".jsdbg-ide-debugger .ace_editor { border: 1px solid silver; box-sizing: border-box; }"+
".jsdbg-ide-class-browser .win-header { padding: 10px !important; }\n"+

".jsdbg-ide-class-browser optgroup.selected { }\n"+
".jsdbg-ide-ace-breakpoint { background: red; position: absolute; }\n"+
".dbg_readonly_code .c-code_editor { background-color: #ffa; }\n"+
".dbg_readonly_code .cmd_code_editor_save { opacity: 0.3; }\n";

win_onmouse.win_css_styles = 
".win { display: flex; display: -webkit-box; flex-direction: column; -webkit-box-orient: vertical; -webkit-box-align: stretch; -webkit-box-pack: justify; box-sizing: border-box; -moz-box-sizing: border-box; position: fixed; left: 0; top: 0; min-width: 32px; min-height: 32px; background: #fff; box-shadow: 0 0 6px rgba(0,0,0,0.7); z-index: 99;font:12px/14px arial,helvetica,tahoma,sans-serif; border-radius:0; }"+
".win-is-hidden { display: none!important; }"+
".win-area { -webkit-box-flex: 1.0; flex: 1; }"+
".win-header { padding: 15px 20px; font:normal 16px Arial,Helvetica,sans-serif; cursor: default; -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: -moz-none; -ms-user-select: none; user-select: none; }"+
//".win-header-title { border-bottom: 1px solid #b7b6b1; color:#6f6563; padding: 15px 20px 10px; }"+
".win-close-btn, .win-close-btn:hover { position:absolute; top:0px; right:0px; width:20px; height:20px; text-indent:-1000em; overflow:hidden; background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgdmVyc2lvbj0iMS4xIj48cGF0aCBkPSJtIDE1LDYuMzI5OTk5OCAtMS4zMywtMS4zMyAtMy42NywzLjY3IC0zLjY2OTk5OTksLTMuNjcgLTEuMzMsMS4zMyAzLjY3LDMuNjcwMDAwMiAtMy42NywzLjY3IDEuMzMsMS4zMyBMIDEwLDExLjMzIDEzLjY3LDE1IDE1LDEzLjY3IDExLjMzLDEwIDE1LDYuMzI5OTk5OCBaIiAvPjwvc3ZnPgo=') 50% 50% no-repeat; border: 12px solid transparent; border-left-width: 2px; }"+
".win-minimize-btn { position:absolute; top:0px; right:34px; width:20px; height:20px; text-indent:-1000em; overflow:hidden; background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDIwIDIwIj48cmVjdCB5PSIxMyIgeD0iNCIgd2lkdGg9IjEyIiByeT0iMCIgaGVpZ2h0PSIyIiAvPjwvc3ZnPgo=') 50% 50% no-repeat; border: 12px solid transparent; border-right-width: 2px; border-left-width: 8px; }"+
".win-close-btn:hover, .win-minimize-btn:hover { opacity: 0.5; }"+
".win-minimize-btn.mod_first { right: 0px; border-right-width: 12px; }" +
".win-footer { text-align: center; }"+
".win-header, .win-fieldset, .win-footer { -moz-box-sizing:border-box; -webkit-box-sizing:border-box; box-sizing:border-box; }"+
".win-resizer { position: absolute; right: -9px; bottom: -10px; width: 20px; height: 20px; border-radius: 3px; cursor:se-resize; -moz-user-select:none; -webkit-user-select:none; -ms-user-select:none; }"+
".win-resizer:hover { border-bottom: 4px solid silver; border-right: 4px solid silver; }"+
".win-splitter { width: 3px; height: auto; background: #eee;  }"+
".win-splitter:hover { background: silver; cursor:col-resize; }"+
".win-splitter.type_horizontal { display: block; width: auto; height: 3px; }"+
".win-splitter.type_horizontal:hover { background: silver; cursor:row-resize; }"+
".win-fieldset, .win fieldset { border: none; padding: 0; }"+
".win-fieldset > .row { padding: 5px 17px; clear:both; }"+
".win-fieldset > .row > label { float: left; width: 100px; }\n";


