/**
 * 
 */

Hoot.model.export = function (context)
{

    var model_export = {};
    var statusTimer;
    var outputname;
    var selectedInput;
    var selExportTypeDesc;
    var removeConflationRes;
    var selectedOutType;
    var exportCallback;
    var mapId;

    model_export.exportData = function (container, data, callback) {
        _initVariables();
        exportCallback = callback;
        outputname = container.select('.reset.fileExportOutputName').value() || 
                container.select('.reset.fileExportOutputName').attr('placeholder');
        selectedInput = data.name || outputname;

        selExportTypeDesc = container.select('.reset.fileExportFileType')
            .value() || container.select('.reset.fileExportFileType').attr('placeholder');
        var _expType = {
            'File Geodatabase': 'gdb',
            'Shapefile': 'shp',
            'Web Feature Service (WFS)':'wfs',
            'Open Street Map (OSM)':'osm'
        };
        selectedOutType = _expType[selExportTypeDesc] || selExportTypeDesc;

        var transType = container.select('.reset.fileExportTranslation').value();

        var comboData = container.select('.reset.fileExportTranslation').datum();
        var transName = null;
        var oTrans = null;
        for(i=0; i<comboData.transcombo.length; i++){
            var o = comboData.transcombo[i];
            if(o.DESCRIPTION == transType){
                transName = o.NAME;
                oTrans = o;
                break;
            }

        }

        var selectedTranslation = 'translations/' + iD.data.hootConfig.defaultScript;

     // Checks to see if it is default translation and if so use the path specified

        var isDefTrans = false;
        if(oTrans && oTrans.DEFAULT == true) {
            if(oTrans.PATH && oTrans.PATH.length > 0){
                selectedTranslation = oTrans.PATH;
                isDefTrans = true;
            }
        }

        if(isDefTrans == false && transName != null && transName != '' ){
            selectedTranslation = 'customscript/' + transName + '.js';
        }

        if (!selectedInput || !selectedOutType) {
            alert('Please enter valid values.');
            return;
        }

        mapId = data.name;

        var param = {};
        param.translation = selectedTranslation;
        param.inputtype = 'db';
        param.input = selectedInput;
        param.outputtype = selectedOutType;
        param.outputname = outputname;
        d3.json('/hoot-services/job/export/execute')
            .header('Content-Type', 'text/plain')
            .post(JSON.stringify(param), function (error, data) {
                if(error){
                if(callback){callback(false);}
                alert('Data Download Fail');
                return;}


                var exportJobId = data.jobid;
                var statusUrl = '/hoot-services/job/status/' + exportJobId;
                statusTimer = setInterval(function () {
                    d3.json(statusUrl, _exportResultHandler);
                }, iD.data.hootConfig.JobStatusQueryInterval);
            });
    };
    
    var _exportResultHandler = function(error, result)
    {

        if (result.status !== 'running') {
            Hoot.model.REST.WarningHandler(result);
            clearInterval(statusTimer);
            var outNameParam = '';
            if (outputname !== null) {
                outNameParam = 'outputname=' + outputname;
            }
            if (exportCallback) {
                exportCallback(result.status);
            }

            if(result.status != 'failed'){
                if(removeConflationRes == "true"){
                    d3.json('/hoot-services/osm/api/0.6/map/delete?mapId=' + mapId)
                    .header('Content-Type', 'text/plain')
                    .post("", function (error, data) {

                    });
                }

                if(selectedOutType == 'wfs'){
                    var capaUrl = location.origin + '/hoot-services/ogc/' + result.jobId + 
                        '?service=WFS&version=1.1.0&request=GetCapabilities';
                    //alert('WFS Resource URL:\n' + capaUrl);
                    var param = {};
                    param.id = result.jobId;
                    context.hoot().control.utilities.wfsdataset.wfsDetailPopup(param);
                } else {
                    var sUrl = '/hoot-services/job/export/' + result.jobId + '?' + outNameParam + '&removecache=true';
                    var link = document.createElement('a');
                    link.href = sUrl;
                    if (link.download !== undefined) {
                        //Set HTML5 download attribute. This will prevent file from opening if supported.
                        var fileName = sUrl.substring(sUrl.lastIndexOf('/') + 1, sUrl.length);
                        link.download = fileName;
                    }
                    //Dispatching click event.
                    if (document.createEvent) {
                        var e = document.createEvent('MouseEvents');
                        e.initEvent('click', true, true);
                        link.dispatchEvent(e);
                        return true;
                    }
                }
            }


        }
    }

    var _initVariables = function()
    {
        statusTimer = null;
        outputname = null;
        selectedInput = null;
        selExportTypeDesc = null;
        removeConflationRes = null;
        selectedOutType = null;
        exportCallback = null;
        mapId = null;
    }

    return model_export;
}