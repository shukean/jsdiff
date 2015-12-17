/*
This is part of jsdifflib v1.0. <http://github.com/cemerick/jsdifflib>

Copyright 2007 - 2011 Chas Emerick <cemerick@snowtide.com>. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY Chas Emerick ``AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Chas Emerick OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of Chas Emerick.
*/
diffview = {
	/**
	 * Builds and returns a visual diff view.  The single parameter, `params', should contain
	 * the following values:
	 *
	 * - baseTextLines: the array of strings that was used as the base text input to SequenceMatcher
	 * - newTextLines: the array of strings that was used as the new text input to SequenceMatcher
	 * - opcodes: the array of arrays returned by SequenceMatcher.get_opcodes()
	 * - baseTextName: the title to be displayed above the base text listing in the diff view; defaults
	 *	   to "Base Text"
	 * - newTextName: the title to be displayed above the new text listing in the diff view; defaults
	 *	   to "New Text"
	 * - contextSize: the number of lines of context to show around differences; by default, all lines
	 *	   are shown
	 * - viewType: if 0, a side-by-side diff view is generated (default); if 1, an inline diff view is
	 *	   generated
	 */
	buildView: function (params, merge_changed_lines) {
		var baseTextLines = params.baseTextLines;
		var newTextLines = params.newTextLines;
		var opcodes = params.opcodes;
		var baseTextName = params.baseTextName ? params.baseTextName : "Base Text";
		var newTextName = params.newTextName ? params.newTextName : "New Text";
		var contextSize = params.contextSize;
		var inline = (params.viewType == 0 || params.viewType == 1) ? params.viewType : 0;
        var changed_lines = {};

		if (baseTextLines == null)
			throw "Cannot build diff view; baseTextLines is not defined.";
		if (newTextLines == null)
			throw "Cannot build diff view; newTextLines is not defined.";
		if (!opcodes)
			throw "Canno build diff view; opcodes is not defined.";
		
		function celt (name, clazz, attr) {
			var e = document.createElement(name);
			e.className = clazz;
            if (attr){
                e.setAttribute(attr[0], attr[1]);
            }
			return e;
		}
		
		function telt (name, text, attr) {
			var e = document.createElement(name);
			e.appendChild(document.createTextNode(text));
            if (attr){
                for(var i=0; i<attr.length; i+=2){
                    e.setAttribute(attr[i], attr[i+1]);
                }
            }
			return e;
		}
		
		function ctelt (name, clazz, text, type, attr) {
			var e = document.createElement(name);
			e.className = clazz + " codeceil codeceil_" + type;
			e.appendChild(document.createTextNode(text));
            if (attr){
                e.setAttribute(attr[0], attr[1]);
            }
			return e;
		}

		var tdata = document.createElement("thead");
		var node = document.createElement("tr");
		tdata.appendChild(node);
		if (inline) {
			node.appendChild(document.createElement("th"));
			node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", baseTextName + " vs. " + newTextName));
		} else {
			node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", baseTextName, 'left'));
            node.appendChild(ctelt("th", "", ''));
			node.appendChild(ctelt("th", "texttitle", newTextName, 'right'));
            node.appendChild(document.createElement("th"));
		}
		tdata = [tdata];
		
		var rows = [];
		var node2;
		
		/**
		 * Adds two cells to the given row; if the given row corresponds to a real
		 * line number (based on the line index tidx and the endpoint of the 
		 * range in question tend), then the cells will contain the line number
		 * and the line of text from textLines at position tidx (with the class of
		 * the second cell set to the name of the change represented), and tidx + 1 will
		 * be returned.	 Otherwise, tidx is returned, and two empty cells are added
		 * to the given row.
		 */
		function addCells (row, tidx, tend, textLines, change, type) {
			if (tidx < tend) {
                var tidx2 = tidx + 1;
                if (type == 'left') {
                    row.appendChild(telt("th", tidx2.toString(), ['name', '#'+ type + tidx2, 'id', type + tidx2]));
                }
				row.appendChild(ctelt("td", change, textLines[tidx].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0"), type));
                if (type == 'left'){
                    row.appendChild(celt("td", "split", ['width', '10px']));
                }
                if (type == 'right') {
                    row.appendChild(telt("th", tidx2.toString(), ['name', '#'+ type + tidx2, 'id', type + tidx2]));
                }
				return tidx + 1;
			} else {
                if (type == 'left') {
                    row.appendChild(document.createElement("th"));
                }
				row.appendChild(celt("td", "empty", null, type));
                if (type == 'left'){
                    row.appendChild(celt("td", "split", ['width', '10px']));
                }
                if (type == 'right') {
                    row.appendChild(document.createElement("th"));
                }
				return tidx;
			}
		}
		
		function addCellsInline (row, tidx, tidx2, textLines, change) {
			row.appendChild(telt("th", tidx == null ? "" : (tidx + 1).toString()));
			row.appendChild(telt("th", tidx2 == null ? "" : (tidx2 + 1).toString()));
			row.appendChild(ctelt("td", change, textLines[tidx != null ? tidx : tidx2].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0")));
		}
		
		for (var idx = 0; idx < opcodes.length; idx++) {
			code = opcodes[idx];
			change = code[0];
			var b = code[1];
			var be = code[2];
			var n = code[3];
			var ne = code[4];
			var rowcnt = Math.max(be - b, ne - n);
			var toprows = [];
			var botrows = [];
			for (var i = 0; i < rowcnt; i++) {
				// jump ahead if we've alredy provided leading context or if this is the first range
				if (contextSize && opcodes.length > 1 && ((idx > 0 && i == contextSize) || (idx == 0 && i == 0)) && change=="equal") {
					var jump = rowcnt - ((idx == 0 ? 1 : 2) * contextSize);
					if (jump > 1) {
						toprows.push(node = document.createElement("tr"));
						
						b += jump;
						n += jump;
						i += jump - 1;
						node.appendChild(telt("th", "..."));
						if (!inline) node.appendChild(ctelt("td", "skip", ""));
						node.appendChild(telt("th", "..."));
						node.appendChild(ctelt("td", "skip", ""));
						
						// skip last lines if they're all equal
						if (idx + 1 == opcodes.length) {
							break;
						} else {
							continue;
						}
					}
				}
				
				toprows.push(node = document.createElement("tr"));
				if (inline) {
					if (change == "insert") {
						addCellsInline(node, null, n++, newTextLines, change);
					} else if (change == "replace") {
						botrows.push(node2 = document.createElement("tr"));
						if (b < be) addCellsInline(node, b++, null, baseTextLines, "delete");
						if (n < ne) addCellsInline(node2, null, n++, newTextLines, "insert");
					} else if (change == "delete") {
						addCellsInline(node, b++, null, baseTextLines, change);
					} else {
						// equal
						addCellsInline(node, b++, n++, baseTextLines, change);
					}
				} else {
					b = addCells(node, b, be, baseTextLines, change, 'left');
					n = addCells(node, n, ne, newTextLines, change, 'right');

                    if (change != 'equal'){
                        //changed_lines[b] = b;
                        changed_lines[n] = n;
                    }
				}
			}

			for (var i = 0; i < toprows.length; i++) rows.push(toprows[i]);
			for (var i = 0; i < botrows.length; i++) rows.push(botrows[i]);
		}

        //console.log(changed_lines);
        for(var i in changed_lines){
            var merge_success = false;
            for (var j in merge_changed_lines){
                if(parseInt(merge_changed_lines[j]) + parseInt(j) == changed_lines[i]){
                    merge_changed_lines[j]++;
                    merge_success = true;
                }
            }
            if (!merge_success){
                merge_changed_lines[i] = 1;
            }
        }

		rows.push(node = ctelt("th", "author", "diff view generated by "));
		node.setAttribute("colspan", inline ? 3 : 5);
		node.appendChild(node2 = telt("a", "jsdifflib"));
		node2.setAttribute("href", "http://github.com/cemerick/jsdifflib");
        node.appendChild(telt('span', ' this style design by '));
        node.appendChild(node3 = telt("a", "yky"));
        node3.setAttribute("href", "http://github.com/shukean/jsdifflib");
		
		tdata.push(node = document.createElement("tbody"));
		for (var idx in rows) rows.hasOwnProperty(idx) && node.appendChild(rows[idx]);
		
		node = celt("table", "diff" + (inline ? " inlinediff" : ""));
		for (var idx in tdata) tdata.hasOwnProperty(idx) && node.appendChild(tdata[idx]);
		return node;
	}
};


// add by yky

$(document).ready(function(){

    var merge_changed_lines = {};
    var _location = location.href.indexOf('#') > -1 ? location.href.split('#')[0] : location.href;

	var _base = difflib.stringAsLines($('#base_file_content').val()),
		_new = difflib.stringAsLines($('#new_file_content').val()),
        diff = new difflib.SequenceMatcher(_base, _new),
        opcodes = diff.get_opcodes();


    $('#diff_content').html(diffview.buildView({
        baseTextLines: _base,
        newTextLines: _new,
        opcodes: opcodes,
        baseTextName: "Base Text",
        newTextName: "New Text",
        contextSize: null,
        viewType: 'sidebyside'
    }, merge_changed_lines));

    //console.log(merge_changed_lines);
    //alert($('#diff_tags').height());
    var diff_tags_height = $('#diff_tags').height() || $(window).height(),
        file_content_height = $('.diff').height();
    //console.log(diff_tags_height, file_content_height);
    for (var i in merge_changed_lines){
        var scroll_x = $('#right' + i).offset().top,
            per_x = scroll_x / file_content_height * diff_tags_height;

        //alert($('#diff_tags').height());
        //console.log(scroll_x , file_content_height , diff_tags_height);

        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.style.top = per_x + 'px';
        tag.setAttribute('tag', i);
        $('#diff_tags').append(tag);
    }

    $('#diff_tags').click(function(e){
        var target = e.target,
            file_content_height = $('.diff').height(),
            diff_tags_height = $('#diff_tags').height();

        if (target.nodeName == 'SPAN'){
            //console.log(target.style.top, diff_tags_height, parseInt(target.style.top) / diff_tags_height * file_content_height);
            //$('.diff_box').scrollTop(parseInt(target.style.top) / diff_tags_height * file_content_height);
            location.href = _location + '#right' + target.getAttribute('tag');
        }
    });
});











