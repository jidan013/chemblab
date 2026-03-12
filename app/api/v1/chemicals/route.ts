import { chemicalsCreateSchema } from "@/lib/validation/chemicals";
import { type NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleOrNull } from "@/lib/auth";

export async function GET() {
  try {
    const chemicals = await db.chemical.findMany({
      select: {
        id: true,
        name: true,
        formula: true,
        form: true,
        characteristic: true,
        currentStock: true,
        unit: true,
        purchaseDate: true,
        expirationDate: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            role: true,
            username: true,
            laboran: { select: { full_name: true } },
          },
        },
        updatedBy: {
          select: {
            role: true,
            username: true,
            laboran: { select: { full_name: true } },
          },
        },
        safetyDataSheet: { select: { id: true } },
        _count: {
          select: {
            borrowings: true,
            usageHistory: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const getActorName = (
      actor: {
        role: string;
        username: string;
        laboran: { full_name: string } | null;
      } | null,
    ) => {
      if (!actor) return "";

      switch (actor.role) {
        case "ADMIN":
          return "Administrator";
        case "LABORAN":
        case "PETUGAS_GUDANG":
          return actor.laboran?.full_name || actor.username || "Tidak diketahui";
        default:
          return actor.username || "Tidak diketahui";
      }
    };

    const formattedChemicals = chemicals.map((chemical) => {
      const createdByName = getActorName(chemical.createdBy);
      const updatedByName = getActorName(chemical.updatedBy);

      return {
        id: chemical.id,
        name: chemical.name,
        formula: chemical.formula ?? "",
        form: chemical.form,
        characteristic: chemical.characteristic,
        stock: chemical.currentStock,
        unit: chemical.unit,
        purchaseDate: chemical.purchaseDate?.toISOString() ?? null,
        expirationDate: chemical.expirationDate?.toISOString() ?? null,
        createdBy: createdByName,
        updatedBy: updatedByName,
        createdAt: chemical.createdAt.toISOString(),
        updatedAt: chemical.updatedAt.toISOString(),
        sdsCount: chemical.safetyDataSheet ? 1 : 0,
        borrowingCount: chemical._count.borrowings,
        usageCount: chemical._count.usageHistory,
      };
    });

    return NextResponse.json({
      message: "Chemicals fetched successfully",
      chemicals: formattedChemicals,
      total: formattedChemicals.length,
    });
  } catch (error) {
    console.error("Get chemicals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userAccess = await requireRoleOrNull([
      "ADMIN",
      "LABORAN",
      "PETUGAS_GUDANG",
    ]);
    if (userAccess instanceof NextResponse) return userAccess;

    const body = await request.json();
    const parsed = chemicalsCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      name,
      formula = "",
      form,
      characteristic,
      stock,
      unit,
      purchaseDate,
      expirationDate,
    } = parsed.data;

    const chemicaExist = await db.chemical.findFirst({
      where: { name },
    });
    // Pengecekan duplikat CAS number
    if (chemicaExist) {
      return NextResponse.json(
        { error: "Bahan kimia dengan CAS number tersebut sudah ada" },
        { status: 409 }
      );
    }

    const chemical = await db.chemical.create({
      data: {
        name,
        formula,
        form,
        characteristic,
        initialStock: stock,
        currentStock: stock,
        unit,
        purchaseDate: new Date(purchaseDate),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        createdBy: { connect: { id: userAccess.userId } },
      },
    });

    return NextResponse.json(
      { message: "Bahan kimia berhasil ditambahkan", chemical },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding chemical:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
