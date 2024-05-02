if(!window['Ctx']) function Ctx(parent_ctx){
	this.__ip = 0;
	this.__t = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
	this.__up = undefined;
	this.__down = undefined;
	this.__exception = undefined;
	this.__catch_block = {};
	
	if (parent_ctx)
		this.__proto__ = parent_ctx;
};

Ctx.prototype.__next_step = function (label) {
	console.log("__next_step(): label="+label+", step_limit="+(typeof jsdbg.step_limit == 'undefined' ? '(none)' : jsdbg.step_limit), this.__t);
	
	this.__ip = label;

	// указан лимит шагов?
	if(typeof jsdbg.step_limit != 'undefined') {
	
		// уменьшим кол-во шагов
		jsdbg.step_limit--;
		
		// если лимит шагов истёк, то ждём дльнейших указаний
		if(jsdbg.step_limit < 1) {
			throw "step_limit=0!";
		}
	}
	
	if(jsdbg.breakpoints[this.__func]) {
		for(var i=0; i<jsdbg.breakpoints[this.__func].length; i++) {
			var brk = jsdbg.breakpoints[this.__func];
			var start = Math.floor(this.__ip / 10000);
			var end = this.__ip % 10000;
			if(start <= brk && end >= brk)
				throw new UnknownError("breakpoint!");
		}
	}
	
	return;
};

Ctx.prototype.__func_start = function (func_name, func__jsdbg_id, parent_ctx) {
	console.log("__func_start(): func_name="+func_name);

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
	console.log("__func_end(): func_name="+func_name+", __func="+(this.__func||''));
	
	for(var up_ctx = this;; up_ctx = up_ctx.__up)
		if(up_ctx.__func == func_name) {
			if(up_ctx.__up) up_ctx.__up.__down = undefined; // отцепляем всё ниже
			return up_ctx.__up;
		}
		else {
			up_ctx.__up
		}
	
	// бывает что это самый верхний контекст
// 	if (up_ctx.__up)
		console.info("__func_end(): not found ctx.__func="+func_name+' !');
	
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
			return true;
		}
	}
		
	console.info("__catch(): Not found relevant ctx.__catch_block for "+this.__ip+"!");
	return false;
};

Ctx.prototype.__new = function () 
{
	// сразу проверим на native
	if(arguments[0].__jsdbg_compiled == 2)
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
	
	// скомпилирована -> создаём объект
	var new_obj = Object.create(arguments[0].prototype);
	switch(arguments.length) {
		case 1:
			return arguments[0].__jsdbg_call0(new_obj);
		case 2:
			return arguments[0].__jsdbg_call1(new_obj, arguments[1]);
		case 3:
			return arguments[0].__jsdbg_call2(new_obj, arguments[1], arguments[2]);
		case 4:
			return arguments[0].__jsdbg_call3(new_obj, arguments[1], arguments[2], arguments[3]);
		case 5:
			return arguments[0].__jsdbg_call4(new_obj, arguments[1], arguments[2], arguments[3], arguments[4]);
		case 6:
			return arguments[0].__jsdbg_call5(new_obj, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
		case 7:
			return arguments[0].__jsdbg_call6(new_obj, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]);
		default:
			throw new Error('not implemented yet!');
	}
}

if(!window['jsdbg']) function jsdbg(){};

jsdbg.init = function () 
{
	this.next_id = 1;
	this.compiled = []; // скомпилированые функции
	this.source = []; // исходный код скопилированых функций
	this.step_limit = undefined; // неограниченое количество шагов
	this.breakpoints = {};

	Function.prototype.__jsdbg_call = function()
	{
		// компилируем функцию если надо
		if(!this.__jsdbg_compiled)
			jsdbg.compileFunc(this);
			
		// новый контекст
		jsdbg.ctx = new Ctx();
			
		jsdbg.step_limit = 99;
		
		// уже скомпилированная функция (обычно anonymous)
		var func = this.__jsdbg_compiled ? this : jsdbg.compiled[this.__jsdbg_id];
		
		switch(arguments.length) {
			case 0:
				var result = func.call(window); break;
			case 1:
				var result = func.call(arguments[0]); break;
			case 2:
				var result = func.call(arguments[0], arguments[1]); break;
			case 3:
				var result = func.call(arguments[0], arguments[1], arguments[2]); break;
			case 4:
				var result = func.call(arguments[0], arguments[1], arguments[2], arguments[3]); break;
			case 5:
				var result = func.call(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break;
			default:
				alert('__jsdbg_call: Not implemented yet! '+arguments.lenght);
				throw new Error('__jsdbg_call: Not implemented yet! '+arguments.lenght);
		}
		
		return result;
	};
	
	// создадим прокси-функции
	Function.prototype.__jsdbg_call0 = function(){ 
		if (!this.__jsdbg_id && !this.__jsdbg_compiled) {
			if(jsdbg.compileFunc(this) == false) {
				// не удалось скомпилировать, возможно [native]
				return this.call(arguments[0]);
			}
		}
		if(!jsdbg.ctx.__down) {
			jsdbg.ctx.__down = new Ctx();
			jsdbg.ctx.__down.__up = jsdbg.ctx;
			jsdbg.ctx.__callee = this;
		}
		jsdbg.ctx = jsdbg.ctx.__down;
		if (this.__jsdbg_parent_ctx) 
			jsdbg.ctx.__proto__ = this.__jsdbg_parent_ctx;
		if (this.__jsdbg_compiled)
			return this.call(arguments[0]);
		else
			return (jsdbg.compiled[this.__jsdbg_id]||this).call(arguments[0]);
	};
	
	Function.prototype.__jsdbg_call1 = function(){ 
		if (!this.__jsdbg_id && !this.__jsdbg_compiled) {
			if(jsdbg.compileFunc(this) == false) {
				// не удалось скомпилировать, возможно [native]
				return this.call(arguments[0], arguments[1]);
			}
		}
		if(!jsdbg.ctx.__down) {
			jsdbg.ctx.__down = new Ctx();
			jsdbg.ctx.__down.__up = jsdbg.ctx;
			jsdbg.ctx.__callee = this;
		}
		jsdbg.ctx = jsdbg.ctx.__down;
		return (jsdbg.compiled[this.__jsdbg_id]||this).call(arguments[0], arguments[1]);
	};
	
	Function.prototype.__jsdbg_call2 = function(){ 
		if (!this.__jsdbg_id && !this.__jsdbg_compiled) {
			if(jsdbg.compileFunc(this) == false) {
				// не удалось скомпилировать, возможно [native]
				return this.call(arguments[0], arguments[1], arguments[2]);
			}
		}
		if(!jsdbg.ctx.__down) {
			jsdbg.ctx.__down = new Ctx();
			jsdbg.ctx.__down.__up = jsdbg.ctx;
			jsdbg.ctx.__callee = this;
		}
		jsdbg.ctx = jsdbg.ctx.__down;
		return (jsdbg.compiled[this.__jsdbg_id]||this).call(arguments[0], arguments[1], arguments[2]);
	};
	
	var args = [", arguments[1]", ", arguments[2]"];
	for(var arg_count=3; arg_count<10; arg_count++) 
	{
		args.push(", arguments["+arg_count+"]");
		Function.prototype['__jsdbg_call'+arg_count] = eval('(function(){\n'+ 
		'	if (!this.__jsdbg_id && !this.__jsdbg_compiled) {\n'+
		'		if(jsdbg.compileFunc(this) == false) {\n'+
		'			return this.call(arguments[0]'+args.join('')+');}\n'+
		'	}\n'+
		'	if(!jsdbg.ctx.__down) {\n'+
		'		jsdbg.ctx.__down = new Ctx();\n'+
		'		jsdbg.ctx.__down.__up = jsdbg.ctx;\n'+
		'		jsdbg.ctx.__callee = this;\n'+
		'	}\n'+
		'	jsdbg.ctx = jsdbg.ctx.__down;\n'+
		'	return (jsdbg.compiled[this.__jsdbg_id]||this).call(arguments[0]'+args.join('')+');\n'+
		'})');
	}
};

jsdbg.next_id = 1;

jsdbg.compiled = [];

jsdbg.source = [];

jsdbg.step_limit = undefined;

jsdbg.compile = function (src, id){
// 	this.src = src;
	this.code = [];
	this.tmp = 0; // текущая свободная временная переменная
	this.func_name = []; // стек вложенных функций
	this.func_id = id;
	this.break_ip = undefined;
	this.continue_ip = undefined;
	this.scope = [];
	
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
	
	if(node.type == "FunctionDeclaration") 
	{
		this.func_name.push(node.id.name);
		this.scope.unshift({arguments: true});
		this.code.push('\nfunction '+node.id.name+'(');
		
		// function arguments
		for(var i=0;i<node.params.length;i++) {
			this.code.push((i?', ':'')+node.params[i].name);
			this.scope[0][node.params[i].name] = true;
		}
		
		this.code.push('){');
	
		// prepare ctx
		this.code.push('\n\tvar ctx = (window.jsdbg ? jsdbg.ctx : new Ctx());');
		this.code.push('\n\tvar t = ctx.__t;');
		
		// продолжение выполнения или начало вызова?
		this.code.push('\n\tif(ctx.__ip == 0) {');
		
		// зарегистрируем начало функции
		this.code.push('\n\t\tctx.__func_start("'+node.id.name+'", '+this.func_id+');');
		
		// зарегистрируем arguments
		this.code.push('\n\t\tctx.arguments = arguments;');
		for(var i=0;i<node.params.length;i++)
			code.push('\n\t\tctx.'+node.params[i].name+' = arguments['+i+'];');
			
		this.code.push('\n\t}');
			
		// body
		this.code.push('\n\tfor(var _prt_cnt=20;_prt_cnt;_prt_cnt--) try{ switch(ctx.__ip){');
		this.code.push('\n\t\tcase 0:');
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
	}
	
	else if(node.type == "BlockStatement") {
		for(var i=0;i<node.body.length;i++) {
			this.compileAcornStmt(node.body[i]);
		}
	}
	
	else if(node.type == "VariableDeclaration") {
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
		// пустой return
		if (!node.argument) 
		{
			code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ctx.__func_end("'+this.func_name[this.func_name.length-1]+'"); return;');
		}
		// не пустой return
		else 
		{
			// вычислим возвращаемое
			var result_expr = this.compileAcornExpr(node.argument);
			
			// вернём
			code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ctx.__func_end("'+this.func_name[this.func_name.length-1]+'"); return '+result_expr+';');
		}
	}
	
	else if(node.type == "BreakStatement") 
	{
		code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+(node.start*10000+node.end)+': ctx.__next_step('+
			this.break_ip+'); break;');
	}
	
	else if(node.type == "ExpressionStatement") {
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');
		this.compileAcornExpr(node.expression, false);
	}
	
	else if(node.type == "IfStatement") 
	{
		// if-test
		this.compileAcornStmt(node.test);
		
		// if
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': if(!t['+this.tmp+']) ');
		if (node.alternate)
			this.code.push('{ ctx.__next_step('+(node.alternate.start*10000+node.alternate.end)+'); break; } else'); // идём на alternate
		else
			this.code.push('{ ctx.__next_step('+(node.end*10000+node.start)+'); break; } else'); // идём на перевёрнутый
			
		// if-true (consequent)
		this.compileAcornStmt(node.consequent);
		
		
		// if-false (alternate)
		if (node.alternate) 
		{
			// пусть идёт на перевёрнутый (перепрыгивает блок ниже)
			this.code.push(' ctx.__next_step('+(node.end*10000+node.start)+'); break;');
			
			this.code.push('\n\t\tcase '+(node.alternate.start*10000+node.alternate.end)+':');
			
			this.compileAcornStmt(node.alternate);
		}
		
		// перевёрнутый
		this.code.push(' ctx.__next_step('+
			(node.end*10000+node.start)+');\n\t\tcase '+
			(node.end*10000+node.start)+':');
	}
	
	else if(node.type == "WhileStatement" || node.type == "DoWhileStatement") 
	{
		var old_break_ip = this.break_ip;
		var old_continue_ip = this.continue_ip;
		this.break_ip = (node.end*10000+node.start); // перевёртыш
		this.continue_ip = node.test.start*10000+node.test.end; // начало
	
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');

		// while - сначало test, а потом body
		if (node.type == "WhileStatement") {
		
		// while-test
		this.compileAcornStmt(node.test);
		
		// while
		this.code.push('\n\t\t\tif(!t['+this.tmp+']) ' +
			'{ ctx.__next_step('+(node.end*10000+node.start)+'); break; };'); // идём на перевёрнутый
			
		// while-body
		this.compileAcornStmt(node.body);
		
		// возврат на while-test
		this.code.push(' ctx.__next_step('+
			(node.test.start*10000+node.test.end)+
			'); break;');
		}
		
		// do-while - сначало body, потом test 
		else if (node.type == "DoWhileStatement") {
		
		// while-body
		this.compileAcornStmt(node.body);
		
		// do-while-test
		this.compileAcornStmt(node.test);
		
		// do-while
		this.code.push('\n\t\t\tif(t['+this.tmp+']) ' +
			'{ ctx.__next_step('+(node.start*10000+node.end)+'); break; };'); // идём на начало цикла
	
		}
			
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
		this.continue_ip = node.update.start*10000+node.update.end; // на инкремент
	
		// for-init
		this.code.push(' ctx.__next_step('+
			(node.init.start*10000+node.init.end)+');\n\t\tcase '+
			(node.init.start*10000+node.init.end)+':');
		for(var i=0; i<node.init.declarations.length; i++)
			this.compileAcornStmt(node.init.declarations[i]);
		
		// for-test
		this.code.push(' ctx.__next_step('+
			(node.test.start*10000+node.test.end)+');\n\t\tcase '+
			(node.test.start*10000+node.test.end)+':');
		this.compileAcornStmt(node.test);
		
		// если for-test == false -> уходим на перевётыш (конец цикла)
		this.code.push('\n\t\t\tif(!t['+this.tmp+']) ');
		this.code.push('{ ctx.__next_step('+ (node.end*10000+node.start)+ '); break; }'); 
		
		// for-body
		this.compileAcornStmt(node.body);

		// for-update
		this.code.push(' ctx.__next_step('+
			(node.update.start*10000+node.update.end)+');\n\t\tcase '+
			(node.update.start*10000+node.update.end)+':');
		this.compileAcornStmt(node.update);
		
		// назад к for-test
		this.code.push(' ctx.__next_step('+(node.test.start*10000+node.test.end)+'); break;');
		
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
	
	else if(node.type == "EmptyStatement") {
		/* skip */
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
		}
		
		this.tmp = old_tmp;
		
		// шаг вызова функции
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = '+
			func_frag[0]+'.__jsdbg_call'+args.length + 
			'(' + func_frag[1] + (args.length?', ':'') +
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

	else if(node.type == "BinaryExpression") 
	{
		// сохраним на всякий случай
		var old_tmp = this.tmp;
		
		// вычислим левую часть
		var left = this.compileAcornExpr(node.left, true);
		this.tmp += left.indexOf('t[') == 0 ? 1 : 0;
		
		// вычислим правую часть
		var right = this.compileAcornExpr(node.right, true);
		//this.tmp += right.indexOf('t[') == 0 ? 1 : 0;
		
		// восстановим
		this.tmp = old_tmp;
		
		// подвыражение -> возвращаем как фрагмент
		if (is_subexpression)
			return left+' '+node.operator+' '+right;
		
		// возвращаем как шаг и временную переменную
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] = '+left+' '+node.operator+' '+right+';');
		return 't['+this.tmp+']';
	}
	
	else if(node.type == "LogicalExpression") 
	{
		// сохраним на всякий случай
		var old_tmp = this.tmp;
		
		// вычислим левую часть
		var left = this.compileAcornExpr(node.left, true);
		
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+':');
		
		// условное выполнение
		if (node.operator == '||') {
			this.code.push(' if('+left+') { t['+this.tmp+'] = '+left+'; ctx.__next_step('+(node.end*10000+node.start)+'); break; }');
		}
		else if (node.operator == '&&') {
			this.code.push(' if(!'+left+') { ctx.__next_step('+(node.end*10000+node.start)+'); break; }');
		}
		
		// вычислим правую часть
		this.compileAcornExpr(node.right, false);
						
		// восстановим
		this.tmp = old_tmp;
		
		// перевёрнутая метка (перевёртыш)
		this.code.push('\n\t\tcase '+
			(node.end*10000+node.start)+':');
			
		return 't['+this.tmp+']';
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
		this.tmp = old_tmp;
		
		// подвыражение -> вернём без шага и временной переменной
		if (is_subexpression)
			return '['+code_line+']';
			
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
			this.tmp += code_frag.indexOf('t[') == 0 ? 1 : 0;
			code_line.push((node.properties[i].key.raw || node.properties[i].key.name) + ': ' + code_frag);
		}
		this.tmp = old_tmp;
		
		if (is_subexpression)
			return '{'+code_line.join(', ')+'}';
		
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
		var this_frag = this.compileAcornExpr(node.object, true);
		if (this_frag.indexOf('t[') === 0)
			this.tmp += 1;
		
		if (node.property.type == "Identifier")
			var code_frag = this_frag + '.' + node.property.name;
		else
			var code_frag = this_frag + '[' + node.property.raw+']';
		
		// для правильного call нужен ещё и правильный this
		if (is_subexpression && with_this)
			return [code_frag, this_frag];
		
		else if (is_subexpression)
			return code_frag;
		
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': t['+this.tmp+'] ='+code_frag+';');

		return 't['+this.tmp+']';
	}

	else if(node.type == "FunctionExpression") 
	{
		this.code.push(' ctx.__next_step('+
			(node.start*10000+node.end)+');\n\t\tcase '+
			(node.start*10000+node.end)+': var parent_ctx = ctx; t['+this.tmp+'] = jsdbg.callback.bind(function(');
		
		// temp name
		var func_name = this.func_name[this.func_name.length-1]+'-func'+node.start;
		this.func_name.push(func_name)+'';
		this.scope.unshift({arguments:true}); 
		this.scope[0].__proto__ = this.scope[1];
		
		// params
		for(var i=0;i<node.params.length;i++) {
			this.code.push((i?', ':'')+node.params[i].name);
			this.scope[0][node.params[i].name] = true;
		}
		this.code.push('){');
		
		// prepare ctx
		this.code.push('\n\tvar ctx = (window.jsdbg ? jsdbg.ctx : new Ctx());');
		this.code.push('\n\tvar t = ctx.__t;');
		
		// продолжение выполнения или начало вызова?
		this.code.push('\n\tif(ctx.__ip == 0) {');
		
		// зарегистрируем начало функции
		this.code.push('\n\t\tctx.__func_start("'+func_name+'", '+this.func_id+', parent_ctx);');
		
		// зарегистрируем arguments
		this.code.push('\n\t\tctx.arguments = arguments;');
		for(var i=0;i<node.params.length;i++)
			code.push('\n\t\tctx.'+node.params[i].name+' = arguments['+i+'];');
			
		this.code.push('\n\t}');
		
		// arguments
		this.code.push('\n\tctx.arguments = arguments;');
		for(var i=0;i<node.params.length;i++)
			this.code.push('\n\tctx.'+node.params[i].name+' = arguments['+i+'];');
			
		// body
		this.code.push('\n\tfor(var _prt_cnt=100; _prt_cnt; _prt_cnt--) try { switch(ctx.__ip){');
		this.code.push('\n\t\tcase 0:');
		this.compileAcornStmt(node.body);
		
		// try{}catch(){}
		this.code.push('\n\t}} catch(ex) {');
		this.code.push('\n\t\tif(ex == "step_limit=0!") throw ex;');
		this.code.push('\n\t\telse if(ctx.__catch(ex)) continue;\n\t\telse throw ex;\n\t}');
		
		// prt_cnt
		this.code.push('\n\tdebugger; //if(_prt_cnt == 0) throw new Error("Infinity loop detected! (_prt_cnt==0)");');
		
		// function end and wrapper function end
		var closure_id = jsdbg.next_id++;
		this.code.push('\n\t}, '+closure_id+', '+this.func_id+');');
// 		jsdbg.source[closure_id] = this.src;
				
		// чтоб не компилировало при вызове проставим родительский id
// 		this.code.push(' t['+this.tmp+'].__jsdbg_id = '+this.func_id+';');
// 		this.code.push(' t['+this.tmp+'].__jsdbg_compiled = true;');
// 		this.code.push(' t['+this.tmp+'].__jsdbg_parent_ctx = ctx;');
		
		this.func_name.pop();
		this.scope.shift();
		
		return 't['+this.tmp+']';
	}

	else {
		console.info("Unknown node type: "+node.type, node);
		debugger;
	}
};

jsdbg.compileFunc = function (func) {
	if (typeof(func) == 'function') try {
		var src = func.toString();
		if(src.length < 150 && src.indexOf('[native code]') > 0) {
			func.__jsdbg_compiled = 2; // native code
			return false;
		}
		
		var new_id = jsdbg.next_id++;
		this.func_id = new_id;
		
		var compiled_src = jsdbg.compile(func.toString(), new_id);
		jsdbg.compiled[new_id] = eval('('+compiled_src+')');
		jsdbg.source[new_id] = func.toString();
		func.__jsdbg_id = new_id;
		return compiled_src;
	} catch(ex) {
		console.error(ex+'\n'+ex.stack);
	}
	return false;
};

jsdbg.callback = function(closure_id, parent_func_id) {
	this.__jsdbg_id = closure_id;
	this.__jsdbg_compiled = true;
	jsdbg.compiled[closure_id] = this;
	jsdbg.source[closure_id] || (jsdbg.source[closure_id] = jsdbg.source[parent_func_id]);

	switch(arguments.length) {
		case 0: throw new Error('Too few arguments!');
		case 1: return this.__jsdbg_call(window);
		case 2: return this.__jsdbg_call(window, arguments[1]);
		case 3: return this.__jsdbg_call(window, arguments[1], arguments[2]);
		case 4: return this.__jsdbg_call(window, arguments[1], arguments[2], arguments[3]);
		case 5: return this.__jsdbg_call(window, arguments[1], arguments[2], arguments[3], arguments[4]);
		case 6: return this.__jsdbg_call(window, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
		case 7: return this.__jsdbg_call(window, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]);
		case 8: return this.__jsdbg_call(window, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6], arguments[7]);
		default:
			throw new Error('Not implemented yet');
	}
}

jsdbg.debug = function (src) 
{
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
		jsdbg.compiled[func.__jsdbg_id].call(window);
	} catch(ex) {
		if (ex != 'step_limit=0!') 
			throw ex;
	}
	
	return jsdbg;
};

jsdbg.debugFunc = function (func) 
		{
			// компилируем функцию если надо
			this.compileFunc(func);
			
			// новый контекст
			jsdbg.ctx = new Ctx();
			
			jsdbg.step_limit = 1;
			
			jsdbg.compiled[func.__jsdbg_id].call(window);
			
// 			jsdbg_ide_onclick({type: });
		};

jsdbg.stepIn = function () {
			jsdbg.step_limit = 1;
			
			try {
				jsdbg.compiled[jsdbg.ctx.__callee.__jsdbg_id]();
			} catch(ex) {
				if (ex == 'step_limit=0!') return;
				throw ex;
			}
		};

jsdbg.stepOver = function () {
			jsdbg.step_limit = 1;
			
			try {
				jsdbg.compiled[jsdbg.ctx.__callee.__jsdbg_id]();
			} catch(ex) {
				if (ex == 'step_limit=0!') return;
				throw ex;
			}
		};

jsdbg.continue = function () {
	jsdbg.step_limit = 99;
	
	try {
		jsdbg.compiled[jsdbg.ctx.__callee.__jsdbg_id]();
	} catch(ex) {
		if (ex == 'step_limit=0!') return;
		throw ex;
	}
};

jsdbg.prototype.test1 = function test1() {
	return 1;
};

jsdbg.prototype.test0 = function test0() {
	
};

jsdbg.init();