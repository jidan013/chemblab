import ExcelJS from "exceljs";
import { SDS } from "@/types/sds";

export const exportSdsToExcel = async (sds: SDS[]) => {
  if (!sds || sds.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // Membuat workbook baru
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Safety Data Sheet");

  // Definisikan header kolom
  worksheet.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama Kimia", key: "chemicalName", width: 25 },
    { header: "Rumus Kimia", key: "formula", width: 15 },
    { header: "Bentuk", key: "form", width: 15 },
    { header: "Sifat", key: "characteristic", width: 15 },
    { header: "Nama File SDS", key: "fileName", width: 25 },
    { header: "URL File", key: "filePath", width: 25 },
    { header: "URL Eksternal", key: "externalUrl", width: 25 },
    { header: "Bahasa", key: "language", width: 10 },
    { header: "Dibuat Oleh", key: "createdByName", width: 20 },
    { header: "Diupdate Oleh", key: "updatedByName", width: 20 },
    { header: "Tanggal Dibuat", key: "createdAt", width: 20 },
    { header: "Tanggal Diupdate", key: "updatedAt", width: 20 },
  ];

  // Tambahkan data ke worksheet
  sds.forEach((sds, index) => {
    worksheet.addRow({
      no: index + 1,
      chemicalName: sds.chemical.name,
      formula: sds.chemical.formula,
      form: sds.chemical.form,
      characteristic: sds.chemical.characteristic,
      fileName: sds.fileName || "-",
      filePath: sds.filePath || "-",
      externalUrl: sds.externalUrl || "-",
      language: sds.language,
      createdByName: sds.createdByName,
      updatedByName: sds.updatedByName || "-",
      createdAt: new Date(sds.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      updatedAt: sds.updatedAt
        ? new Date(sds.updatedAt).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "-",
    });
  });

  // Style untuk header
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Format tanggal untuk nama file
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Bulan dimulai dari 0
  const year = now.getFullYear();
  const fileName = `data_safety_data_sheets_${day}-${month}-${year}.xlsx`;

  // Export ke file
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Gagal mengekspor data ke Excel");
  }
};
