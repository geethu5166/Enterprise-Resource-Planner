import { Link } from "wouter";
import { ReactNode } from "react";
import { LayoutDashboard, Briefcase, DollarSign, Truck, Users, Package, BarChart3, Car, FileText } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/projects", icon: Briefcase, label: "Projects" },
    { href: "/finance", icon: DollarSign, label: "Finance" },
    { href: "/procurement", icon: FileText, label: "Procurement" },
    { href: "/vendors", icon: Users, label: "Vendors" },
    { href: "/inventory", icon: Package, label: "Inventory" },
    { href: "/tenders", icon: BarChart3, label: "Tenders" },
    { href: "/vehicles", icon: Car, label: "Vehicles" },
    { href: "/hr", icon: Users, label: "HR" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">BuildCore ERP</h1>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition">
                <Icon size={20} />
                <span>{label}</span>
              </a>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
