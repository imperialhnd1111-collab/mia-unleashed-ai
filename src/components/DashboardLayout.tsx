import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="min-h-full p-6 fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
