/**
 * RENDEMENKU - Backend Script for Google Sheets
 * Paste this code into your Google Sheets Script Editor (Extensions > Apps Script)
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('RENDEMENKU')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fetches dashboard data filtered by date
 * @param {string} filterDate - Date in YYYY-MM-DD format
 */
function getDashboardData(filterDate) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    
    if (lastRow < 2) return createEmptyResponse();
    
    // Fetch columns A to J (1 to 10)
    var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    
    var targetDate = filterDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    var filteredData = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowDate = "";
      
      if (row[0] instanceof Date) {
        rowDate = Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else {
        rowDate = String(row[0]);
      }
      
      if (rowDate === targetDate) {
        var input = Number(row[3]) || 0;
        var utama = Number(row[4]) || 0;
        var total = Number(row[9]) || 0;
        var yieldVal = input > 0 ? (utama / input) * 100 : 0;
        
        filteredData.push({
          tanggal: rowDate,
          mesin: String(row[1]).trim().toUpperCase(),
          line: String(row[2]),
          input: input,
          utama: utama,
          output: total,
          yield: yieldVal
        });
      }
    }
    
    return {
      success: true,
      date: targetDate,
      data: filteredData,
      timestamp: new Date().getTime()
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function createEmptyResponse() {
  return {
    success: true,
    data: [],
    date: new Date().toISOString().split('T')[0]
  };
}

/**
 * Optional: Function to save manual calculations back to the sheet
 */
function saveCalculation(calcData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    
    // Append row: Date, Machine, Line, Input, Utama, ..., ..., ..., ..., Total
    // Adjust indices to match your sheet structure
    var newRow = [
      new Date(),
      calcData.machine,
      calcData.line,
      calcData.input,
      calcData.utama,
      "", "", "", "", // Empty columns for F, G, H, I
      calcData.output
    ];
    
    sheet.appendRow(newRow);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
