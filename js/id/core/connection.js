//TODO: Document why this was modified for Hoot
iD.Connection = function(context) {

    var event = d3.dispatch('authenticating', 'authenticated', 'auth', 'loading', 'load', 'loaded', 'layer', 'layerAdding', 'layerAdded','tileAdded'),
        url = (context && iD.data.hootConfig) ? iD.data.hootConfig.url : 'http://www.openstreetmap.org',
        connection = {},
        inflight = {},
        loadedTiles = {},
        tileZoom = 2, //Why did Hoot change this from 16?  Maybe add to hootConfig instead of hardcode?
        oauth = osmAuth({
            url: (context && iD.data.hootConfig) ? iD.data.hootConfig.url : 'http://www.openstreetmap.org',
            oauth_consumer_key: '5A043yRSEugj4DJ5TljuapfnrflWDte8jTOcWLlT',
            oauth_secret: 'aB3jKq1TRsCOUrfOIZ6oQMEDmv2ptV76PA54NGLL',
            loading: authenticating,
            done: authenticated
        }),
        ndStr = 'nd',
        tagStr = 'tag',
        memberStr = 'member',
        nodeStr = 'node',
        wayStr = 'way',
        relationStr = 'relation',
      //TODO: Document why this was added for Hoot
        layerZoomArray = [],
        totalNodesCnt = 0 ,
        maxNodesCnt = 0,
        off;

    //TODO: Document why this was added for Hoot
    //FIXME: is this a dup of connection.authenticated?
    oauth.authenticated = function () {
        return true;
    };

    connection.changesetURL = function(changesetId) {
        return url + '/changeset/' + changesetId;
    };

    connection.changesetsURL = function(center, zoom) {
        var precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));
        return url + '/history#map=' +
            Math.floor(zoom) + '/' +
            center[1].toFixed(precision) + '/' +
            center[0].toFixed(precision);
    };

    connection.entityURL = function(entity) {
        return url + '/' + entity.type + '/' + entity.osmId();
    };

    connection.userURL = function(username) {
        return url + '/user/' + username;
    };

  //TODO: Document why this was modified for Hoot
    connection.loadFromURL = function(url, callback, mapId, layerName) {
        function done(dom) {
            var result = parse(dom, mapId, layerName);
            return callback(null, result);
        }
        return d3.xml(url).get().on('load', done);
    };

    connection.loadFromHootRest = function(command, data, callback, mapId, layerName) {
        function done(dom) {
            var result = parse(dom, mapId, layerName);
            return callback(null, result);
        }
        return Hoot.model.REST(command, data, done);
    };

  //TODO: Document why this was added for Hoot
    connection.getTileNodesCountFromURL = function(url, data, callback) {
        if (iD.data.hootConfig)
            d3.json(url)
                .header('Content-Type', 'text/plain')
                .post(JSON.stringify(data), function (error, resp) {
                    if (error) {
                        window.alert(error.responseText);
                        return ;
                    }
                    callback(resp);
                });
    };

  //TODO: Document why this was added for Hoot
    connection.getMbrFromUrl = function( mapId, callback) {
        var request = d3.json('/hoot-services/osm/api/0.6/map/mbr?mapId=' + mapId);
        request.get(function (error, resp) {
            if (error) {
                window.console.log(error);
                window.alert(error.responseText);
                return callback(null);

            }
            callback(resp);
        });
    };
    connection.isShowBBox = function(){
        return totalNodesCnt > maxNodesCnt;
    };
    connection.loadEntity = function(id, callback) {
        var type = iD.Entity.id.type(id),
            osmID = iD.Entity.id.toOSM(id);

        connection.loadFromURL(
            url + '/api/0.6/' + type + '/' + osmID + (type !== 'node' ? '/full' : ''),
            function(err, entities) {
                event.load(err, {data: entities});
                if (callback) callback(err, entities && _.find(entities, function(e) { return e.origid === id ; })); //Modified by Hoot
            });
    };

    connection.loadMultiple = function(ids, callback, hootcallback) {
        // TODO: upgrade lodash and just use _.chunk
        function chunk(arr, chunkSize) {
            var result = [];
            for (var i = 0; i < arr.length; i += chunkSize) {
                result.push(arr.slice(i, i + chunkSize));
            }
            return result;
        }

        var currMapId = null;
        // get the map id. Do on first one since ids should be coming from same map
        if(ids && ids.length > 0){
            var firstId = ids[0];
            var parts = firstId.split('_');
            if(parts.length > 1){
                currMapId = "" + parts[1];
            }
        }


        _.each(_.groupBy(ids, iD.Entity.id.type), function(v, k) {
            var type = k + 's',
                osmIDs = _.map(v, iD.Entity.id.toOSM);

            _.each(chunk(osmIDs, 150), function(arr) {
                if(currMapId){
                    connection.loadFromURL(
                        url + '/api/0.6/' + type + '?mapId=' + currMapId + '&elementIds'  + '=' + arr.join(),
                        function(err, entities) {
                            if (callback) callback(err, {data: entities}, hootcallback);
                        },currMapId);
                } else { // we do not know hoot map id so use the default iD behavior
                    connection.loadFromURL(
                        url + '/api/0.6/' + type + '?' + type + '=' + arr.join(),
                        function(err, entities) {
                            if (callback) callback(err, {data: entities});
                        });
                }

            });
        });

    };

    function authenticating() {
        event.authenticating();
    }

    function authenticated() {
        event.authenticated();
    }

    function getLoc(attrs) {
        var lon = attrs.lon && attrs.lon.value,
            lat = attrs.lat && attrs.lat.value;
        return [parseFloat(lon), parseFloat(lat)];
    }

  //TODO: Document why this was modified for Hoot
    function getNodes(obj, mapId) {
        var elems = obj.getElementsByTagName(ndStr),
            nodes = new Array(elems.length);
        for (var i = 0, l = elems.length; i < l; i++) {
            nodes[i] = 'n' + elems[i].attributes.ref.value + '_' + mapId;
        }
        return nodes;
    }

  //TODO: Document why this was modified for Hoot
    function getTags(obj, layerName) {
        var elems = obj.getElementsByTagName(tagStr),
            tags = {};
        for (var i = 0, l = elems.length; i < l; i++) {
            var attrs = elems[i].attributes;
            tags[attrs.k.value] = attrs.v.value;
        }
        tags.hoot = layerName;
        return tags;
    }

  //TODO: Document why this was modified for Hoot
    function getMembers(obj, mapId) {
        var elems = obj.getElementsByTagName(memberStr),
            members = new Array(elems.length);
        for (var i = 0, l = elems.length; i < l; i++) {
            var attrs = elems[i].attributes;
            members[i] = {
                id: attrs.type.value[0] + attrs.ref.value + '_' + mapId,
                type: attrs.type.value,
                role: attrs.role.value
            };
        }
        return members;
    }

    function getVisible(attrs) {
        return (!attrs.visible || attrs.visible.value !== 'false');
    }

  //TODO: Document why this was modified for Hoot
    var parsers = {
        node: function nodeData(obj, mapId, layerName) {
            var attrs = obj.attributes;
            return new iD.Node({
                id: iD.Entity.id.fromOSMPlus(nodeStr, attrs.id.value, mapId),
                origid: iD.Entity.id.fromOSM(nodeStr, attrs.id.value),
                loc: [parseFloat(attrs.lon.value), parseFloat(attrs.lat.value)],
                version: attrs.version.value,
                user: attrs.user && attrs.user.value,
                tags: getTags(obj, layerName),
                layerName: layerName,
                mapId: mapId,
                visible: getVisible(attrs)
            });
        },

        way: function wayData(obj, mapId, layerName) {
            var attrs = obj.attributes;
            return new iD.Way({
                id: iD.Entity.id.fromOSMPlus(wayStr, attrs.id.value, mapId),
                origid: iD.Entity.id.fromOSM(wayStr, attrs.id.value),
                version: attrs.version.value,
                user: attrs.user && attrs.user.value,
                tags: getTags(obj, layerName),
                nodes: getNodes(obj, mapId),
                layerName: layerName,
                mapId: mapId,
                visible: getVisible(attrs)
            });
        },

        relation: function relationData(obj, mapId, layerName) {
            var attrs = obj.attributes;
            return new iD.Relation({
                id: iD.Entity.id.fromOSMPlus(relationStr, attrs.id.value, mapId),
                origid: iD.Entity.id.fromOSM(relationStr, attrs.id.value),
                version: attrs.version.value,
                user: attrs.user && attrs.user.value,
                tags: getTags(obj, layerName),
                members: getMembers(obj, mapId),
                layerName: layerName,
                mapId: mapId,
                visible: getVisible(attrs)
            });
        }
    };

  //TODO: Document why this was modified for Hoot
    function parse(dom, mapId, layerName) {
        if (!dom || !dom.childNodes) return new Error('Bad request');
        var root = dom.childNodes[0],
            children = root.childNodes,
            entities = [];

        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i],
                parser = parsers[child.nodeName];
            if (parser) {
                entities.push(parser(child, mapId, layerName));
            }
        }

        return entities;
    }

    connection.authenticated = function () {
        //return oauth.authenticated();
        return true;
    };

    // Generate Changeset XML. Returns a string.
    connection.changesetJXON = function(tags) {
        return {
            osm: {
                changeset: {
                    tag: _.map(tags, function(value, key) {
                        return { '@k': key, '@v': value };
                    }),
                    '@version': 0.3,
                    '@generator': 'iD'
                }
            }
        };
    };

    // Generate [osmChange](http://wiki.openstreetmap.org/wiki/OsmChange)
    // XML. Returns a string.
    connection.osmChangeJXON = function(changeset_id, changes) {
        function nest(x, order) {
            var groups = {};
            for (var i = 0; i < x.length; i++) {
                var tagName = Object.keys(x[i])[0];
                if (!groups[tagName]) groups[tagName] = [];
                groups[tagName].push(x[i][tagName]);
            }
            var ordered = {};
            order.forEach(function(o) {
                if (groups[o]) ordered[o] = groups[o];
            });
            return ordered;
        }

        function rep(entity) {
            return entity.asJXON(changeset_id);
        }

        return {
            osmChange: {
                '@version': 0.3,
                '@generator': 'iD',
                'create': nest(changes.created.map(rep), ['node', 'way', 'relation']),
                'modify': nest(changes.modified.map(rep), ['node', 'way', 'relation']),
                'delete': _.extend(nest(changes.deleted.map(rep), ['relation', 'way', 'node']), {'@if-unused': true})
            }
        };
    };

    connection.changesetTags = function(comment, imageryUsed) {
        var detected = iD.detect(),
            tags = {
                created_by: 'iD ' + iD.version,
                imagery_used: imageryUsed.join(';').substr(0, 255),
                host: (window.location.origin + window.location.pathname).substr(0, 255),
                locale: detected.locale,
                browser: detected.browser + ' ' + detected.version,
                platform: detected.platform
            };

        if (comment) {
            tags.comment = comment;
        }

        return tags;
    };

  //TODO: Document why this was added for Hoot
    connection.putChangesetmapId = function(changes) {
        var mapid;
        var types = ['created', 'modified', 'deleted'];
        function getmapid(data){
             return _.map(data, function (a) {return a.mapId;});
        }
        for (var i = 0; i < types.length; i++) {
            var tagName = types[i];
            var obj = changes[tagName];
            if (obj.length && obj[0].layerName) {
                return obj[0].mapId;
            } else {
                return getmapid(loadedData);
            }
        }
        return mapid;
    };

  //TODO: Document why this was modified for Hoot
    connection.filterChangeset = function(changes) {
        var toChangemapids = {};
        var ways = _.filter(_.flatten(_.map(changes, function (a) {
            return a;
        })), function (c) {
            return c.type !== 'node';
        });
        var newWays = _.filter(ways, function (a) {
            return a.isNew();
        });
        var vis = connection.visLayers();
        var go = true;
        var defaultmapid;
        if (newWays.length && vis.length !== 1) {
            go = false;
        }
        if (vis.length === 1) {
            defaultmapid = vis[0];
        }
        if (!go) {
            window.alert('New way created with multiple layers visible. Turn off all layer but target layer');
            return false;
        }
        var mapids = _.compact(_.unique(_.map(_.flatten(_.map(changes, function (a) {
            return a;
        })), function (c) {
            return c.mapId;
        })));
        if (!mapids.length) {
            mapids = vis;
        }
        _.each(mapids, function (a) {
            toChangemapids[a] = {};
            toChangemapids[a].modified = [];
            toChangemapids[a].created = [];
            toChangemapids[a].deleted = [];
        });
        _.each(changes, function (a, aa) {
            if (!a.length) return;
            var type = aa;
            _.each(a, function (b) {
                var mapid = defaultmapid;
                if (b.isNew() && b.type === 'node') {
                    var parent = _.find(ways, function (a) {
                        return _.contains(a.nodes, b.id);
                    });
                    if (parent && parent.mapId) {
                        mapid = parent.mapId;
                    }
                } else {
                    mapid = (b.mapId) ? b.mapId : mapid;
                }
                toChangemapids[mapid][type].push(b);
            });
        });
        return toChangemapids;
    };

  //TODO: Document why this was modified for Hoot
    connection.putChangeset = function (changes, comment, imageryUsed, callback) {
        var changesArr = connection.filterChangeset(changes);
        if (!changesArr) {
            callback(true);
            return;
        }
        _.each(changesArr, function(a, b) {
            var changemapId = b;
            var changes = a;
            oauth.xhr({
                method: 'PUT',
                path: '/api/0.6/changeset/create?mapId=' + changemapId,
                options: { header: { 'Content-Type': 'text/xml' } },
                content: JXON.stringify(connection.changesetJXON(connection.changesetTags(comment, imageryUsed)))
            }, function(err, changeset_id) {
                if (err) return callback(err);
                oauth.xhr({
                    method: 'POST',
                    path: '/api/0.6/changeset/' + changeset_id + '/upload?mapId=' + changemapId,
                    options: { header: { 'Content-Type': 'text/xml' } },
                    content: JXON.stringify(connection.osmChangeJXON(changeset_id, changes))
                }, function(err) {
                    if (err) return callback(err);
                    oauth.xhr({
                        method: 'PUT',
                        path: '/api/0.6/changeset/' + changeset_id + '/close?mapId=' + changemapId,
                        options: { header: { 'Content-Type': 'text/plain' } }
                    }, function(err) {
                        callback(err, changeset_id);
                    });
                });
            });
        });
    };

  //TODO: Document why this was added for Hoot
    connection.createChangeset = function (mapId, comment, imageryUsed, callback) {
        oauth.xhr({
            method: 'PUT',
            path: '/api/0.6/changeset/create?mapId=' + mapId,
            options: {
                header: {
                    'Content-Type': 'text/xml'
                }
            },
            content: JXON.stringify(connection.changesetJXON(connection.changesetTags(comment, imageryUsed)))
        }, function (err, changesetId) {
            callback(err, changesetId);
        });
    };

  //TODO: Document why this was added for Hoot
    connection.closeChangeset = function (mapId, changesetId, callback) {
        oauth.xhr({
            method: 'PUT',
            path: '/api/0.6/changeset/' + changesetId + '/close?mapId=' + mapId,
            options: {
                header: {
                    'Content-Type': 'text/plain'
                }
            }
        }, function (err) {
            callback(err, changesetId);
        });
    };
    var userDetails;

    connection.userDetails = function(callback) {
        if (userDetails) {
            callback(undefined, userDetails);
            return;
        }

        function done(err, user_details) {
            if (err) return callback(err);

            var u = user_details.getElementsByTagName('user')[0],
                img = u.getElementsByTagName('img'),
                image_url = '';

            if (img && img[0] && img[0].getAttribute('href')) {
                image_url = img[0].getAttribute('href');
            }

            userDetails = {
                display_name: u.attributes.display_name.value,
                image_url: image_url,
                id: u.attributes.id.value
            };

            callback(undefined, userDetails);
        }

        oauth.xhr({ method: 'GET', path: '/api/0.6/user/details' }, done);
    };

    connection.status = function(callback) {
        function done(capabilities) {
            var apiStatus = capabilities.getElementsByTagName('status');
            callback(undefined, apiStatus[0].getAttribute('api'));
        }
        d3.xml(url + '/api/capabilities').get()
            .on('load', done)
            .on('error', callback);
    };

    function abortRequest(i) { i.abort(); }

    connection.tileZoom = function(_) {
        if (!arguments.length) return tileZoom;
        tileZoom = _;
        return connection;
    };

  //TODO: Document why this was added for Hoot
    var loadedData = {};
    connection.hideLayer = function (mapid) {
        if(loadedData[mapid]){
            loadedData[mapid].vis = false;
            var name = loadedData[mapid].name;
            d3.selectAll('.tag-hoot-' + mapid.toString()).remove();
            _.each(loadedTiles, function (a, b) {
                if (b.match(',' + mapid.toString() + '$')) {
                    delete loadedTiles[b];
                }
            });
        }
    };

    connection.showLayer = function (mapid) {
        loadedData[mapid].vis = true;
        return event.layer();
    };


    connection.visLayer = function (mapid) {
        if(loadedData[mapid]){
            return loadedData[mapid].vis;
        }
        return false;
    };

    connection.hiddenLayers = function () {
        var ar = [];
        _.each(loadedData, function (layer) {
            if (!layer.vis) {
                ar.push(layer.mapId);
            }
        });
        return ar;
    };

    connection.visLayers = function () {
        var ar = [];
        _.each(loadedData, function (layer) {
            if (layer.vis) {
                ar.push(layer.mapId);
            }
        });
        return ar;
    };

    connection.refresh = function () {
        event.layer();
    };

    var lastLoadedLayer;
    connection.lastLoadedLayer = function (d) {
        if(d){
            lastLoadedLayer=d;
            return lastLoadedLayer;
        }
        return lastLoadedLayer;
    };

    connection.loadData = function (options) {
        var mapid = options.mapId;
        loadedData[mapid] = options;
        loadedData[mapid].vis = true;
        lastLoadedLayer=options.mapId.toString();
        event.layer();
    };

    connection.loadedDataRemove = function (mapid) {
        delete loadedData[mapid];
        _.each(loadedTiles, function (a, b) {
            if (b.match(',' + mapid + '$')) {
                delete loadedTiles[b];
            }
        });
        event.layer();
    };

    connection.loadedData = function () {
        return loadedData;
    };

    connection.loadedTiles = function () {
        return loadedTiles;
    };

    connection.getLoadableTiles = function (projection, dimensions) {
        var s = projection.scale() * 2 * Math.PI,
            z = Math.max(Math.log(s) / Math.log(2) - 8, 0),
            ts = 256 * Math.pow(2, z - tileZoom),
            origin = [
            s / 2 - projection.translate()[0], s / 2 - projection.translate()[1]];
        var visLayers = _.filter(loadedData, function(layer) {
            return layer.vis;
        });
        var mapidArr = _.map(loadedData, function(layer) {
            return layer.mapId;
        });
        var tiles = _.map(visLayers, function(layer) {
            var _tiles = d3.geo.tile()
                .scaleExtent([tileZoom, tileZoom])
                .scale(s)
                .size(dimensions)
                .translate(projection.translate())()
                .map(function (tile) {
                    var x = tile[0] * ts - origin[0],
                        y = tile[1] * ts - origin[1];
                    return {
                        id: tile.toString() + ',' + layer.mapId,
                        extent: iD.geo.Extent(
                            projection.invert([x, y + ts]), projection.invert([x + ts, y])),
                        mapId: layer.mapId,
                        layerName: layer.name
                    };
                });
            return _tiles;
        });
        tiles = _.flatten(tiles);
        _.filter(inflight, function(v, i) {
            var wanted = _.find(tiles, function (tile) {
                var mapids = _.find(mapidArr, function (a) {
                    return tile.mapId === a;
                });
                return i === tile.id + ',' + mapids;
            });
            if (!wanted) delete inflight[i];
            return !wanted;
        })
            .map(abortRequest);

        var firstMapId = null;
        var params = [];
        tiles.forEach(function(tile) {
            var mapId = tile.mapId || mapId;
            firstMapId = mapId;
            var layerName = tile.layerName || layerName;
            var vis = connection.visLayer(mapId);

            _.find(loadedData, function (layer) {
                return layer.mapId === mapId;
            });

            if (!vis) return;

            var param = {};
            param.tile = tile.extent.toParam();
            param.mapId = '' + mapId;
            params.push(param);

        });

        return params;
    };

    var doFlush = false;
    var lastShowBBox = null;
  //END: Document why this was added for Hoot

    connection.loadTiles = function(projection, dimensions, callback) {

        if (off) return;

        var s = projection.scale() * 2 * Math.PI,
            z = Math.max(Math.log(s) / Math.log(2) - 8, 0),
            ts = 256 * Math.pow(2, z - tileZoom),
            origin = [
              s / 2 - projection.translate()[0],
              s / 2 - projection.translate()[1]];

      //TODO: Document why this was added for Hoot
        var visLayers = _.filter(loadedData, function (layer) {
            return layer.vis;
        });

      //TODO: Document why this was added for Hoot
        var mapidArr = _.map(loadedData, function (layer) {
            return layer.mapId;
        });

        // Transform visible Hootenanny layers into tiles
        var tiles = _.map(visLayers, function (layer) {
            var _tiles = d3.geo.tile()
                .scaleExtent([tileZoom, tileZoom])
                .scale(s)
                .size(dimensions)
                .translate(projection.translate())()
                .map(function (tile) {
                    var x = tile[0] * ts - origin[0],
                        y = tile[1] * ts - origin[1];

                    return {
                        id: tile.toString() + ',' + layer.mapId,
                        extent: iD.geo.Extent(
                            projection.invert([x, y + ts]),
                            projection.invert([x + ts, y])),
                            mapId: layer.mapId,
                            layerName: layer.name
                    };
                });
            return _tiles;
        });

        // transform multiple arrays into single so we can process
        tiles = _.flatten(tiles);


      //TODO: Document why this was modified for Hoot
        function bboxUrl(tile, mapId, layerName, layerExt, showbbox) {
            if (context.hoot().demo) { return '/data/'+layerName+'.xml'; }
            var ext = '';
            if(showbbox){
                iD.data.hootConfig.hootMaxImportZoom = context.map().zoom();
                if (layerExt) {
                    var layerZoomObj = _.find(layerZoomArray, function(a){
                        return mapId === a.mapId;
                    });
                    if(layerZoomObj){
                        layerZoomObj.zoomLevel = context.map().zoom();
                    } else {
                        layerZoomObj = {};
                        layerZoomObj.mapId = mapId;
                        layerZoomObj.zoomLevel = context.map().zoom();
                        layerZoomArray.push(layerZoomObj);
                    }
                    ext = '&extent=' + layerExt.maxlon + ',' + layerExt.maxlat +
                    ',' + layerExt.minlon + ',' + layerExt.minlat + '&autoextent=manual';
                }
            }

            return url + '/api/0.6/map?mapId=' + mapId + '&bbox=' + tile.extent.toParam() + ext;
        }

        _.filter(inflight, function(v, i) {
            var wanted = _.find(tiles, function (tile) {
                var mapids = _.find(mapidArr, function (a) {
                    return tile.mapId === a;
                });
                return i === tile.id + ',' + mapids;
            });
            if (!wanted) delete inflight[i];
            return !wanted;
        }).map(abortRequest);

        // Generate the coordinates of each tiles as parameter so we can calculate total numbers of
        // Node counts, which in turn used for determining density raster vs osm display
        var firstMapId = null;
        var params = [];
        tiles.forEach(function(tile) {
            var mapId = tile.mapId || mapId;
            firstMapId = mapId;
            var layerName = tile.layerName || layerName;
            var vis = connection.visLayer(mapId);

            _.find(loadedData, function (layer) {
                return layer.mapId === mapId;
            });

            if (!vis) return;
            //var id = tile.id + ',' + mapId;
            //if (loadedTiles[id]) return;
            var param = {};
            param.tile = tile.extent.toParam();
            param.mapId = '' + mapId;
            params.push(param);

        });

        connection.showDensityRaster = function(doShow){

            function toggleDensityRaster(d){
                if(d.subtype === 'density_raster'){
                    if(doShow){
                        context.background().showOverlayLayer(d);
                    } else {
                        context.background().hideOverlayLayer(d);
                    }
                }
            }
            //var tmsConfig = null;
            var lyrList = d3.selectAll('.layer-list');
            if(lyrList && lyrList.length > 0){

                for(var i=0; i<lyrList.length; i++){
                    for(var j=0; j<lyrList[i].length; j++){
                        var dataArray = d3.select(d3.selectAll('.layer-list')[i][j]).selectAll('li.layer').data();
                        if(dataArray){
                            _.each(dataArray, toggleDensityRaster);
                        }
                    }

                }
            }

        };
        // Get the node count from service
        connection.getTileNodesCountFromURL(url + '/api/0.6/map/nodescount', params, function(resp){

            function showOnTop(){
                d3.select(this).moveToFront();
            }
            totalNodesCnt = 1*resp.nodescount;
            maxNodesCnt = 1*iD.data.hootConfig.maxnodescount;

            var currShowBbox = totalNodesCnt > maxNodesCnt;

            if(currShowBbox !== lastShowBBox){

                doFlush = true;
                context.flush();

            }

            lastShowBBox = currShowBbox;

            tiles.forEach(function (tile) {
                var mapId = tile.mapId || mapId;
                var layerName = tile.layerName || layerName;
                var vis = connection.visLayer(mapId);

                var curLayer = _.find(loadedData, function (layer) {
                    return layer.mapId === mapId;
                });

                if (!vis) return;
                var id = tile.id + ',' + mapId;
                if (loadedTiles[id] || inflight[id]){
                    if(callback){
                        callback();
                    }
                    return;
                }

                if (_.isEmpty(inflight)) {
                    event.loading();
                }

                // get osm from server for tile
                inflight[id] = connection.loadFromURL(bboxUrl(tile, mapId, layerName, curLayer.extent, totalNodesCnt > iD.data.hootConfig.maxnodescount),
                        function (err, parsed) {
                            loadedTiles[id] = true;
                            delete inflight[id];

                            event.load(err, _.extend({data: parsed}, tile));

                            // When there is no more inflight item then we are done so do post processing
                            event.tileAdded();
                            if (_.isEmpty(inflight)) {
                                var hootLyrs = d3.selectAll('.hootLayers');
                                if(hootLyrs[0] !== undefined){
                                    for(var i=hootLyrs[0].length-1; i>-1; i--){
                                        var lyr = d3.select(hootLyrs[0][i]).text();
                                        var curId = _.find(loadedData, function(l){return l.name == lyr;});
                                        d3.selectAll('.tag-hoot-' + curId.mapId.toString()).each(function(){d3.select(this).moveToFront();});
                                        event.loaded();
                                        event.layerAdded(lyr);
                                    }
                                } else {
                                    var modifiedId = lastLoadedLayer.toString();
                                    d3.selectAll('.tag-hoot-'+modifiedId).each(function(){d3.select(this).moveToFront();});
                                    event.loaded();
                                    event.layerAdded(layerName);
                                }
                                if(totalNodesCnt > maxNodesCnt){
                                    connection.showDensityRaster(true);
                                } else {
                                    connection.showDensityRaster(false);
                                }
                                if(callback){
                                    callback();
                                }
                            }
                    }, mapId, layerName);
            });
        });
    };

    connection.switch = function(options) {
        url = options.url;
        oauth.options(_.extend({
            loading: authenticating,
            done: authenticated
        }, options));
        event.auth();
        connection.flush();
        return connection;
    };

    connection.toggle = function(_) {
        off = !_;
        return connection;
    };

    connection.flush = function() {
        _.forEach(inflight, abortRequest);
        loadedTiles = {};
        inflight = {};
        d3.select('.spinner').style('opacity',0);
        return connection;
    };

    connection.loadedTiles = function(_) {
        if (!arguments.length) return loadedTiles;
        loadedTiles = _;
        return connection;
    };

    connection.logout = function() {
        oauth.logout();
        event.auth();
        return connection;
    };

    connection.authenticate = function(callback) {
        function done(err, res) {
            event.auth();
            if (callback) callback(err, res);
        }
        return oauth.authenticate(done);
    };

    return d3.rebind(connection, event, 'on');
};
