Hoot.model.layers = function (context)
{
	var model_layers = {};
	var layers = {};
	var availLayers = [];
    var isLayerLoading = false;


    model_layers.layers = layers;
    model_layers.getmapIdByName = function (name) {
        var ar = _.filter(model_layers.getAvailLayers(), function (a) {
            return a.name === name;
        });
        if(!ar.length){return null;}
        return ar[0].id;
    };
    model_layers.getNameBymapId = function (id) {
        var currAvailLayers = model_layers.getAvailLayers();
        var layerSort = _.object(_.pluck(currAvailLayers, 'id'), currAvailLayers);
        var obj = layerSort[id];
        return obj ? obj.name : null;
    };


	model_layers.refresh = function (callback) {
        Hoot.model.REST('getAvailLayers', function (a) {

            if(a.status == 'failed'){
                if(a.error){
                    context.hoot().view.utilities.errorlog.reportUIError(a.error);
                }
            }

            if (!a.layers) {
                return callback([]);
            }
            availLayers = a.layers;
            if (callback) {
                callback(availLayers);
            }
        });
    };
    model_layers.getAvailLayers = function () {
        return availLayers;
    };
    model_layers.setAvailLayers = function (d) {
        availLayers = d;
        return availLayers;
    };
    model_layers.getLayers = function (opt) {
        if (opt) return layers[opt];
        return layers;
    };
    model_layers.layerSwap = function () {
        var merged = _.filter(layers, function (d) {
            return d.merged;
        });
        if (merged.length > 1) {
            merged = _.filter(merged, function (d) {
                return d.loadable;
            });
        }
        if (!merged || !merged.length) {
            return;
        }
        _.each(layers, function (d) {
            var mapid = d.mapId;
            var current = context.connection()
                .visLayer(mapid);
            var modifiedId = d.mapId.toString();
            if (current) {
                context.connection()
                    .hideLayer(mapid);
                d3.select('.layerControl_' + modifiedId)
                    .select('input')
                    .property('checked', false);
            }
            else {
                context.connection()
                    .showLayer(mapid);
                d3.select('.layerControl_' + modifiedId)
                    .select('input')
                    .property('checked', true);
            }
        });
        context.flush();
    };

    model_layers.changeLayerCntrlBtnColor = function(lyrId, color){
        var lyrSym = d3.select('#lyrcntrlbtn-' + lyrId);
        if(lyrSym && lyrSym.size()>0){
            var classStr = lyrSym.attr('class');
            var classList = classStr.split(' ');
            var colorAttrib = _.find(classList,function(cls){
                return cls.indexOf('fill-') === 0;
            });
            if(colorAttrib){
                lyrSym.classed(colorAttrib, false);
                lyrSym.classed('fill-' + color, true);
            }
        }
    };


    model_layers.addLayer2Sidebar = function (options) {
        var layerName = options.name;
        var modifiedId = options.mapId.toString();
        var parent = d3.select('.layer-list-hoot');
        var layerLinks = parent.insert('li', ':first-child')
            .attr('class', 'layers active hootLayers layerControl_' + modifiedId);
        var btn = layerLinks.append('button')
        .attr('id', 'lyrcntrlbtn-' + modifiedId)
        .classed('pad0x keyline-left tall fr fill-'+options.color,true)
        .style('border-radius','0 3px 3px')
            .on('click', function () {
                var feature = layerLinks.node();
                var prev = feature.previousElementSibling;
                if (!prev) {
                    return;
                }
                parent.node()
                    .insertBefore(feature, prev);

                var hootLyrs = d3.selectAll('.hootLayers');
                if(hootLyrs[0][0] != undefined){
                	var lyr = model_layers.getmapIdByName(d3.select(hootLyrs[0][0]).text());
                    context.connection().lastLoadedLayer(lyr.toString());
                    context.flush();
                }

            });
        btn.append('span')
        .classed('_icon up',true);
        var lbl = layerLinks.append('label');
        lbl.append('input').attr('type','checkbox').property('checked', true)
            .on('change', function () {
                model_layers.changeVisibility(layerName);
            });
        lbl.append('span').text(layerName);
    };



    model_layers.addLayerAndCenter = function (key, callback, extent) {
        var name = key.name;
        var mapId =  model_layers.getmapIdByName(name) || 155;
        if (layers[name]){return false;}

        key.mapId = mapId;
        if(extent){
            key.extent = extent;
        }

        var color = key.color;
        context.hoot()
            .changeColor(mapId, color);
        var projection = context.projection;
        var dimensions = d3.select('#map')
            .dimensions();
        layers[name] = key;
        context.connection().loadData(key);
        model_layers.addLayer2Sidebar(key);
        if (callback) callback();
    }

    model_layers.addLayer = function (key, callback) {
        // this isLayerLoading tracks on till key is added to layers object.
        isLayerLoading = true;
        var cMapId =  model_layers.getmapIdByName(key.name) || 155;
        context.connection().getMbrFromUrl(cMapId, function(resp){
            if(resp == null){

            } else {
                if(callback){
                    callback('showprogress');
                }

                // zoom and render
                var zoomLevel = context.map().getZoomLevel(resp.minlon, resp.minlat, resp.maxlon, resp.maxlat);
                context.zoomToExtent(resp.minlon, resp.minlat, resp.maxlon, resp.maxlat);

                model_layers.addLayerAndCenter(key, callback, resp);
            }

            isLayerLoading = false;
        });

    };


    model_layers.removeLayer = function (name) {
        //var mapid = model_layers.getLayers()[name].mapId;
        var mapid = model_layers.getLayers(name).mapId;
        delete layers[name];


        var lyrList = d3.selectAll('.layer-list');
        if(lyrList && lyrList.length > 0){

            for(var i=0; i<lyrList.length; i++){
                for(var j=0; j<lyrList[i].length; j++){
                    var dataArray = d3.select(d3.selectAll('.layer-list')[i][j]).selectAll('li.layer').data();
                    if(dataArray){

                        _.each(dataArray, function(d){
                            if(typeof d === 'object'){
                                if(d.name()==name){
                                    context.background().hideOverlayLayer(d);
                                }
                            }
                            
                        });
                    }
                }

            }
        }

        context.connection().loadedDataRemove(mapid.toString());
        d3.select('.layerControl_' + mapid.toString()).remove();
        context.flush();
    };
    model_layers.changeVisibility = function (name) {
        var layer = model_layers
            .getLayers(name);
        if (!layer) {
            return;
        }
        var mapid = layer.mapId;
        var current = context.connection()
            .visLayer(mapid);
        var modifiedId = mapid.toString();
        if (current) {
            context.connection()
                .hideLayer(mapid);
            context.flush(false);
            d3.select('.layerControl_' + modifiedId)
                .select('input')
                .property('checked', false);
        }
        else {
            context.connection()
                .showLayer(mapid);
            context.flush(false);
            d3.select('.layerControl_' + modifiedId)
                .select('input')
                .property('checked', true);
        }
    };


    model_layers.setLayerVisible = function(name) {
        var layer = model_layers
        .getLayers(name);
        if (!layer) {
            return;
        }
        var mapid = layer.mapId;
        var current = context.connection()
            .visLayer(mapid);
        if (!current){
            context.connection()
                .showLayer(mapid);
            context.flush(false);
            d3.select('.layerControl_' + mapid.toString())
                .select('input')
                .property('checked', true);
        }
    };


    model_layers.setLayerInvisible = function(name) {
        var layer = model_layers
        .getLayers(name);
        if (!layer) {
            return;
        }
        var mapid = layer.mapId;
        var current = context.connection()
            .visLayer(mapid);
        if (current) {
            context.connection()
                .hideLayer(mapid.toString());
            context.flush(false);
            d3.select('.layerControl_' + mapid)
                .select('input')
                .property('checked', false);
        }

    };

    model_layers.RefreshLayers = function ()
    {

        model_layers.refresh(/*function () {
           var combo = d3.combobox().data(_.map(model_layers.getAvailLayers(), function (n) {
                return {
                    value: n.name,
                    title: n.name
                };
            }));
            var controls = d3.selectAll('.reset.fileImport');
            var cntrl;

            for (var j = 0; j < controls.length; j++) {
                cntrl = controls[j];
                // for each of subitems
                for(k=0; k<cntrl.length; k++){
                    d3.select(cntrl[k]).style('width', '100%')
                    .call(combo);
                }

            }

        }*/context.hoot().model.import.updateCombo);



    };


   model_layers.isLayerLoading = function()
   {
        return isLayerLoading;
   }


   model_layers.getMergedLayer = function () {
        var merged = _.filter(layers, function (d) {
            return d.merged;
        });
        return merged;
    };

    return model_layers;
}