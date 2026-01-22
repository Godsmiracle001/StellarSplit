import { Outlet } from "react-router";
import Navbar from "../components/Navbar";

export default function RootLayout() {
  return (
    <div className="h-screen max-w-lg mx-auto p-4">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
