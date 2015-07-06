Hoot.control.utilities.folder = function(context) {

	var hoot_control_utilities_folder = {};


    hoot_control_utilities_folder.createFolderTree = function(container) {
    	// http://bl.ocks.org/mbostock/1093025 - Collapsible Indented Tree
    	
    	var folders = context.hoot().model.layers
		.getAvailLayersWithFolders();
    	folders= JSON.parse('{"name":"Datasets","children":' + JSON.stringify(folders) +'}');
	
    	var margin = {top: 10, right: 20, bottom: 30, left: 0},
	        width = '100%',
	        height = '150px', //'100%',
	        barHeight = 20,
	        barWidth = 100;
    	
	    var i = 0,
	        duration = 400,
	        root;
	
	    var tree = d3.layout.tree()
	        .nodeSize([0, 20]);
	
	    var diagonal = d3.svg.diagonal()
	        .projection(function(d) { return [d.y, d.x]; });
	
	    var svg = container.append("svg")
	        .attr("width", width)// + margin.left + margin.right)
	        .attr("height", height)// + margin.left + margin.right)
	      .append("g")
	        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	   
		folders.x0=0;
		folders.y0=0;
		update(root=folders);
	
	    function update(source) {
	
	      // Compute the flattened node list. TODO use d3.layout.hierarchy.
	      var nodes = tree.nodes(root);
	
	      var height = Math.max(400, nodes.length * barHeight + margin.top + margin.bottom);
	
	      d3.select("svg").transition()
	          .duration(duration)
	          .attr("height", height);
	
	      d3.select(self.frameElement).transition()
	          .duration(duration)
	          .style("height", height + "px");
	
	      // Compute the "layout".
	      nodes.forEach(function(n, i) {
	        n.x = i * barHeight;
	      });
	
	      // Update the nodes…
	      var node = svg.selectAll("g.node")
	          .data(nodes, function(d) { return d.id || (d.id = ++i); });
	
	      var nodeEnter = node.enter().append("g")
	          .attr("class", "node")
	          .attr("transform", function(d) { return "translate(" + 0 + "," + source.x0 + ")"; })
	          .style("opacity", 1e-6);
	
	      // Enter any new nodes at the parent's previous position.
	      nodeEnter.append("rect")
	          .attr("y", -barHeight / 2)
	          .attr("height", barHeight)
	          .attr("width", function(d){
	        	  return '100%';})
	          //.style("fill", color)
	          .attr("class", rectClass)
	          .on("click", click);
	
	      nodeEnter.append("text")
	          .attr("dy", 3.5)
	          .attr("dx", function(d){
	        	  return  5.5+(11*d.depth);})	//5.5
	          .attr('lyr-id',function(d){return d.id;})
	          .text(function(d) { return d.name.substring(d.name.lastIndexOf('|')+1); });
	      	
	      // Transition nodes to their new position.
	      nodeEnter.transition()
	          .duration(duration)
	          .attr("transform", function(d) { return "translate(" + 0 + "," + d.x + ")"; })
	          .style("opacity", 1);
	
	      node.transition()
	          .duration(duration)
	          .attr("transform", function(d) { return "translate(" + 0 + "," + d.x + ")"; })
	          .style("opacity", 1)
	        .select("rect")
	          //.style("fill", color);
	          .attr("class", rectClass);
	
	      // Transition exiting nodes to the parent's new position.
	      node.exit().transition()
	          .duration(duration)
	          .attr("transform", function(d) { return "translate(" + 0 + "," + source.x + ")"; })
	          .style("opacity", 1e-6)
	          .remove();
	
	      // Update the links…
	      var link = svg.selectAll("path.link")
	          .data(tree.links(nodes), function(d) { return d.target.id; });
	
	      // Enter any new links at the parent's previous position.
	      link.enter().insert("path", "g")
	          .attr("class", "link")
	          .attr("d", function(d) {
	            var o = {x: source.x0, y: source.y0};
	            return diagonal({source: o, target: o});
	          })
	        .transition()
	          .duration(duration)
	          .attr("d", diagonal);
	
	      // Transition links to their new position.
	      link.transition()
	          .duration(duration)
	          .attr("d", diagonal);
	
	      // Transition exiting nodes to the parent's new position.
	      link.exit().transition()
	          .duration(duration)
	          .attr("d", function(d) {
	            var o = {x: source.x, y: source.y};
	            return diagonal({source: o, target: o});
	          })
	          .remove();
	
	      // Stash the old positions for transition.
	      nodes.forEach(function(d) {
	        d.x0 = d.x;
	        d.y0 = d.y;
	      });
	    }
	
	    // Toggle children on click.
	    // If no children, consider it a dataset!
	    function click(d) {
	      var nodes = tree.nodes(root);
	      _.each(nodes,function(n){n.selected=false;});
	    	
	      if (d.children) {
	        d._children = d.children;
	        d.children = null;
	        d.selected = false;
	      } else {
	        d.children = d._children;
	        d._children = null;
	        //change color to signify selected
	        if(d.type=='dataset'){d.selected=true;}
	      }
	      update(d);
	    }
	
	    function color(d) {
	      //return d.selected ? "#ffff99" : d._children ? "#3182bd" : "#c6dbef";
	    	return d._children ? "#3182bd" : "#c6dbef";
	    }
	    
	    function rectClass(d) {
		      return d.selected ? "sel" : d._children ? "more" : "flat";
		    }
	    
	    function getWidth(d) {
	    	return '100%';
	    }
    }

	return hoot_control_utilities_folder;
};