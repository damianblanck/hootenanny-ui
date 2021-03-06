Hoot.model.conflicts = function(context)
{
  var model_conflicts = {};
  var descendents = {};

    model_conflicts.beginReview = function (layer, callback) {
        var mapid = layer.mapId;
        context.hoot().model.layers.refresh(function () {
            Hoot.model.REST('ReviewGet', mapid, function (response) {
                if(response.error){
                    context.hoot().view.utilities.errorlog.reportUIError(response.error);
                    if(response.reset){
                        context.hoot().reset();
                    }
                    return;
                }

                if (!response.reviewableItems || !response.reviewableItems.length) {
                    return callback(response);
                }
                if (callback) {
                    response.reviewableItems = _.filter(response.reviewableItems, function (d) {
                        return d.type !== 'relation';
                    });
                    model_conflicts.reviews = response;
                    callback(response);
                }
            });
        });
    };
    model_conflicts.acceptAll = function (data, callback) {
        var items = data.reviewableItems;
        var mapid = data.mapId;
        var flagged = _.uniq(_.flatten(_.map(items, function (d) {
            return [d.type.charAt(0) + d.id + '_' + mapid, d.itemToReviewAgainst.type.charAt(0) + d.itemToReviewAgainst.id + '_' + mapid];
        })));
        var inID = _.filter(flagged, function (d) {
            return context.hasEntity(d);
        });
        _.each(inID, function (d) {
            var ent = context.hasEntity(d);
            if (!ent) {
                return;
            }
            var tags = ent.tags;
            var newTags = _.clone(tags);
            newTags = _.omit(newTags, function (value, key) {
                return key.match(/hoot:review/g);
            });
            context.perform(iD.actions.ChangeTags(d, newTags), t('operations.change_tags.annotation'));
        });
        var hasChanges = context.history().hasChanges();
        if (hasChanges) {
            iD.modes.Save(context).save(context, function () {
              //This must be called or the services database review database tables will not be
                //updated and duplicated review items will be returned for subsequent conflation jobs
                //against the same data.
                var reviewMarkData = {};
                reviewMarkData.mapId = data.mapId;
                Hoot.model.REST('ReviewMarkAll', reviewMarkData, function () {  });

                if (callback) {
                    callback();
                }
            });
        }
        else {
            callback();
        }
    };

    model_conflicts.RemoveAllReviews = function (data) {
        var items = data.reviewableItems;
        var mapid = data.mapId;
        var flagged = _.uniq(_.flatten(_.map(items, function (d) {
            //return [d.type.charAt(0) + d.id + '_' + mapid, d.itemToReviewAgainst.type.charAt(0) + d.itemToReviewAgainst.id + '_' + mapid];
            //ONLY remove the review against feature
            return [d.itemToReviewAgainst.type.charAt(0) + d.itemToReviewAgainst.id + '_' + mapid];
        })));
        var toDel = _.filter(flagged, function (d) {
            return context.hasEntity(d);
        });
        var delConflicts = iD.operations.Delete(toDel, context);
        delConflicts();
    };
    model_conflicts.RemoveFeature = function (item, mapid) {
        var featureID = item.type.charAt(0) + item.id + '_' + mapid;
        if (!context.hasEntity(featureID)) {
            window.console.log('delete error: ' + featureID);
        } else {
            var toDel = [featureID];
            var delConflicts = iD.operations.Delete([toDel], context);
            delConflicts();
        }

    };
    model_conflicts.autoMergeFeature = function (feature, featureAgainst, mapid) {
        var layerName = feature.layerName;

        if (!feature && !featureAgainst) {
             window.alert('Merge error, one feature is missing');
        } else {
            var osmXml = '<osm version=\'0.6\' upload=\'true\' generator=\'JOSM\'>' +
                JXON.stringify(feature.asJXON()) + JXON.stringify(featureAgainst.asJXON()) + '</osm>';

            context.connection().loadFromHootRest('poiMerge', osmXml, function(error, entities) {

                //Remove two input entities
                iD.operations.Delete([feature.id, featureAgainst.id], context)();

                //Add merged entity
                var mergedNode = entities[0];
                //FIXME: Temp hack to set version to 0
                mergedNode.version = 0;
                //Track merged ids in descendents
                descendents[feature.id] = mergedNode.id;
                descendents[featureAgainst.id] = mergedNode.id;

                //console.log(descendents);

                context.perform(
                    iD.actions.AddEntity(mergedNode),
                    t('operations.add.annotation.point'));

                context.enter(iD.modes.Select(context, [mergedNode.id]));

            }, mapid, layerName);
        }
    };
    model_conflicts.findDescendent = function (id) {
        //console.log(descendents[id]);
        var ent = context.hasEntity(descendents[id]);
        while (typeof ent === 'undefined' && typeof descendents[id] !== 'undefined') {
            ent = model_conflicts.findDescendent(descendents[id]);
        }
        return ent;
    };



  return model_conflicts;
};