var express = require('express');
var fileUpload = require('express-fileupload');
var router = express.Router();
var _ = require('lodash');
var cors = require('cors');

router.options('*', cors());
router.use(fileUpload());

router.post('/', function(req, res) {
    // CORS
    if (req.method === "OPTIONS") {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    if (!req.files)
        return res.status(400).send('No files were uploaded.');

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    var sampleFile = req.files.sampleFile;

    // Use the mv() method to place the file somewhere on your server
    var fn = './uploads/' + req.body.ownershipGroupId + '-upload-' + new Date().toISOString().substr(0,10) + '.xlsx';
    sampleFile.mv(fn, function(err) {
        if (err) {
            return res.status(500).send(err);
        } else {
            var output = processFile(fn, req.body);
            if(output.error_code === 0) {
                res.status(200).send({status: 'success', output: output});
            } else {
                res.status(400).send({status: 'error', output: output});
            }
        }
    });
});

function processFile(filename, reqBody) {
    // excel parser
    var XLSX = require('xlsx');
    try {
        var workbook = XLSX.readFile(filename);
        var sheet_name_list = workbook.SheetNames;
        var output = {};
        for(var i=0; i<sheet_name_list.length; i++) {
            output[sheet_name_list[i]] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[i]]);
        }
        // sheet validation
        if(output.DMA === undefined || output.DMA === null) {
            return {
                error_code:1,
                err_desc:"Sheet validation failed",
                validation_message: "The sheet/tab 'DMA' cannot be found in this workbook",
                validation_errors: ["The sheet/tab 'DMA' cannot be found in this workbook.  The sheet must be named 'DMA' in order for it to be processed.  Please use the template generated for guidance."]};
        }
        var validationResult = validateSheet(output.DMA, reqBody);
        if(validationResult.validation_status === 'success') {
            return {error_code:0,err_desc:null, data: output};
        } else { // validation error
            return {error_code:1,err_desc:"Sheet validation failed", validation_message: validationResult.validation_message, validation_errors: validationResult.validation_errors};
        }
    } catch (e){
        return {error_code:1,err_desc:"Corrupted excel file", exception:e.message};
    }
}

function validateSheet(output, reqBody) {
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
    _.forEach(output, function(row) {
        var providedClubs = Object.keys(row);
        providedClubs.splice(providedClubs.indexOf('Tactic'),1); // Remove the Tactic column
        Object.keys(row).forEach(function(key) {
            _.forEach(reqBody.clubId, function(club) {
                if(key === club) {
                    if(finalClubs.indexOf(key) === -1) { finalClubs.push(key) };
                    providedClubs.splice(providedClubs.indexOf(key),1);
                    return;
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
    _.forEach(output, function(row) {
        _.forEach(finalClubs, function(c) {
            if(row[c] === undefined || row[c] === null) {
                row[c] = '$0';
            }
            if(row[c] !== undefined && row[c] !== null && row[c].indexOf(',') !== -1) {
                row[c] = row[c].replace(',','');
            }
        });
        Object.keys(row).forEach(function(key) {
            console.log('row = ' + row);
            console.log('key = ' + key);
        });
    });
    // Validation successful
    if(ret.validation_status === 'failed') {
        return ret;
    } else {
        return {validation_status:'success',validation_message:'Validation successful'};
    }
}

module.exports = router;
