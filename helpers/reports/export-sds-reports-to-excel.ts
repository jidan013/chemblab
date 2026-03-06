import ExcelJS from "exceljs";
import { SDSStats } from "@/types/reports";

export const exportSDSReportToExcel = async (
  data: SDSStats,
  period: string,
) => {
  if (!data) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan SDS");

  // Title
  worksheet.mergeCells("A1:D1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "Laporan Safety Data Sheet (SDS)";
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center" };
  worksheet.getCell("A2").value = `Periode: ${period}`;

  // Key Metrics
  worksheet.mergeCells("A4:D4");
  worksheet.getCell("A4").value = "Ringkasan SDS";
  worksheet.getCell("A4").font = { bold: true, color: { argb: "FF0070C0" } };

  const keyMetrics = [
    ["Total SDS", data.totalSDS],
    ["SDS Aktif", data.activeSDS],
    ["Total Unduhan", data.totalDownloads],
  ];

  let rowIndex = 5;
  keyMetrics.forEach(([label, value]) => {
    worksheet.getCell(`A${rowIndex}`).value = label;
    worksheet.getCell(`B${rowIndex}`).value = value;
    worksheet.getRow(rowIndex).font = { bold: true };
    rowIndex++;
  });

  // Downloads by Language
  rowIndex += 2;
  worksheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
  worksheet.getCell(`A${rowIndex}`).value = "Distribusi Bahasa";
  worksheet.getCell(`A${rowIndex}`).font = { bold: true };
  rowIndex++;
  worksheet.getCell(`A${rowIndex}`).value = "Bahasa";
  worksheet.getCell(`B${rowIndex}`).value = "Jumlah";
  worksheet.getRow(rowIndex).font = { bold: true };
  rowIndex++;
  Object.entries(data.byLanguage).forEach(([language, count]) => {
    worksheet.getCell(`A${rowIndex}`).value = language;
    worksheet.getCell(`B${rowIndex}`).value = count;
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
    a.download = `laporan_sds_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Gagal mengekspor data ke Excel");
  }
};
