"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, RotateCcw, Clock, AlertTriangle } from "lucide-react";
import { DetailBorrowingDialog } from "@/components/dialog/borrowings/detail-borrowing-dialog";
import { useToast } from "@/hooks/use-toast";
import { Borrowing } from "@/types/borrowings";
import axios from "axios";
import { ReturnBorrowingDialog } from "@/components/dialog/borrowings/return-borrowing-dialog";

interface BorrowingPaginationProps {
  currentPage: number;
  totalPages: number;
}

interface BorrowingTableProps {
  borrowings: Borrowing[];
  pagination: BorrowingPaginationProps;
  onPageChange: (page: number) => void;
  userRole: string;
}

export function BorrowingTable({
  borrowings,
  pagination,
  onPageChange,
  userRole,
}: BorrowingTableProps) {
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(
    null
  );
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedReturnBorrowing, setSelectedReturnBorrowing] =
    useState<Borrowing | null>(null);

  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Menunggu
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Disetujui
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Ditolak</Badge>;
      case "RETURNED":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Dikembalikan
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Terlambat
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "APPROVED":
        return <Check className="h-4 w-4 text-green-600" />;
      case "REJECTED":
        return <X className="h-4 w-4 text-red-600" />;
      case "RETURNED":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case "OVERDUE":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const handleStatusChange = async (borrowingId: string, action: string) => {
    try {
      let body = {};

      if (action === "RETURNED") {
        // Buka dialog untuk pengembalian
        const borrowing = borrowings.find((b) => b.id === borrowingId);
        if (borrowing) {
          setSelectedReturnBorrowing(borrowing);
          setReturnDialogOpen(true);
        }
        return;
      } else {
        body = { action };
      }

      const { data } = await axios.patch(
        `/api/v1/borrowings/${borrowingId}`,
        body,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(data);

      toast({
        title: "Status Updated! 🎉",
        description: `Peminjaman berhasil ${
          action === "APPROVED"
            ? "disetujui"
            : action === "REJECTED"
            ? "ditolak"
            : "diperbarui"
        }`,
      });

      // Refresh halaman untuk menampilkan data terbaru
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error("Error change status: ", error);

      // Ambil pesan error asli dari response server jika tersedia,
      // supaya pengguna tahu alasan spesifik kegagalan
      // (mis. "Stok tidak mencukupi", "melebihi batas 25 bahan", dll)
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Gagal memperbarui status peminjaman";

      toast({
        title: "Error ❌",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const canManage =
    userRole === "ADMIN" ||
    userRole === "LABORAN" ||
    userRole === "PETUGAS_GUDANG";

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-blue-50 hover:bg-blue-100">
                <TableHead className="whitespace-nowrap pl-4 w-[60px]">
                  No
                </TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Bahan Kimia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowings.map((borrowing, index) => (
                <TableRow key={borrowing.id}>
                  <TableCell className="pl-4 w-[60px]">{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {borrowing.borrower.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {borrowing.borrower.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm font-medium truncate">
                        {borrowing.purpose}
                      </p>
                      <p className="text-xs text-gray-500">
                        {borrowing.items.length} item
                        {borrowing.items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {borrowing.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="text-sm">
                          <span className="font-medium">
                            {item.chemical.name}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {item.quantity} {item.chemical.unit}
                          </span>
                        </div>
                      ))}
                      {borrowing.items.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{borrowing.items.length - 2} lainnya
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(borrowing.status)}
                      {getStatusBadge(borrowing.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        Diajukan:{" "}
                        {format(borrowing.requestDate, "dd/MM/yyyy", {
                          locale: id,
                        })}
                      </div>
                      {borrowing.approvedAt && (
                        <div className="text-green-600">
                          Disetujui:{" "}
                          {format(borrowing.approvedAt, "dd/MM/yyyy", {
                            locale: id,
                          })}
                        </div>
                      )}
                      {borrowing.returnedAt && (
                        <div className="text-blue-600">
                          Dikembalikan:{" "}
                          {format(borrowing.returnedAt, "dd/MM/yyyy", {
                            locale: id,
                          })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        title="Detail Peminjaman"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBorrowing(borrowing)}>
                        <Eye className="h-4 w-4" />
                      </Button>

                      {canManage && borrowing.status === "PENDING" && (
                        <>
                          <Button
                            title="Peminjaman disetujui"
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 bg-transparent"
                            onClick={() =>
                              handleStatusChange(borrowing.id, "APPROVED")
                            }>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            title="Peminjaman ditolak"
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                            onClick={() =>
                              handleStatusChange(borrowing.id, "REJECTED")
                            }>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {canManage && borrowing.status === "APPROVED" && (
                        <>
                          <Button
                            title="Peminjaman dikembalikan"
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 bg-transparent"
                            onClick={() =>
                              handleStatusChange(borrowing.id, "RETURNED")
                            }>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            title="Peminjaman terlambat"
                            variant="outline"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700 bg-transparent"
                            onClick={() =>
                              handleStatusChange(borrowing.id, "OVERDUE")
                            }>
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          Halaman {pagination.currentPage} dari {pagination.totalPages}
        </p>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 md:flex-none"
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage <= 1}>
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 md:flex-none"
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages}>
            Selanjutnya
          </Button>
        </div>
      </div>

      {selectedBorrowing && (
        <DetailBorrowingDialog
          borrowing={selectedBorrowing}
          open={!!selectedBorrowing}
          onOpenChange={(open) => !open && setSelectedBorrowing(null)}
          userRole={userRole}
        />
      )}

      {/* Dialog Pengembalian */}
      <ReturnBorrowingDialog
        borrowing={selectedReturnBorrowing}
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
      />
    </>
  );
}