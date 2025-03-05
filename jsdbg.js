if(!window['Ctx']) var Ctx = function (parent_ctx) {
	this.__ip = 0;
	this.__t = [undefined, undefined, undefined, undefined];
	this.__func = undefined;
	this.__func_id = undefined;
	this.__callee = undefined;
	this.__up = undefined;
	this.__down = undefined;
	this.__exception = undefined;
	this.__catch_block = {};
	
	if (parent_ctx)
		this.__proto__ = parent_ctx;
};

Ctx.prototype.__next_step = function (label, breakpoint) {  
	//console.log("__next_step(): label="+label+", step_limit="+(typeof jsdbg.step_limit == 'undefined' ? '(none)' : jsdbg.step_limit), this.__t);
	
	this.__ip = label;

	if(breakpoint) 
		throw "breakpoint!";

	// указан лимит шагов?
	if(typeof jsdbg.step_limit != 'undefined') {
		if(Math.floor(this.__ip / 10000) > (this.__ip % 10000)) {
			/* перевёрнутый, пустой шаг -> не считаем */
		}
		else {
			// уменьшим кол-во шагов
			jsdbg.step_limit--;
		}
		
		// если лимит шагов истёк, то ждём дльнейших указаний
		// TODO показать окно дебагера, если можно?
		if(jsdbg.step_limit < 1) {
			throw "step_limit=0!";
		}
	}
	
	/*if(jsdbg.source[this.__func_id][1].__jsdbg_breakpoints) {
		var brk_list = jsdbg.source[this.__func_id][1].__jsdbg_breakpoints;
		for(var i=0; i<brk_list.length; i++) {
			var brk = brk_list[i];
			var start = Math.floor(this.__ip / 10000);
			var end = this.__ip % 10000;
			if(start <= brk && end >= brk)
				throw "breakpoint!";
		}
	}*/
	
	return;
};

Ctx.prototype.__func_start = function (func_name, func__jsdbg_id, parent_ctx) { 
//	console.log("__func_start(): func_name="+func_name);

	// родительский контекст
	if (parent_ctx) {
		if(parent_ctx == this)
			debugger;
		else
			this.__proto__ = parent_ctx;
	}

	// сохраняем информацию о функции
	this.__func = func_name;
	this.__func_id = func__jsdbg_id;
	
	return this;
};

Ctx.prototype.__func_end = function (func_name) { 
//	console.log("__func_end(): func_name="+func_name+", __func="+(this.__func||''));
	
	this.__ip = -1;
	
	for(var up_ctx = this; up_ctx.__up; up_ctx = up_ctx.__up)
		if(up_ctx.__func == func_name) {
			if(up_ctx.__up) up_ctx.__up.__down = undefined; // отцепляем всё ниже
			return up_ctx.__up;
		}
		else {
			up_ctx.__up
		}
	
	// бывает что это самый верхний контекст
// 	if (up_ctx.__up)
//		console.info("__func_end(): not found ctx.__func="+func_name+' !');
	
	// закончили выполнение callback функции и контекст надо отключить от jsdbg
	if(this.__is_callback && jsdbg.ctx == this) {
		jsdbg.old_ctx = jsdbg.ctx;
		delete jsdbg.ctx;
	}
	
	return up_ctx;
};

Ctx.prototype.__try_start = function (try_ip, catch_ip) {
	console.log("__try_start(): try_ip="+try_ip+", catch_ip="+catch_ip);	
	this.__catch_block[try_ip] = catch_ip;
};

Ctx.prototype.__try_end = function (try_ip, catch_ip) {
	console.log("__try_end(): try_ip="+try_ip+", catch_ip="+catch_ip);	

	if(try_ip in this.__catch_block)
		delete this.__catch_block[try_ip];
	else
		console.info("__try_end(): not found ctx.__catch_block["+try_ip+'] !');
};

Ctx.prototype.__catch = function (exception) { 
	console.log("__catch(): exception="+exception);
	this.__exception = exception;
	
	var ip = Math.floor(this.__ip / 10000);
	for(var try_range in this.__catch_block) {
		var start = Math.floor(try_range / 10000);
		var end = try_range % 10000;
		if (ip >= start && ip <= end) {
			this.__ip = this.__catch_block[try_range];
			return true; // поймали эксепшен успешно
		}
	}
	
	// если дальше кидать некуда, то открываем окно дебаггера если возможно
	if(this.__up == undefined && typeof jsdbg_ide_onclick != 'undefined') {
		setTimeout(jsdbg_ide_onclick.bind(window, {type: 'open_debugger', ctx: this}), 20); 
		
		// не надо breakpoint кидать дальше
		if(exception == 'breakpoint!') {
			// подчищаем
			jsdbg.old_ctx = jsdbg.ctx;
			delete jsdbg.ctx;
		
			return false;
		}
	}

	console.info("__catch(): Not found relevant ctx.__catch_block for "+this.__ip+"!");

	// если на самом верху цепочки контекстов, то подчистим за собой
	if(this.__up == undefined) {
		jsdbg.old_ctx = jsdbg.ctx;
		delete jsdbg.ctx;
	}

	// кидаем дальше exception
	return false;
};

Ctx.prototype.__new = function () { 
	// сразу проверим на native
	// TODO [object XMLHttpRequestConstructor]
	if(arguments[0].__jsdbg_compiled == 2 || typeof(arguments[0]) == 'object')
	switch(arguments.length) {
		case 1:
			return new arguments[0]();
		case 2:
			return new arguments[0](arguments[1]);
		case 3:
			return new arguments[0](arguments[1], arguments[2]);
		case 4:
			return new arguments[0](arguments[1], arguments[2], arguments[3]);
		case 5:
			return new arguments[0](arguments[1], arguments[2], arguments[3], argument[4]);
		default:
			var new_src = '(new '+arguments[0]+'('+arguments[1];
			for(var i=2; i<arguments.length; i++) new_src += ', '+arguments[2];
			return eval(new_src+'))');
	}
	
	// не скомпилирована?
	if(!arguments[0].__jsdbg_id && jsdbg.compileFunc(arguments[0]) == false) 
	{
		// не удалось скомпилировать, возможно [native]
		if(arguments[0].__jsdbg_compiled == 2) 
			return this.__new.apply(this, arguments);
		
		console.error('Cant compile '+arguments[0]);
		
		var new_src = '(new '+arguments[0]+'('+arguments[1];
		for(var i=2; i<arguments.length; i++) new_src += ', '+arguments[2];
		return eval(new_src+'))');
	}
	
	// создаём пустой объект
	if(!this.__down) {
		var new_obj = Object.create(arguments[0].prototype);
	}
	// уже начали создание объекта
	else {
		var new_obj = this.__down.this;
	}
	
	// скомпилирована -> создаём объект
	switch(arguments.length) {
		case 1:
			this.__func_call(arguments[0], new_obj); break;
		case 2:
			this.__func_call(arguments[0], new_obj, arguments[1]); break;
		case 3:
			this.__func_call(arguments[0], new_obj, arguments[1], arguments[2]); break;
		case 4:
			this.__func_call(arguments[0], new_obj, arguments[1], arguments[2], arguments[3]); break;
		case 5:
			this.__func_call(arguments[0], new_obj, arguments[1], arguments[2], arguments[3], arguments[4]); break;
		case 6:
			this.__func_call(arguments[0], new_obj, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]); break;
		case 7:
			this.__func_call(arguments[0], new_obj, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]); break;
		default:
			throw new Error('not implemented yet!');
	}
	return new_obj;
};

Ctx.prototype.__func_call = function (func_, this_) { 
		if (func_ == undefined) { 
			// поищем название функции
			var src = jsdbg.compiled[this.__func_id].toString();
			var start = src.indexOf('case '+this.__ip+':');
			var end = src.indexOf('ctx.__next_step(', start);
			if(end == -1) end = src.length;
			var func_call = src.substring(start, end).match(/ctx.__func_call\(([^,)]+)/);
			throw func_call[1].replace(/^ctx\./, '')+' is undefined!';
			// throw 'Function/method is undefined!';
		}
	
		// компилируем функцию если надо
		if( ! func_.__jsdbg_compiled && ! func_.__jsdbg_id)
			jsdbg.compileFunc(func_, this_);
		
		// создаём новый контекст для вызываемой функции/метода
		if(!this.hasOwnProperty('__down') || !this.__down) {
			this.__down = new Ctx();
			this.__down.__up = this;
			this.__down.__callee = func_;
		}
		jsdbg.ctx = this.__down;
			
		// jsdbg.step_limit = 99;
		
		// уже скомпилированная функция (обычно anonymous)
		var func = func_.__jsdbg_id ? jsdbg.compiled[func_.__jsdbg_id] : func_;
		
		switch(arguments.length) {
			case 0: 
				throw 'Ctx.prototype.__func_call need one or more agruments!';
			case 1:
				var result = func.call(window); break;
			case 2:
				var result = func.call(arguments[1]); break;
			case 3:
				var result = func.call(arguments[1], arguments[2]); break;
			case 4:
				var result = func.call(arguments[1], arguments[2], arguments[3]); break;
			case 5:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4]); break;
			case 6:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]); break;
			case 7:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]); break;
			case 8:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7]); break;
			case 9:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8]); break;
			case 10:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9]); break;
			case 11:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10]); break;
			case 12:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11]); break;
			case 13:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12]); break;
			case 14:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12], arguments[13]); break;
			case 15:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12], arguments[13], arguments[14]); break;
			case 16:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12], arguments[13], arguments[14], arguments[15]); break;
			case 17:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12], arguments[13], arguments[14], arguments[15], arguments[16]); break;
			case 18:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12], arguments[13], arguments[14], arguments[15], arguments[16], arguments[17]); break;
			case 19:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12], arguments[13], arguments[14], arguments[15], arguments[16], arguments[17], arguments[18]); break;
			case 20:
				var result = func.call(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7], arguments[8], arguments[9], arguments[10], arguments[11], arguments[12], arguments[13], arguments[14], arguments[15], arguments[16], arguments[17], arguments[18], arguments[19]); break;
			default:
				alert('Ctx.prototype.__func_call: Not implemented yet! '+arguments.length);
				throw new Error('Ctx.prototype.__func_call: Not implemented yet! '+arguments.length);
		}
		
		// удаляем контекст для вызваной функции/метода
		if (this.__down) {
			delete this.__down.__up;
			delete this.__down;
		}
		jsdbg.ctx = this;
		
		return result;
};

Ctx.prototype.__restart = function () { 
	this.__ip = 0;
	this.__t = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
	this.__exception = undefined;
	this.__catch_block = {};
	delete this.__down;
	
	// перезапускаем функцию/метод
	var old_ctx = jsdbg.ctx, old_step_limit = jsdbg.step_limit;
	jsdbg.ctx = this;
	jsdbg.step_limit = 1;
	
	try {
	switch(this.arguments.length) {
		case 0:
			jsdbg.compiled[this.__func_id].call(this.this);
			break;
		case 1: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0]); 
			break;
		case 2: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1]); 
			break;
		case 3: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2]); 
			break;
		case 4: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3]); 
			break;
		case 5: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4]); 
			break;
		case 6: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5]); 
			break;
		case 7: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6]); 
			break;
		case 8: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7]); 
			break;
		case 9: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8]); 
			break;
		case 10: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8], this.arguments[9]); 
			break;
		case 11: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8], this.arguments[9], this.arguments[10]); 
			break;
		case 12: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8], this.arguments[9], this.arguments[10], this.arguments[11]); 
			break;
		case 13: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8], this.arguments[9], this.arguments[10], this.arguments[11], this.arguments[12]); 
			break;
		case 14: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8], this.arguments[9], this.arguments[10], this.arguments[11], this.arguments[12], this.arguments[13]); 
			break;
		case 15: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8], this.arguments[9], this.arguments[10], this.arguments[11], this.arguments[12], this.arguments[13], this.arguments[14]); 
			break;
		case 16: 
			jsdbg.compiled[this.__func_id].call(this.this, this.arguments[0], this.arguments[1], this.arguments[2], this.arguments[3], this.arguments[4], this.arguments[5], this.arguments[6], this.arguments[7], this.arguments[8], this.arguments[9], this.arguments[10], this.arguments[11], this.arguments[12], this.arguments[13], this.arguments[14], this.arguments[15]); 
			break;
		default:
			debugger;
	}
	} catch(ex){
		if (ex == 'step_limit=0!') return;
		throw ex;
	}
	
	jsdbg.ctx = old_ctx;
	jsdbg.step_limit = old_step_limit;
};

Ctx.prototype.__func_apply = function (func_, this_, arguments_) { 
	
		// компилируем функцию если надо
		if( ! func_.__jsdbg_compiled && ! func_.__jsdbg_id)
			jsdbg.compileFunc(func_, this_);
		
		// создаём новый контекст для вызываемой функции/метода
		if(!this.hasOwnProperty('__down') || !this.__down) {
			this.__down = new Ctx();
			this.__down.__up = this;
			this.__down.__callee = func_;
		}
		jsdbg.ctx = this.__down;

		// уже скомпилированная функция (обычно anonymous)
		var func = func_.__jsdbg_id ? jsdbg.compiled[func_.__jsdbg_id] : func_;
		var result = func.apply(this_, arguments_);
		
		// удаляем контекст для вызваной функции/метода
		if (this.__down) {
			delete this.__down.__up;
			delete this.__down;
		}
		jsdbg.ctx = this;
		
		return result;
};

if(!window['jsdbg']) var jsdbg = function jsdbg() { 
	var func = arguments[0];
	var this_ = arguments[1]||window;
	var args = [];
	while(arguments.length > args.length+2) args.push(arguments[args.length+2]);
	
	try {
		if(func == undefined) throw new Error('Function is undefined!');
		jsdbg.startDebug(func, this_, args);
		jsdbg.continue();
	}
	catch(ex) {
		//if(typeof jsdbg_ide_onclick != 'undefined')
		//	setTimeout(jsdbg_ide_onclick.bind(window, {type: 'open_debugger', ctx: jsdbg.ctx || (new Ctx())}), 100);
			
		if (ex != 'step_limit=0!' && ex != 'breakpoint!') {
			if(!window.onerror) setTimeout(function(){ alert(ex); }, 100);
			
			// подчистим за собой
			if(jsdbg.ctx) jsdbg.old_ctx = jsdbg.ctx;
			delete jsdbg.ctx;
		
			throw ex;
		}
	}

	// подчистим за собой
	if(jsdbg.ctx) jsdbg.old_ctx = jsdbg.ctx;
	delete jsdbg.ctx;
	
	return jsdbg.old_ctx ? jsdbg.old_ctx.__t[0] : undefined;
};

jsdbg.init = function () {
	this.next_id = 1;
	this.compiled = []; // скомпилированые функции
	this.source = []; // исходный код скопилированых функций
	this.funcs = []; // сами функции или методы с объектом this
	this.step_limit = undefined; // неограниченое количество шагов
	this.breakpoints = {};
};

jsdbg.compile = function (src, id, scope) {
 	this.src = src;
	this.code = [];
	this.tmp = 0; // текущая свободная временная переменная
	this.func_name = []; // стек вложенных функций
	this.func_id = id;
	this.break_ip = undefined;
	this.continue_ip = undefined;
	this.scope = []; // локальные переменные
	
	// acorn не любит пустые функции/методы
	if(src.match(/function\s*\([^)]*\)\s*{\s*}/)) {
		return src;
	}
	
	if(src.match(/^\s*function\s*\(/) && scope) {
		var ast = acorn.parse(src);
		if(ast.body[0].type == 'FunctionDeclaration') {
			ast.body[0].id = {name: 'noname'+(new Date())*1};
			if(scope) ast.body[0].custom_scope = scope; // подсунем свой scope если передали
		}
	} 
	else
		var ast = acorn.parse(src);
	
	
	for(var i=0;i<ast.body.length;i++){
		this.compileAcornStmt(ast.body[i], 0);
	}
	
	return this.code.join('');
};

jsdbg.compileAcornStmt = function (node) { 
	var code = this.code;
	var old_tmp = this.tmp;
	
	if(!node || !node.type) { debugger; return; }
	
	// компилируем только верхнего уровня функции
	if(node.type == "FunctionDeclaration" && this.func_name.length == 0) 
	{
		// если acorn пропатчен чтоб парсить безымянные функции
		if(!node.id) node.id = {name:'noname_func_'+this.func_id};

		this.scope.unshift(node.custom_scope || {arguments: true});
		this.func_name.push(node.id.name);		
		this.code.push('\nfunction '+node.id.name+'(');
		
		// function arguments
		for(var i=0;i<node.params.length;i++) {
			this.code.push((i?', ':'')+node.params[i].name);
			this.scope[0][node.params[i].name] = true;
		}
		
		this.code.push('){');
	
		// prepare ctx
		this.code.push('\n\tvar ctx = jsdbg.ctx;');
		this.code.push('\n\tif(!ctx) { jsdbg.ctx = ctx = new Ctx(); jsdbg.step_limit = 55222333; }');
		this.code.push('\n\tvar t = ctx.__t;');
		
		// parent_ctx
		var old_parent_ctx_name = this.parent_ctx_name;
		this.parent_ctx_name = 'parent_ctx_'+node.id.name;
		this.code.push(' var '+this.parent_ctx_name+' = ctx;');
		
		// продолжение выполнения или начало вызова?
//		this.code.push('\n\tif(ctx.__ip == 0) {');
			
//		this.code.push('\n\t}');
			
		// body
		this.code.push('\n\tfor(var _prt_cnt=111222;_prt_cnt;_prt_cnt--) try{ switch(ctx.__ip){');
		this.code.push('\n\t\tcase 0:');
		
		// зарегистрируем начало функции
		this.code.push('\n\t\t\tctx.__func_start("'+node.id.name+'", '+this.func_id+');');
		
		// зарегистрируем arguments
		this.code.push('\n\t\t\tctx.arguments = arguments;');
		for(var i=0;i<node.params.length;i++)
			code.push('\n\t\t\tctx.'+node.params[i].name+' = arguments['+i+'];');
		
		// зарегистрируем this
		this.code.push('\n\t\t\tctx.this = this; ');
		
		// компилируем сам код функции
		this.compileAcornStmt(node.body);
		
		// end
		this.code.push('\n\t\tdefault: ctx.__func_end("'+node.id.name+'"); return;');
		
		// try{}catch(){}
		this.code.push('\n\t}} catch(ex) {\n\t\tif(ex == "step_limit=0!") throw ex;\n\t\telse if(ctx.__catch(ex)) continue;\n\t\telse throw ex;\n\t}');
		
		// prt_cnt
		this.code.push('\n\tif(_prt_cnt == 0) throw new Error("Infinity loop detected! (_prt_cnt == 0)");');
		
		// function end
		this.code.push('\n}');
				
		this.func_name.pop();
		this.scope.shift();
		this.parent_ctx_name = old_parent_ctx_name;
	}
	
	else if(node.type == "BlockStatement") {
		for(var i=0;i<node.body.length;i++) {
			this.compileAcornStmt(node.body[i]);
		}
	}
	
	else if(node.type == "VariableDeclaration") 
	{
		this.code.push('ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');
		
		for(var i=0; i<node.declarations.length; i++) {
			this.compileAcornStmt(node.declarations[i]); 
			this.tmp++;
		}
		this.tmp -= node.declarations.length;
	}
	
	else if(node.type == "VariableDeclarator") 
	{
		this.scope[0][node.id.name] = true;
		if (node.init) 
		{
			var code_frag = this.compileAcornExpr(node.init, true);
			this.code.push(' ctx.__next_step('+
				(node.start*10000+node.end)+');\n\t\tcase '+
				(node.start*10000+node.end)+': ctx.'+node.id.name+' = '+code_frag+';');
		}
		else {
			this.code.push(' ctx.__next_step('+
				(node.start*10000+node.end)+');\n\t\tcase '+
				(node.start*10000+node.end)+': ctx.'+node.id.name+' = undefined;');
		}
	}
	
	else if(node.type == "ReturnStatement") 
	{
		// ! Обычно все ищют результат в t[0]
		
		// пустой return
		if (!node.argument) 
		{
			code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ctx.__ip = -1; ctx.__func_end("'+this.func_name[this.func_name.length-1]+'"); return ctx.__t[0] = undefined;');
		}
		// не пустой return
		else 
		{
			// вычислим возвращаемое
			var result_expr = this.compileAcornExpr(node.argument);
			
			// вернём
			
			
			// если результат не в t[0], то положим туда
			if(result_expr != 't[0]') {
				code.push(' ctx.__next_step('+(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ctx.__ip = -1; ctx.__func_end("'+this.func_name[this.func_name.length-1]+'");');
				code.push(' return t[0] = '+result_expr+';');
			}
			else {
				code.push(' ctx.__next_step('+(node.start*10000+(node.start+6))+');\n\t\tcase '+(node.start*10000+(node.start+6))+': ctx.__func_end("'+this.func_name[this.func_name.length-1]+'");');
				code.push(' return t[0];');
			}
		}
	}
	
	else if(node.type == "BreakStatement") 
	{
		code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ctx.__next_step('+
			this.break_ip+'); break;');
	}
	
	else if(node.type == "ContinueStatement")
	{
		code.push(' ctx.__next_step('+
		(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ctx.__next_step('+
		this.continue_ip+'); break;');
	}
	
	else if(node.type == "ExpressionStatement") {
		/*this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':'); */
		this.compileAcornExpr(node.expression, false);
	}
	
	else if(node.type == "IfStatement") 
	{
		// ! При цепочке if-else-if-else начинается дублирование 
		var last_code_line = this.code[this.code.length-1];
		if (last_code_line.indexOf('case '+(node.start*10000+node.end)+':') > -1) {
			this.code.pop();
			console.info(last_code_line);
		}
		
		// начало "if"
		var if_token_end = node.start + 2;
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');
		
		// if-test
		this.compileAcornExpr(node.test, false);
		this.code.push(' if(!t['+this.tmp+']) ');
		if (node.alternate)
			this.code.push('{ ctx.__next_step('+((node.elseStart||node.alternate.start)*10000+node.alternate.end)+'); break; } '); // идём на alternate
		else
			this.code.push('{ ctx.__next_step('+(node.end*10000+node.start)+'); break; } '); // идём на перевёрнутый
			
		// if-true (consequent)
		this.compileAcornStmt(node.consequent);
		
		
		// if-false (alternate)
		if (node.alternate) 
		{
			// пусть идёт на перевёрнутый (перепрыгивает блок ниже)
			this.code.push(' ctx.__next_step('+(node.end*10000+node.start)+'); break;');
			
			this.code.push('\n\t\tcase '+((node.elseStart||node.alternate.start)*10000+node.alternate.end)+':');
			
			this.compileAcornStmt(node.alternate);
		}
		
		// оптимизация цепочки if else if else
		if(node.alternate && node.alternate.type == 'ifStatement') {
			/* skip */
		}
		else {
			/*this.code.push(' ctx.__next_step('+(node.end*10000+node.start)+');');*/
		}
		
		// перевёрнутый
		this.code.push('\n\t\tcase '+
			(node.end*10000+node.start)+':');
	}
	
	else if(node.type == "DoWhileStatement") 
	{
		var old_break_ip = this.break_ip;
		var old_continue_ip = this.continue_ip;
		this.break_ip = (node.end*10000+node.start); // перевёртыш
		// this.continue_ip = node.test.start*10000+node.test.end; // начало
		
		// сам токен do
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.start+2)+');\n\t\tcase '+
			(node.start*10000+node.start+2)+':');
		//this.continue_ip = (node.start+2)*10000+node.end; // должен указывать на test
		
		// while-body
		this.compileAcornStmt(node.body);
		
		// найдём скобки while-test
		var test_start = 0, test_end = 0;
		for(var i = node.end; i > ((node.body||{}).end||node.start); i--) 
		{
			if(test_end == 0 && this.src[i] == ')') test_end = i;
			if(this.src[i] == '(') test_start = i;
		}
		this.continue_ip = test_start*10000+test_end;
		
		// начало do-while-test
		this.code.push('\n\t\tcase '+this.continue_ip+':');
		
		// do-while-test
		this.compileAcornStmt(node.test);
		
		// do-while
		this.code.push('\n\t\t\tif(t['+this.tmp+']) ' +
			'{ ctx.__next_step('+(node.start*10000+node.start+2)+'); break; };'); // идём на начало цикла
			
		// перевёртыш
		this.code.push('\n\t\tcase '+ (node.end*10000+node.start) + ':');
		
		this.break_ip = old_break_ip;
		this.continue_ip = old_continue_ip;	
	}
	
	else if(node.type == "WhileStatement") 
	{
		var old_break_ip = this.break_ip;
		var old_continue_ip = this.continue_ip;
		this.break_ip = (node.end*10000+node.start); // перевёртыш
		// this.continue_ip = node.test.start*10000+node.test.end; // начало

		// токен while
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.start+5)+');\n\t\tcase '+
			(node.start*10000+node.start+5)+':');
		
		// найдём скобки while-test
		var test_start = 0, test_end = 0;
		for(var i = node.start+5; i < ((node.body||{}).start||node.end); i++) 
		{
			if(test_start == 0 && this.src[i] == '(') test_start = i;
			if(this.src[i] == ')') test_end = i;
		}
		this.continue_ip = test_start*10000+test_end;
		
		// начало while-test
		this.code.push('\n\t\tcase '+this.continue_ip+':');
		
		// while-test	
		this.compileAcornStmt(node.test);
	
		// while
		this.code.push('\n\t\t\tif(!t['+this.tmp+']) ' +
			'{ ctx.__next_step('+(node.end*10000+node.start)+'); break; };'); // идём на перевёрнутый
		
		// while-body
		this.compileAcornStmt(node.body);
	
		// возврат на while-test
		this.code.push(' ctx.__next_step('+this.continue_ip+'); break;');
		
		// перевёртыш
		this.code.push('\n\t\tcase '+ (node.end*10000+node.start) + ':');
		
		this.break_ip = old_break_ip;
		this.continue_ip = old_continue_ip;
	}
	
	else if(node.type == "ForStatement") 
	{
		var old_break_ip = this.break_ip;
		var old_continue_ip = this.continue_ip;
		this.break_ip = (node.end*10000+node.start); // перевёртыш
		this.continue_ip = node.update 
			? node.update.start*10000+node.update.end // на инкремент
			: undefined; // немного попозже проставим
	
		// токен "for"
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.start+3)+');\n\t\tcase '+
			(node.start*10000+node.start+3)+':');
	
		// for-init
		if (!node.init) { 
			var init_separator = this.src.indexOf(';', node.start);
			if(init_separator == -1) debugger;
			node.init = {start: init_separator, end: init_separator+1, declarations: []};
			
			this.code.push(' ctx.__next_step('+
				(node.init.start*10000+node.init.end)+');\n\t\tcase '+
				(node.init.start*10000+node.init.end)+':');
		}
		else
//		for(var i=0; i<node.init.declarations.length; i++)
//			this.compileAcornStmt(node.init.declarations[i]);
			this.compileAcornStmt(node.init);
		
		// for-test
		// TODO точка начала
		if (!node.test) {
			var test_separator = this.src.indexOf(';', node.init.end+1);
			if(test_separator == -1) debugger; // оборван код?			
			node.test = {start: test_separator, end: test_separator+1, declarations: []};
			
			// пригодиться ниже, после update куда перескакивать
			var if_test_ip = (node.test.start*10000+node.test.end);
			
			this.code.push(' ctx.__next_step('+
				if_test_ip+');\n\t\tcase '+
				if_test_ip+': t['+this.tmp+'] = true;');
		}
		else {
			// пригодиться ниже, после update куда перескакивать
			var test_separator = this.src.indexOf(';', node.test.end);
			var if_test_ip = node.test.start*10000+test_separator+1;
			
			this.code.push(' ctx.__next_step('+
				if_test_ip+');\n\t\tcase '+
				if_test_ip+':');
			
			this.compileAcornStmt(node.test);
		}
		
		// если for-test == false -> уходим на перевётыш (конец цикла)
		this.code.push('\n\t\t\tif(!t['+this.tmp+']) ');
		this.code.push('{ ctx.__next_step('+ (node.end*10000+node.start)+ '); break; }'); 
		
		// for-body
		this.compileAcornStmt(node.body);

		// for-update
		if(!node.update) {
			var update_separator = this.src.indexOf(')', node.test.end+1);
			if(update_separator == -1) debugger;
			node.update = {start: update_separator, end: update_separator+1, declarations: []};
			
			this.code.push(' ctx.__next_step('+
				(node.update.start*10000+node.update.end)+');\n\t\tcase '+
				(node.update.start*10000+node.update.end)+':');
				
			this.continue_ip = node.update.start*10000+node.update.end;
		}
		else
			this.compileAcornStmt(node.update);
		
		// назад к for-test
		this.code.push(' ctx.__next_step('+if_test_ip+'); break;');
		
		// for-end перевёртыш
		this.code.push('\n\t\tcase '+(node.end*10000+node.start)+':');
		
		this.break_ip = old_break_ip;
		this.continue_ip = old_continue_ip;
	}
	
	else if(node.type == "ForInStatement") 
	{
		var old_break_ip = this.break_ip;
		var old_continue_ip = this.continue_ip;
		this.break_ip = (node.end*10000+node.start); // перевёртыш
		this.continue_ip = (node.left.start*10000+node.left.end); // на след.ключ
		var tmp_var = 'ctx.__forin_'+(node.start*10000+node.end); // список ключей
	
		// for-right
		this.code.push(' ctx.__next_step('+
			(node.right.start*10000+node.right.end)+');\n\t\tcase '+
			(node.right.start*10000+node.right.end)+':');
		var forin_right = this.compileAcornExpr(node.right, true);
		
		// список ключей и индекс
		this.code.push(tmp_var+' = Object.keys('+forin_right+'), '+tmp_var+'_i = 0;');
		
		// регистрируем в scope переменную цикла
		this.scope[0][node.left.declarations[0].id.name] = true;
		
		// начинаем тело цикла
		this.code.push(' ctx.__next_step('+
			(node.left.start*10000+node.left.end)+');\n\t\tcase '+
			(node.left.start*10000+node.left.end)+':');
			
		// проверяем, можно ли взять след. ключ
		this.code.push('\n\t\t\tif('+tmp_var+'.length <= '+tmp_var+'_i) ');
		this.code.push('{ ctx.__next_step('+ (node.end*10000+node.start)+ '); break; }'); 
		// если можно -> берём
		this.code.push('\n\t\t\telse ctx.'+node.left.declarations[0].id.name+' = '+tmp_var+'['+tmp_var+'_i++];');
		
		// for-body
		this.compileAcornStmt(node.body);

		// назад к for-left
		this.code.push(' ctx.__next_step('+(node.left.start*10000+node.left.end)+'); break;');
		
		// for-end перевёртыш
		this.code.push('\n\t\tcase '+(node.end*10000+node.start)+':');
		
		this.break_ip = old_break_ip;
		this.continue_ip = old_continue_ip;
	}
	
	else if(node.type == "SwitchStatement") 
	{
		var old_break_ip = this.break_ip;
		this.break_ip = (node.end*10000+node.start); // перевёртыш
	
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');
		
		// case-value
		this.compileAcornStmt(node.discriminant);
		
		// if-chain
		var default_case;
		for(var i=0; i<node.cases.length; i++) 
		{
			// default:
			if (node.cases[i].test == null)
				default_case = node.cases[i];
				
			// case X:
			else 
				this.code.push('\n\t\t\tif(t['+this.tmp+'] == '+node.cases[i].test.raw+') { ctx.__next_step('+(node.cases[i].start*10000+node.cases[i].end)+'); break; }');
		}
		if (default_case) {
			this.code.push('\n\t\t\tctx.__next_step('+ (default_case.start*10000+default_case.end)+ '); break;');
		}
		// иначе сразу идём на перевёртыш
		else {
			this.code.push('\n\t\t\tctx.__next_step('+ (node.end*10000+node.start)+ '); break;');
		}
		
		// case-body
		for(var i=0; i<node.cases.length; i++) 
		{
			// default:
			if (node.cases[i].test == null)
				continue;
				
			// case X:
			this.code.push('\n\t\tcase '+(node.cases[i].start*10000+ node.cases[i].end)+':');
			
			// case-body
			for(var ii=0; ii<node.cases[i].consequent.length; ii++)
				this.compileAcornStmt(node.cases[i].consequent[ii]);
		}
		// case-body-default:
		if (default_case) {
			this.code.push('\n\t\tcase '+(default_case.start*10000+ default_case.end)+':');
			
			// case-body
			for(var ii=0; ii<default_case.consequent.length; ii++)
				this.compileAcornStmt(default_case.consequent[ii]);
		}
		
		// перевёртыш
		this.code.push('\n\t\tcase '+(node.end*10000+node.start)+': ');
		
		this.break_ip = old_break_ip;
	}
	
	else if(node.type == "TryStatement") 
	{
		// зарегистрируем catch-блок
		this.code.push(' ctx.__try_start('+(node.block.start*10000+node.block.end)+', '+(node.handler.start*10000+node.handler.end)+');');
		
		// try-body
		this.compileAcornStmt(node.block);
		
		// переход на перевёртыш
		this.code.push(' ctx.__next_step('+(node.end*10000+node.start)+'); break; ');

		// переменную со исключением регистрируем в scope
		var old_ex = node.handler.param.name in this.scope[0];
		this.scope[0][node.handler.param.name] = true;
		
		// catch-body
		this.code.push('\n\t\tcase '+
			(node.handler.start*10000+node.handler.end)+': ');
		this.code.push('ctx.'+node.handler.param.name+' = ctx.__exception;');
		this.compileAcornStmt(node.handler.body);
		
		// убираем переменнуы из scope
		if (old_ex) this.scope[0][node.handler.param.name] = true;
		else delete this.scope[0][node.handler.param.name];
		
		// перевёртыш, выходим из try-catch
		this.code.push('\n\t\tcase '+
			(node.end*10000+node.start)+': ctx.__try_end('+(node.block.start*10000+node.block.end)+', '+(node.handler.start*10000+node.handler.end)+');');
	}
	
	else if(node.type == "ThrowStatement") 
	{
		// вычислим аргумент
		var result_expr = this.compileAcornExpr(node.argument);
			
		// выбрасим исключение
		code.push(' ctx.__next_step('+
		(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': throw '+result_expr+';');
	}
	
	else if(node.type == "EmptyStatement") 
	{
		/* skip */
	}
	
	else if(node.type == "DebuggerStatement") 
	{
		code.push('debugger; ctx.__next_step('+
		(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ');
	}
	
	else
		this.compileAcornExpr(node, false);
};

jsdbg.compileAcornExpr = function (node, is_subexpression, with_this) { 
		
	if(node.type == "CallExpression") 
	{
		var old_tmp = this.tmp;
		
		// получим функцию
		var func_frag = this.compileAcornExpr(node.callee, true, true);
		if (Array.isArray(func_frag) == false) func_frag = [func_frag, 'window'];
		if (func_frag[0].indexOf('t[') === 0) 
			this.tmp++;
	
		// скомпилируем аргументы
		var args = [];
		for(var i=0;i<node.arguments.length;i++) {
			args.push(this.compileAcornExpr(node.arguments[i], true));
			if (args[args.length-1].indexOf('t[') === 0) 
				this.tmp++;
			// TODO неэфективное использование временных переменных
			// пример: a.concat(a.toString()+a.toString(), a, a.toString()+a.toString());
		}
		
		this.tmp = old_tmp;
		
		// эмулируем Function.prototype.apply()
		if(func_frag[0].match(/\.apply$/)) {
			this.code.push(' ctx.__next_step('+
				(node.start*10000+node.end)+');\n\t\tcase '+
				(node.start*10000+node.end)+': t['+this.tmp+'] = ('+
				func_frag[0]+' instanceof Function) ? ctx.__func_apply('+
				func_frag[0].replace(/\.apply$/, '') +
				', ' + args[0] + ', ' + args[1] + ') : ctx.__func_call('+
				func_frag[0] + ', ' + func_frag[1] + (args.length?', ':'') +
				args.join(', ') +
				');');
		}
		else if(func_frag[0] == 'jsdbg') {
			this.code.push(' ctx.__next_step('+
				(node.start*10000+node.end)+');\n\t\tcase '+
				(node.start*10000+node.end)+': t['+this.tmp+'] = ctx.__func_call(' +
				args.join(', ') + ');');
		}
		// простой шаг вызова функции
		else 
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = '+
			'ctx.__func_call('+
			func_frag[0] + ', ' + func_frag[1] + (args.length?', ':'') +
			args.join(', ') +
			');');
		
		return 't['+this.tmp+']';
	}

	else if (node.type == 'NewExpression') 
	{
		var old_tmp = this.tmp; 
		
		// узнаём прототип
		var sub_expr = this.compileAcornExpr(node.callee, true);
		
		var args = [];
		for(var i=0;i<node.arguments.length;i++) {
			args.push(this.compileAcornExpr(node.arguments[i], true));
			if (args[args.length-1].indexOf('t[') === 0) 
				this.tmp++;
		}
		
		this.tmp = old_tmp;

		// создаём пустой объект
		//code_line = ' t['+this.tmp+ '] = Object.create('+sub_expr+'.prototype);';
		
		// вызываем конструктор
		//code_line += ' '+sub_expr+'.__jsdbg_call'+args.length+'(t['+this.tmp+']';
		code_line = ' t['+this.tmp+ '] = ctx.__new('+sub_expr;
		
		// добавляем аргументы
		if (args.length) {
			code_line += ', '+args.join(', ');
		}
		
		// закончим вызов
		code_line += ');';
		
		// в любом случае это шаг и результат во временной переменной будет
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':'+code_line);
		
// 				if (is_subexpression) {
			return 't['+this.tmp+']';
// 				}
	}
	
	else if(node.type == "Identifier") 
	{
// console.log(this.scope[0], node.name);
		if (node.name == 'undefined')
			var code_line = 'undefined';
		else if (this.scope[0] && this.scope[0][node.name])
			var code_line = "ctx."+node.name;
		else if (node.name == '__t' || node.name == '__ip' || node.name == '__callee' || node.name == '__up' || node.name == '__down' || node.name == '__func_id')
			var code_line = "ctx."+node.name;
		else
			var code_line = node.name;
		
		// нужно вернуть как фрагмент кода
		if (is_subexpression) {
			return code_line;
		}
			
		// либо положем во временную переменную и вернём её
		else {
			this.code.push(' ctx.__next_step('+
				(node.start*10000+node.end)+');\n\t\tcase '+
				(node.start*10000+node.end)+': t['+this.tmp+'] = '+ code_line+';');
			return 't['+this.tmp+']';
		}
	}
	
	else if(node.type == "Literal") 
	{
		if (is_subexpression)
			return node.raw;
			
		var code_line = ' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = '+node.raw+';';
		this.code.push(code_line);
		return 't['+this.tmp+']';
	}
	
	else if(node.type == "ThisExpression") 
	{
		if (is_subexpression)
			return 'ctx.this';
			
		var code_line = ' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = ctx.this;';
		this.code.push(code_line);
		return 't['+this.tmp+']';
	}

	else if(node.type == "BinaryExpression") 
	{
		var group_exprs = ' BinaryExpression LogicalExpression AssignmentExpression';
		
		// сохраним на всякий случай
		var old_tmp = this.tmp;
		
		// вычислим левую часть
		var left = this.compileAcornExpr(node.left, group_exprs.indexOf(node.left.type) < 0);
		this.tmp += left.indexOf('t[') == 0 ? 1 : 0;
		
		// вычислим правую часть
		var right = this.compileAcornExpr(node.right, group_exprs.indexOf(node.right.type) < 0);
		this.tmp += right.indexOf('t[') == 0 ? 1 : 0; // на случай is_subexpression = true
//console.log(left, node.left.type, right, node.right.type);
		
		// подвыражение -> возвращаем как фрагмент
		if (is_subexpression)
			return left+' '+node.operator+' '+right;

		// восстановим
		this.tmp = old_tmp;
		
		// возвращаем как шаг и временную переменную
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = '+left+' '+node.operator+' '+right+';');
		return 't['+this.tmp+']';
	}
	
	else if(node.type == "LogicalExpression") 
	{
		// сохраним и зарезервируем себе одну
		var old_tmp = this.tmp;
		this.tmp++;
		
		// вычислим левую часть
		var left = this.compileAcornExpr(node.left, false);
		
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');

		// условное выполнение
		if (node.operator == '||') {
			this.code.push(' if('+left+') { t['+old_tmp+'] = '+left+'; ctx.__next_step('+(node.end*10000+node.start)+'); break; }');
		}
		else if (node.operator == '&&') {
			this.code.push(' if(!('+left+')) { t['+old_tmp+'] = false; ctx.__next_step('+(node.end*10000+node.start)+'); break; }');
		}
		
		// вычислим правую часть
		this.code.push('\n\t\t\tt['+old_tmp+'] = ' + this.compileAcornExpr(node.right, true) + ';');
						
		// восстановим
		this.tmp = old_tmp;
		
		// перевёрнутая метка (перевёртыш)
		this.code.push('\n\t\tcase '+
			(node.end*10000+node.start)+':');
			
		return 't['+old_tmp+']';
	}
	
	else if(node.type == "UpdateExpression") 
	{
		var code_frag = this.compileAcornExpr(node.argument, true);
		
		if (is_subexpression)
			return node.prefix == false
				? (code_frag+node.operator)
				: (node.operator+code_frag);
		
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');
			
		// ++a, --a
		if (node.prefix) {
			this.code.push(' t['+this.tmp+'] = '+node.operator+code_frag+';');
		}
		// a++, a--
		else {
			this.code.push(' t['+this.tmp+'] = '+code_frag+node.operator+';');
		}
		return 't['+this.tmp+']';
	}
	
	else if(node.type == "ArrayExpression") 
	{
		// формируем код array
		var code_line = '', old_tmp = this.tmp;
		for(var i=0; i<node.elements.length; i++) {
			var code_frag = this.compileAcornExpr(node.elements[i], true);
			if (code_frag.indexOf('t[') == 0)
				this.tmp++;
			code_line += (code_line?', ':'') + code_frag;
		}
		
		// подвыражение -> вернём без шага и временной переменной (если без доп.вычислений было)
		if (is_subexpression && this.tmp == old_tmp) {
			return '['+code_line+']';
		}
		
		// похоже были доп.вычисления
		this.tmp = old_tmp;
		
		// иначе верёнм как шаг и временную переменную
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = ['+code_line+'];');
		return 't['+this.tmp+']';
	}
	
	else if(node.type == "ObjectExpression") 
	{
		var old_tmp = this.tmp, code_line = [];
		for(var i=0; i<node.properties.length; i++) {
			var code_frag = this.compileAcornExpr(node.properties[i].value, true);
			if (code_frag.indexOf('t[') == 0)
				this.tmp++;
			code_line.push((node.properties[i].key.raw || node.properties[i].key.name) + ': ' + code_frag);
		}
		
		// подвыражение -> вернём без шага и временной переменной (если без доп.вычислений было)
		if (is_subexpression && this.tmp == old_tmp) 
			return '{'+code_line.join(', ')+'}';
			
		// похоже были доп.вычисления
		this.tmp = old_tmp;
		
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = {'+code_line.join(', ')+'}; ');
		return 't['+this.tmp+']';
	}
	
	else if(node.type == "AssignmentExpression") 
	{
		var old_tmp = this.tmp;
		
		// вычеслим левую часть
		var left = this.compileAcornExpr(node.left, true); 
		if (left.indexOf('t[') === 0) this.tmp++;
		
		// вычеслим правую часть
		var right = this.compileAcornExpr(node.right, true);
		
		this.tmp = old_tmp;
		
		if (is_subexpression) {
			return left+' '+node.operator+' '+right;
		}
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': '+left+' '+node.operator+' '+right+';');
		return left;
	}
	
	else if(node.type == "MemberExpression") 
	{
		// метод вызывают у числа
		if (node.object.type == "Literal" && typeof node.object.value == 'number')
			var this_frag = this.compileAcornExpr(node.object, false);
		else
			var this_frag = this.compileAcornExpr(node.object, true);
			
		if (this_frag.indexOf('t[') === 0)
			this.tmp += 1;
		
		if (node.property.type == "Identifier" && node.computed == false)
			var code_frag = this_frag + '.' + node.property.name;
		else if (node.property.type == "Identifier" && node.computed == true)
			var code_frag = this_frag + '[' + this.compileAcornExpr(node.property,true)+']';
		else if ('raw' in node.property)
			var code_frag = this_frag + '[' + node.property.raw+']';
		else 
			var code_frag = this_frag + '[' + this.compileAcornExpr(node.property,true)+']';
		
		// для правильного call нужен ещё и правильный this
		if (is_subexpression && with_this)
			return [code_frag, this_frag];
		
		else if (is_subexpression)
			return code_frag;
		
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = '+code_frag+';');

		return 't['+this.tmp+']';
	}

	else if(node.type == "FunctionExpression"
	|| node.type == "FunctionDeclaration" && this.func_name.length > 0) 
	{
		var node_end = this.src.indexOf('(', node.start+8);

		// уже именованная функция или анонимная?
		if (node.id && node.id.name) {
			var func_name = node.id.name;
			var tmp_var_func = '__'+func_name+node.start;
			var tmp_var_to_return = 'ctx.'+func_name;
			this.scope[0][func_name] = true;
			
			// выделим заголовок функции
			this.code.push(' ctx.__next_step('+
				((node.start+node.id.end)*10000+node_end)+');\n\t\tcase '+
				((node.start+node.id.end)*10000+node_end)+':');
		}
		else {
			var func_name = this.func_name[this.func_name.length-1]+'-func'+node.start;
			var tmp_var_func = '__'+func_name.replace(/-/g, '_');
			var tmp_var_to_return = 't['+this.tmp+']';
			
			// выделим заголовок функции
			this.code.push(' ctx.__next_step('+
				((node.start+8)*10000+node_end)+');\n\t\tcase '+
				((node.start+8)*10000+node_end)+':');
		}
		
		//this.code.push(' var parent_ctx = ctx; ');
		
		this.code.push('var '+tmp_var_func+' = '+tmp_var_to_return+' = function(');
		this.func_name.push(func_name);
		this.scope.unshift({arguments:true}); 
		this.scope[0].__proto__ = this.scope[1];
		
		// params
		for(var i=0;i<node.params.length;i++) {
			this.code.push((i?', ':'')+node.params[i].name);
			this.scope[0][node.params[i].name] = true;
		}
		this.code.push('){');
		
		// prepare ctx
		this.code.push('\n\tvar ctx = jsdbg.ctx;');
		this.code.push('\n\tif(!ctx || ctx.__ip == -1) { jsdbg.ctx = ctx = new Ctx(); ctx.__callee = '+tmp_var_func+'; ctx.__is_callback = true; jsdbg.step_limit = 55222333; }');
		this.code.push('\n\tvar t = ctx.__t;');
		
		// parent_ctx
		var old_parent_ctx_name = this.parent_ctx_name;
		this.parent_ctx_name = 'parent_ctx_'+func_name.replace(/-/g, '_');
		this.code.push(' var '+this.parent_ctx_name+' = ctx;');
		
		// при многократном вызове, надо сбрасывать указатель операции
		//this.code.push('\n\tif(ctx.__ip == -1) ctx.__ip = 0;');
		
		// body
		this.code.push('\n\tfor(var _prt_cnt=111222; _prt_cnt; _prt_cnt--) try { switch(ctx.__ip){');
		this.code.push('\n\t\tcase 0:');
		
		// зарегистрируем начало функции
		this.code.push('\n\t\t\tctx.__func_start("'+func_name+'", '+this.func_id+', '+old_parent_ctx_name+');');
		
		// зарегистрируем arguments
		this.code.push('\n\t\t\tctx.arguments = arguments;');
		for(var i=0;i<node.params.length;i++)
			this.code.push('\n\t\t\tctx.'+node.params[i].name+' = arguments['+i+'];');
		
		this.compileAcornStmt(node.body);
		
		// try{}catch(){}
		this.code.push('\n\t\tdefault: ctx.__func_end("'+func_name+'"); return; }} catch(ex) {');
		this.code.push('\n\t\tif(ex == "step_limit=0!") throw ex;');
		this.code.push('\n\t\telse if(ctx.__catch(ex)) continue;\n\t\telse throw ex;\n\t}');
		
		// prt_cnt
		this.code.push('\n\t/*debugger;*/ //if(_prt_cnt == 0) throw new Error("_prt_cnt == 0!");');
		
		// function end and wrapper function end
		//var closure_id = jsdbg.next_id++;
		this.code.push('\n\t};');
 		//jsdbg.source[closure_id] = this.src;
				
		// чтоб не компилировало при вызове
 		this.code.push(tmp_var_to_return+'.__jsdbg_compiled = true;');
 		this.code.push(tmp_var_to_return+'.__jsdbg_parent_id = '+this.func_id+';');
		
		this.func_name.pop();
		this.scope.shift();
		this.parent_ctx_name = old_parent_ctx_name;
		
		return tmp_var_to_return;
	}

	else if(node.type == "ConditionalExpression")
	{
		var result_tmp = this.tmp++;
		var old_tmp = this.tmp;

		// if-test
		var tmp_test = this.compileAcornExpr(node.test, true);

		// if
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': if(!('+tmp_test+')) ');
		if (node.alternate)
			this.code.push('{ ctx.__next_step('+(node.alternate.start*10000+node.alternate.end)+'); break; }'); // идём на alternate
		else
			this.code.push('{ ctx.__next_step('+(node.end*10000+node.start)+'); break; }'); // идём на перевёрнутый

		// if-true (consequent)
		this.code.push(' t['+result_tmp+'] = '+ this.compileAcornExpr(node.consequent, true)+';');
		this.tmp = old_tmp; // освободим обратно исп.временных переменных

		// if-false (alternate)
		if (node.alternate)
		{
			// пусть идёт на перевёрнутый (перепрыгивает блок ниже)
			this.code.push(' ctx.__next_step('+(node.end*10000+node.start)+'); break;');

			// надо будет проверить сгенерировался case для node.alternate?
			var ternary_if_false_body_start = this.code.length;
			var ternary_if_false_body_result = this.compileAcornExpr(node.alternate, true);
			var case_alternate_fragment = 'case '+(node.alternate.start*10000+node.alternate.end)+':';
			for(var i=ternary_if_false_body_start; i<this.code.length;i++)
				if(this.code[i].indexOf(case_alternate_fragment)>-1) {
					case_alternate_fragment = null; // уже вставлен
					break;
				}
			// нужно вставить
			if(case_alternate_fragment != null)
				this.code.push('\n\t\t'+case_alternate_fragment);

			this.code.push(' t['+result_tmp+'] = '+ternary_if_false_body_result+';');
			this.tmp = old_tmp; // освободим обратно исп.временных переменных
		}

		// перевёрнутый
		this.code.push(' ctx.__next_step('+
			(node.end*10000+node.start)+');\n\t\tcase '+
			(node.end*10000+node.start)+':');

		return 't['+result_tmp+']';
	}

	else if(node.type == "UnaryExpression")
	{
		var code = this.compileAcornExpr(node.argument, true);
		
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');
		
		if (is_subexpression)
			return node.operator+' '+code;
			
		this.code.push(' t['+this.tmp+'] = '+node.operator+' '+code+'; ');
		return 't['+this.tmp+']';
	}

	else if(node.type == "SequenceExpression")
	{
		for(var i=0; i<node.expressions.length; i++)
			var result = this.compileAcornExpr(
					node.expressions[i], 
					i+1 == node.expressions.length ? is_subexpression : false, 
					with_this);
			
		return result;
	}

	else {
		console.info("Unknown node type: "+node.type, node);
		debugger;
	}
};

jsdbg.compileFunc = function (func, this_, custom_scope) { 
	if (typeof(func) == 'function') 
	try {
		var src = func.toString();

		if(src.length < 150 && src.indexOf('[native code]') > 0) {
			func.__jsdbg_compiled = 2; // native code
			return false;
		}

		// acorn не любит пустые функции/методы
		if(src.match(/function\s*\([^)]*\)\s*{\s*}/)) {
			// return src;
			src = src.replace('}', 'return;}');
		}
		
		var ast = acorn.parse(src, {ecmaVersion: 'latest'});

		// подсунем свой scope если передали
		if(ast.body.length && ast.body[0].type == 'FunctionDeclaration' && custom_scope) {
			ast.body[0].custom_scope = custom_scope;
		}
		
		// TODO методы классов часто бывают без имени

		/* Начинаем компиляцию */
		var new_id = func.__jsdbg_id || jsdbg.next_id++; // перекомпиляция или первая компиляция?
		this.src = src;
		this.code = [];
		this.tmp = 0; // текущая свободная временная переменная
		this.func_name = []; // стек вложенных функций
		this.func_id = new_id;
		this.break_ip = undefined;
		this.continue_ip = undefined;
		this.scope = []; // локальные переменные

		// компилируем	
		for(var i=0;i<ast.body.length;i++){
			this.compileAcornStmt(ast.body[i], 0);
		}
		var compiled_src = this.code.join('');

		// проверим на зацикленные шаги
		var lines = compiled_src.split('\n');
		for(var i=lines.length-1; i>=0; i--) {
			var m1 = lines[i].match(/case ([0-9]+):/);
			var m2 = lines[i].match(/next_step\(([0-9]+)/);
			if(m1 && m2 && m1[1] == m2[1]) debugger;
		}

		// внедряем breakpoints
		if(func.__jsdbg_breakpoints) 
		{
			// берём список всех шагов
			var next_steps = compiled_src.match(/__next_step\([0-9]+/g);
			
			// перебираем торки останова
			var brk_list = func.__jsdbg_breakpoints;
			for(var i=0; i<brk_list.length; i++) {
				var best_ip = [0, 10000];
			
				// перебираем шаги в алгоритме
				for(var ii=0; ii<(next_steps||[]).length; ii++) 
				{
					var ip = parseInt(next_steps[ii].substring(12));
					var ip_start = Math.floor(ip / 10000);
					var ip_end = ip % 10000;
				
					// он лучше чем предыдущий?
					if(brk_list[i] > ip_start && brk_list[i] < ip_end
					&& best_ip[1] > ip_end - ip_start)
						best_ip = [ip, ip_end - ip_start];
				}
				
				// не нашли подходящий 
				if(!best_ip[0]) {
					alert('Not found step for breakpoint '+brk_list[i]);
					debugger;
				}
				
				// заменяем в коде
				compiled_src = compiled_src.replace(new RegExp('__next_step\\('+best_ip[0]+'[^)]*\\)', 'g'), '__next_step('+best_ip[0]+', 1)');
			}
		}
		
		jsdbg.compiled[new_id] = eval('('+compiled_src+')');
		func.__jsdbg_id = new_id; // для надёжности
		jsdbg.compiled[new_id].__jsdbg_compiled = true; // чтоб при callback не компилилась
		
		jsdbg.source[new_id] = [func.toString(), func, this_];
		
		return compiled_src;	
	} 
	catch(ex) {
		console.error(ex+'\n'+ex.stack);
		if((ex.message||'').match(/Unexpected token/)) console.info(compiled_src);
		throw ex;
	}
	return false;
};

jsdbg.debug = function (src, _this, _arguments) {
	if (typeof src == 'function') return jsdbg.debugFunc(src, _this, _arguments);
	
	// создаём функцию-обёртку
	var func_name = 'eval'+(new Date())*1;
	var func_src = 'function '+func_name+'(){\n'+src+'\n}';
	var func = eval('('+func_src+')');
	
	// компилируем
	var compiled_src = jsdbg.compileFunc(func);

	// подготавливаем контекст
	jsdbg.ctx = new Ctx();
	jsdbg.ctx.__callee = func;

	// останавливаемся на первом же шаге
	jsdbg.step_limit = 1;
	
	try {
		var args = _arguments || [];
		jsdbg.compiled[func.__jsdbg_id].apply(_this||window, args);
	} 
	catch(ex) {
		if (ex != 'step_limit=0!' && ex != 'breakpoint!') {
			setTimeout(function(){ alert(ex); }, 50);
			throw ex;
		}
	}
	
	return jsdbg;
};

jsdbg.debugFunc = function (func, _this, _arguments) {
	// компилируем функцию если надо
	if(!func.__jsdbg_id) this.compileFunc(func);
	
	// новый контекст
	jsdbg.ctx = new Ctx();
	
	jsdbg.step_limit = 1;
	
	try {
		var args = _arguments||[];
		jsdbg.compiled[func.__jsdbg_id].apply(_this||window, args);
	}
	catch(ex) {
		if (ex != 'step_limit=0!' && ex != 'breakpoint!') {
			setTimeout(function(){ alert(ex); }, 50);
			throw ex;
		}
		
		/*if(jsdbg_ide_onclick)
			jsdbg_ide_onclick({type: 'open_debugger', ctx: jsdbg.ctx});*/
	}
};

jsdbg.stepIn = function () { 
	//jsdbg.ctx.__mode = 'stepin';
	
	for(var top_ctx = jsdbg.ctx; top_ctx.__up;)
		top_ctx = top_ctx.__up;
	jsdbg.ctx = top_ctx;

	try {
		jsdbg.step_limit = 1;
		if(jsdbg.ctx.__func_id == jsdbg.ctx.__callee.__jsdbg_id)
			jsdbg.compiled[jsdbg.ctx.__func_id]();
		else
			jsdbg.ctx.__callee();
	}
	catch(ex) {
		if (ex != 'step_limit=0!') throw ex;
	}

	if(jsdbg.ctx) jsdbg.old_ctx = jsdbg.ctx;
	delete jsdbg.ctx;
};

jsdbg.stepOver = function () { 
	var curr_ctx = jsdbg.ctx;

	for(var top_ctx = jsdbg.ctx; top_ctx.__up;)
		top_ctx = top_ctx.__up;

	for(prt_cnt=1222333; prt_cnt; prt_cnt--) {
		try {
			jsdbg.ctx = top_ctx;
			jsdbg.step_limit = 1;
			if(jsdbg.ctx.__func_id == jsdbg.ctx.__callee.__jsdbg_id)
				jsdbg.compiled[jsdbg.ctx.__func_id]();
			else
				jsdbg.ctx.__callee();
		}
		catch(ex) {
			if (ex != 'step_limit=0!') throw ex;
		}

		// не опускались ниже -> шаг выполнен
		if(jsdbg.ctx == curr_ctx) break;
		
		// если контекста нет (напр: был эксепшен) -> прерываем выполнение
		if(!jsdbg.ctx) break;

		// проверим цепочку контекстов наверх
		for(var tmp_ctx = jsdbg.ctx; tmp_ctx.__up; tmp_ctx = tmp_ctx.__up)
			if(tmp_ctx == curr_ctx) break;

		// нашли наш контекст в цепочке -> продолжим выполнение
		if(tmp_ctx == curr_ctx) continue;

		// в цепорке нет нашего контекста -> прерываем выполнение
		else break;
	}

	if (jsdbg.ctx) jsdbg.old_ctx = jsdbg.ctx;
	delete jsdbg.ctx;
};

jsdbg.continue = function () { 
	
	// поднимемеся на самый верх (в начало) цепочки вызовов
	for(var top_ctx = jsdbg.ctx; top_ctx.__up;)
		top_ctx = top_ctx.__up;
	jsdbg.ctx = top_ctx;
	
	// продолжим выполнение
	try {
		jsdbg.step_limit = 55222333;
		if(jsdbg.ctx.__func_id == jsdbg.ctx.__callee.__jsdbg_id)
			jsdbg.compiled[jsdbg.ctx.__func_id]();
		else
			jsdbg.ctx.__callee();
	} 
	catch(ex) {
		if (ex == 'step_limit=0!') return;
		throw ex;
	}
};

jsdbg.stepOut = function () { 
	// невозможно выйти наверх т.к. уже наверху
	if(!jsdbg.ctx.__up) return;
	
	// соберём список контекстов выше
	var list_up_ctx = [];
	for(var up_ctx = jsdbg.ctx.__up; up_ctx; up_ctx = up_ctx.__up)
		list_up_ctx.push(up_ctx);
	
	for(var top_ctx = jsdbg.ctx; top_ctx.__up;)
		top_ctx = top_ctx.__up;
	
	// идём по шагам, пока не выйдем в верхние контексты
	for(var prt_cnt=11222333; prt_cnt; prt_cnt--) {
		try {
			jsdbg.ctx = top_ctx;
			jsdbg.step_limit = 1;
			if(jsdbg.ctx.__func_id == jsdbg.ctx.__callee.__jsdbg_id)
				jsdbg.compiled[jsdbg.ctx.__func_id]();
			else
				jsdbg.ctx.__callee();
		} 
		catch(ex) {
			if (ex != 'step_limit=0!') throw ex;
		}
		
		// если контекста нет (напр: был эксепшен) -> прерываем выполнение
		if(!jsdbg.ctx) break;
		
		// ищем текущий контекст в нашем списке контекстов выше
		for(var i=0; i<list_up_ctx.length; i++)
			if(list_up_ctx[i] == jsdbg.ctx) { 
				jsdbg.old_ctx = jsdbg.ctx;
				delete jsdbg.ctx;
				return;
			}
	}
	console.error('prt_cnt = '+prt_cnt);

	if(jsdbg.ctx) jsdbg.old_ctx = jsdbg.ctx;
	delete jsdbg.ctx;
};

jsdbg.startDebug = function (src, _this, _arguments) { 
	// если уже функция, то используем её как есть
	if (typeof src == 'function') {
		var func = src;
	}
	
	// создаём функцию-обёртку
	else {
		var func_name = 'eval'+(new Date())*1;
		var func_src = 'function '+func_name+'(){\n'+src+'\n}';
		var func = eval('('+func_src+')');
	}
	
	// компилируем
	if(!func.__jsdbg_parent_id)
		var compiled_src = jsdbg.compileFunc(func, _this);

	// подготавливаем контекст
	jsdbg.ctx = new Ctx();
	jsdbg.ctx.__callee = func;

	// останавливаемся на первом же шаге
	jsdbg.step_limit = 1;
	
	try {
		var args = _arguments || [];
		if(func.__jsdbg_parent_id)
			func.apply(_this||window, args);
		else
			jsdbg.compiled[func.__jsdbg_id].apply(_this||window, args);
	} 
	catch(ex) {
		if (ex != 'step_limit=0!'/* && ex != 'breakpoint!'*/)
			throw ex;
	}
};

jsdbg.startDebugCtx = function (ctx, src, _this, _arguments) { 
	// если уже функция, то используем её как есть
	if (typeof src == 'function') {
		var func = src;
	}
	
	// создаём функцию-обёртку
	else {
		//var func_name = 'eval'+(new Date())*1;
		//var func_src = 'function '+func_name+'(){\n'+src+'\n}';
		var func_src = 'function(){\n'+src+';\n}';
		var func = eval('('+func_src+')');
	}
	
	var custom_scope = {};
	for(var f in ctx) 
	if(f[0] == '_' && f[1] == '_')
		continue;
	else
		custom_scope[f] = true;
	
	// компилируем
	var compiled_src = jsdbg.compileFunc(func, undefined, custom_scope);

	// подготавливаем контекст, копируем локальные переменные
	jsdbg.ctx = new Ctx();
	for(var f in ctx) 
	if(f[0] == '_' && f[1] == '_')
		continue;
	else
		jsdbg.ctx[f] = ctx[f];
	
	// незабываем проставить тек.фунцкию/метод
	jsdbg.ctx.__callee = func;

	// останавливаемся на первом же шаге
	jsdbg.step_limit = 1;
	
	try {
		var args = _arguments || ctx.arguments || [];
		jsdbg.compiled[func.__jsdbg_id].apply(_this||jsdbg.ctx.this||window, args);
	} 
	catch(ex) {
		if (ex != 'step_limit=0!' && ex != 'breakpoint!')
			throw ex;
	}
};

jsdbg.continueToIp = function (destination_ip) { 
	var curr_ctx = jsdbg.ctx;

	// найдём самый начало цепочки вызовов
	for(var top_ctx = jsdbg.ctx; top_ctx.__up;)
		top_ctx = top_ctx.__up;

	for(prt_cnt=55222333; prt_cnt; prt_cnt--)
	{
		// делаем шаг
		try {
			jsdbg.ctx = top_ctx;
			jsdbg.step_limit = 1;
			if(jsdbg.ctx.__func_id == jsdbg.ctx.__callee.__jsdbg_id)
				jsdbg.compiled[jsdbg.ctx.__func_id]();
			else
				jsdbg.ctx.__callee();
		}
		catch(ex) {
			if (ex != 'step_limit=0!') throw ex;
		}
		
		// если контекста нет (напр: был эксепшен) -> прерываем выполнение
		if(!jsdbg.ctx) break;

		// дошли до нужной точки -> завершаем
		if(jsdbg.ctx.__ip == destination_ip) break;

		// проверим цепочку контекстов наверх 
		// на случай если опустились ниже или произашёл возврат из функции/метода неожиданно
		for(var tmp_ctx = jsdbg.ctx; tmp_ctx.__up; tmp_ctx = tmp_ctx.__up)
			if(tmp_ctx == curr_ctx) break;

		// нашли наш контекст в цепочке -> продолжим выполнение
		if(tmp_ctx == curr_ctx) continue;

		// в цепорке нет нашего контекста -> прерываем выполнение
		else break;
	}

	if(jsdbg.ctx) jsdbg.old_ctx = jsdbg.ctx;
	delete jsdbg.ctx;
};

jsdbg.prototype.test1 = function () {
	return 1;
};

jsdbg.prototype.test0 = function () {
	
};



jsdbg.init();