import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths, format, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodRaw = searchParams.get("period") || "1month";
    const period = periodRaw.replace(/\s+/g, "").toLowerCase();

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "1month":
        startDate = subMonths(now, 1);
        break;
      case "6months":
        startDate = subMonths(now, 6);
        break;
      case "1year":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subMonths(now, 1);
    }

    // Get chemical statistics
    const chemicals = await db.chemical.findMany({
      include: {
        usageHistory: {
          where: {
            usedAt: {
              gte: startDate,
              lte: now,
            },
          },
        },
      },
    });

    const expiredChemicals = chemicals.filter(
      (chem) => chem.expirationDate && chem.expirationDate < now
    );

    const expiringSoonChemicals = chemicals.filter(
      (chem) =>
        chem.expirationDate &&
        chem.expirationDate > now &&
        chem.expirationDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    );

    // Get borrowing statistics
    const borrowings = await db.borrowing.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        items: true,
        borrower: {
          include: {
            mahasiswa: true,
            dosen: true,
          },
        },
      },
    });

    const activeBorrowings = borrowings.filter(
      (b) => b.status === "APPROVED" || b.status === "PENDING"
    );

    const overdueBorrowings = borrowings.filter(
      (b) => b.status === "OVERDUE" && b.requestDate < subDays(now, 7) // Assuming 7 days is overdue
    );

    // Get SDS statistics
    const sds = await db.safetyDataSheet.findMany({
      include: {
        chemical: true,
        SDSDownloadHistory: {
          where: {
            downloadedAt: {
              gte: startDate,
              lte: now,
            },
          },
        },
      },
    });

    // Get all download history for the period
    const sdsDownloads = await db.sDSDownloadHistory.findMany({
      where: {
        downloadedAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        sds: {
          include: {
            chemical: true,
          },
        },
      },
    });

    // Monthly data aggregation for chemicals
    const monthlyUsage = Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthUsage = chemicals.reduce((total, chem) => {
        const usage = chem.usageHistory
          .filter((uh) => uh.usedAt >= monthStart && uh.usedAt <= monthEnd)
          .reduce((sum, uh) => sum + uh.quantity, 0);
        return total + usage;
      }, 0);

      return {
        month: format(monthDate, "MMM"),
        usage: monthUsage,
      };
    });

    // Monthly data aggregation for borrowings
    const monthlyBorrowings = Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthBorrows = borrowings.filter(
        (b) => b.requestDate >= monthStart && b.requestDate <= monthEnd
      ).length;

      const monthReturns = borrowings.filter(
        (b) =>
          b.returnedAt && b.returnedAt >= monthStart && b.returnedAt <= monthEnd
      ).length;

      return {
        month: format(monthDate, "MMM"),
        borrowings: monthBorrows,
        returned: monthReturns,
      };
    });

    // Monthly data aggregation for SDS downloads (REAL DATA)
    const monthlyDownloads = Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthDownloads = sdsDownloads.filter(
        (d) => d.downloadedAt >= monthStart && d.downloadedAt <= monthEnd
      ).length;

      return {
        month: format(monthDate, "MMM"),
        downloads: monthDownloads, // REAL DATA
      };
    });

    // Calculate average return time
    const returnedBorrowings = borrowings.filter(
      (b) => b.returnedAt && b.requestDate
    );
    const averageReturnTime =
      returnedBorrowings.length > 0
        ? returnedBorrowings.reduce((total, b) => {
            const days = Math.ceil(
              (b.returnedAt!.getTime() - b.requestDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return total + days;
          }, 0) / returnedBorrowings.length
        : 0;

    // Top borrowers calculation
    const topBorrowers = borrowings
      .reduce((acc, b) => {
        const name =
          b.borrower.mahasiswa?.full_name ||
          b.borrower.dosen?.full_name ||
          "Unknown";
        const nim = b.borrower.mahasiswa?.nim || null;

        const existing = acc.find((item) => item.name === name);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ name, nim, count: 1 });
        }
        return acc;
      }, [] as Array<{ name: string; nim: string | null; count: number }>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top used chemicals
    const topUsedChemicals = chemicals
      .map((chem) => ({
        name: chem.name,
        formula: chem.formula || "",
        usage: chem.usageHistory.reduce((sum, uh) => sum + uh.quantity, 0),
        unit: chem.unit,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    const reportData = {
      chemicalStats: {
        totalChemicals: chemicals.length,
        activeChemicals: chemicals.filter((chem) => chem.currentStock > 0)
          .length,
        lowStockChemicals: chemicals.filter((chem) => chem.currentStock < 10)
          .length,
        expiredChemicals: expiredChemicals.length,
        expiringSoonChemicals: expiringSoonChemicals.length,
        byForm: chemicals.reduce((acc, chem) => {
          acc[chem.form] = (acc[chem.form] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCharacteristic: chemicals.reduce((acc, chem) => {
          acc[chem.characteristic] = (acc[chem.characteristic] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        monthlyUsage,
        topUsedChemicals,
      },

      borrowingStats: {
        totalBorrowings: borrowings.length,
        activeBorrowings: activeBorrowings.length,
        completedBorrowings: borrowings.filter((b) => b.status === "RETURNED")
          .length,
        overdueBorrowings: overdueBorrowings.length,
        rejectedBorrowings: borrowings.filter((b) => b.status === "REJECTED")
          .length,
        monthlyBorrowings,
        byUserType: {
          students: borrowings.filter((b) => b.borrower.mahasiswa).length,
          lecturers: borrowings.filter((b) => b.borrower.dosen).length,
        },
        averageReturnTime: Math.round(averageReturnTime * 10) / 10, // Round to 1 decimal
        topBorrowers,
      },

      sdsStats: {
        totalSDS: sds.length,
        activeSDS: sds.length, // Assuming all SDS are active
        byLanguage: sds.reduce((acc, s) => {
          acc[s.language] = (acc[s.language] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalDownloads: sdsDownloads.length,
        monthlyDownloads,
      },
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error fetching report data:", error);
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
