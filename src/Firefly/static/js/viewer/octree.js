var totalOctreeN = 0;
function traverseOctreeNodes(node){
	for (i=0; i<node.nodesIndices.length; i++) {
		var node = node.nodesByIndex[node.nodesIndices[i]];
		totalOctreeN += node.objects.length;
		console.log(node.objects.length, totalOctreeN, node.position.x, node.position.y, node.position.z, node);
		traverseOctreeNodes(node);
	}
}

function searchOctree() {
	viewerParams.octree.update();
	console.log("octree", viewerParams.octree)
	traverseOctreeNodes(viewerParams.octree.root)

	//this should search through the octree, and find cells that I can collapse into an individual point at the center of the box (e.g., the box size on the screen is smaller than some threshold).  Then I would want to remove? (or just set alpha = 0?) any of the points in those boxes.  Maybe I also need all the central points in the octree in a mesh which could be visualized?


}