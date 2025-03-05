# JSDbg
A JavaScript Debugger written on JavaScript. It recompiles JavaScript code into another form suitable for debugging with JSDbg.

# Example of usage

'''html
<!doctype html>
<html>
<head>
	<title>JSDbg example</title>
	<script src="/acorn.js"></script>
	<script src="/jsdbg.js"></script>
	<script src="/jsdbg.ide.js"></script>
	<script>
	function test(event){
		if(event.target.nodeName == 'BUTTON')
			alert(event.targat.innerHTML); // "targat" - misprint. Debugger window will be opened.
	}
	</script>
</head>
<body>
	<button onclick="jsdbg(
		window.test /* func/method */,
		window /* this object (optional) */,
		event /* 1st argument (optional) */)">test()</button>
</body>
</html>
'''
