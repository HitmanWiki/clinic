// /app/dashboard/layout.tsx - Simple version
import DashboardSidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      {/* Mobile padding for fixed header */}
      <div className="md:pl-64">
        <div className="md:hidden h-16"></div> {/* Spacer for mobile header */}
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}