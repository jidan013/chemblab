import { DashboardData } from "@/types/dashboard";
import axios from "axios";

export const getDashboardData = async (): Promise<DashboardData> => {
  const borrowingsRes = await axios.get("/api/v1/borrowings", {
    params: { summaryOnly: 1 },
  });

  return {
    activeAllBorrowings: borrowingsRes.data.allActive,
    activeBorrowings: borrowingsRes.data.ownActive,
    recentActivities: borrowingsRes.data.recentActivities ?? [],
  };
};
