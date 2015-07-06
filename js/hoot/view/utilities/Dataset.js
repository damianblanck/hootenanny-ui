Hoot.view.utilities.dataset = function(context)
{
    var hoot_view_utilities_dataset = {};
    
    hoot_view_utilities_dataset.createContent = function(form){
        var datasetControls = form.append('div');
        datasetControls
        .classed('pad1y pad2x keyline-bottom col12', true)
        .append('a')
        .attr('href', '#')
        .text('Add Dataset')
        .classed('dark fr button loud pad2x big _icon plus margin0', true)
        .on('click', function () {
            //importData.classed('hidden', false);
             Hoot.model.REST('getTranslations', function (d) {
                 if(d.error){
                     context.hoot().view.utilities.errorlog.reportUIError(d.error);
                     return;
                 }
                context.hoot().control.utilities.dataset.importDataContainer(d);
             });
        });
        datasetControls
	        .classed('pad1y pad2x keyline-bottom col12', true)
	        .append('a')
	        .attr('href', '#')
	        .text('Refresh')
	        .classed('dark fr button loud pad2x big _icon check', true)
	        .on('click', function () {
	        	hoot_view_utilities_dataset.populateDatasets(d3.select('#datasettable'));
	        });

        fieldset = form.append('div')
        .attr('id','datasettable')
            .classed('col12 fill-white small strong row10 overflow', true)
            .call(hoot_view_utilities_dataset.populateDatasets);
    };

    _createFolders = function(data, isSub){
    	//create a div and span for each, nested under parent
        var html = (isSub)?'<div>':''; // Wrap with div if true
        html += '<div>';
        for(item in data){
            html += '<div>';
            if(typeof(data[item].children) === 'object'){ // An array will return 'object'
                if(isSub){
                    html += '<div>' + data[item].name + '</div>';
                } else {
                    html += data[item].name; // Submenu found, but top level list item.
                }
                html += _createFolders(data[item].children, true); // Submenu found. Calling recursively same method (and wrapping it in a div)
            } else {
                html += data[item].name; // No submenu
            }
            html += '</div>';
        }
        html += '</div>';
        html += (isSub)?'</div>':'';
        return html;
    }
    
    _deleteDataset = function(spanType,parent_id,trashBtn,map_id){
    	d3.event.stopPropagation();
        d3.event.preventDefault();
       
        var warningMsg = spanType=='folder'? 'folder and all data?' : 'dataset?';
        
        if(!window.confirm("Are you sure you want to remove selected " + warningMsg)){return;}
        
        //delete all datasets that fall within folder.
        d3.select(trashBtn)
        	.classed('keyline-left keyline-right fr _icon trash pad2 col1',false)
        	.classed('keyline-left keyline-right pad1 row1  col1 fr',true).call(iD.ui.Spinner(context));
        
        var datasets2remove = [];
        
        if(spanType=='folder'){
        	datasets2remove = _.filter(hoot.model.layers.getAvailLayers(),function(f){
        		return f.path.indexOf(parent_id)>=0;
        	});
        } else {
        	var availLayers = context.hoot().model.layers.getAvailLayers();
            datasets2remove=_.filter(availLayers,function(n){return n.id==map_id;});
        }
        
        _.each(datasets2remove,function(dataset){
        	var mapId = dataset.name;
        	var exists = context.hoot().model.layers.getLayers()[mapId];
            if(exists){
                alert('Can not remove the layer in use.');
                return;
            }
            this.disabled = true;
            
            //var trashBtn = this;
	          d3.json('/hoot-services/osm/api/0.6/map/delete?mapId=' + mapId)
	            .header('Content-Type', 'text/plain')
	            .post("", function (error, data) {
	
	              var exportJobId = data.jobId;
	              trashBtn.id = 'a' + exportJobId;
	
	                var statusUrl = '/hoot-services/job/status/' + exportJobId;
	                var statusTimer = setInterval(function () {
	                    d3.json(statusUrl, function (error, result) {
	                        if (result.status !== 'running') {
	                            Hoot.model.REST.WarningHandler(result);
	                            clearInterval(statusTimer);
	                            var btnId = result.jobId;
	                            var curBtn = d3.select('#a' + btnId)[0];
	                            d3.select(curBtn[0].parentNode.parentNode)
	                            .remove();
	                            context.hoot().model.layers.RefreshLayers();
	                        }
	                    });
	                }, iD.data.hootConfig.JobStatusQueryInterval);	
	            });
        },this);
    }
    
    _createChildren = function(containerID,elem,tree){
    	var container = d3.select('#folder-'+containerID);
    	
		var elemData = elem.length!=undefined ? elem.slice(0) : elem.children;
		if(elemData!=undefined||null){
			_.each(elemData,function(item){
				var datasetDiv = container.append('div')
					.classed('col12 fill-white small keyline-bottom closed', true)
					.attr('id',"folder-" + item.id);
				var datasetSpan = datasetDiv.append('span')
			        .classed('text-left big col12 fill-white small hoverDiv2', true)
			        .style('text-indent',(25*(item.depth)) + 'px')
			        .text(item.name);
				datasetSpan.append('button')
					.classed('keyline-left keyline-right fr _icon trash pad2 col1', true)
					.style('height', '100%')
					.on('click', function () {
						 var parent_id = this.parentNode.parentNode.id.replace('folder-','').split('-').join('|');
						 var trashBtn = this;
						_deleteDataset('folder',parent_id,trashBtn,null);
					});

				datasetSpan.append('button')
					.classed('keyline-left fr _icon folderplus  pad2 col1', true)
					.style('height', '100%')
					.on('click',function(d){
						d3.event.stopPropagation();
			            d3.event.preventDefault();
			            if(d3.select('#folder-'+item.id).node().classList.contains('closed')){
			            	d3.select(this).classed('folderplus',false).classed('up',true);
			            	d3.select('#folder-'+item.id).classed('closed',false)
			            		.classed('open',true);
			            	_createChildren(item.id,item,tree);
							_addDatasets(item.id,item);			            	
			            } else if(d3.select('#folder-'+item.id).node().classList.contains('open')){
			            	d3.select(this).classed('folderplus',true).classed('up',false);
			            	d3.select('#folder-'+item.id).classed('closed',true)
			            		.classed('open',false)
			            		.selectAll('div').remove();
			            } 
					});
			});
		}	
    }
    
    _addDatasets = function(containerID,elem){
    	var container = containerID=='datasettable' ? d3.select('#'+containerID):d3.select('#folder-'+containerID);
    	
    	var elemData = elem.length!=undefined ? elem[0]:elem;
    	var parent_id = containerID=='datasettable' ? 'root':elemData.id;
    	var datasets = _.filter(hoot.model.layers.getAvailLayers(),function(f){
    		return f.path==parent_id.split('-').join('|');
    	});
    	
    	if(!_.isEmpty(datasets)){
        	_.each( datasets, function( dataset ){
        		var datasetDiv = container.append('div')
        		 	.classed('col12 fill-white small keyline-bottom', true)
        		 	.attr('id',function(d){return "dataset-" + dataset.id});
        		 var datasetSpan = datasetDiv.append('span')
        		 	.classed('text-left big col12 fill-white small hoverDiv2', true)
        		 	.style('text-indent',function(){
        		 		var level = dataset.path.split('|').length-1;
        		 		if(level==0){return '0px';}
        		 		else{return 25*(dataset.path.split('|').length) + 'px';}})
        		 	.text(dataset.name.substring(dataset.name.lastIndexOf('|')+1));
        	        	
			    datasetSpan.append('button')
			    // to reenable trash buttons remove quiet
			        .classed('keyline-left keyline-right fr _icon trash pad2 col1', true)
			        .style('height', '100%')
			        .on('click', function () {
						var parent_id =  this.parentNode.parentNode.parentNode.id.replace('folder-','').split('-').join('|');
			        	var map_id = this.parentNode.parentNode.id.replace('dataset-','');
						var trashBtn = this;
						_deleteDataset('dataset',parent_id,trashBtn,map_id);
			        });
			    datasetSpan.append('button')
			        .classed('keyline-left fr _icon export pad2 col1', true)
			        .style('height', '100%')
			        .on('click', function (d) {
			
			            d3.event.stopPropagation();
			            d3.event.preventDefault();
			
			            var mapid = context.hoot().model.layers.getmapIdByName(dataset.name);
			            Hoot.model.REST('getMapSize', mapid,function (sizeInfo) {
			                if(sizeInfo.error){
			                    return;
			                }
			                var expThreshold = 1*iD.data.hootConfig.export_size_threshold;
			                var totalSize = 1*sizeInfo.size_byte;
			
			                if(totalSize > expThreshold)
			                {
			                    var thresholdInMb = Math.floor((1*expThreshold)/1000000);
			                    var res = window.confirm("Export data size is greater than " + thresholdInMb 
			                        +"MB and export may encounter problem." +
			                        " Do you wish to continue?");
			                    if(res === false) {
			                        
			                        return;
			                    }
			                }
			
			                Hoot.model.REST('getTranslations', function (trans) {
			                    if(trans.error){
			                        context.hoot().view.utilities.errorlog.reportUIError(trans.error);
			                        return;
			                    }
			                    exportData = context.hoot().control.utilities.dataset.exportDataContainer(dataset, trans);
			                });
			            });
			        });
        		},elemData);
        	}
    }
    
    _getObjects = function(obj, key, val) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(_getObjects(obj[i], key, val));    
            } else 
            //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
            if (i == key && obj[i] == val || i == key && val == '') { //
                objects.push(obj);
            } else if (obj[i] == val && key == ''){
                //only add if the object is not already in the array
                if (objects.lastIndexOf(obj) == -1){
                    objects.push(obj);
                }
            }
        }
        return objects;
    }
    
    hoot_view_utilities_dataset.populateDatasets = function(container) {
    	context.hoot().model.layers
        	.refresh(function (d) {
        		var enabled = true;
            	container.selectAll('div').remove();
            	
            	var folders = context.hoot().model.layers.getAvailFolders(d);
            	var tree = context.hoot().model.layers.unflattenFolders(folders);            	
            	
            	//First create folders, then place datasets            	
            	tree= JSON.parse('{"name":"Datasets","type":"root","children":' + JSON.stringify(tree) +'}');
            	var la = container.selectAll('div')
            	    .data(tree.children)
                    .enter();
                var datasetDiv = la.append('div')
                    .classed('col12 fill-white small keyline-bottom closed', true)
                    .attr('id',function(d){return "folder-" + d.id});
                var datasetSpan = datasetDiv.append('span')
                    .classed('text-left big col12 fill-white small hoverDiv2', true)
                    .style('text-indent','0px')
                    .text(function (d) {
                        return d.name;
                    });
				datasetSpan.append('button')
					.classed('keyline-left keyline-right fr _icon trash pad2 col1', true)
					.style('height', '100%')
					.on('click', function () {
						 var parent_id = this.parentNode.parentNode.id.replace('folder-','').split('-').join('|');
						 var trashBtn = this;
						_deleteDataset('folder',parent_id,trashBtn,null);	
					});
                datasetSpan.append('button')//keyline-left fr _icon export pad2 col1
					.classed('keyline-left fr _icon folderplus pad2 col1', true)
					.style('height', '100%')
					.on('click',function(d){
						d3.event.stopPropagation();
			            d3.event.preventDefault();
			            if(d3.select('#folder-'+d.id).node().classList.contains('closed')){
			            	d3.select(this).classed('folderplus',false).classed('up',true);
			            	d3.select('#folder-'+d.id).classed('closed',false);
			            	d3.select('#folder-'+d.id).classed('open',true);
			            	_createChildren(d.id,d,tree);
							_addDatasets(d.id,d);			            	
			            } else if(d3.select('#folder-'+d.id).node().classList.contains('open')){
			            	d3.select(this).classed('folderplus',true).classed('up',false);
			            	d3.select('#folder-'+d.id).classed('closed',true)
			            		.classed('open',false)
			            		.selectAll('div').remove();
			            } 
					});
                
                _addDatasets(container.attr('id'),tree.children);
            });
    }




    return hoot_view_utilities_dataset;
}


