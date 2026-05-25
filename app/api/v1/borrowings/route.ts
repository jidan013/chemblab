import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthOrNull } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { createBorrowingSchema } from "@/lib/validation/borrowings";
import { sendNotification } from "@/lib/notification";

export async function GET(request: NextRequest) {
  try {
    const userAccess = await requireAuthOrNull();
    if (userAccess instanceof NextResponse) return userAccess;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Invalid pagination params" },
        { status: 400 }
      );
    }
    const search = searchParams.get("search") || "";
    const filterStatus = searchParams.get("status") || "";
    const filterUserRole = searchParams.get("userRole") || "";
    const summaryOnly = searchParams.get("summaryOnly") === "1";

    const skip = (page - 1) * limit;

    const andConditions: Prisma.BorrowingWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          {
            borrower: {
              username: { contains: search, mode: "insensitive" },
            },
          },
          {
            borrower: {
              email: { contains: search, mode: "insensitive" },
            },
          },
          {
            borrower: {
              mahasiswa: {
                full_name: { contains: search, mode: "insensitive" },
              },
            },
          },
          {
            borrower: {
              dosen: {
                full_name: { contains: search, mode: "insensitive" },
              },
            },
          },
          {
            borrower: {
              laboran: {
                full_name: { contains: search, mode: "insensitive" },
              },
            },
          },
          {
            purpose: { contains: search, mode: "insensitive" },
          },
          {
            items: {
              some: {
                chemical: {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { formula: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (filterStatus) {
      andConditions.push({
        status: filterStatus as Prisma.EnumBorrowingStatusFilter["equals"],
      });
    }

    if (filterUserRole) {
      andConditions.push({
        borrower: {
          role: filterUserRole as Prisma.EnumRoleFilter["equals"],
        },
      });
    }

    if (userAccess?.role === "MAHASISWA" || userAccess?.role === "DOSEN") {
      andConditions.push({
        borrowerId: userAccess.userId,
      });
    }

    const where: Prisma.BorrowingWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    if (summaryOnly) {
      const [recentActivities, allActive, ownActive] = await Promise.all([
        db.borrowing.findMany({
          take: 5,
          orderBy: { requestDate: "desc" },
          select: {
            id: true,
            status: true,
            requestDate: true,
            borrower: { select: { username: true } },
            items: {
              take: 1,
              select: {
                chemical: {
                  select: { name: true, unit: true },
                },
              },
            },
          },
        }),

        db.borrowing.count({
          where: {
            status: { in: ["APPROVED", "OVERDUE"] },
          },
        }),

        db.borrowing.count({
          where: {
            status: { in: ["APPROVED", "OVERDUE"] },
            borrowerId: userAccess?.userId,
          },
        }),
      ]);

      return NextResponse.json(
        {
          message: "Successfully fetched borrowing summary",
          recentActivities,
          allActive,
          ownActive,
        },
        { status: 200 }
      );
    }

    const [
      borrowings,
      totalFiltered,
      total,
      groupedStatus,
      recentActivities,
      allActive,
      ownActive,
    ] = await Promise.all([
      db.borrowing.findMany({
        where,
        select: {
          id: true,
          borrowerId: true,
          purpose: true,
          status: true,
          requestDate: true,
          approvedAt: true,
          returnedAt: true,
          notes: true,
          borrower: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              dosen: { select: { full_name: true } },
              laboran: { select: { full_name: true } },
              mahasiswa: { select: { full_name: true } },
            },
          },
          items: {
            select: {
              id: true,
              chemicalId: true,
              quantity: true,
              returned: true,
              returnedQty: true,
              chemical: {
                select: { id: true, name: true, formula: true, unit: true },
              },
            },
          },
          approvedBy: {
            select: {
              id: true,
              role: true,
              username: true,
              laboran: { select: { full_name: true } },
            },
          },
          rejectedBy: {
            select: {
              id: true,
              role: true,
              username: true,
              laboran: { select: { full_name: true } },
            },
          },
          returnedBy: {
            select: {
              id: true,
              role: true,
              username: true,
              laboran: { select: { full_name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { requestDate: "desc" },
      }),

      db.borrowing.count({ where }),
      db.borrowing.count(),

      db.borrowing.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),

      db.borrowing.findMany({
        take: 5,
        orderBy: { requestDate: "desc" },
        select: {
          id: true,
          status: true,
          requestDate: true,
          borrower: { select: { username: true } },
          items: {
            take: 1,
            select: {
              chemical: {
                select: { name: true, unit: true },
              },
            },
          },
        },
      }),

      db.borrowing.count({
        where: {
          status: { in: ["APPROVED", "OVERDUE"] },
        },
      }),

      db.borrowing.count({
        where: {
          status: { in: ["APPROVED", "OVERDUE"] },
          borrowerId: userAccess?.userId,
        },
      }),
    ]);

    const getActorName = (
      actor:
        | {
            role: string;
            username: string;
            laboran: { full_name: string } | null;
          }
        | null
        | undefined
    ) => {
      if (!actor) return undefined;
      if (actor.role === "ADMIN") return "Administrator";
      return actor.laboran?.full_name || actor.username;
    };

    const getBorrowerName = (borrowing: (typeof borrowings)[number]) => {
      if (borrowing.borrower.role === "ADMIN") return "Administrator";
      return (
        borrowing.borrower.mahasiswa?.full_name ||
        borrowing.borrower.dosen?.full_name ||
        borrowing.borrower.laboran?.full_name ||
        borrowing.borrower.username ||
        "GUEST"
      );
    };

    const formattedBorrowings = borrowings.map((borrowing) => {
      return {
        id: borrowing.id,
        borrowerId: borrowing.borrowerId,
        borrower: {
          id: borrowing.borrower.id,
          name: getBorrowerName(borrowing),
          email: borrowing.borrower.email,
          role: borrowing.borrower.role,
        },
        purpose: borrowing.purpose,
        status: borrowing.status,
        requestDate: borrowing.requestDate.toISOString(),
        approvedAt: borrowing.approvedAt
          ? borrowing.approvedAt.toISOString()
          : null,
        returnedAt: borrowing.returnedAt
          ? borrowing.returnedAt.toISOString()
          : null,
        notes: borrowing.notes,
        items: borrowing.items.map((item) => ({
          id: item.id,
          chemicalId: item.chemicalId,
          chemical: {
            id: item.chemical.id,
            name: item.chemical.name,
            formula: item.chemical.formula,
            unit: item.chemical.unit,
          },
          quantity: item.quantity,
          returned: item.returned,
          returnedQty: item.returnedQty,
        })),
        approvedBy: {
          userId: borrowing.approvedBy?.id,
          name: getActorName(borrowing.approvedBy),
        },
        rejectedBy: {
          userId: borrowing.rejectedBy?.id,
          name: getActorName(borrowing.rejectedBy),
        },
        returnedBy: {
          userId: borrowing.returnedBy?.id,
          name: getActorName(borrowing.returnedBy),
        },
      };
    });

    const statusCounts = groupedStatus.reduce(
      (acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      },
      {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        RETURNED: 0,
        OVERDUE: 0,
      } as Record<string, number>
    );

    return NextResponse.json(
      {
        message: "Successfully fetched borrowings",
        formattedBorrowings,
        totalFiltered,
        statusCounts,
        recentActivities,
        allActive,
        ownActive,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(totalFiltered / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching borrowings: ", error);
    return NextResponse.json(
      { error: "Failed to fetch borrowings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userAccess = await requireAuthOrNull();
    if (userAccess instanceof NextResponse) return userAccess;

    const body = await request.json();
    const parsed = createBorrowingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: "Data tidak valid", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { nrp, supervisor, noTelp, sarjanaLevel, purpose, notes, items } =
      parsed.data;

    const borrowing = await db.borrowing.create({
      data: {
        nrp,
        supervisor,
        noHp: String(noTelp),
        sarjanaLevel,
        purpose,
        notes,
        borrowerId: userAccess.userId,
        items: {
          create: items.map((item) => ({
            chemicalId: item.chemicalId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        borrower: {
          include: {
            laboran: { select: { full_name: true } },
            dosen: { select: { full_name: true } },
            mahasiswa: { select: { full_name: true } },
          },
        },
        items: {
          include: {
            chemical: {
              select: { id: true, name: true, formula: true, unit: true },
            },
          },
        },
      },
    });

    // Cari semua ADMIN & LABORAN & PETUGAS_GUDANG
    const recipients = await db.user.findMany({
      where: { role: { in: ["ADMIN", "LABORAN", "PETUGAS_GUDANG"] } },
      select: { id: true },
    });

    const userIds = recipients.map((r) => r.id);

    // 🔔 Kirim notifikasi
    await sendNotification(
      userIds,
      "Pengajuan Peminjaman Baru",
      `${borrowing.borrower.username} mengajukan peminjaman`,
      "/borrowings"
    );

    return NextResponse.json(
      { message: "Borrowing created successfully", borrowing },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating borrowing:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
