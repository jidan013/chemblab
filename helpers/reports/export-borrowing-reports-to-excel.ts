import ExcelJS from "exceljs";
import { BorrowingStats } from "@/types/reports";

export const exportBorrowingReportToExcel = async (
  data: BorrowingStats,
  period: string,
) => {
  if (!data) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Permintaan");

  // Title
  worksheet.mergeCells("A1:F1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "Laporan Permintaan & Peminjaman";
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center" };
  worksheet.getCell("A2").value = `Periode: ${period}`;

  // Key Metrics
  worksheet.mergeCells("A4:F4");
  worksheet.getCell("A4").value = "Ringkasan Peminjaman";
  worksheet.getCell("A4").font = { bold: true, color: { argb: "FF0070C0" } };

  const keyMetrics = [
    ["Total Permintaan", data.totalBorrowings],
    ["Peminjaman Aktif", data.activeBorrowings],
    ["Selesai", data.completedBorrowings],
    ["Terlambat", data.overdueBorrowings],
    ["Ditolak", data.rejectedBorrowings],
    ["Rata-rata Waktu Pengembalian (jam)", data.averageReturnTime.toFixed(2)],
  ];

  let rowIndex = 5;
  keyMetrics.forEach(([label, value]) => {
    worksheet.getCell(`A${rowIndex}`).value = label;
    worksheet.getCell(`B${rowIndex}`).value = value;
    worksheet.getRow(rowIndex).font = { bold: true };
    rowIndex++;
  });

  // User Stats
  rowIndex += 2;
  worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
  worksheet.getCell(`A${rowIndex}`).value = "Peminjaman Berdasarkan Tipe User";
  worksheet.getCell(`A${rowIndex}`).font = { bold: true };

  rowIndex++;
  worksheet.getCell(`A${rowIndex}`).value = "Mahasiswa";
  worksheet.getCell(`B${rowIndex}`).value = data.byUserType.students;
  rowIndex++;
  worksheet.getCell(`A${rowIndex}`).value = "Dosen";
  worksheet.getCell(`B${rowIndex}`).value = data.byUserType.lecturers;
  rowIndex++;

  // Top Borrowers
  rowIndex++;
  worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
  worksheet.getCell(`A${rowIndex}`).value = "Top Peminjam";
  worksheet.getCell(`A${rowIndex}`).font = { bold: true };
  rowIndex++;
  worksheet.getCell(`A${rowIndex}`).value = "Nama";
  worksheet.getCell(`B${rowIndex}`).value = "NIM";
  worksheet.getCell(`C${rowIndex}`).value = "Jumlah Pinjam";
  worksheet.getRow(rowIndex).font = { bold: true };
  rowIndex++;
  data.topBorrowers.forEach((borrower) => {
    worksheet.getCell(`A${rowIndex}`).value = borrower.name;
    worksheet.getCell(`B${rowIndex}`).value = borrower.nim ?? "-";
    worksheet.getCell(`C${rowIndex}`).value = borrower.count;
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
    a.download = `laporan_peminjaman_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Gagal mengekspor data ke Excel");
  }
};
