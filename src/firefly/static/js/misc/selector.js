function createSelector(){
    // wireframe sphere on front half
    const geometry1 = new THREE.SphereGeometry(viewerParams.selector.radius, 16, 16, 0, Math.PI, 0, Math.PI);
    const wireframe = new THREE.WireframeGeometry(geometry1);
    const line = new THREE.LineSegments(wireframe);
    line.material.depthTest = true;
    line.material.opacity = 0.9;
    line.material.transparent = true;

    // back half of sphere filled in
    const geometry2 = new THREE.SphereGeometry(viewerParams.selector.radius, 16, 16, Math.PI, Math.PI, 0, Math.PI);
    const material = new THREE.MeshBasicMaterial({ color: "green" });
    material.depthTest = true;
    material.opacity = 0.9;
    material.transparent = true;   
    material.side = THREE.DoubleSide;
    const sphere = new THREE.Mesh(geometry2, material);

    // create a group to hold the two elements of the selector
    group = new THREE.Object3D();
    group.add(sphere);
    group.add(line);

    // for now I will place the selector to be right in front of the camera
    viewerParams.camera.add(group);
    group.position.set(0,0,-100);

    viewerParams.selector.object3D = group;
    //viewerParams.scene.add( sphere );

}

