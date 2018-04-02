'use strict';

var express = require('express');
var fileUpload = require('express-fileupload');
var router = express.Router();
var _ = require('lodash');
var cors = require('cors');
var constants = require('../constants');

var WORKSHEET_NAME = constants.WORKSHEET_NAME;
var TEMPLATE_VERSION = constants.TEMPLATE_VERSION;

var Excel = require('exceljs');

router.options('*', cors());
router.use(fileUpload());

router.post('/', function(req, res) {
    // CORS
    if (req.method === "OPTIONS") {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    var sampleFile = req.files.sampleFile;

    // Use the mv() method to place the file somewhere on your server
    var fn = './uploads/' + req.body.ownershipGroupId + '-upload-' + new Date().toISOString().substr(0,10) + '.xlsx';
    sampleFile.mv(fn, function(err) {
        if (err) {
            return res.status(500).send(err);
        } else {
            processFile(fn, req.body, function(output){ //ProcessFile takes a callback due to the asynchronous nature of the 'Read Notebook function'
                //console.log(output);
                if(output.error_code === 0) {
                    console.log('I SENT: ');
                    console.log(output.data);
                    res.status(200).send({status: 'success', output: output});
                } else {
                    res.status(400).send({status: 'error', output: output});
                }
            });
        }
    });
});

function processFile(filename, reqBody, returnStatusFunction) {
    
    if(filename === undefined || filename === null || reqBody === null) {
        returnStatusFunction({
            error_code: 1,
            err_desc: "Broken",
            validation_message: "The sheet/tab 'DMA' cannot be found in this workbook",
            validation_errors: ["The sheet/tab 'DMA' cannot be found in this workbook.  The sheet must be named 'DMA' in order for it to be processed.  Please use the template generated for guidance."]
        });
        return;
    }
    // read from a file
    var workbook = new Excel.Workbook();
    workbook.xlsx.readFile(filename)
        .then(function() {
            try {
                //Find the DMA Sheet
                var worksheet = workbook.getWorksheet(WORKSHEET_NAME);
                //console.log(worksheet);
                
                
                    // sheet validation
                if(worksheet === undefined || worksheet === null) {
                    returnStatusFunction({
                        error_code:1,
                        err_desc:"Sheet validation failed",
                        validation_message: "The sheet/tab 'DMA' cannot be found in this workbook",
                        validation_errors: ["The sheet/tab 'DMA' cannot be found in this workbook.  The sheet must be named 'DMA' in order for it to be processed.  Please use the template generated for guidance."]
                    });
                    return;
                }
                
                if(worksheet.getCell('A1').value !== TEMPLATE_VERSION) {
                    returnStatusFunction({
                        error_code:1,
                        err_desc:"Sheet validation failed",
                        validation_message: "Wrong Version of the Template Used",
                        validation_errors: ["Wrong Version of the Template Used.  Please generate a new template and try again."]
                    });
                    return;
                }
                
                //Murder the first Row, as it contains the ClubName, while we really care about the Id
                worksheet.spliceRows(1,1);
                
                var output = [];
                var clubIDs = [];
                var headerRow = worksheet.getRow(1);
                
                
                
                //Produce an array of the club numbers:
                //['1234', '2345', '3456'...n]
                headerRow.eachCell(function(cell, colNumber){
                    clubIDs.push(cell.value);
                });
                
                
    
                worksheet.eachRow(function(row, rowNumber) {
                    //console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
                    //output.push(row.values[1]);
                    output.push({});
                    output[rowNumber - 1] = {};
                    
                    row.eachCell({includeEmpty: true}, function(cell, colNumber) {
                        output[rowNumber - 1][clubIDs[colNumber-1]] = cell.value;
                    });
                });
                
                var validationResult = validateSheet(output, reqBody);
                if(validationResult.validation_status === 'success') {
                    returnStatusFunction({error_code:0,err_desc:null, data: output});
                
                } else { // validation error
                    returnStatusFunction({error_code:1,err_desc:"Sheet validation failed", validation_message: validationResult.validation_message, validation_errors: validationResult.validation_errors});
                    
                }
        
                
            } catch (e){
                returnStatusFunction({error_code:1,err_desc:"Corrupted excel file", exception:e.message});
        }
    });
}
//LEGACY



function validateSheet(output, reqBody) {
    
    // console.log('***Whats om the requestbody?');
    // console.log(reqBody);
    
    var ret = {};
    ret.validation_status = 'Pending';
    ret.validation_message = 'Pending validation';
    ret.validation_errors = [];

    if(reqBody.clubId.constructor !== Array) { // convert this to an array if only one club ID is provided
        var singleClubId = reqBody.clubId;
        reqBody.clubId = [];
        reqBody.clubId.push(singleClubId);
    }

    var finalClubs = [];
    //console.log('***Lets see what is going on with the output Object***');
    //console.log(output);
    //output = output.splice(1, output.length);
    // console.log('***Modified Array Object***');
    // console.log(output);
    
    
    _.forEach(output, function(row) {
        // console.log('***Instance of a row***');
        // console.log(row);
        
        var providedClubs = Object.keys(row); //Returns an array of the keys: [' PF Club ID 1' ...n]
        //console.log(providedClubs);
        
        providedClubs.splice(providedClubs.indexOf('Tactic'),1); // Remove the Tactic column
        Object.keys(row).forEach(function(key) {
            _.forEach(reqBody.clubId, function(club) {
                if(key === club) {
                    if(finalClubs.indexOf(key) === -1) { finalClubs.push(key); }
                    providedClubs.splice(providedClubs.indexOf(key),1);
                    //return;
                }
            });
        });
        if(providedClubs.length !== 0) { // There was an extra club id that shouldn't be here
            ret.validation_status = 'failed';
            ret.validation_message = 'Validation failed';
            providedClubs.forEach(function(club) {
                var errorMsg = "Club with ID '" + club + "' not allowed here.";
                if(!ret.validation_errors.includes(errorMsg)) { // We don't need the same error over and over
                    ret.validation_errors.push(errorMsg);
                }
            });
            return ret;
        }
    });
    
    
    
    // Cleanup - default values and remove commas
    console.log('***the output***');
    console.log(output);
    
    console.log('***final clubs***');
    console.log(finalClubs);
    
    _.forEach(output, function(row) {
        _.forEach(finalClubs, function(c) {
            if(row[c] === undefined || row[c] === null) {
                row[c] = 0;
            }
            // if(row[c] !== undefined && row[c] !== null && row[c].indexOf(',') !== -1) {
            //     row[c] = row[c].replace(',','');
            // }
        });
        Object.keys(row).forEach(function(key) {
           // console.log('row = ' + row);
            //console.log('key = ' + key);
        });
    });
    
    console.log('did i get here?');
    
    // Validation successful
    if(ret.validation_status === 'failed') {
        return ret;
    } else {
        return {validation_status:'success',validation_message:'Validation successful'};
    }
}



module.exports = router;
