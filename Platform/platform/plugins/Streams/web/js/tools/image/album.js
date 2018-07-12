(function (Q, $) {

/**
 * @module Streams-tools 
 */

var Users = Q.Users;
var Streams = Q.Streams;
var imagepicker;
var base64Image;
var result = false;
var dialog = Q.Dialogs;
var flag = 0;
var selector_tool = null;

if (!Q.plugins.Users.loggedInUser) {
    throw new Error("Streams.imageAlbum: Not logged in.");
}
$("#Streams_image_album_tool").parent().append("<button type='button' name='upload_image' id='image_album_add' >Add Image</button>");
$(document).on('click', "#image_album_add", function(){
    dialog.push(Q.extend({
        'title': 'Select Option',
        'content': $('<div class="Q_messagebox Q_big_prompt" />').append(
            $('<p />').html('Select option to upload an image.'),
            $('<div class="Q_buttons" />').append(
                $('<button class="Q_button_local" />').html('local'), ' ',
                $('<button class="Q_button_fb" />').html('Facebook')
            )
        ),
        'removeOnClose': true,
        'className': 'Q_confirm',
        'fullscreen': false,
        'hidePrevious': true
    }));
    $(document).on('click', "button.Q_button_local", function(e){
        if (Q.Tool.byId("Streams_image_album").activated == true && flag == 0 ) {
            var publisherId =  Q.Tool.byId("Streams_image_album").state.publisherId;
            var streamName =  Q.Tool.byId("Streams_image_album").state.streamName;
            Q.Tool.byId("Streams_image_album").state.onClickCreatable(publisherId, streamName);
            e.preventDefault();
            flag = 1;
        }
    });

    $(document).on('click', "button.Q_button_fb", function(){
        if ($("div#fb_photo_albums").hasClass('Streams_photoSelector_tool') == false) {
            if (Q.typeOf(selector_tool) !== "Q.Tool") {
                selector_tool = $("<div id='fb_photo_albums'>").tool("Streams/photoSelector", {
                    'oneLine' : true,
                    'onSelect' : Q.Tool.byId("Streams_image_album").state.onPhotoSelect,
                    'destroyOnClose' : true,
                    'onClose' : new Q.Event(function (wasRemoved) {
                        this.element.removeClass('Q_working');
                        Q.Masks.hide(this);
                        if (wasRemoved) {
                            this.$().hide(300, function () {
                                Q.removeElement(this, true);
                            });
                        }
                    }, 'Streams/photoSelector'),
                });
                selector_tool.insertAfter(this);
                selector_tool.activate();
            }
        }                
    });
});
Q.Tool.define("Streams/image/album", function _Streams_image_album_tool (options) {
    // check for required options
    var state = this.state;
    if ((!state.publisherId || !state.streamName)
	&& (!state.stream || Q.typeOf(state.stream) !== 'Streams.Stream')) {
		throw new Q.Error("Streams/image/album tool: missing publisherId or streamName");
	}
	if (!state.relationType) {
		throw new Q.Error("Streams/image/album tool: missing relationType");
    }
    if (state.sortable && typeof state.sortable !== 'object') {
		throw new Q.Error("Streams/image/album tool: sortable must be an object or false");
	}
    
    state.publisherId = state.publisherId || state.stream.fields.publisherId;
    state.streamName = state.streamName || state.stream.fields.streamName;

	state.refreshCount = 0;

	// render the tool
    this.refresh();
},
{
    publisherId: Q.info.app,
    isCategory: true,
	relationType: null,
	realtime: false,
	editable: true,
	closeable: true,
    creatable: {},
    imagepicker: {
		showSize: "50",
		fullSize: "200x"
    },
    throbber: "{{Q}}/img/throbbers/loading.gif",
    onClickCreatable: function (publisherId, streamName) {
        var slotNames = ['stream'];
        var options = options || {};

        if (options.fields) {
            Q.extend(fields, 10, options.fields);
        }

        var fields = {
            "publisherId": publisherId,
            "type": 'Streams/image',
            "Q.Streams.related.type": 'Streams/image',
            "Q.Streams.related.streamName": streamName,
            "Q.Streams.related.publisherId": publisherId
        };

        var baseUrl = Q.baseUrl({
            publisherId: publisherId,
            streamName: "" // NOTE: the request is routed to wherever the "" stream would have been hosted
        });
        fields["Q.clientId"] = Q.clientId();
        if (options.form) {
            fields["file"] = {
                path: 'Q/uploads/Streams'
            }
        }
        Q.req('Streams/stream', slotNames, function Stream_create_response_handler(err, data) {
        }, { 
            method: 'post', 
            fields: fields, 
            baseUrl: baseUrl, 
            form: options.form, 
            resultFunction: options.resultFunction
        });
        result = _refreshUnlessSocket(publisherId, streamName);
        function _refreshUnlessSocket(publisherId, streamName, options) {
            // close dialog box
            dialog.pop();
            // render the loading
            Q.Tool.byId("Streams_image_album").loading();
            return Q.Streams.refresh(publisherId, streamName, null, Q.extend({
                messages: true,
                unlessSocket: true
            }, options));
        }
        if (result) {
            setTimeout ( function() {
                // refreshing tool
                Q.Tool.byId("Streams_image_album").refresh();
                // remove loading.gif
                $(".Streams_image_album_loading").remove();
                flag = false;
                return flag;
            },3000);
        }
        _retain = undefined;
    },
    onPhotoSelect: function ($element, photo, images) {
        var src = images[0].source;
        toDataUrl(src, function (myBase64) {
            // call pick option
            Q.Tool.byId("Streams_image_album").state.pick(myBase64);
        });
        function toDataUrl(url, callback) {  
            var xhr = new XMLHttpRequest();  
            xhr.onload = function () {   
                var reader = new FileReader();   
                reader.onloadend = function () {    
                    callback(reader.result);   
                }   
            reader.readAsDataURL(xhr.response);  
            };  
        xhr.open('GET', url);  
        xhr.responseType = 'blob';  
        xhr.send(); 
        }
        // close dialog box
        dialog.pop();
        // $(this.element).empty();
        Q.Tool.remove(this.element);
        // render the loading
        Q.Tool.byId("Streams_image_album").loading();
        var publisherId = Q.Tool.byId("Streams_image_album").state.publisherId;
        var streamName = Q.Tool.byId("Streams_image_album").state.streamName;
        
        imagepicker = $('div#image_picker').plugin('Q/imagepicker', {   
            saveSizeName: { 
                200: "200.png",40: "40.png",80: "80.png",50: "50.png", '200x': "200x.png", 'x200': "x200.png" },   
            showSize: 50,  
            path: 'Q/uploads/Streams',
            subpath: publisherId.splitId() + '/',
            publisherId: publisherId,
            streamName: streamName,
            onSuccess: function(){
                Q.Tool.byId("Streams_image_album").refresh();
                // remove loading.gif
                $(".Streams_image_album_loading").remove();
            }
        });
    },
    sortable: {
		draggable: '.Streams_image_album_stream',
		droppable: '.Streams_image_album_stream'
	},
    tabs: function (previewTool, tabsTool) {
		return Streams.key(previewTool.state.publisherId, previewTool.state.streamName);
	},
    toolName: function (streamType) {
		return streamType+'/preview';
    },
    pick: function (src, callback) {
        var $this = imagepicker;
        var state = $this.state('Q/imagepicker');
        _upload.call(this, src);
        
        function _callback (err, res) {
            var state = $this.state('Q/imagepicker');
            var msg = Q.firstErrorMessage(err) || Q.firstErrorMessage(res && res.errors);
            if (msg) {
                $this.attr('src', state.oldSrc).stop().removeClass('Q_uploading');
                return Q.handle([state.onError, state.onFinish], $this, [msg]);
            }
            var key = state.showSize;
            if (!key) {
                // by default set src equal to first element of the response
                key = Q.firstKey(res.slots.data, {nonEmpty: true});
            }
            var c = Q.handle([state.onSuccess, state.onFinish], $this, 
                [res.slots.data, key, state.file || null]
            );
            if (c !== false && key) {
                $this.attr('src', 
                    Q.url(res.slots.data[key], null, {cacheBust: state.cacheBust})
                );
            }
            $this.removeClass('Q_uploading');
        }
    
        function _upload(data) {
            if (state.preprocess) {
                state.preprocess.call($this, _doCropping);
            } else {
                _doCropping();
            }			
            function _doCropping(override) {
            
                function _calculateRequiredSize (saveSizeName, imageSize, rotated) {
                    var widths = [], heights = [];
                    Q.each(saveSizeName, function(key, size) {
                        var parts = key.split('x');
                        var w = parseInt(parts[0] || 0);
                        var h = (parts.length === 2) ? parseInt(parts[1] || 0) : w;
                        var r = imageSize.width / imageSize.height;
                        widths.push(w || h * r || imageSize.width);
                        heights.push(h || w / r || imageSize.height);
                    });
                    var width = Math.max.apply( Math, widths );
                    var height = Math.max.apply( Math, heights );

                    return { width: width, height: height };
                };
    
                function _checkRequiredSize(requiredSize, imageSize) {
                    if (state.useAnySize) {
                        return true;
                    }
                    if (requiredSize.width > imageSize.width
                     || requiredSize.height > imageSize.height) {
                        var result = Q.handle(
                            [state.onTooSmall, state.onFinish], state, 
                            [requiredSize, imageSize]
                        );
                        if (result === false) {
                            return false;
                        }
                    }
                    return true;
                }
            
                function _selectionInfo(requiredSize, imageSize) {
                    if (!_checkRequiredSize(requiredSize, imageSize)) {
                        return _revert();
                    }
                    var result = {};
                    if ( requiredSize.width && requiredSize.height ) {
        //              if specified two dimensions - we should remove small size to avoid double reductions
                        if ( requiredSize.width > requiredSize.height ) {
                            requiredSize.height = null;
                        } else {
                            requiredSize.width = null;
                        }

                    }
                    var rqw = requiredSize.width;
                    var rqh = requiredSize.height;
                    var iw = imageSize.width;
                    var ih = imageSize.height;
                    if (rqw) {
                        result.width = rqw;
                        result.height = Math.ceil(imageSize.height * rqw/imageSize.width);
                    }
                    if (rqh) {
                        result.height = rqh;
                        result.width = Math.ceil(imageSize.width * rqh/imageSize.height);
                    }
                    result.left = (iw-result.width)/2;
                    result.top = (ih-result.height)/2;
                    return result;
                };
            
                function _doCanvasCrop (src, bounds, orientation, callback) {
                    // nothing to crop
                    if ( ! src || ! bounds ) {
                        throw new Q.Exception('Q/imagepicker: src and bounds are required!');
                    }
                
                    var canvas = $('<canvas style="display:none"></canvas>').appendTo('body')[0];
                
                    if (!( canvas && canvas.getContext('2d') )) {
                        return callback.call(this, src, params.crop);
                    }
                
                    canvas.width = bounds.requiredSize.width;
                    canvas.height = bounds.requiredSize.height;
        
                    var $img = $('<img />').on('load', function() {
                        // draw cropped image
                        var sourceLeft = bounds.left;
                        var sourceTop = bounds.top;
                        var sourceWidth = bounds.width;
                        var sourceHeight = bounds.height;
                        var destLeft = 0;
                        var destTop = 0;
                        var destWidth = bounds.requiredSize.width;
                        var destHeight = bounds.requiredSize.height;
                        var context = canvas.getContext('2d');
                        switch (orientation) {
                        case 8:
                            context.translate(-canvas.width, 0); 
                            context.rotate(-90*Math.PI/180);
                            break;
                        case 3:
                            context.translate(canvas.width, canvas.height); 
                            context.rotate(180*Math.PI/180);
                            break;
                        case 6:
                            context.translate(canvas.width, 0); 
                            context.rotate(90*Math.PI/180);
                            break;
                        }
                        var rotated = (orientation === 8 || orientation === 6);
                        var dw = rotated ? destHeight : destWidth;
                        var dh = rotated ? destWidth : destHeight;
                        drawImageIOSFix(
                            context, $img[0],
                            sourceLeft, sourceTop, sourceWidth, sourceHeight,
                            destLeft, destTop, dw, dh
                        );
                        var imageData = canvas.toDataURL();
                        $(canvas).remove();
                        $img.remove();
                        callback.call(this, imageData, null);
                    }).attr('src', src)
                    .css('display', 'none')
                    .appendTo('body');
                };
            
                function _onImgLoad() {
                    Q.addScript(EXIFjslib, function () {
                        EXIF.getData(img, function () {
                            var orientation = this.exifdata.Orientation;
                            var rotated = (orientation === 8 || orientation === 6);
                            var isw = img.width;
                            var ish = img.height;
                            var temp = null;
                            if (rotated) {
                                temp = isw;
                                isw = ish;
                                ish = temp;
                            }
                            imageSize = {
                                width: isw,
                                height: ish
                            };
                            var requiredSize  = _calculateRequiredSize(
                                state.saveSizeName, {width: isw, height: ish}, rotated
                            );
                            if (!_checkRequiredSize(requiredSize, imageSize)) {
                                return _revert();
                            }
                        
                            if (state.cropping && !state.saveSizeName.x) {
                                var $croppingElement = $('<img />').attr({ src: img.src })
                                    .css({'visibility': 'hidden'});
                                var $title = $('<div />')
                                    .addClass('Q_imagepicker_cropping_title')
                                    .html(state.croppingTitle);
                                var $explanation = $('<div />')
                                    .addClass('Q_imagepicker_cropping_explanation')
                                    .html(Q.info.isTouchscreen
                                        ? state.croppingTouchscreen
                                        : state.croppingNotTouchscreen
                                    );
                                var $croppingTitle = $('<div />').append(
                                    $title, $explanation
                                );
                                Q.Dialogs.push({
                                    className: 'Q_dialog_imagepicker',
                                    title: $croppingTitle,
                                    content: $croppingElement,
                                    destroyOnClose: true,
                                    apply: true,
                                    onActivate : {
                                        "Q/imagepicker": function ($dialog) {
                                            var w = requiredSize.width / isw;
                                            var h = requiredSize.height / ish;
                                            var rsw1 = rsw2 = requiredSize.width;
                                            var rsh1 = rsh2 = requiredSize.height;
                                            var dw = this.width();
                                            var dh = this.height();
                                            if (rsw2 != dw) {
                                                rsh2 *= dw / rsw1;
                                                rsw2 = dw;
                                            }
                                            // if (rsh2 > dh) {
                                            // 	rsw2 *= dh / rsh2;
                                            // 	rsh2 = dh;
                                            // }
                                            var maxScale = Math.min(rsw2 / rsw1, rsh2 / rsh1);
                                            $croppingElement.plugin('Q/viewport', {
                                                initial: {
                                                    x: 0.5, 
                                                    y: 0.5, 
                                                    scale: Math.max(rsw2 / isw, rsh2 / ish)
                                                },
                                                width: rsw2,
                                                height: rsh2,
                                                maxScale: maxScale
                                            }, function () {
                                                $croppingElement.css({'visibility': 'visible'});
                                                Q.handle(state.onCropping, $this, [
                                                    $dialog,
                                                    $croppingTitle,
                                                    $croppingElement
                                                ]);
                                            });
                                        }
                                    },
                                    beforeClose: function(dialog) {
                                        var state = $('.Q_viewport', dialog).state('Q/viewport');
                                        var result = state.selection;
                                        var bounds = {
                                            requiredSize: requiredSize,
                                            left: result.left * isw,
                                            top: result.top * ish,
                                            width: Math.max(
                                                result.width * isw, requiredSize.width
                                            ),
                                            height: Math.max(
                                                result.height * ish, requiredSize.height
                                            )
                                        };
                                        if (!_checkRequiredSize(requiredSize, bounds)) {
                                            return _revert();
                                        }
                                        var temp;
                                        if (orientation === 6) {
                                            temp = bounds.width;
                                            bounds.width = bounds.height;
                                            bounds.height = temp;
                                            temp = bounds.left;
                                            bounds.left = bounds.top;
                                            bounds.top = isw - temp - bounds.height;
                                        } else if (orientation === 8) {
                                            temp = bounds.height;
                                            bounds.height = bounds.width;
                                            bounds.width = temp;
                                            temp = bounds.top;
                                            bounds.top = bounds.left;
                                            bounds.left = ish - temp - bounds.width;
                                        } else if (orientation === 3) {
                                            bounds.top = ish - bounds.top - bounds.height;
                                            bounds.left = isw - bounds.left - bounds.width;
                                        }
                                        if (!bounds) return;
                                        _doCanvasCrop(img.src, bounds, orientation,
                                        function(data, crop) {
                                            params.data = data;
                                            params.crop = crop;
                                            _doUpload(params, data);
                                        });
                                    }
                                });
                            } else {
                                var bounds = _selectionInfo(requiredSize, imageSize);
                                bounds.requiredSize = requiredSize;
                                _doCanvasCrop(img.src, bounds, orientation,
                                function(data, crop) {
                                    params.data = data;
                                    params.crop = crop;
                                    _doUpload(params, data);
                                });
                            }
                        });
                    });
                }
            
                var EXIFjslib = '{{Q}}/js/exif.js';
                Q.addScript(EXIFjslib); // start loading it
            
                var params = {
                    data: data
                };
                Q.extend(params, override);
            
                if ((!state.cropping && !state.crop)
                || state.saveSizeName.x) {
                    _doUpload(override, data);
                    return;
                }
            
                var img = new Image;
                img.onload = _onImgLoad;
                img.src = params.data;
            }
        }
    
        function _doUpload(override, data) {
            base64Image = data;
            var state = $this.state('Q/imagepicker');
            if (!Q.plugins.Users.loggedInUser) {
                throw new Error("Streams.relate: Not logged in.");
            }
            
            var slotNames = ['stream'];
            var options = options || {};

            if (options.fields) {
                Q.extend(fields, 10, options.fields);
            }

            var publisherId = state.publisherId;
            var streamName = state.streamName;

            var fields = {
                "publisherId": publisherId,
                "type": 'Streams/image',
                "Q.Streams.related.type": 'Streams/image',
                "Q.Streams.related.streamName": streamName,
                "Q.Streams.related.publisherId": publisherId
            };

            var baseUrl = Q.baseUrl({
                publisherId: fields.publisherId,
                streamName: "" // NOTE: the request is routed to wherever the "" stream would have been hosted
            });
            fields["Q.clientId"] = Q.clientId();
            if (options.form) {
                fields["file"] = {
                    path: 'Q/uploads/Streams'
                }
            }
            Q.req('Streams/stream', slotNames, function Stream_create_response_handler(err, data) {
                if(data) {
                    if (override === false || (override && override.cancel)) {
                        return _revert();
                    }
                    var path = state.path;
                    path = (typeof path === 'function') ? path() : path;
                    var subpath = state.subpath;
                    subpath = (typeof subpath === 'function') ? subpath() : subpath + data.slots.stream.name;
                    subpath += '/icon/'+Math.floor(Date.now()/1000);
                    var params = {
                        'data': base64Image,
                        'path': path,
                        'subpath': subpath,
                        'save': state.saveSizeName,
                        'url': state.url,
                        'loader': state.loader,
                        'crop': null,
                    };
                    Q.extend(params, override);
                    if (Q.isEmpty(params.crop)) {
                        delete params.crop;
                    }
                    if (params.save && !params.save[state.showSize]) {
                        throw new Q.Error("Q/imagepicker tool: no size found corresponding to showSize");
                    }
                    
                    if (params.loader) {
                        var callable = params.loader;
                        delete params.loader;
                        Q.handle(callable, null, [params, _callback]);
                    } else {
                        var url = params.url;
                        delete params.url;
                        if (window.FileReader) {
                            Q.request(url, "data", _callback, {
                                fields: params,
                                method: 'POST'
                            });
                        } else {
                            delete params.data;
                            state.input.wrap('<form />', {
                                method: 'POST',
                                action: Q.url(url, params)
                            }).parent().submit();
                            state.input.unwrap();
                        }                        
                    }
                }
            }, { 
                method: 'post', 
                fields: fields, 
                baseUrl: baseUrl, 
                form: options.form, 
                resultFunction: options.resultFunction
            });
            
            _refreshUnlessSocket(publisherId, streamName);
            _retain = undefined;
        }

        function _refreshUnlessSocket(publisherId, streamName, options) {
            return Q.Streams.refresh(publisherId, streamName, null, Q.extend({
                messages: true,
                unlessSocket: true
            }, options));
        }
    
        function _revert() {
            var state = $this.state('Q/imagepicker');
            $this.attr('src', state.oldSrc)
                .stop()
                .removeClass('Q_uploading');
        }
        
        function detectVerticalSquash(img) {
           var iw = img.naturalWidth, ih = img.naturalHeight;
           var canvas = document.createElement('canvas');
           canvas.width = 1;
           canvas.height = ih;
           var ctx = canvas.getContext('2d');
           ctx.drawImage(img, 0, 0);
           var data = ctx.getImageData(0, 0, 1, ih).data;
           // search image edge pixel position in case it is squashed vertically.
           var sy = 0;
           var ey = ih;
           var py = ih;
           while (py > sy) {
               var alpha = data[(py - 1) * 4 + 3];
               if (alpha === 0) {
                   ey = py;
               } else {
                   sy = py;
               }
               py = (ey + sy) >> 1;
           }
           var ratio = (py / ih);
           return (ratio===0)?1:ratio;
       }

       function drawImageIOSFix(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
           var vertSquashRatio = detectVerticalSquash(img);
        // Works only if whole image is displayed:
        // ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh / vertSquashRatio);
        // The following works correct also when only a part of the image is displayed:
           ctx.drawImage(img, sx * vertSquashRatio, sy * vertSquashRatio, 
                              sw * vertSquashRatio, sh * vertSquashRatio, 
                              dx, dy, dw, dh );
       }
    },
    remove: function () {
        return this.each(function() {
            var $this = $(this);
            $this.off('.Q_imagepicker');
            if ($this.next().hasClass('Q_imagepicker_file')) {
                $this.next().remove();
            }
        });
    },
    onUpdate: new Q.Event(
        function _Streams_image_album_onUpdate(result, entering, exiting, updating) {
            function addComposer(streamType, params, creatable, oldElement) {
                // TODO: test whether the user can really create streams of this type
                // and otherwise do not append this element
                if (params && !Q.isPlainObject(params)) {
                    params = {};
                }
                params.streamType = streamType;
                var element = tool.elementForStream(
                    tool.state.publisherId, "", streamType, null, 
                    { creatable: params }
                ).addClass('Streams_image_album_composer Q_contextual_inactive');
                if (tool.tabs) {
                    element.addClass('Q_tabs_tab');
                }
                if (oldElement) {
                    $(oldElement).before(element);
                    var $last = tool.$('.Streams_image_album_composer:last');
                    if ($last.length) {
                        $(oldElement).insertAfter($last);
                    }
                } else {
                    var $prev = $container.find('.Streams_image_album_stream:first').prev();
                    if ($prev.length) {
                        $prev.after(element);
                    } else {
                        $container.append(element);
                    }
                }
                Q.activate(element, function () {
                    var rc = tool.state.refreshCount;
                    var preview = Q.Tool.from(element, 'Streams/preview');
                    var ps = preview.state;
                    tool.integrateWithTabs([element], true);
                    preview.state.beforeCreate.set(function () {
                        // workaround for now
                        if (tool.state.refreshCount > rc) {
                            return;
                        }
                        $(this.element)
                            .addClass('Streams_image_album_loading')
                            .removeClass('Streams_image_album_composer');
                        addComposer(streamType, params, null, element);
                        ps.beforeCreate.remove(tool);
                    }, tool);
                    preview.state.onCreate.set(function () {
                        $(this.element)
                            .removeClass('Streams_image_album_loading')
                            .removeClass('Streams_image_album_composer')
                            .addClass('Streams_image_album_stream');
                        ps.onCreate.remove(tool);
                    }, tool);
                    Q.handle(state.onComposer, tool, [preview]);
                });
            }
            
            var tool = this;
            var state = tool.state;
            var $te = $(tool.element);
            var $container = $te;
            var isTabs = $te.hasClass('Q_tabs_tool');
            if (isTabs) {
                $container = $te.find('.Q_tabs_tabs');
            }
            Q.removeElement($container.find('.Streams_preview_tool'), true);
            ++state.refreshCount;
            
            if (result.stream.testWriteLevel('relate')) {
                Q.each(state.creatable, addComposer);
                if (state.sortable && result.stream.testWriteLevel('edit')) {
                    if (state.realtime) {
                        alert("Streams/image/album: can't mix realtime and sortable options yet");
                        return;
                    }
                    var sortableOptions = Q.extend({}, state.sortable);
                    var $t = tool.$();
                    $t.plugin('Q/sortable', sortableOptions, function () {
                        $t.state('Q/sortable').onSuccess.set(function ($item, data) {
                            if (!data.direction) return;
                            var p = new Q.Pipe(['timeout', 'updated'], function () {
                                if (state.realtime) return;
                                Streams.image.album.cache.removeEach(
                                    [state.publisherId, state.streamName]
                                );
                                // TODO: replace with animation?
                                tool.refresh();
                            });
                            var s = Q.Tool.from(data.target, 'Streams/preview').state;
                            var i = Q.Tool.from($item[0], 'Streams/preview').state;
                            var r = i.related;
                            setTimeout(
                                p.fill('timeout'),
                                this.state('Q/sortable').drop.duration
                            );
                            Streams.updateRelation(
                                r.publisherId,
                                r.streamName,
                                r.type,
                                i.publisherId,
                                i.streamName,
                                s.related.weight,
                                1,
                                p.fill('updated')
                            );
                        }, tool);
                    });
                }
            }
            
            tool.previewElements = {};
            var elements = [];
            Q.each(result.relations, function (i) {
                if (!this.from) return;
                var tff = this.from.fields;
                var element = tool.elementForStream(
                    tff.publisherId, 
                    tff.name, 
                    tff.type, 
                    this.weight
                );
                elements.push(element);
                $(element).addClass('Streams_image_album_stream');
                Q.setObject([tff.publisherId, tff.name], element, tool.previewElements);
                $container.append(element);
            });
            // activate the elements one by one, asynchronously
            var previews = [];
            var map = {};
            var i=0;
            setTimeout(function _activatePreview() {
                var element = elements[i++];
                if (!element) {
                    if (tool.tabs) {
                        tool.tabs.refresh();
                    }
                    tool.state.onRefresh.handle.call(tool, previews, map, entering, exiting, updating);
                    return;
                }
                Q.activate(element, null, function () {
                    var index = previews.push(this) - 1;
                    var key = Streams.key(this.state.publisherId, this.state.streamName);
                    map[key] = index;
                    tool.integrateWithTabs([element], true);
                    setTimeout(_activatePreview, 0);
                });
            }, 0);
            // The elements should animate to their respective positions, like in D3.
    
        }, "Streams/image/album"),
    onRefresh: new Q.Event()
},
{
    loading: function _loading() {
		var tool = this;
		var state = tool.state;
		var $img = $('<img />').attr({
			'alt': 'loading',
			'src': Q.url(state.throbber),
			'class': 'Streams_image_album_loading'
		});
		$(tool.element).empty().append($img);
		_setWidthHeight(tool, $img);
	},
    /**
	 * Call this method to refresh the contents of the tool, requesting only
	 * what's needed and redrawing only what's needed.
	 * @method refresh
	 * @param {Function} onUpdate An optional callback to call after the update has completed.
	 *  It receives (result, entering, exiting, updating) arguments.
	 *  The child tools may still be refreshing after this. If you want to call a function
	 *  after they have all refreshed, use the tool.state.onRefresh event.
	 */
	refresh: function (onUpdate) {
		var tool = this;
		var state = tool.state;
		var publisherId = state.publisherId;
		var streamName = state.streamName;
		Streams.retainWith(tool).related(
			publisherId, 
			streamName, 
			state.relationType, 
			state.isCategory, 
			state.relatedOptions,
			relatedResult
		);
		
		function relatedResult(errorMessage) {
			if (errorMessage) {
				console.warn("Streams/image/album refresh: " + errorMessage);
				return;
			}
			var result = this;
			var entering, exiting, updating;
			entering = exiting = updating = null;
			function comparator(s1, s2, i, j) {
				return s1 && s2 && s1.fields && s2.fields
					&& s1.fields.publisherId === s2.fields.publisherId
					&& s1.fields.name === s2.fields.name;
			}
			var tsr = tool.state.result;
			if (tsr) {
				exiting = Q.diff(tsr.relatedStreams, result.relatedStreams, comparator);
				entering = Q.diff(result.relatedStreams, tsr.relatedStreams, comparator);
				updating = Q.diff(result.relatedStreams, entering, exiting, comparator);
			} else {
				exiting = updating = [];
				entering = result.relatedStreams;
			}
			tool.state.onUpdate.handle.apply(tool, [result, entering, exiting, updating]);
			Q.handle(onUpdate, tool, [result, entering, exiting, updating]);
			
			// Now that we have the stream, we can update the event listeners again
			var dir = tool.state.isCategory ? 'To' : 'From';
			var eventNames = ['onRelated'+dir, 'onUnrelated'+dir, 'onUpdatedRelate'+dir];
			if (tool.state.realtime) {
				Q.each(eventNames, function (i, eventName) {
					result.stream[eventName]().set(onChangedRelations, tool);
				});
			} else {
				Q.each(eventNames, function (i, eventName) {
					result.stream[eventName]().remove(tool);
				});
			}
			tool.state.result = result;
			tool.state.lastMessageOrdinal = result.stream.fields.messageCount;
		}
		function onChangedRelations(msg, fields) {
			// TODO: REPLACE THIS WITH AN ANIMATED UPDATE BY LOOKING AT THE ARRAYS entering, exiting, updating
			var isCategory = tool.state.isCategory;
			if (fields.type !== tool.state.relationType) {
				return;
			}
			if (!Users.loggedInUser
			|| msg.byUserId != Users.loggedInUser.id
			|| msg.byClientId != Q.clientId()
			|| msg.ordinal !== tool.state.lastMessageOrdinal + 1) {
				tool.refresh();
			} else {
				tool.refresh(); // TODO: make the weights of the items in between update in the client
			}
			tool.state.lastMessageOrdinal = msg.ordinal;
		}
    },
    
    /**
     * You don't normally have to call this method, since it's called automatically.
     * Sets up an element for the stream with the tag and toolName provided to the
     * Streams/related tool. Also populates "publisherId", "streamName" and "related" 
     * options for the tool.
     * @method elementForStream
     * @param {String } publisherId
     * @param {String} streamName
     * @param {String} streamType
     * @param {Number} weight The weight of the relation
     * @param {Object} options
     *  The elements of the tools representing the related streams
     * @return {HTMLElement} An element ready for Q.activate
     */
    elementForStream: function (publisherId, streamName, streamType, weight, options) {
        var state = this.state;
        var o = Q.extend({
            publisherId: publisherId,
            streamName: streamName,
            related: {
                publisherId: state.publisherId,
                streamName: state.streamName,
                type: state.relationType,
                weight: weight
            },
            editable: state.editable,
            closeable: state.closeable
        }, options);
        var f = state.toolName;
        if (typeof f === 'string') {
            f = Q.getObject(state.toolName) || f;
        }
        var toolName = (typeof f === 'function') ? f(streamType, o) : f;
        var e = Q.Tool.setUpElement(
            state.tag || 'div', 
            ['Streams/preview', toolName], 
            [o, {}], 
            null, this.prefix
        );
        return e;
    },
    	/**
	 * You don't normally have to call this method, since it's called automatically.
	 * It integrates the tool with a Q/tabs tool on the same element or a parent element,
	 * turning each Streams/preview of a related stream into a tab.
	 * @method integrateWithTabs
	 * @param elements
	 *  The elements of the tools representing the related streams
	 */
	integrateWithTabs: function (elements, skipRefresh) {
		var id, tabs, i;
		var tool = this;
		var state = tool.state;
		if (typeof state.tabs === 'string') {
			state.tabs = Q.getObject(state.tabs);
			if (typeof state.tabs !== 'function') {
				throw new Q.Error("Q/image_album tool: state.tabs does not refer to a function");
			}
		}
		var t = tool;
		if (!tool.tabs) {
			do {
				tool.tabs = t.sibling('Q/tabs');
				if (tool.tabs) {
					break;
				}
			} while (t = t.parent());
		}
		if (!tool.tabs) {
			return;
		}
		var tabs = tool.tabs;
		var $composer = tool.$('.Streams_image_album_composer');
		$composer.addClass('Q_tabs_tab');
		Q.each(elements, function (i) {
			var element = this;
			element.addClass("Q_tabs_tab");
			var preview = Q.Tool.from(element, 'Streams/preview');
			var key = preview.state.onRefresh.add(function () {
				var value = state.tabs.call(tool, preview, tabs);
				var attr = value.isUrl() ? 'href' : 'data-name';
				element.setAttribute(attr, value);
				if (!tabs.$tabs.is(element)) {
					tabs.$tabs = tabs.$tabs.add(element);
				}
				var onLoad = preview.state.onLoad;
				if (onLoad) {
					onLoad.add(function () {
						// all the image album tabs have loaded, process them
						tabs.refresh();
					});
				}
				preview.state.onRefresh.remove(key);
			});
			var key2 = preview.state.onComposer.add(function () {
				tabs.refresh();
			});
		});
		if (!skipRefresh) {
			tabs.refresh();
		}
	},
	previewElement: function (publisherId, streamName) {
		return Q.getObject([publisherId, streamName], this.previewElements);
	},
    previewTool: function (publisherId, streamName) {
		return Q.getObject([publisherId, streamName, 'Q', 'tool'], this.previewElements);
    },
    Q: {
		beforeRemove: function () {
            $(this.element).plugin('Q/sortable', 'remove');
			this.state.onUpdate.remove("Streams/image/album");
		}
    }
}

);

function _setWidthHeight(tool, $img) {
    var state = tool.state;
	var w = $img.width();
	var h = $img.height();
	if (!w || !h) {
		var parts = state.imagepicker.showSize.split('x');
		w = parts[0] || parts[1] || state.creatable.addIconSize;
		h = parts[0] || parts[1] || state.creatable.addIconSize;
		w = h = Math.min(w, h);
	}
	if (w && h) {
		$img.width(w).height(h);
	}
}


})(Q, jQuery);