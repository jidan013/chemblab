import { getCurrentUser } from "@/lib/auth";
import { BorrowingClient } from "./components/borrowing-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Borrow",
  description: "",
};

export default async function BorrowingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 px-2 md:ml-64 overflow-auto">
        <BorrowingClient user={user} />
      </main>
    </div>
  );
}
