"use client";

import Dashboard from "@/components/Dashboard";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function OverViewPage() {
  const { data: session } = useSession();
  if (session?.user?.role !== "admin") {
    redirect("/");
  }
  return <Dashboard />;
}
