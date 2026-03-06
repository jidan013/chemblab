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

    // Validasi status peminjaman
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

    switch (action) {
      case "APPROVED":
        // Validasi stok
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
          // Update stok chemicals
          for (const item of borrowing.items) {
            await tx.chemical.update({
              where: { id: item.chemical.id },
              data: { currentStock: { decrement: item.quantity } },
            });

            // Create stock mutation record
            await tx.stockMutation.create({
              data: {
                type: "OUT",
                quantity: item.quantity,
                description: `Peminjaman Disetujui - ID: ${borrowing.id}`,
                chemicalId: item.chemical.id,
                createdById: userAccess.userId,
              },
            });

            // Buat usage history untuk seluruh quantity
            usageHistories.push(
              await tx.usageHistory.create({
                data: {
                  quantity: item.quantity,
                  purpose: borrowing.purpose,
                  chemicalId: item.chemical.id,
                  userId: borrowing.borrowerId,
                  borrowingId: borrowing.id,
                },
              })
            );
          }

          return await tx.borrowing.update({
            where: { id: borrowingId },
            data: {
              status: BorrowingStatus.APPROVED,
              approvedAt: new Date(),
              approvedById: userAccess.userId,
              rejectedById: null, // Reset rejectedBy jika ada
            },
            include: {
              items: true,
              approvedBy: true,
              borrower: true,
              UsageHistory: true,
            },
          });
        });
        break;

      case "REJECTED":
        updatedBorrowing = await db.borrowing.update({
          where: { id: borrowingId },
          data: {
            status: BorrowingStatus.REJECTED,
            rejectedAt: new Date(),
            rejectedById: userAccess.userId,
            approvedById: null, // Reset approvedBy jika ada
          },
          include: {
            rejectedBy: true,
            borrower: true,
          },
        });
        break;

      case "RETURNED":
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

        updatedBorrowing = await db.$transaction(async (tx) => {
          // Update returned items
          for (const returnedItem of returnedItems) {
            const item = borrowing.items.find((i) => i.id === returnedItem.id);
            if (!item) continue;

            const returnedQty = Number(returnedItem.returnedQty) || 0;
            const usedQty = item.quantity - returnedQty;

            // Validasi jumlah pengembalian
            if (returnedQty < 0 || returnedQty > item.quantity) {
              throw new Error(
                `Jumlah pengembalian tidak valid untuk item ${item.chemical.name}`
              );
            }

            // Update borrowing item
            await tx.borrowingItem.update({
              where: { id: item.id },
              data: {
                returned: true,
                returnedQty: returnedQty,
              },
            });

            // Kembalikan stok jika ada yang dikembalikan
            if (returnedQty > 0) {
              await tx.chemical.update({
                where: { id: item.chemical.id },
                data: { currentStock: { increment: returnedQty } },
              });

              // Create stock mutation record for the return
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
              usageHistories.push(
                await tx.usageHistory.create({
                  data: {
                    quantity: usedQty,
                    purpose: borrowing.purpose,
                    chemicalId: item.chemical.id,
                    userId: borrowing.borrowerId,
                    borrowingId: borrowing.id,
                  },
                })
              );
            }
          }

          return await tx.borrowing.update({
            where: { id: borrowingId },
            data: {
              status: BorrowingStatus.RETURNED,
              returnedAt: new Date(),
              returnedById: userAccess.userId,
            },
            include: {
              items: true,
              returnedBy: true,
              borrower: true,
              UsageHistory: true,
            },
          });
        });
        break;

      case "OVERDUE":
        updatedBorrowing = await db.borrowing.update({
          where: { id: borrowingId },
          data: {
            status: BorrowingStatus.OVERDUE,
          },
          include: {
            borrower: true,
          },
        });
        break;

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
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
