Hoot.control.export = function (sidebar) {
    var exportResources = ['LTDS 4.0', 'MGCP'];
    var event = d3.dispatch('saveLayer', 'cancelSaveLayer');
    var exp = {};
    var save;
    exp.deactivate = function () {
        save.remove();
    };
 // This was for UTP FOUO but not necessary since user have know about it before creating custom translation
  /*  Hoot.model.REST('getExportResources', function (e) {
        if(e){
            exportResources = [];
            var resp = JSON.parse(e);
            _.each(resp, function(o){
                exportResources.push(o.description);
            });
        }

    });*/

    exp.activate = function (layer, translations) {
        var placeHolder = 'Select Data Translation Schema';
       
        
        var transCombo = [];
        // filters for exportable translations
        _.each(translations, function(tr){
            if(tr.CANEXPORT && tr.CANEXPORT == true){
                transCombo.push(tr);
            }
        });


        if(transCombo.length == 1){
            var emptyObj = {};
            emptyObj.NAME="";
            emptyObj.DESCRIPTION="";
            transCombo.push(emptyObj);
        }
        
        var d_save = [{
            label: 'Translation',
            type: 'fileExportTranslation',
            transcombo: transCombo,//exportResources,
            placeholder: placeHolder,//'LTDS 4.0'
            inputtype:'text'
        }, {
            label: 'Export Format',
            type: 'fileExportFileType',
            combobox: ['File Geodatabase', 'Shapefile', 'Web Feature Service (WFS)', 'Open Street Map (OSM)'],
            placeholder: 'File Geodatabase',
            inputtype:'text'
        }, {
            label: 'Output Name',
            type: 'fileExportOutputName',
            placeholder: layer.name || 'Output Name',
            inputtype:'text'
        }];
        save = sidebar
            .append('form')
            .classed('round space-bottom1', true);
        save
            .append('a')
            .classed('button dark animate strong block _icon big plus pad2x pad1y js-toggle active', true)
            .attr('href', '#')
            .text('Save')
            .on('click', function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                toggleForm(this);
            });
        save
            .append('fieldset')
            .classed('pad1 keyline-left keyline-right keyline-bottom round-bottom', true)
            .selectAll('.form-field')
            .data(d_save)
            .enter()
            .append('div')
            .classed('form-field fill-white small keyline-all round space-bottom1', true)
            .html(function (field) {
                if(field.inputtype=='checkbox'){
                	var retval = '<label class="pad1x pad0y strong fill-light round-top keyline-bottom">' + field.label + '</label>';
                	for (k in field.checkbox){
                		retval += '<label class="pad1x pad0y round-top keyline-bottom" style="opacity: 1;">';
                		retval += '<input type="checkbox" class="reset ' + k + '" style="opacity: 1;">'+field.checkbox[k]+'</label>';
                	}
                	return retval;
                } else {
                	return '<label class="pad1x pad0y strong fill-light round-top keyline-bottom">' + field.label; // + '</label><input type="text" class="reset ' + field.type + '" />';
                }
            })
            .append('input')
            .attr('type',function(field){if (field.inputtype=='text') return field.inputtype;})
            .value(function (field) {
            	if (field.inputtype=='text') return field.placeholder;
            })
            .attr('class', function (field) {
                return 'reset ' + field.type;
            })
            .select(function (a) {
            	if (a.checkbox){
            	   d3.selectAll('input.reset.fileExportOptions').remove();
            	}
            	if (a.combobox) {
                    var combo = d3.combobox()
                        .data(_.map(a.combobox, function (n) {
                            return {
                                value: n,
                                title: n
                            };
                        }));
                    d3.select(this)
                        .style('width', '100%')
                        .call(combo);
                }
                
                if (a.transcombo) {
                    var combotrans = d3.combobox()
                        .data(_.map(a.transcombo, function (n) {
                            return {
                                value: n.DESCRIPTION,
                                title: n.DESCRIPTION
                            };
                        }));
                    d3.select(this)
                        .style('width', '100%')
                        .call(combotrans);
                }   
            });
        var actions = save
            .select('fieldset')
            .append('div')
            .classed('form-field pill col12', true);
        actions
            .append('input')
            .attr('type', 'submit')
            .attr('value', 'Exit')
            .classed('fill-darken0 button round pad0y pad2x small strong', true)
            .attr('border-radius', '4px')
            .on('click', function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                event.cancelSaveLayer();
            });
        actions
            .append('input')
            .attr('type', 'submit')
            .attr('value', 'Export')
            .classed('fill-dark button round pad0y pad2x dark small strong margin0', true)
            .attr('border-radius', '4px')
            .on('click', function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                event.saveLayer(save, layer);
            });

        function toggleForm(context) {
            var text = (d3.select(context)
                .classed('active')) ? false : true;
            d3.select(context)
                .classed('active', text);
        }
        return save;
    };
    return d3.rebind(exp, event, 'on');
};
