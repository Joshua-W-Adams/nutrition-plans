// Author: Joshua William Adams
// Rev History:
// No.: A     Desc.: Issued for review                          Date: 8/12/2019
// No.: 0     Desc.: Issued for use                             Date: 12/12/2019
//
// Description: Module for all filesystem related opertions in the application.

// Import external librarys
// file system operations
var fs = require('fs');
// csv to json parser
var parse = require('csv-parse');
// json to csv parser
const Json2csvParser = require('json2csv').Parser;
// creating .xslx files
const XlsxPopulate = require('xlsx-populate');

/**
 * readCsv - read in csv files and parse to json.
 */
function readCsv (filePath) {
  return new Promise (function (resolve, reject) {
    var parser = parse({delimiter: ',', columns: true, cast: true}),
        arr = [];
    fs.createReadStream(filePath)
      // send (pipe) each chunk of data into the parser function to convert the
      // chunk to a json object
      .pipe(parser)
      // async function to be executed on each row of data
      .on('data', function (row) {
        arr.push(row);
      }).on('end', function (err, data) {
        resolve(arr);
      }).on('error', function (err) {
        reject(err);
    })
  })
}

function getKeys(obj) {

  var keys = [];

  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key);
    }
  }

  return keys;

}

function jsonToCsv (arr) {

  const fields = getKeys(arr[0]);
  const opts = { fields };
  var csv;

  try {
    const parser = new Json2csvParser(opts);
    csv = parser.parse(arr);
  } catch (err) {
    throw err;
  }

  return csv;

}

function outputToCsv (output, data) {
  // convert data to csv format
  csv = jsonToCsv(data);

  // write data to file
  fs.writeFile(output.filePath, csv, function (err) {
    if (err) throw err;
      console.log('.csv has been saved!');
  });

  return;
}

function writeJsonData (workbook, insertSheet, insertCellRow
, insertCellCol, jsonDataArray) {
  var value,
      row,
      y;
  for (var x = 0; x < jsonDataArray.length; x++) {
    row = jsonDataArray[x];
    y = 0;
    for (var key in row) {
      value = row[key];
      workbook.sheet(insertSheet).cell(insertCellRow + x, insertCellCol + y)
      .value(value);
      y++;
    }
  }
  return workbook;
}

function outputToXlsx (output, data) {
  // Load a new blank workbook
  XlsxPopulate.fromFileAsync(output.template).then(function (workbook) {
    // Modify the workbook.
    workbook = writeJsonData(workbook, "data", 2, 1, data);
    // write workbook to file
    workbook.toFileAsync(output.filePath);
  });
  return;
}

function outputDataToFile (output, data) {

  if (output.filePath.endsWith(".xlsx")) {
    outputToXlsx(output, data);
  } else {
    outputToCsv(output, data);
  }

  return;
}

function writeDataToFiles (output, data) {

  // delete any existing files
  if (fs.existsSync(output.filePath)) {
    fs.unlinkSync(output.filePath, function (err) {
      if (err) throw err;
      console.log(output.filePath + ' was deleted');
    });
  }

  outputDataToFile(output, data);

  return;

}

// Return all objects to calling javascript
// exports.getMappingInputFiles = getMappingInputFiles;
exports.writeDataToFiles = writeDataToFiles;
exports.readCsv = readCsv;
