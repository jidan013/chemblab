import ExcelJS from "exceljs";

export interface MonthlyChemicalUsage {
  chemicalName: string;
  formula: string;
  initialStock: number;
  unit: string;
  dailyUsage: { [day: number]: number };
  finalStock: number;
}

export const exportRecapitulationToExcel = async (
  data: MonthlyChemicalUsage[],
  month: string,
  year: number
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekapitulasi Penggunaan");

  // =========================
  // Hitung jumlah hari
  // =========================
  const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const startDayCol = 5; // kolom E
  const endDayCol = startDayCol + daysInMonth - 1;
  const finalStockCol = endDayCol + 1;

  // =========================
  // TITLE
  // =========================
  worksheet.mergeCells(1, 1, 1, finalStockCol);
  worksheet.getCell("A1").value = "REKAPITULASI PENGGUNAAN BAHAN KIMIA";
  worksheet.getCell("A1").font = { bold: true, size: 14 };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.mergeCells(2, 1, 2, finalStockCol);
  worksheet.getCell("A2").value = "LABORATORIUM FUNDAMENTAL KIMIA";
  worksheet.getCell("A2").font = { bold: true, size: 14 };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells(3, 1, 3, finalStockCol);
  worksheet.getCell("A3").value = `BULAN ${month.toUpperCase()} TAHUN ${year}`;
  worksheet.getCell("A3").font = { bold: true, size: 13 };
  worksheet.getCell("A3").alignment = { horizontal: "center" };

  // =========================
  // HEADER
  // =========================
  worksheet.getCell("A5").value = "No.";
  worksheet.getCell("B5").value = "Nama Bahan Kimia";
  worksheet.getCell("C5").value = "Rumus";
  worksheet.getCell("D5").value = "Stock Awal (g) (mL)";

  worksheet.mergeCells("A5:A6");
  worksheet.mergeCells("B5:B6");
  worksheet.mergeCells("C5:C6");
  worksheet.mergeCells("D5:D6");

  // Tanggal Permintaan
  worksheet.mergeCells(5, startDayCol, 5, endDayCol);
  worksheet.getCell(5, startDayCol).value = "Tanggal Permintaan";

  // Header tanggal
  for (let i = 1; i <= daysInMonth; i++) {
    worksheet.getCell(6, startDayCol + i - 1).value = i;
  }

  // Stock akhir
  worksheet.mergeCells(5, finalStockCol, 6, finalStockCol);
  worksheet.getCell(5, finalStockCol).value = "Stock Akhir (g) (mL)";

  // Styling header
  [5, 6].forEach((rowNum) => {
    const row = worksheet.getRow(rowNum);
    row.font = { bold: true };
    row.alignment = { horizontal: "center", vertical: "middle" };
  });

  // =========================
  // DATA
  // =========================
  data.forEach((item, index) => {
    const rowIndex = 7 + index;

    const dailyValues: (number | string)[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      dailyValues.push(item.dailyUsage[i] || "");
    }

    worksheet.getRow(rowIndex).values = [
      index + 1,
      item.chemicalName,
      item.formula,
      item.initialStock,
      ...dailyValues,
      item.finalStock,
    ];
  });

  // =========================
  // COLUMN WIDTH
  // =========================
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 30;
  worksheet.getColumn(3).width = 15;
  worksheet.getColumn(4).width = 15;

  for (let i = startDayCol; i <= endDayCol; i++) {
    worksheet.getColumn(i).width = 4;
  }

  worksheet.getColumn(finalStockCol).width = 15;

  // =========================
  // BORDER TABLE
  // =========================
  const lastRow = 6 + data.length;

  for (let i = 5; i <= lastRow; i++) {
    const row = worksheet.getRow(i);

    for (let j = 1; j <= finalStockCol; j++) {
      const cell = row.getCell(j);

      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
  }

  // =========================
  // SIGNATURE
  // =========================
  const signRow = lastRow + 2;
  const signatureCol = finalStockCol > 5 ? finalStockCol - 5 : 1; // Place signature on the right side

  worksheet.getCell(signRow, 1).value = "Mengetahui";
  worksheet.getCell(signRow + 1, 1).value = "Sekretaris Departemen Kimia";
  worksheet.getCell(signRow + 5, 1).value = "Nama (bisa diedit)";
  worksheet.getCell(signRow + 6, 1).value = "NIP. (bisa diedit)";

  worksheet.getCell(
    signRow,
    signatureCol
  ).value = `Surabaya, ${new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
  worksheet.getCell(signRow + 1, signatureCol).value = "Petugas Gudang";
  worksheet.getCell(signRow + 5, signatureCol).value = "Nama (bisa diedit)";
  worksheet.getCell(signRow + 6, signatureCol).value = "NIP. (bisa diedit)";

  // =========================
  // EXPORT
  // =========================
  try {
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `REKAPITULASI_PENGGUNAAN_BAHAN_KIMIA_${month}_${year}.xlsx`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Gagal export Excel");
  }
};