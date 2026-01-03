import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Convert the data to a worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Append the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate the Excel file and trigger download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
