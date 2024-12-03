function test1a() {
	return 1+1;
}
test1a.__arguments = [];
test1a.__expect = 2;

function test1b(arg1, arg2) {
	return arg1+arg2;
}
test1b.__arguments = [2, 3];
test1b.__expect = 5;

function test1c(arg1, arg2) {
	return arg1 || arg2;
}
test1c.__arguments = [2, 3];
test1c.__expect = 2;

function test1d(arg1, arg2) {
	return arg1 && arg2;
}
test1d.__arguments = [2, 3];
test1d.__expect = 3;

function test1ca(arg1, arg2) {
	arg1++;
	return arg1;
}
test1ca.__arguments = [4, 6];
test1ca.__expect = 5;

function test1cb(arg1, arg2) {
	arg1--;
	return arg1;
}
test1cb.__arguments = [4, 6];
test1cb.__expect = 3;

function test1cc(arg1, arg2) {
	return arg1++;
}
test1cc.__arguments = [4, 6];
test1cc.__expect = 4;

function test1cd(arg1, arg2) {
	return ++arg1;
}
test1cd.__arguments = [4, 6];
test1cd.__expect = 5;

function test1d(arg1) {
	return [1,"two", 3.1, undefined, true, false, null];
}
test1d.__arguments = [3];
test1d.__expect = [1, "two", 3.1, undefined, true, false, null];

function test1e(arg1) {
	return {a: 1, b: 'two', "c": 3.1, e: undefined, "f f": true, _g: false, _123: null, __arg1: arg1};
}
test1e.__arguments = [123];
test1e.__expect = {a: 1, b: 'two', c: 3.1, e: undefined, "f f": true, _g: false, _123: null, __arg1: 123};

function test1f(arg1) {
	arg1.a += 1; // 1 -> 2
	arg1.b -= 1; // 12 -> 11
	arg1.c *= 2; // 10 -> 20
	arg1.d /= 3; // 12 -> 4
	arg1.e &= 4; // 15 -> 4
	arg1.f |= 8; // 4 -> 12
	arg1.g ^= 5; // 12 -> 9
	arg1.h %= 3; // 5 -> 2
	return arg1;
}
test1f.__arguments = [{a: 1, b: 12, c: 10, d: 12, e: 15, f: 4, g: 12, h: 5}];
test1f.__expect = {a: 2, b: 11, c: 20, d: 4, e: 4, f: 12, g: 9, h: 2};

function test1g() {
	return (1+2)*(3+4);
}
test1g.__arguments = [];
test1g.__expect = 21;

function test1h(arg1) {
	return !arg1;
}
test1h.__arguments = [0];
test1h.__expect = true;

function test2_if1(arg1) {
	if (arg1)
		return 1;
	else
		return 2;
}
test2_if1.__arguments = [false];
test2_if1.__expect = 2;

function test2_if2(arg1) {
	if (arg1) {
		return 1;
	}
	else {
		return 2;
	}
}
test2_if2.__arguments = [true];
test2_if2.__expect = 1;

function test2_if3(arg1) {
	if (arg1) return 1;
	return 2;
}
test2_if3.__arguments = [false];
test2_if3.__expect = 2;

function test2_if4(arg1, arg2) {
	if ((tmp = arg1.exec(arg2)) !== null)
		return tmp;
	return 2;
}
test2_if4.__arguments = [/3/g, '[123]'];
test2_if4.__expect = ["3"];

function test2_if5(arg1) {
	if (arg1 == 1)
		return 111;
	else if (arg1 == 2 && arg1 > 1)
		return 222;
	else
		return 333;
	return 0;
}
test2_if5.__arguments = [2];
test2_if5.__expect = 222;

function test2_if6(arg1) {
	var tmp1 = false;
	if (arg1 == 1)
		return 11;
	else if (arg1 == 3 && !tmp1)
		return 22;
	else
		return 33;
	return 0;
}
test2_if6.__arguments = [3];
test2_if6.__expect = 22;

function test2_if7_for(arg1) {
	for (var i = 3; i; i--)
	if (i == arg1 && i)
		break;
	else /* abc */ if (arg1 == i && !arg1)
		break;
	else {
		/* skip */;
	}
	return 0;
}
test2_if7_for.__arguments = [1];
test2_if7_for.__expect = 0;

function test2_ternaryif1(arg1, arg2, arg3) {
	return arg1 ? arg2 : arg3;
}
test2_ternaryif1.__arguments = [true, 123, 321];
test2_ternaryif1.__expect = 123;

function test2_for1(arg1) {
	var tmp = arg1;
	for(var i=0; i<3; i++)
		tmp++;
	return tmp;
}
test2_for1.__arguments = [0];
test2_for1.__expect = 3;

function test2_for2(arg1) {
	var tmp = arg1;
	for(var i=0; i<3; i++)
		return tmp++;
	return arg1;
}
test2_for2.__arguments = [0];
test2_for2.__expect = 0;

function test2_for3(arg1) {
	var tmp = arg1;
	var i=0;
	for(; i<3; i++)
		return tmp++;
	return arg1;
}
test2_for3.__arguments = [9];
test2_for3.__expect = 9;

function test2_for4(arg1) {
	var tmp = arg1;
	var i=0;
	for(/* no init */; /* no test */; i++)
		return tmp+1;
	return arg1;
}
test2_for4.__arguments = [9];
test2_for4.__expect = 10;

function test2_for5(arg1) {
	var tmp = arg1;
	var i=0;
	for(/* no init */; /* no test */; /* no increment */)
		return tmp+1;
	return arg1;
}
test2_for5.__arguments = [9];
test2_for5.__expect = 10;

function test2_while1(arg1) {
	var tmp = arg1;
	while(tmp)
		tmp--;
	return tmp;
}
test2_while1.__arguments = [3];
test2_while1.__expect = 0;

function test2_while2(arg1) {
	var tmp = arg1;
	while(tmp < 10) {
		tmp = tmp+1;
	}
	return tmp;
}
test2_while2.__arguments = [3];
test2_while2.__expect = 10;

function test2_while3(arg1) {
	var tmp = arg1;
	while(tmp < 10) {
		if (tmp == 4) break;
		tmp++;
	}
	return tmp;
}
test2_while3.__arguments = [3];
test2_while3.__expect = 4;

function test2_do_while4(arg1) {
	var tmp = arg1;
	do {
		if (tmp == 5) break;
		tmp++;
	} while(tmp < 10);
	return tmp;
}
test2_do_while4.__arguments = [3];
test2_do_while4.__expect = 5;

function test2_switch1(arg1, arg2) {
	var tmp;
	switch(arg1) {
		case 1: tmp = "one"; break;
		case 2: tmp = "two"; break;
		default: tmp = "many";
	}
	return tmp;
}
test2_switch1.__arguments = [2, 0];
test2_switch1.__expect = "two";

function test2_switch2(arg1) {
	var tmp;
	switch(arg1) {
		case 1: tmp = "one"; break;
		case 2: tmp = "two"; break;
		default: tmp = "many"; break;
	}
	return tmp;
}
test2_switch2.__arguments = [3, 0];
test2_switch2.__expect = "many";

function test2_switch3(arg1) {
	var tmp;
	switch(arg1) {
		case 1: tmp = "one"; 
		case 2: tmp = "two"; break;
		default: tmp = "many"; break;
	}
	return tmp;
}
test2_switch3.__arguments = [1, 0];
test2_switch3.__expect = "two";

function test3a(arg1) {
	return arg1.a;
}
test3a.__arguments = [{a: 999}];
test3a.__expect = 999;

function test3b(arg1) {
	return arg1[1];
}
test3b.__arguments = [[1,2,3]];
test3b.__expect = 2;

function test3c(arg1) {
	return arg1.a[2];
}
test3c.__arguments = [{a: [1,2,3]}];
test3c.__expect = 3;

function test3d(arg1) {
	return arg1.a.b[1].length;
}
test3d.__arguments = [{a: {b: ["1","22","333"]}}];
test3d.__expect = 2;

function test3e(arg1) {
	this.test3e_tmp1 = arg1+1;
	return this.test3e_tmp1;
}
test3e.__arguments = [9];
test3e.__expect = 10;

function test3f(arg1, arg2) {
	return arg1[arg2];
}
test3f.__arguments = [{a:1, b:2, c:3}, 'b'];
test3f.__expect = 2;

function test3g(arg1, arg2) {
	arg1[arg2+2] = 123;
	return arg1;
}
test3g.__arguments = [{a:1, b:2, c:3}, 'b'];
test3g.__expect = {a:1, b:2, c:3, b2: 123};

function test4_try1(arg1) {
	try {
		throw '123';
	} catch(ex) {
		return ex;
	}
	return arg1;
}
test4_try1.__arguments = [999];
test4_try1.__expect = '123';

function test4_forin1(arg1) {
	for(var f in arg1)
		if (f == 'bbb') return f;
}
test4_forin1.__arguments = [{aaa: 1, bbb: 2, ccc: 3}];
test4_forin1.__expect = 'bbb';

function test4_forin2(arg1) {
	for(var f in arg1)
		if (f == 'bbb') break;
	return arg1[f]
}
test4_forin2.__arguments = [{aaa: 1, bbb: 2, ccc: 3}];
test4_forin2.__expect = 2;

function test9_func1(arg1) {
	var func = function(){
		return arg1;
	};
	return func();
}
test9_func1.__arguments = [123];
test9_func1.__expect = 123;

function test9_func2(arg1) {
	function func(){
		return arg1;
	};
	return func();
}
test9_func2.__arguments = [1234];
test9_func2.__expect = 1234;

function test9_func3(arg1) {
	var tmp = 999;
	function func(){
		return tmp;
	};
	return func();
}
test9_func3.__arguments = [12345];
test9_func3.__expect = 999;

function test9b(arg1) {
	return JSON.stringify(arg1);
}
test9b.__arguments = ['abc'];
test9b.__expect = '"abc"';

function test9b2(arg1) {
	return localStorage.getItem(arg1);
}
test9b2.__arguments = ['abc'];
test9b2.__expect = null;

function test9c(arg1) {
	return new Date(arg1);
}
test9c.__arguments = [2000];
test9c.__expect = new Date("1970-01-01T00:00:02.000Z");

function test9c2(arg1) {
	return (new Date(arg1)).toString();
}
test9c2.__arguments = [2000];
test9c2.__expect = "Thu Jan 01 1970 03:00:02 GMT+0300 (MSK)";

/* ========================= */
function jsdbg_test_all() {
	document.getElementById('test_zone').innerHTML = '';
	
	jsdbg_test('test1a');
	jsdbg_test('test1b');
	jsdbg_test('test1c');
	jsdbg_test('test1ca');
	jsdbg_test('test1cb');
	jsdbg_test('test1cc');
	jsdbg_test('test1cd');
	jsdbg_test('test1d');
	jsdbg_test('test1e');
	jsdbg_test('test1f');
	jsdbg_test('test1g');
	jsdbg_test('test1h');
	
	jsdbg_test('test2_if1');
	jsdbg_test('test2_if2');
	jsdbg_test('test2_if3');
	jsdbg_test('test2_if4');
	jsdbg_test('test2_if5');
	jsdbg_test('test2_if6');
	jsdbg_test('test2_if7_for');
	jsdbg_test('test2_ternaryif1');
	jsdbg_test('test2_for1');
	jsdbg_test('test2_for2');
	jsdbg_test('test2_for3');
	jsdbg_test('test2_for4');
	jsdbg_test('test2_for5');
	jsdbg_test('test2_while1');
	jsdbg_test('test2_while2');
	jsdbg_test('test2_while3');
	jsdbg_test('test2_do_while4');
	jsdbg_test('test2_switch1');
	jsdbg_test('test2_switch2');
	jsdbg_test('test2_switch3');
	
	jsdbg_test('test3a');
	jsdbg_test('test3b');
	jsdbg_test('test3c');
	jsdbg_test('test3d');
	jsdbg_test('test3e');
	jsdbg_test('test3f');
	jsdbg_test('test3g');
	
	jsdbg_test('test4_try1');
	jsdbg_test('test4_forin1');
	jsdbg_test('test4_forin2');
	
	jsdbg_test('test9_func1');
	jsdbg_test('test9_func2');
	jsdbg_test('test9_func3');
	jsdbg_test('test9b');
	jsdbg_test('test9b2');
	jsdbg_test('test9c');
	jsdbg_test('test9c2');
}

function jsdbg_test(func_name, verbose, event) 
{
	if (!window[func_name]) return alert('Not found - '+func_name+'!');
	
	// компилируем
	delete window[func_name].__jsdbg_id;
	/*if (!window[func_name].__jsdbg_id)*/ try {
		var func_compiled = jsdbg.compileFunc(window[func_name]);
	}
	catch(ex) {
		console.error(ex.stack);
		func_compiled = '';
	}
	
	if (verbose) {
		document.querySelectorAll('textarea')[0].value = window[func_name].toString();
		document.querySelectorAll('textarea')[1].value = (jsdbg.compiled[window[func_name].__jsdbg_id]||func_compiled).toString();
		document.getElementById('result').innerHTML = JSON.stringify(acorn.parse(window[func_name].toString()), undefined, 2);
	}
	
	// переподключяем
	if (verbose && window[func_name].__jsdbg_id) {
		var script = document.querySelector('script#'+func_name);
		if (!script) {
			script = document.createElement('SCRIPT');
			script.id = func_name;
			script.onerror = function(event){ console.error(event); alert('Error! http://localhost:8800/ - not work!'); this.parentNode.removeChild(this); };
			script.src = 'http://localhost:8800/?src='+encodeURIComponent('jsdbg.compiled['+window[func_name].__jsdbg_id+']='+jsdbg.compiled[window[func_name].__jsdbg_id].toString()+';');
			document.head.appendChild(script);
		}
	}

	// лимит шагов как защита от infinity loop
	jsdbg.step_limit = 100;
	
	// запустим тест
	var result;
	if (window[func_name].__jsdbg_id)
	try {
		// защита от опечатки
		if('__arguments' in window[func_name] == false) 
			alert('Not found '+func_name+'.__arguments!');
		
		var args = window[func_name].__arguments||[]
		
		// попросили запустить под дебагером
		//console.log(event);
		if ((event||{}).ctrlKey) {
			jsdbg.debug(window[func_name], window, args);
			jsdbg_ide_onclick({type: 'open_debugger', ctx: jsdbg.ctx});
			return;
		}
		
		switch(args.length) {
			case 0:
				result = jsdbg(window[func_name], window);
				break;
			case 1:
				result = jsdbg(window[func_name], window, args[0]);
				break;
			case 2:
				result = jsdbg(window[func_name], window, args[0], args[1]);
				break;
			case 3:
				result = jsdbg(window[func_name], window, args[0], args[1], args[2]);
				break;
		}
	} catch(ex) {
		window[func_name].__exception = ex;
		console.error(ex.stack||ex);
		if(verbose) alert(ex.stack||ex);
	}
	
	var test_zone = document.getElementById('test_zone');
	
	// array
	if (Array.isArray(window[func_name].__expect)) 
	{
		var test_ok = true;
		if(Array.isArray(result))
		for(var i=0; i<window[func_name].__expect.length; i++) {
			if(window[func_name].__expect[i] !== result[i])
				test_ok = false;
		}
		else
			test_ok = false;
	}
	// object
	else if(typeof window[func_name].__expect == 'object') 
	{
		var test_ok = true;
		if(typeof result == 'object')
		for(var f in result) {
			if(window[func_name].__expect[f] !== result[f])
				test_ok = false;
		}
		else
			test_ok = false;
	}
	// ...
	else {
		var test_ok = result === window[func_name].__expect;
		console.log(func_name, result, window[func_name].__expect, test_ok)
	}
	
	if (test_ok) 
	{
		if(test_zone.innerHTML.indexOf(func_name) > 0)
			test_zone.innerHTML = test_zone.innerHTML.replace('color:red">'+func_name+'</a', 'color:green">'+func_name+'</a');
		else
			test_zone.insertAdjacentHTML('beforeend', ' <a href="javascript:void(0)" onclick="jsdbg_test(\''+func_name+'\', true, event)" style="color:green">'+func_name+'</a>');
	}
	else {
		try { 
			console.log(func_name+': '+result+' != '+window[func_name].__expect); } 
		catch(ex) { 
			console.error(ex); 
		}
		if (verbose) alert(func_name+': '+JSON.stringify(result)+' != '+JSON.stringify(window[func_name].__expect));
		
		if(test_zone.innerHTML.indexOf(func_name) > 0)
			test_zone.innerHTML = test_zone.innerHTML.replace('color:green">'+func_name+'</a', 'color:red">'+func_name+'</a');
		else
			test_zone.insertAdjacentHTML('beforeend', ' <a class="bad-test" href="javascript:void(0)" onclick="jsdbg_test(\''+func_name+'\', true, event)" style="color:red">'+func_name+'</a>');
	}
	
}

/* node.js */
if (typeof window == 'undefined') {
var http = require('http');
var url = require('url');
// var query = require('query');

http.createServer(function (req, res) {
	console.log(req.url.substring(0,40));
	res.writeHead(200, {'Content-Type': 'text/javascript'});
	res.write(decodeURIComponent(req.url.substring(6))||'')
	res.end();
}).listen(8800);
console.log('Listening *:8800');
}
