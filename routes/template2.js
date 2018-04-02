'use strict';



var totalClubs;


//Imports
var constants = require('../constants');

var express = require('express');
var router = express.Router();
//var _ = require('lodash');
var cors = require('cors');
var Excel = require('exceljs');

//Constants
var WORKSHEET_NAME = constants.WORKSHEET_NAME;
var SPEND_CATEGORIES = constants.SPEND_CATEGORIES;
var TEMPLATE_VERSION = constants.TEMPLATE_VERSION;

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
    
    console.log('CORS Okay');
    
    // This is the Request:
    // {
    //     ownershipGroupNumber: 123,
    //     clubs: [
    //         {clubId: 'PF Club Id 1', clubName: 'PF CLUB NAME 1'},
    //         {clubId: 'PF Club Id 2', clubName: 'PF CLUB NAME 2'},
    //         {clubId: 'PF Club Id 3', clubName: 'PF CLUB NAME 3'},
    //         {clubId: 'PF Club Id 4', clubName: 'PF CLUB NAME 4'},
    //         {clubId: 'PF Club Id 5', clubName: 'PF CLUB NAME 5'},
    //         {clubId: 'PF Club Id 6', clubName: 'PF CLUB NAME 6'}
    //     ]
    // };
    
    var input = req.body;
    
    console.log(input);
    
    totalClubs = req.body.clubs.length;
    console.log(totalClubs);
    
    var wb = newWorkbook();
    constructColumns(wb, WORKSHEET_NAME, input.clubs);
    addRows(wb, WORKSHEET_NAME, SPEND_CATEGORIES, input.clubs);
    addFormat(wb, WORKSHEET_NAME);
    
    
    
    
    
    var fn = './uploads/' + input.ownershipGroupNumber + '-template-' + new Date().toISOString().substr(0,10) + '.xlsx';
    
    
    wb.xlsx.writeFile(fn)
        .then(function() {
            // Download the file that was produced on the App Server
            res.download(fn);
        })
        .catch(function(err) {
            console.log(err);
        });
    
});


//Everything Below here is in support of the above:

function newWorkbook(){
    var workbook = new Excel.Workbook();
    workbook.created = new Date();
    return workbook;
}

function constructColumns(workbook, sheetName, clubs){
    
    console.log(clubs.length);
    
    var worksheet = workbook.addWorksheet(sheetName);
    var columns = [
        { header: TEMPLATE_VERSION, key: 'tactic', width: 30 }
    ];
    
    for(var i = 0; i < clubs.length; i++){
        columns.push(
            {
                header: clubs[i].clubName,
                key:clubs[i].clubId,
                width: 10,
                style: {numFmt: '$0.00'}
            }
        );
        //console.log(clubs[i].clubId);
    }
    
    worksheet.columns = columns;
    worksheet.views = [
        {
            state: 'frozen',
            xSplit: 1
        }
    ];
    
}

function addRows(workbook, sheetName, categories, clubs){
    var sheet = workbook.getWorksheet(sheetName);
    
    
    
    var nameRow = {tactic: 'Tactic'};
    
    for (var h = 0; h < totalClubs; h++){
        nameRow[clubs[h].clubId] = clubs[h].clubId;
    }
    
    
    sheet.addRow(nameRow);
    
    for(var i = 0; i < categories.length; i++){
        var newRow = {};
        newRow.tactic = categories[i];
    
        for (var j = 0; j < totalClubs; j++){
            newRow[clubs[j].clubId] = 0;
        }
    
        sheet.addRow(newRow);
    }
    
    
    
    var totalRow = {};
    totalRow.tactic = 'Total';
    var columnLetter = 'A';
    for (var k = 0; k < totalClubs; k++){
        
        var formulaString = 'SUM(' + nextChar(columnLetter) + '3:' + nextChar(columnLetter) + '23)';
        columnLetter = nextChar(columnLetter);
        
        totalRow[clubs[k].clubId] = {
            formula: formulaString
        };
    }
    
    sheet.addRow(totalRow);
    
    //sheet.addRow({tactic: 'Total', id: 'total'});
    sheet.addRow({tactic: ''});
    //sheet.addRow({tactic: 'Promotional Club Expense'});
    
    var promo = {};
    promo.tactic = 'Promotional Club Expense';
    for (var l = 0; l < totalClubs; l++){
        promo[clubs[l].clubId] = 0;
    }
    sheet.addRow(promo);
}


function addFormat(workbook, sheetName){
    var sheet = workbook.getWorksheet(sheetName);
    var firstColumn = sheet.getColumn(1);
    firstColumn.font = {
      bold: true
    };
    
    var A1 = sheet.getCell('A1');
    A1.fill = {
        pattern: 'solid',
        type: 'pattern'
    };
    
    var headerRow = sheet.getRow(1);
    headerRow.alignment = {
        textRotation: 45
    };
    headerRow.font = {
        bold: true
    };
    
    var headerBottom = sheet.getRow(2);
    headerBottom.border = {
        bottom: {style: 'thin'}
    };
    headerBottom.font = {
        bold: true
    };
    
    var totalRow = sheet.getRow(24);
    totalRow.font = {
        bold: true
    };
    
    totalRow.border = {
        top: {style: 'thin'},
        bottom: {style: 'double'}
    };
    
    totalRow.eachCell({ includeEmpty: true }, function(cell, colNumber) {
        console.log('Cell ' + colNumber + ' = ' + cell.value);
    });
    
}

//The following functions produce the next letter in the Excel Column Naming convention

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
