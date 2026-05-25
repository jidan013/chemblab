import { getCurrentUser } from "@/lib/auth";
import { ChemicalsClient } from "./components/chemical-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chemicals",
  description: "Chemicals of Chemical Inventory Management System",
};

export default async function ChemicalsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 px-2 md:ml-64 overflow-auto">
        <ChemicalsClient user={user} />
      </main>
    </div>
  );
}
