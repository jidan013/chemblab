"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardData } from "@/lib/services/dashboard/dashboard-data";
import { MappedActivity } from "@/types/dashboard";
import {
  Package,
  FileText,
  AlertTriangle,
  Calendar,
  Activity,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import CardStats from "@/components/card-stats";
import { UserAuth } from "@/types/auth";
import axios from "axios";

interface DashboardClientProps {
  user: UserAuth;
}

export const DashboardClient: React.FC<DashboardClientProps> = ({ user }) => {
  const [stats, setStats] = useState({
    activeAllBorrowings: 0,
    activeBorrowings: 0,
    totalChemicals: 0,
    lowStockChemicals: 0,
    expiringChemicals: 0,
  });
  const [activities, setActivities] = useState<MappedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const [data, chemicalsStatsRes] = await Promise.all([
        getDashboardData(),
        axios.get("/api/v1/chemicals", { params: { statsOnly: 1 } }),
      ]);
      const chemicalsStats = chemicalsStatsRes.data?.stats;

      console.log("Dashboard Data:", data);

      setStats({
        activeAllBorrowings: data.activeAllBorrowings,
        activeBorrowings: data.activeBorrowings,
        totalChemicals: chemicalsStats?.totalChemicals ?? 0,
        lowStockChemicals: chemicalsStats?.lowStockChemicals ?? 0,
        expiringChemicals: chemicalsStats?.expiringChemicals ?? 0,
      });

      const mappedActivities: MappedActivity[] = (data.recentActivities ?? []).map(
        (act) => ({
          id: act.id,
          type: act.status,
          message: `${act.borrower.username} meminjam ${
            act.items[0]?.chemical?.name ?? "bahan"
          } (${act.items[0]?.chemical?.unit})`,
          time: new Date(act.requestDate).toLocaleString("id-ID"),
          color:
            act.status === "RETURNED"
              ? "bg-blue-500"
              : act.status === "OVERDUE"
              ? "bg-red-500"
              : "bg-green-500",
        })
      );

      setActivities(mappedActivities);
    } catch (error) {
      console.error("Gagal mengambil data dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchDashboard();
  }, []);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 md:ml-64">
        <div className="p-6">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Dashboard
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Selamat datang, <span className="font-medium">{user.name}</span>!
              Berikut ringkasan sistem inventaris bahan kimia.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <CardStats
              title="Total Bahan Kimia"
              icon={<Package className="h-4 w-4 text-muted-foreground" />}>
              <div className="text-2xl font-bold pt-4 sm:pt-7">
                {stats.totalChemicals}
              </div>
              <p className="text-xs text-muted-foreground">
                bahan padat, cair dan gas
              </p>
            </CardStats>

            <CardStats
              title="Peminjaman Aktif"
              badge={
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-[9px] sm:px-3 text-[9px] sm:text-xs">
                  Anda
                </Badge>
              }
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}>
              <div className="text-2xl font-bold">{stats.activeBorrowings}</div>
              <p className="text-xs text-muted-foreground">transaksi</p>
            </CardStats>

            {user.role === "ADMIN" && (
              <CardStats
                title="Semua Peminjaman Aktif"
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}>
                <div className="text-2xl font-bold pt-4 sm:pt-7">
                  {stats.activeAllBorrowings}
                </div>
                <p className="text-xs text-muted-foreground">transaksi</p>
              </CardStats>
            )}

            <CardStats
              title="Stok Hampir Habis"
              icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}>
              <div className="text-2xl font-bold text-yellow-600 pt-9 sm:pt-7">
                {stats.lowStockChemicals}
              </div>
              <p className="text-xs text-muted-foreground">item</p>
            </CardStats>

            <CardStats
              title="Kadaluarsa Bulan Ini"
              icon={<Calendar className="h-4 w-4 text-red-600" />}>
              <div className=" pt-4 sm:pt-7">
                <span className="text-2xl font-bold text-red-600">
                  {stats.expiringChemicals}
                </span>
                <p className="text-xs text-muted-foreground">item</p>
              </div>
            </CardStats>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardStats
              title="Ringkasan Aktivitas"
              description="Peminjaman dan pengembalian terbaru"
              icon={<Activity className="h-4 w-4 text-blue-600" />}>
              <div className="space-y-4 mt-2">
                {isLoading ? (
                  <div className="flex w-full justify-center items-center min-h-[100px] text-muted-foreground">
                    Memuat...
                  </div>
                ) : (
                  <>
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-4">
                        <div
                          className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardStats>

            <CardStats
              title="Pemberitahuan"
              description="Item yang memerlukan perhatian"
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}>
              <div className="space-y-4 mt-2">
                <div className="flex items-center space-x-4">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {stats.expiringChemicals} bahan akan kadaluwarsa bulan
                      ini
                    </p>
                    <p className="text-xs text-gray-500">
                      Periksa tanggal kadaluwarsa
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {stats.lowStockChemicals} bahan stok rendah
                    </p>
                    <p className="text-xs text-gray-500">
                      Pertimbangkan untuk restok
                    </p>
                  </div>
                </div>
              </div>
            </CardStats>
          </div>

          {/* Role-specific content */}
          {user.role === "ADMIN" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Panel Administrator</CardTitle>
                <CardDescription>
                  Akses khusus untuk administrator sistem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Sebagai administrator, Anda memiliki akses penuh ke semua
                  fitur sistem termasuk manajemen pengguna dan pengaturan
                  sistem.
                </p>
              </CardContent>
            </Card>
          )}

          {user.role === "LABORAN" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Panel Laboran</CardTitle>
                <CardDescription>
                  Akses untuk mengelola inventaris dan peminjaman
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Sebagai laboran, Anda dapat mengelola inventaris bahan kimia,
                  menyetujui peminjaman, dan mengakses laporan.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
