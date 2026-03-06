import ExcelJS from "exceljs";
import { ChemicalStats } from "@/types/reports";

export const exportChemicalReportToExcel = async (
  data: ChemicalStats,
  period: string,
) => {
  if (!data) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Inventaris Bahan Kimia");

  // Judul Laporan
  worksheet.mergeCells("A1:F1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "Laporan Inventaris Bahan Kimia";
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center" };
  worksheet.getCell("A2").value = `Periode: ${period}`;

  // Key Metrics
  worksheet.mergeCells("A4:F4");
  worksheet.getCell("A4").value = "Ringkasan Utama";
  worksheet.getCell("A4").font = { bold: true, color: { argb: "FF0070C0" } };

  const keyMetrics = [
    ["Total Bahan Kimia", data.totalChemicals],
    ["Bahan Kimia Aktif", data.activeChemicals],
    ["Stok Rendah", data.lowStockChemicals],
    ["Kadaluwarsa", data.expiredChemicals],
    ["Akan Kadaluwarsa", data.expiringSoonChemicals],
  ];

  let rowIndex = 5;
  keyMetrics.forEach(([label, value]) => {
    worksheet.getCell(`A${rowIndex}`).value = label;
    worksheet.getCell(`B${rowIndex}`).value = value;
    worksheet.getRow(rowIndex).font = { bold: true };
    rowIndex++;
  });

  // Distribusi
  rowIndex += 2;
  worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
  worksheet.getCell(`A${rowIndex}`).value = "Distribusi Berdasarkan Bentuk";
  worksheet.getCell(`A${rowIndex}`).font = { bold: true };

  worksheet.mergeCells(`D${rowIndex}:F${rowIndex}`);
  worksheet.getCell(`D${rowIndex}`).value = "Distribusi Berdasarkan Sifat";
  worksheet.getCell(`D${rowIndex}`).font = { bold: true };

  rowIndex++;
  worksheet.getCell(`A${rowIndex}`).value = "Bentuk";
  worksheet.getCell(`B${rowIndex}`).value = "Jumlah";
  worksheet.getCell(`D${rowIndex}`).value = "Sifat";
  worksheet.getCell(`E${rowIndex}`).value = "Jumlah";
  worksheet.getRow(rowIndex).font = { bold: true };
  Object.entries(data.byForm).forEach(([form, count], index) => {
    worksheet.getCell(`A${rowIndex + index + 1}`).value = form;
    worksheet.getCell(`B${rowIndex + index + 1}`).value = count;
  });

  Object.entries(data.byCharacteristic).forEach(
    ([characteristic, count], index) => {
      worksheet.getCell(`D${rowIndex + index + 1}`).value = characteristic;
      worksheet.getCell(`E${rowIndex + index + 1}`).value = count;
    },
  );

  rowIndex += Math.max(
    Object.keys(data.byForm).length,
    Object.keys(data.byCharacteristic).length,
  );
  rowIndex += 2;

  // Top Used Chemicals
  worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
  worksheet.getCell(`A${rowIndex}`).value =
    "Bahan Kimia Paling Banyak Digunakan";
  worksheet.getCell(`A${rowIndex}`).font = { bold: true };
  rowIndex++;
  worksheet.getCell(`A${rowIndex}`).value = "Nama";
  worksheet.getCell(`B${rowIndex}`).value = "Formula";
  worksheet.getCell(`C${rowIndex}`).value = "Penggunaan";
  worksheet.getCell(`D${rowIndex}`).value = "Unit";
  worksheet.getRow(rowIndex).font = { bold: true };
  rowIndex++;
  data.topUsedChemicals.forEach((chemical) => {
    worksheet.getCell(`A${rowIndex}`).value = chemical.name;
    worksheet.getCell(`B${rowIndex}`).value = chemical.formula;
    worksheet.getCell(`C${rowIndex}`).value = chemical.usage;
    worksheet.getCell(`D${rowIndex}`).value = chemical.unit;
    rowIndex++;
  });

  // Export
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_inventaris_kimia_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Gagal mengekspor data ke Excel");
  }
};
