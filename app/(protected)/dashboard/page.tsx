import { getCurrentUser } from "@/lib/auth";
import { DashboardClient } from "./components/dashboard-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard of Chemical Inventory Management System",
};

const DashboardPage = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  return <DashboardClient user={user} />;
};

export default DashboardPage;
