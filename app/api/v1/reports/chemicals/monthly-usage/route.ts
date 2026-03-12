import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { MonthlyChemicalUsage } from "@/helpers/reports/export-recapitulation-to-excel";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g., "January"
    const year = searchParams.get("year"); // e.g., "2026"

    if (!month || !year) {
      return NextResponse.json(
        { message: "Month and year are required" },
        { status: 400 },
      );
    }

    const monthIndex = new Date(Date.parse(month + " 1, 2012")).getMonth();
    if (Number.isNaN(monthIndex)) {
      return NextResponse.json({ message: "Invalid month" }, { status: 400 });
    }

    const startDate = new Date(parseInt(year), monthIndex, 1);
    const startNextMonth = new Date(parseInt(year), monthIndex + 1, 1);

    // 1) Ambil semua pemakaian (OUT) di bulan yang dipilih sekali query.
    const mutationsInMonth = await db.stockMutation.findMany({
      where: {
        type: "OUT",
        createdAt: {
          gte: startDate,
          lt: startNextMonth,
        },
      },
      select: {
        chemicalId: true,
        quantity: true,
        createdAt: true,
      },
    });

    if (mutationsInMonth.length === 0) {
      return NextResponse.json([]);
    }

    const chemicalIds = [...new Set(mutationsInMonth.map((m) => m.chemicalId))];

    // 2) Ambil data chemical yang memang dipakai di bulan tsb.
    const chemicals = await db.chemical.findMany({
      where: { id: { in: chemicalIds } },
      select: {
        id: true,
        name: true,
        formula: true,
        currentStock: true,
        unit: true,
      },
    });

    // 3) Agregasi mutasi sejak awal bulan untuk hitung stock awal (tanpa N+1 query).
    const mutationsSinceStartAgg = await db.stockMutation.groupBy({
      by: ["chemicalId", "type"],
      where: {
        chemicalId: { in: chemicalIds },
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const adjustmentsByChemical = new Map<
      string,
      { inQty: number; returnQty: number; outQty: number }
    >();

    for (const row of mutationsSinceStartAgg) {
      const current = adjustmentsByChemical.get(row.chemicalId) ?? {
        inQty: 0,
        returnQty: 0,
        outQty: 0,
      };

      const qty = row._sum.quantity ?? 0;
      if (row.type === "IN") current.inQty += qty;
      if (row.type === "RETURN") current.returnQty += qty;
      if (row.type === "OUT") current.outQty += qty;

      adjustmentsByChemical.set(row.chemicalId, current);
    }

    const monthlyUsageByChemical = new Map<
      string,
      { dailyUsage: { [day: number]: number }; totalUsageInMonth: number }
    >();

    for (const mutation of mutationsInMonth) {
      const current = monthlyUsageByChemical.get(mutation.chemicalId) ?? {
        dailyUsage: {},
        totalUsageInMonth: 0,
      };
      const day = mutation.createdAt.getDate();
      current.dailyUsage[day] = (current.dailyUsage[day] || 0) + mutation.quantity;
      current.totalUsageInMonth += mutation.quantity;
      monthlyUsageByChemical.set(mutation.chemicalId, current);
    }

    const recapitulationData: MonthlyChemicalUsage[] = chemicals
      .map((chemical) => {
        const adjustment = adjustmentsByChemical.get(chemical.id) ?? {
          inQty: 0,
          returnQty: 0,
          outQty: 0,
        };

        const usage = monthlyUsageByChemical.get(chemical.id);
        if (!usage || usage.totalUsageInMonth === 0) {
          return null;
        }

        // Pertahankan logika lama: reverse mutasi dari awal bulan untuk dapat stock awal bulan.
        const initialStock =
          chemical.currentStock - adjustment.inQty - adjustment.returnQty + adjustment.outQty;
        const finalStock = initialStock - usage.totalUsageInMonth;

        return {
          chemicalName: chemical.name,
          formula: chemical.formula ?? "",
          initialStock,
          unit: chemical.unit,
          dailyUsage: usage.dailyUsage,
          finalStock,
        };
      })
      .filter((item): item is MonthlyChemicalUsage => item !== null);

    return NextResponse.json(recapitulationData);
  } catch (error) {
    console.error("[REPORTS_CHEMICAL_MONTHLY_USAGE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
