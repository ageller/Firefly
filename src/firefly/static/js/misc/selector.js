function createSelector(){
    // wireframe sphere on front half
    const geometry1 = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI, 0, Math.PI);
    const wireframe = new THREE.WireframeGeometry(geometry1);
    const line = new THREE.LineSegments(wireframe);
    line.material.depthTest = true;
    line.material.opacity = 0.9;
    line.material.transparent = true;

    // back half of sphere filled in
    const geometry2 = new THREE.SphereGeometry(1, 16, 16, Math.PI, Math.PI, 0, Math.PI);
    const material = new THREE.MeshBasicMaterial({ color: "black" });
    material.depthTest = true;
    material.opacity = 0.7;
    material.transparent = true;   
    material.side = THREE.DoubleSide;
    const sphere = new THREE.Mesh(geometry2, material);

    // create a group to hold the two elements of the selector
    group = new THREE.Object3D();
    group.add(sphere);
    group.add(line);

    // for now I will place the selector to be right in front of the camera
    viewerParams.camera.add(group);
    group.position.set(0, 0, -viewerParams.selector.distance);

    viewerParams.selector.object3D = group;
    viewerParams.selector.object3D.scale.set(viewerParams.selector.radius, viewerParams.selector.radius, viewerParams.selector.radius);

    // run this later (in WebGLStart) so that the particles are created first
    // toggleDataSelector(viewerParams.selector.active);

}

function updateSelector(){
	// update the center, radius and send to the shader
	viewerParams.selector.object3D.getWorldPosition(viewerParams.selector.center);
    viewerParams.selector.object3D.scale.set(viewerParams.selector.radius, viewerParams.selector.radius, viewerParams.selector.radius);
    viewerParams.selector.object3D.position.set(0, 0, -viewerParams.selector.distance);

	viewerParams.partsKeys.forEach(function(p,i){
		viewerParams.partsMesh[p].forEach(function(m, j){
			m.material.uniforms.selectorCenter.value = [viewerParams.selector.center.x, viewerParams.selector.center.y, viewerParams.selector.center.z];
			m.material.uniforms.selectorRadius.value = viewerParams.selector.radius;
		})
	})
}

function gatherSelectedData(){
	// add some notification to the screen, maybe with a progress bar?

	// find the data that is inside the selected region 
	// is there a way to do this without looping through every particle?
	// this actually runs much more quickly than I anticipated (at least on our default sample data)
	var selected  = {};
	viewerParams.partsKeys.forEach(function(p,i){
		var j = 0;
		
		// create the arrays to hold the output
		selected[p] = {};
		viewerParams.inputDataAttributes[p].forEach(function(key){
			selected[p][key] = [];
		})

		while (j < viewerParams.parts[p].Coordinates_flat.length){
			var p0 = viewerParams.parts[p].Coordinates_flat.slice(j, j + 3);
			var pos = new THREE.Vector3(p0[0], p0[1], p0[2]); 
			if (pos.distanceTo(viewerParams.selector.center) < viewerParams.selector.radius) {
				// compile the output
				var index = Math.floor(j/3);
				Object.keys(selected[p]).forEach(function(key){
					if (key.includes('flat')){
						selected[p][key].push(viewerParams.parts[p][key].slice(j, j + 3));
					} else {
						selected[p][key].push(viewerParams.parts[p][key].slice(index, index + 1)[0]);
					}
				})
			}
			j += 3;
		}
		
		// I need to flatten any of the arrays that have the word "flat" in them
		Object.keys(selected[p]).forEach(function(key){
			if (key.includes('flat')) selected[p][key] = selected[p][key].flat();
		})
	})
	console.log(selected);

	return selected;
}

function downloadSelection(selected = null){
	// download the data that is physically inside the selector sphere
	console.log('downloading selected data...');
	if (!selected) selected = gatherSelectedData()

	downloadObjectAsJson(selected, 'Firefly_data_selection');
}

function sendSelectedData(selection = null){
	console.log('sending selected data to flask...');
	if (!selection) selection = gatherSelectedData();

	// send to Flask
	socketParams.socket.emit('send_selected_data', {'data':selection, 'room':socketParams.room});

}

