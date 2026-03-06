import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { MonthlyChemicalUsage } from "@/helpers/reports/export-recapitulation-to-excel";

export async function GET(req: NextRequest) {
  try {
    // console.log("--- NEW REQUEST ---");
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g., "January"
    const year = searchParams.get("year"); // e.g., "2026"

    // console.log(`Params: month=${month}, year=${year}`);

    if (!month || !year) {
      return NextResponse.json(
        { message: "Month and year are required" },
        { status: 400 },
      );
    }

    const monthIndex = new Date(Date.parse(month + " 1, 2012")).getMonth();
    const startDate = new Date(parseInt(year), monthIndex, 1);
    const endDate = new Date(parseInt(year), monthIndex + 1, 0);

    // console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const chemicals = await db.chemical.findMany();
    // console.log(`Found ${chemicals.length} chemicals.`);

    const recapitulationData: MonthlyChemicalUsage[] = [];

    for (const chemical of chemicals) {
      // console.log(`Processing chemical: ${chemical.name} (ID: ${chemical.id})`);

      const mutationsSinceStart = await db.stockMutation.findMany({
        where: {
          chemicalId: chemical.id,
          createdAt: {
            gte: startDate,
          },
        },
      });
      // console.log(`Found ${mutationsSinceStart.length} mutations since start date for ${chemical.name}.`);

      let initialStockForMonth = chemical.currentStock;
      mutationsSinceStart.forEach((mutation) => {
        if (mutation.type === "IN" || mutation.type === "RETURN") {
          initialStockForMonth -= mutation.quantity;
        } else if (mutation.type === "OUT") {
          initialStockForMonth += mutation.quantity;
        }
      });
      // console.log(`Calculated initial stock for ${chemical.name}: ${initialStockForMonth}`);

      const mutationsInMonth = mutationsSinceStart.filter(
        (m) => m.type === "OUT" && m.createdAt <= endDate,
      );
      // console.log(`Found ${mutationsInMonth.length} 'OUT' mutations in month for ${chemical.name}.`);


      const dailyUsage: { [day: number]: number } = {};
      let totalUsageInMonth = 0;
      mutationsInMonth.forEach((mutation) => {
        const day = mutation.createdAt.getDate();
        dailyUsage[day] = (dailyUsage[day] || 0) + mutation.quantity;
        totalUsageInMonth += mutation.quantity;
      });

      const finalStock = initialStockForMonth - totalUsageInMonth;
      
      if (mutationsInMonth.length > 0) {
          console.log(`Adding ${chemical.name} to recapitulation data.`);
          recapitulationData.push({
              chemicalName: chemical.name,
              formula: chemical.formula ?? "",
              initialStock: initialStockForMonth,
              unit: chemical.unit,
              dailyUsage,
              finalStock,
          });
      }
    }

    // console.log(`Finished processing. Returning ${recapitulationData.length} records.`);
    return NextResponse.json(recapitulationData);
  } catch (error) {
    // console.error("[REPORTS_CHEMICAL_MONTHLY_USAGE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
