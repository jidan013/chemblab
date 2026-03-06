"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Shield,
  TrendingUp,
  Languages,
  AlertTriangle,
} from "lucide-react";

interface SDSReportData {
  totalSDS: number;
  byLanguage: Record<string, number>;
  totalDownloads: number;
  monthlyDownloads: Array<{ month: string; downloads: number }>;
}

interface SDSReportsProps {
  data: SDSReportData;
  period: string;
  onExport: () => void;
}

export function SDSReports({ data, period, onExport }: SDSReportsProps) {
  const { totalSDS, byLanguage, totalDownloads, monthlyDownloads } = data;

  const avgDownloadsPerSDS = totalSDS > 0 ? totalDownloads / totalSDS : 0;
  const currentMonthDownloads =
    monthlyDownloads[monthlyDownloads.length - 1]?.downloads || 0;
  const avgMonthlyDownloads =
    monthlyDownloads.length > 0
      ? monthlyDownloads.reduce((sum, month) => sum + month.downloads, 0) /
        monthlyDownloads.length
      : 0;

  // Get top languages
  const topLanguages = Object.entries(byLanguage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Laporan Safety Data Sheet (SDS)
          </h2>
          <p className="mt-1 text-gray-600">
            Analisis dokumen keselamatan dan akses
          </p>
        </div>
        <Button
          onClick={onExport}
          className="text-white bg-green-700 shrink-0 hover:bg-green-400"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Laporan
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total SDS</CardTitle>
            <Shield className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSDS}</div>
            <p className="text-xs text-muted-foreground">
              Dokumen keselamatan tersedia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total Download
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDownloads}</div>
            <p className="text-xs text-muted-foreground">
              Dalam periode {period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Bahasa</CardTitle>
            <Languages className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(byLanguage).length}
            </div>
            <p className="text-xs text-muted-foreground">Bahasa berbeda</p>
          </CardContent>
        </Card>
      </div>

      {/* Download Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik Akses Dokumen</CardTitle>
          <CardDescription>
            Analisis penggunaan dan akses dokumen SDS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="p-4 text-center rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {totalDownloads.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Total Download</p>
            </div>

            <div className="p-4 text-center rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(avgDownloadsPerSDS)}
              </div>
              <p className="text-sm text-gray-600">Rata-rata per Dokumen</p>
            </div>

            <div className="p-4 text-center rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {currentMonthDownloads}
              </div>
              <p className="text-sm text-gray-600">Download Bulan Ini</p>
            </div>

            <div className="p-4 text-center rounded-lg bg-orange-50">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(avgMonthlyDownloads)}
              </div>
              <p className="text-sm text-gray-600">Rata-rata Bulanan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Downloads Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Download Bulanan</CardTitle>
          <CardDescription>
            Perkembangan akses dokumen SDS dalam 6 bulan terakhir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-end h-40 grid-cols-6 gap-2">
            {monthlyDownloads.map((month, index) => {
              const maxDownloads = Math.max(
                ...monthlyDownloads.map((m) => m.downloads),
              );
              const height =
                maxDownloads > 0 ? (month.downloads / maxDownloads) * 100 : 0;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center space-y-2"
                >
                  <div className="text-xs text-gray-600">{month.month}</div>
                  <div
                    className="w-full transition-all duration-300 bg-purple-200 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs font-medium">{month.downloads}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribusi Bahasa</CardTitle>
          <CardDescription>Dokumen SDS berdasarkan bahasa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topLanguages.map(([language, count]) => {
              const percentage = totalSDS > 0 ? (count / totalSDS) * 100 : 0;
              return (
                <div key={language} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">
                      {language.toLowerCase()}
                    </span>
                    <span className="text-gray-600">
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-blue-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="w-5 h-5" />
            Rekomendasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-blue-700">
            • <span className="font-medium">Tingkatkan ketersediaan:</span>{" "}
            Pertimbangkan menambah dokumen SDS dalam bahasa Indonesia untuk
            aksesibilitas yang lebih baik
          </div>

          <div className="text-sm text-blue-700">
            • <span className="font-medium">Monitor trends:</span> Pantau pola
            download bulanan untuk anticipasi kebutuhan pengguna
          </div>

          <div className="text-sm text-blue-700">
            • <span className="font-medium">Edukasi pengguna:</span> Tingkatkan
            awareness tentang pentingnya SDS melalui training reguler
          </div>

          <div className="text-sm text-blue-700">
            • <span className="font-medium">Optimalkan konten:</span> Fokus pada
            bahasa yang paling banyak digunakan untuk update konten
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
