//https://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string
function executeFunctionByName(functionName, context /*, args */) {
	var args = Array.prototype.slice.call(arguments, 2);
	var namespaces = functionName.split(".");
	var func = namespaces.pop();
	for(var i = 0; i < namespaces.length; i++) {
		context = context[namespaces[i]];
	}
	return context[func].apply(context, args);
}



function setParams(vars){
	//console.log('have params from sockets', vars)
	var keys = Object.keys(vars);
	keys.forEach(function(k,i){
		executeFunctionByName(k, window, vars[k])
	});

}