import { DollarSign, Users, Receipt, TrendingUp } from "lucide-react";
import { Link } from "react-router";

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Expenses",
      value: "$2,450.00",
      change: "+12.5%",
      icon: DollarSign,
      color: "bg-blue-500",
    },
    {
      title: "Active Groups",
      value: "4",
      change: "+2 this month",
      icon: Users,
      color: "bg-green-500",
    },
    {
      title: "Pending Splits",
      value: "8",
      change: "3 need action",
      icon: Receipt,
      color: "bg-orange-500",
    },
    {
      title: "You Owe",
      value: "$125.50",
      change: "2 people",
      icon: TrendingUp,
      color: "bg-red-500",
    },
  ];

  const recentActivity = [
    {
      name: "Dinner at Italian Restaurant",
      amount: "$85.00",
      group: "Friends",
      date: "2 hours ago",
    },
    {
      name: "Movie Tickets",
      amount: "$45.00",
      group: "Weekend Squad",
      date: "1 day ago",
    },
    {
      name: "Groceries",
      amount: "$120.50",
      group: "Roommates",
      date: "3 days ago",
    },
  ];

  return (
    <div className="min-h-screen bg-theme p-6">
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme">Dashboard</h1>
          <p className="text-muted-theme mt-1">
            Welcome back! Here's your expense overview.
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-card-theme rounded-lg shadow p-6 border border-theme"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-muted-theme text-sm font-medium">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-theme mt-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-theme mt-2">{stat.change}</p>
              </div>
            );
          })}
        </div>

        {/* ── Bottom Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-card-theme rounded-lg shadow p-6 border border-theme">
            <h2 className="text-xl font-bold text-theme mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <Link
                  to={`/split/split_${index + 123}`}
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-theme last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-theme">{activity.name}</p>
                    <p className="text-sm text-muted-theme">
                      {activity.group} • {activity.date}
                    </p>
                  </div>
                  <p className="font-semibold text-theme">{activity.amount}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card-theme rounded-lg shadow p-6 border border-theme">
          <h2 className="text-xl font-bold text-theme mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition">
              Add Expense
            </button>
            <button className="bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition">
              Create Group
            </button>
            <button className="bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition">
              Settle Up
            </button>
            <button className="bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
