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
	if (vars){
		if (!Array.isArray(vars)) vars = [vars];
		vars.forEach(function(v){
			var keys = Object.keys(v);
			keys.forEach(function(k,i){
				executeFunctionByName(k, window, v[k])
			});
		});
	}
}

function evalCommand(evalString){
	//console.log(evalString)
	//can I improve on this method?
	eval(evalString);
}

//can use these later, but will need to edit..
function setURLvars(paramsObj, name){
	var keys = Object.keys(paramsObj);
	var vars = "/"+name+"?" //this needs to be the same as what is in flask
	keys.forEach(function(k) {
		if (k != name){
			vars += k+"="+paramsObj[k]+"&";
		}
	});
	window.history.pushState(name+"Params", "updated", vars);
}
//https://html-online.com/articles/get-url-parameters-javascript/
function getURLvars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}
function setParamsFromURL(paramsObj){
	var vars = getURLvars();
	var keys = Object.keys(vars);
	keys.forEach(function(k){
		paramsObj[k] = parseFloat(vars[k])
	});
}
