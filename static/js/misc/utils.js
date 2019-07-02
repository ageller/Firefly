//https://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string
function executeFunctionByName(functionName, context /*, args */) {
	var args = Array.prototype.slice.call(arguments, 2);
	var namespaces = functionName.split(".");
	var func = namespaces.pop();
	for(var i = 0; i < namespaces.length; i++) {
		context = context[namespaces[i]];
	}
	//console.log(context, functionName, func, args)
	return context[func].apply(context, args);
}



function setParams(vars){
	if (!Array.isArray(vars)) vars = [vars];
	vars.forEach(function(v){
		var keys = Object.keys(v);
		keys.forEach(function(k,i){
			executeFunctionByName(k, window, v[k])
		});
	});

}

function evalCommand(evalString){
	console.log(evalString)
	//can I improve on this method?
	eval(evalString);
}