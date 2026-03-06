"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Package, AlertTriangle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ChemicalStats, TopUsedChemical, MonthlyUsage } from "@/types/reports";

interface ChemicalReportsProps {
  data: ChemicalStats;
  period: string;
  onExport: () => void;
}

export function ChemicalReports({
  data,
  period,
  onExport,
}: ChemicalReportsProps) {
  const stockLevelPercentage =
    ((data.totalChemicals - data.lowStockChemicals) / data.totalChemicals) *
    100;
  const expiryRiskPercentage =
    ((data.expiredChemicals + data.expiringSoonChemicals) /
      data.totalChemicals) *
    100;

  // Safe access untuk data bulanan
  const currentMonthUsage: MonthlyUsage = data.monthlyUsage[
    data.monthlyUsage.length - 1
  ] || { month: "", usage: 0 };
  const previousMonthUsage: MonthlyUsage = data.monthlyUsage[
    data.monthlyUsage.length - 2
  ] || { month: "", usage: 0 };

  const usageIncreasePercentage =
    previousMonthUsage.usage > 0
      ? ((currentMonthUsage.usage - previousMonthUsage.usage) /
          previousMonthUsage.usage) *
        100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Laporan Inventaris Bahan Kimia</h2>
          <p className="text-gray-600">
            Analisis stok, penggunaan, dan kondisi bahan kimia
          </p>
        </div>
        <Button
          onClick={onExport}
          className="text-white bg-green-700 shrink-0 hover:bg-green-400"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Laporans
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total Bahan Kimia
            </CardTitle>
            <Package className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalChemicals}</div>
            <div className="text-xs text-muted-foreground">
              {data.activeChemicals} aktif,{" "}
              {data.totalChemicals - data.activeChemicals} tidak aktif
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {data.lowStockChemicals}
            </div>
            <div className="text-xs text-muted-foreground">
              {((data.lowStockChemicals / data.totalChemicals) * 100).toFixed(
                1,
              )}
              % dari total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Kadaluwarsa</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.expiredChemicals}
            </div>
            <div className="text-xs text-muted-foreground">
              +{data.expiringSoonChemicals} akan kadaluwarsa
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Penggunaan Bulan Ini
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthUsage.usage}</div>
            <div className="text-xs text-muted-foreground">
              {usageIncreasePercentage >= 0 ? "+" : ""}
              {usageIncreasePercentage.toFixed(1)}% dari bulan lalu
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* By Form Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Berdasarkan Bentuk</CardTitle>
            <CardDescription>
              Jumlah bahan kimia berdasarkan bentuk fisik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.byForm).map(([form, count]) => (
                <div key={form} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {form.toLowerCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count}</span>
                    <span className="text-xs text-gray-500">
                      ({((count / data.totalChemicals) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Location Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Berdasarkan Sifat</CardTitle>
            <CardDescription>
              Jumlah bahan kimia berdasarkan Sifat fisik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.byCharacteristic).map(
                ([characteristic, count]) => (
                  <div
                    key={characteristic}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{characteristic}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <span className="text-xs text-gray-500">
                        ({((count / data.totalChemicals) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Used Chemicals */}
      <Card>
        <CardHeader>
          <CardTitle>Bahan Kimia Paling Banyak Digunakan</CardTitle>
          <CardDescription>
            Top 5 bahan kimia berdasarkan penggunaan dalam periode {period}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topUsedChemicals.map(
              (chemical: TopUsedChemical, index: number) => (
                <div
                  key={`${chemical.name}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{chemical.name}</div>
                    <div className="text-sm text-gray-500">
                      {chemical.formula}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {chemical.usage} {chemical.unit}
                    </div>
                    <div className="text-sm text-gray-500">#{index + 1}</div>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Indicators */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Kesehatan Stok</CardTitle>
            <CardDescription>
              Persentase bahan kimia dengan stok memadai
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Stok Memadai</span>
                <span>{stockLevelPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={stockLevelPercentage} className="h-2" />
              <div className="text-xs text-gray-500">
                {data.totalChemicals - data.lowStockChemicals} dari{" "}
                {data.totalChemicals} bahan kimia
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Risiko Kadaluwarsa</CardTitle>
            <CardDescription>
              Persentase bahan kimia berisiko kadaluwarsa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Berisiko</span>
                <span>{expiryRiskPercentage.toFixed(1)}%</span>
              </div>
              <Progress
                value={expiryRiskPercentage}
                className="h-2 bg-red-100"
              />
              <div className="text-xs text-gray-500">
                {data.expiredChemicals + data.expiringSoonChemicals} dari{" "}
                {data.totalChemicals} bahan kimia
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Usage Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Penggunaan Bulanan</CardTitle>
          <CardDescription>
            Perkembangan penggunaan bahan kimia dalam 6 bulan terakhir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.monthlyUsage.map((monthData: MonthlyUsage, index: number) => (
              <div
                key={monthData.month}
                className="flex items-center justify-between"
              >
                <span className="text-sm font-medium">{monthData.month}</span>
                <div className="flex items-center gap-4">
                  <span className="font-bold">{monthData.usage}</span>
                  {index > 0 && (
                    <span
                      className={`text-xs ${
                        monthData.usage > data.monthlyUsage[index - 1].usage
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {monthData.usage > data.monthlyUsage[index - 1].usage
                        ? "↑"
                        : "↓"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Rekomendasi</CardTitle>
          <CardDescription>
            Saran berdasarkan analisis inventaris saat ini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.lowStockChemicals > 0 && (
            <div className="text-sm text-blue-700">
              • Segera restok {data.lowStockChemicals} bahan kimia dengan stok
              rendah
            </div>
          )}

          {data.expiredChemicals > 0 && (
            <div className="text-sm text-blue-700">
              • Periksa dan ganti {data.expiredChemicals} bahan kimia yang sudah
              kadaluwarsa
            </div>
          )}

          {data.expiringSoonChemicals > 0 && (
            <div className="text-sm text-blue-700">
              • Siapkan penggantian untuk {data.expiringSoonChemicals} bahan
              kimia yang akan kadaluwarsa
            </div>
          )}

          <div className="text-sm text-blue-700">
            • Pertimbangkan redistribusi stok antar lokasi untuk optimasi
            penyimpanan
          </div>

          {Object.entries(data.byForm).length > 1 && (
            <div className="text-sm text-blue-700">
              • Evaluasi kebutuhan berdasarkan distribusi bentuk:{" "}
              {Object.entries(data.byForm)
                .map(([form, count]) => `${form} (${count})`)
                .join(", ")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
