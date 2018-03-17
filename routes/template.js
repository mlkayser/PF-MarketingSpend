"use strict";

var express = require('express');
var router = express.Router();
var _ = require('lodash');
var cors = require('cors');
var Excel = require('exceljs');

//Set up CORS so the internet will work as I desire
router.options('*', cors());

//Handle Post requests sent to the main route
router.post('/', function(req, res) {
    // CORS
    if (req.method === "OPTIONS") {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    console.log('step 1');
    
    // var input = {
        // ownershipGroupNumber: 123,
        // clubs: [
            // {clubId: 'PF Club Id 1'},
            // {clubId: 'PF Club Id 2'},
            // {clubId: 'PF Club Id 3'},
            // {clubId: 'PF Club Id 4'},
            // {clubId: 'PF Club Id 5'},
            // {clubId: 'PF Club Id 6'}
        // ]
    // };
    var input = req.body;

    // excel parser
    var fn = createExcelTemplate(input);

    // Tell the client to download the file
    res.download(fn);
});

function createExcelTemplate(input) {
    var baseWs = [
        {Tactic:'Television'},
        {Tactic:'Streaming Television'},
        {Tactic:'Radio'},
        {Tactic:'Streaming Radio'},
        {Tactic:'Direct Mail'},
        {Tactic:'Shared Mail'},
        {Tactic:'Letter'},
        {Tactic:'Email'},
        {Tactic:'Digital Display'},
        {Tactic:'SEO/SEM'},
        {Tactic:'Social'},
        {Tactic:'OOH'},
        {Tactic:'Newspaper'},
        {Tactic:'Events'},
        {Tactic:'Sponsorship(s)'},
        {Tactic:'Guerilla Marketing'},
        {Tactic:'Promotional POP'},
        {Tactic:'Public Relations Fee'},
        {Tactic:'Production Fees'},
        {Tactic:'Agency Fees'},
        {Tactic:'Reoccurring Co-Op Contribution'},
        {Tactic:'Total'},
        {Tactic:''},
        {Tactic:'Promotional Club Expense'}];
    var baseHeader = {header:["Tactic"]};

    // One column for each club
    _.forEach(input.clubs, function(club) {
        _.find(baseWs, {Tactic:'Television'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Streaming Television'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Radio'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Streaming Radio'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Direct Mail'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Shared Mail'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Letter'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Email'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Digital Display'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'SEO/SEM'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Social'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'OOH'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Newspaper'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Events'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Sponsorship(s)'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Guerilla Marketing'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Promotional POP'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Public Relations Fee'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Production Fees'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Agency Fees'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Reoccurring Co-Op Contribution'})[club.clubId] = 0;
        _.find(baseWs, {Tactic:'Promotional Club Expense'})[club.clubId] = 0;
        baseHeader.header.push(club.clubId);
    });
    
    //Create the Workbook
    var workbook = new Excel.Workbook();
    var ws = workbook.addWorksheet('My Sheet');

    //var ws = XLSX.utils.json_to_sheet(baseWs, baseHeader);
    console.log('Step 4');
    var colChar = 'B';
    
    // Sum Rows
    _.forEach(input.clubs, function(club) {
        // // Comment on Club ID
        // ws[colChar + '1'].c = [ { a: 'PlanetFitness', t: 'Club Name here'} ];
        // Sum
        ws[colChar + '23'] = {
            t:'n',
            f: "SUM(" + colChar + "2:" + colChar + "22)",
            F:"" + colChar + "23:" + colChar + "23"
        };
        
        colChar = nextChar(colChar);
    });
    
    

    // Formatting
    var fmt = '$0.00'; // or '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)' or any Excel number format

    /* get worksheet range */
    var range = XLSX.utils.decode_range(ws['!ref']);
    var r = { s: { c: 1, r: 1 }, e: { c: 6, r: 23 } };
    for(var i = range.s.r + 1; i <= range.e.r; ++i) {
        for(var x = range.s.c + 1; x <= range.e.c; ++x) {
            /* find the data cell (range.s.r + 1 skips the header row of the worksheet) */
            var ref = XLSX.utils.encode_cell({r:i, c:x});
            /* if the particular row did not contain data for the column, the cell will not be generated */
            if(!ws[ref]) {continue;}
            /* `.t == "n"` for number cells */
            if(ws[ref].t !== 'n') {continue;}
            /* assign the `.z` number format */
            ws[ref].z = fmt;
        }
    }

    // Column width
    var wscols = [
        {wch:30}
    ];

    ws['!cols'] = wscols;

    var fn = './uploads/' + input.ownershipGroupNumber + '-template-' + new Date().toISOString().substr(0,10) + '.xlsx';
    var wb = { SheetNames:['DMA'], Sheets:{}};
    wb.Sheets.DMA = ws;
    
    var XLSX_style = require('xlsx-style');
    
    
    XLSX_style.writeFile(wb, fn);
    return fn;
}

function nextChar(c) {
    var u = c.toUpperCase();
    if (same(u,'Z')){
        var txt = '';
        var i = u.length;
        while (i--) {
            txt += 'A';
        }
        return (txt+'A');
    } else {
        var p = "";
        var q = "";
        if(u.length > 1){
            p = u.substring(0, u.length - 1);
            q = String.fromCharCode(p.slice(-1).charCodeAt(0));
        }
        var l = u.slice(-1).charCodeAt(0);
        var z = nextLetter(l);
        if(z==='A'){
            return p.slice(0,-1) + nextLetter(q.slice(-1).charCodeAt(0)) + z;
        } else {
            return p + z;
        }
    }
}

function nextLetter(l){
    if(l<90){
        return String.fromCharCode(l + 1);
    }
    else{
        return 'A';
    }
}

function same(str,char){
    var i = str.length;
    while (i--) {
        if (str[i]!==char){
            return false;
        }
    }
    return true;
}

module.exports = router;
