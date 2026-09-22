(function(root){
  'use strict';
  // Small dependency-free OOXML writer: UTF-8, stored ZIP entries, numeric cells and literal strings.
  function xml(v){return String(v).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function col(n){var s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
  function zip(files){
    var enc=new TextEncoder(),parts=[],central=[],offset=0;
    function header(size){return new Uint8Array(size);}
    function put(a,n,v,size){new DataView(a.buffer).setUint32(n,v,true);if(size===2)new DataView(a.buffer).setUint16(n,v,true);}
    files.forEach(function(file){var name=enc.encode(file[0]),data=enc.encode(file[1]),crc=0xffffffff;data.forEach(function(b){crc^=b;for(var k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);});crc=(crc^0xffffffff)>>>0;
      var h=header(30);put(h,0,0x04034b50);put(h,4,20,2);put(h,6,0x800,2);put(h,14,crc);put(h,18,data.length);put(h,22,data.length);new DataView(h.buffer).setUint16(26,name.length,true);
      var c=header(46);put(c,0,0x02014b50);put(c,4,20,2);put(c,6,20,2);put(c,8,0x800,2);put(c,16,crc);put(c,20,data.length);put(c,24,data.length);new DataView(c.buffer).setUint16(28,name.length,true);put(c,42,offset);parts.push(h,name,data);central.push(c,name);offset+=h.length+name.length+data.length;
    });
    var length=central.reduce(function(n,a){return n+a.length;},0),end=header(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);return new Blob(parts.concat(central,[end]),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function styles(ns) {
    function font(size, color, bold) { return '<font>' + (bold ? '<b/>' : '') + '<sz val="'+size+'"/><color rgb="'+color+'"/><name val="맑은 고딕"/></font>'; }
    function fill(color) { return '<fill><patternFill patternType="solid"><fgColor rgb="'+color+'"/><bgColor indexed="64"/></patternFill></fill>'; }
    function xf(fontId, fillId, number, align, border) { return '<xf numFmtId="'+(number ? 164 : 0)+'" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+(border===false?0:1)+'" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" horizontal="'+(align || (number ? 'right' : 'left'))+'"/></xf>'; }
    // Compact monthly-settlement workbook: 11pt type, gray headers, yellow review cells and blue totals.
    return '<styleSheet xmlns="'+ns+'"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0;[Red](#,##0);&quot;—&quot;"/></numFmts>' +
      '<fonts count="3">'+font(11,'FF000000',false)+font(11,'FF000000',true)+font(11,'FFC00000',false)+'</fonts>' +
      '<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+fill('FFD9D9D9')+fill('FFFFFF00')+fill('FFE2EFF5')+fill('FFFFF2CC')+'</fills>' +
      '<borders count="2"><border/><border>'+['left','right','top','bottom'].map(function(side){return '<'+side+' style="thin"><color rgb="FF000000"/></'+side+'>';}).join('')+'</border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>' +
      '<cellXfs count="14">'+xf(0,0,false,'left',false)+xf(1,2,false,'center')+xf(0,0,true)+xf(0,0,false)+xf(0,0,true)+xf(1,4,false)+xf(1,4,true)+xf(1,0,false,'left',false)+xf(0,0,false,'left',false)+xf(1,3,false,'center')+xf(1,3,true)+xf(0,0,false,'center')+xf(2,0,false,'center')+xf(0,5,true,'right')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }

  function worksheet(sheet, ns) {
    var rows=sheet.rows, layout=sheet.layout || {}, width=Math.max.apply(null,rows.map(function(r){return r.length;}));
    var headers=layout.headerRows || [1], frozen=layout.freezeRows || 1, frozenCols=layout.freezeCols || 0;
    function inRows(list, row) { return (list || []).indexOf(row)>=0; }
    function inCells(list, ref) { return (list || []).indexOf(ref)>=0; }
    var data=rows.map(function(row,index){
      var rn=index+1, header=inRows(headers,rn), title=layout.titleRow===rn, note=inRows(layout.noteRows,rn), total=inRows(layout.totalRows,rn), highlight=inRows(layout.highlightRows,rn);
      return '<row r="'+rn+'">'+row.map(function(value,ci){
        var formula=value&&typeof value==='object'&&typeof value.formula==='string', raw=formula?value.value:value;
        var numeric=typeof raw==='number'||formula, style=numeric?2:3;
        var inTable = !layout.tableRanges || layout.tableRanges.some(function(range){return rn>=range.startRow && rn<=range.endRow && ci>=range.startCol && ci<=range.endCol;});
        if(!header && numeric && inRows(layout.amountCols,ci))style=10;
        if(header)style=inRows(layout.accentHeaderRows,rn)?9:1;
        if(total)style=ci===layout.totalAccentCol?10:(numeric?6:5);
        if(highlight)style=numeric?10:9;
        if(title)style=7;
        if(note || (!header && rn<headers[0] && !title))style=8;
        var ref=col(ci)+rn;
        var statusRange=layout.statusRange;
        if(!header && ci===layout.statusCol && (!statusRange || (rn>=statusRange.startRow && rn<=statusRange.endRow)))style=String(raw)==='미취소'?11:12;
        if(inCells(layout.inputCells,ref))style=13;
        if(!inTable)style=0;
        if(formula)return '<c r="'+ref+'" s="'+style+'"><f>'+xml(value.formula)+'</f>'+(raw===null||raw===undefined?'':'<v>'+raw+'</v>')+'</c>';
        if(raw===null || raw===undefined)return '<c r="'+ref+'" s="'+style+'"/>';
        return numeric?'<c r="'+ref+'" s="'+style+'"><v>'+raw+'</v></c>':'<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+xml(raw)+'</t></is></c>';
      }).join('')+'</row>';
    }).join('');
    var merges=layout.merges || [];
    var filterRow=layout.filterRow||headers[0], filterEndRow=layout.filterEndRow||rows.length, filterStartCol=layout.filterStartCol||0, filterEndCol=layout.filterEndCol===undefined?width-1:layout.filterEndCol;
    return '<worksheet xmlns="'+ns+'"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:'+col(width-1)+rows.length+'"/>' +
      '<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="100"><pane ySplit="'+frozen+'"'+(frozenCols?' xSplit="'+frozenCols+'"':'')+' topLeftCell="'+col(frozenCols)+(frozen+1)+'" activePane="'+(frozenCols?'bottomRight':'bottomLeft')+'" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>' +
      '<cols>'+Array.from({length:width},function(_,c){return '<col min="'+(c+1)+'" max="'+(c+1)+'" width="'+((layout.widths || [])[c] || 24)+'" customWidth="1"/>';}).join('')+'</cols><sheetData>'+data+'</sheetData>' +
      (layout.filter && filterEndRow>filterRow?'<autoFilter ref="'+col(filterStartCol)+filterRow+':'+col(filterEndCol)+filterEndRow+'"/>':'') +
      (merges.length?'<mergeCells count="'+merges.length+'">'+merges.map(function(ref){return '<mergeCell ref="'+ref+'"/>';}).join('')+'</mergeCells>':'') +
      '<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="'+(width>10?8:9)+'" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L'+xml(sheet.name)+'&amp;R&amp;P / &amp;N</oddFooter></headerFooter></worksheet>';
  }

  function workbook(sheets){
    var ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var definitions=sheets.map(function(s,i){var name="'"+s.name.replace(/'/g,"''")+"'",width=Math.max.apply(null,s.rows.map(function(r){return r.length;}));return '<definedName name="_xlnm.Print_Area" localSheetId="'+i+'">'+xml(name)+'!$A$1:$'+col(width-1)+'$'+s.rows.length+'</definedName><definedName name="_xlnm.Print_Titles" localSheetId="'+i+'">'+xml(name)+'!$1:$'+((s.layout || {}).printHeader || 1)+'</definedName>';}).join('');
    var files=[['_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="'+rel+'"><sheets>'+sheets.map(function(s,i){return '<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>';}).join('')+'</sheets><definedNames>'+definitions+'</definedNames><calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>'],['xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map(function(s,i){return '<Relationship Id="rId'+(i+1)+'" Type="'+rel+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>';}).join('')+'<Relationship Id="styles" Type="'+rel+'/styles" Target="styles.xml"/></Relationships>'],['xl/styles.xml',styles(ns)]];
    sheets.forEach(function(s,i){files.push(['xl/worksheets/sheet'+(i+1)+'.xml',worksheet(s,ns)]);});
    files.push(['[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map(function(s,i){return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';}).join('')+'</Types>']);return zip(files);
  }
  root.SettlementXlsx={workbook:workbook};
})(typeof window==='undefined'?globalThis:window);
