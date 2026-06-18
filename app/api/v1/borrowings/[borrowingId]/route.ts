import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleOrNull } from "@/lib/auth";
import { BorrowingStatus, UsageHistory } from "@/types/borrowings";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ borrowingId: string }> }
) {
  try {
    const userAccess = await requireRoleOrNull([
      "ADMIN",
      "LABORAN",
      "PETUGAS_GUDANG",
    ]);
    if (userAccess instanceof NextResponse) return userAccess;

    const { borrowingId } = await params;

    const body = await req.json();
    const { action, returnedItems } = body;

    // Validasi action
    const validActions = ["APPROVED", "REJECTED", "RETURNED", "OVERDUE"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          error:
            "Aksi tidak valid. Gunakan: APPROVE, REJECT, RETURN, atau MARK_OVERDUE",
        },
        { status: 400 }
      );
    }

    const borrowing = await db.borrowing.findUnique({
      where: { id: borrowingId },
      include: {
        items: {
          include: {
            chemical: true,
          },
        },
        borrower: true,
      },
    });

    if (!borrowing) {
      return NextResponse.json(
        { error: "Peminjaman tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi status peminjaman (pengecekan awal / fail-fast,
    // pengecekan final tetap dilakukan ulang di dalam transaksi)
    if (action === "APPROVED" && borrowing.status !== BorrowingStatus.PENDING) {
      return NextResponse.json(
        {
          error: "Hanya peminjaman dengan status PENDING yang dapat disetujui",
        },
        { status: 400 }
      );
    }

    if (action === "REJECTED" && borrowing.status !== BorrowingStatus.PENDING) {
      return NextResponse.json(
        { error: "Hanya peminjaman dengan status PENDING yang dapat ditolak" },
        { status: 400 }
      );
    }

    if (
      action === "RETURNED" &&
      borrowing.status !== BorrowingStatus.APPROVED
    ) {
      return NextResponse.json(
        {
          error:
            "Hanya peminjaman dengan status APPROVED yang dapat dikembalikan",
        },
        { status: 400 }
      );
    }

    if (action === "OVERDUE" && borrowing.status !== BorrowingStatus.APPROVED) {
      return NextResponse.json(
        {
          error:
            "Hanya peminjaman dengan status APPROVED yang dapat ditandai overdue",
        },
        { status: 400 }
      );
    }

    let updatedBorrowing;
    const usageHistories: UsageHistory[] = [];

    // Opsi transaksi yang lebih longgar, dipakai di APPROVED & RETURNED
    const TRANSACTION_OPTIONS = {
      maxWait: 10000,
      timeout: 20000,
    };

    switch (action) {
      case "APPROVED": {
        // Validasi stok awal (fail-fast). Pengecekan ulang yang lebih
        // ketat (anti race-condition) dilakukan lagi di dalam transaksi.
        for (const item of borrowing.items) {
          if (item.quantity > item.chemical.currentStock) {
            return NextResponse.json(
              {
                error: `Stok ${item.chemical.name} tidak mencukupi`,
                chemicalId: item.chemical.id,
                availableStock: item.chemical.currentStock,
                requested: item.quantity,
              },
              { status: 400 }
            );
          }
        }

        updatedBorrowing = await db.$transaction(async (tx) => {
          // Kunci status PENDING -> APPROVED secara atomik.
          // Kalau ada request lain yang sudah mengubah status ini lebih dulu
          // (misalnya klik approve ganda / race condition), count akan 0.
          const statusLock = await tx.borrowing.updateMany({
            where: { id: borrowingId, status: BorrowingStatus.PENDING },
            data: {
              status: BorrowingStatus.APPROVED,
              approvedAt: new Date(),
              approvedById: userAccess.userId,
              rejectedById: null,
            },
          });

          if (statusLock.count === 0) {
            throw new Error(
              "Peminjaman sudah diproses oleh permintaan lain"
            );
          }

          // Jalankan operasi per item secara PARALEL, bukan sequential,
          // supaya waktu eksekusi tidak naik linear seiring jumlah item.
          const createdHistories = await Promise.all(
            borrowing.items.map(async (item) => {
              // Decrement stok hanya jika stok masih cukup SAAT INI,
              // bukan berdasarkan data yang dibaca sebelum transaksi.
              const stockLock = await tx.chemical.updateMany({
                where: {
                  id: item.chemical.id,
                  currentStock: { gte: item.quantity },
                },
                data: { currentStock: { decrement: item.quantity } },
              });

              if (stockLock.count === 0) {
                throw new Error(
                  `Stok ${item.chemical.name} tidak mencukupi saat diproses`
                );
              }

              await tx.stockMutation.create({
                data: {
                  type: "OUT",
                  quantity: item.quantity,
                  description: `Peminjaman Disetujui - ID: ${borrowing.id}`,
                  chemicalId: item.chemical.id,
                  createdById: userAccess.userId,
                },
              });

              return tx.usageHistory.create({
                data: {
                  quantity: item.quantity,
                  purpose: borrowing.purpose,
                  chemicalId: item.chemical.id,
                  userId: borrowing.borrowerId,
                  borrowingId: borrowing.id,
                },
              });
            })
          );

          usageHistories.push(...createdHistories);

          // Ambil ulang data lengkap untuk response, karena updateMany
          // di atas tidak mengembalikan record yang sudah diupdate.
          return await tx.borrowing.findUniqueOrThrow({
            where: { id: borrowingId },
            include: {
              items: true,
              approvedBy: true,
              borrower: true,
              UsageHistory: true,
            },
          });
        }, TRANSACTION_OPTIONS);
        break;
      }

      case "REJECTED": {
        const rejected = await db.borrowing.updateMany({
          where: { id: borrowingId, status: BorrowingStatus.PENDING },
          data: {
            status: BorrowingStatus.REJECTED,
            rejectedAt: new Date(),
            rejectedById: userAccess.userId,
            approvedById: null,
          },
        });

        if (rejected.count === 0) {
          return NextResponse.json(
            { error: "Peminjaman sudah diproses oleh permintaan lain" },
            { status: 409 }
          );
        }

        updatedBorrowing = await db.borrowing.findUniqueOrThrow({
          where: { id: borrowingId },
          include: {
            rejectedBy: true,
            borrower: true,
          },
        });
        break;
      }

      case "RETURNED": {
        if (
          !returnedItems ||
          !Array.isArray(returnedItems) ||
          returnedItems.length === 0
        ) {
          return NextResponse.json(
            {
              error:
                "Data pengembalian harus berupa array dan tidak boleh kosong",
            },
            { status: 400 }
          );
        }

        // Validasi semua item ada
        for (const returnedItem of returnedItems) {
          const itemExists = borrowing.items.some(
            (i) => i.id === returnedItem.id
          );
          if (!itemExists) {
            return NextResponse.json(
              {
                error: `Item dengan ID ${returnedItem.id} tidak ditemukan dalam peminjaman ini`,
              },
              { status: 400 }
            );
          }
        }

        // Validasi jumlah pengembalian dan cegah pengembalian ganda,
        // dilakukan SEBELUM transaksi dimulai supaya gagal cepat.
        for (const returnedItem of returnedItems) {
          const item = borrowing.items.find((i) => i.id === returnedItem.id);
          if (!item) continue;

          if (item.returned) {
            return NextResponse.json(
              {
                error: `Item ${item.chemical.name} sudah pernah dikembalikan`,
              },
              { status: 400 }
            );
          }

          const returnedQty = Number(returnedItem.returnedQty) || 0;
          if (returnedQty < 0 || returnedQty > item.quantity) {
            return NextResponse.json(
              {
                error: `Jumlah pengembalian tidak valid untuk item ${item.chemical.name}`,
              },
              { status: 400 }
            );
          }
        }

        updatedBorrowing = await db.$transaction(async (tx) => {
          // Kunci status APPROVED -> RETURNED secara atomik, mencegah
          // proses pengembalian ganda dari request yang bersamaan.
          const statusLock = await tx.borrowing.updateMany({
            where: { id: borrowingId, status: BorrowingStatus.APPROVED },
            data: {
              status: BorrowingStatus.RETURNED,
              returnedAt: new Date(),
              returnedById: userAccess.userId,
            },
          });

          if (statusLock.count === 0) {
            throw new Error(
              "Peminjaman sudah diproses oleh permintaan lain"
            );
          }

          const createdHistories = await Promise.all(
            returnedItems.map(async (returnedItem) => {
              const item = borrowing.items.find(
                (i) => i.id === returnedItem.id
              );
              if (!item) return null;

              const returnedQty = Number(returnedItem.returnedQty) || 0;
              const usedQty = item.quantity - returnedQty;

              // Update borrowing item, dengan guard "returned: false"
              // untuk mencegah item yang sama diproses dua kali.
              const itemLock = await tx.borrowingItem.updateMany({
                where: { id: item.id, returned: false },
                data: {
                  returned: true,
                  returnedQty: returnedQty,
                },
              });

              if (itemLock.count === 0) {
                throw new Error(
                  `Item ${item.chemical.name} sudah pernah dikembalikan`
                );
              }

              // Kembalikan stok jika ada yang dikembalikan
              if (returnedQty > 0) {
                await tx.chemical.update({
                  where: { id: item.chemical.id },
                  data: { currentStock: { increment: returnedQty } },
                });

                await tx.stockMutation.create({
                  data: {
                    type: "RETURN",
                    quantity: returnedQty,
                    description: `Pengembalian Peminjaman - ID: ${borrowing.id}`,
                    chemicalId: item.chemical.id,
                    createdById: userAccess.userId,
                  },
                });
              }

              // Catat usage history untuk yang terpakai
              if (usedQty > 0) {
                return tx.usageHistory.create({
                  data: {
                    quantity: usedQty,
                    purpose: borrowing.purpose,
                    chemicalId: item.chemical.id,
                    userId: borrowing.borrowerId,
                    borrowingId: borrowing.id,
                  },
                });
              }

              return null;
            })
          );

          usageHistories.push(
            ...createdHistories.filter(
              (h): h is UsageHistory => h !== null
            )
          );

          return await tx.borrowing.findUniqueOrThrow({
            where: { id: borrowingId },
            include: {
              items: true,
              returnedBy: true,
              borrower: true,
              UsageHistory: true,
            },
          });
        }, TRANSACTION_OPTIONS);
        break;
      }

      case "OVERDUE": {
        const overdue = await db.borrowing.updateMany({
          where: { id: borrowingId, status: BorrowingStatus.APPROVED },
          data: {
            status: BorrowingStatus.OVERDUE,
          },
        });

        if (overdue.count === 0) {
          return NextResponse.json(
            { error: "Peminjaman sudah diproses oleh permintaan lain" },
            { status: 409 }
          );
        }

        updatedBorrowing = await db.borrowing.findUniqueOrThrow({
          where: { id: borrowingId },
          include: {
            borrower: true,
          },
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: "Aksi tidak valid" },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Peminjaman berhasil diupdate - Status: ${updatedBorrowing.status}`,
        data: {
          borrowing: updatedBorrowing,
          usageHistories:
            usageHistories.length > 0 ? usageHistories : undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating borrowing:", error);

    // Error timeout transaksi Prisma
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2028"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Proses memakan waktu terlalu lama, silakan coba lagi",
        },
        { status: 500 }
      );
    }

    // Error validasi/race-condition custom yang dilempar manual
    if (error instanceof Error && error.message) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}