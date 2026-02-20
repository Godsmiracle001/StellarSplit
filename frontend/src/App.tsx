import { useEffect } from "react";
import { registerServiceWorker } from "./utils/sw-register";
import { SplitDetailPage } from "./pages/SplitView/SplitDetailPage";

function App() {
  useEffect(() => {
  registerServiceWorker();
}, [])
  return (
    <div className="antialiased text-gray-900 bg-gray-50 min-h-screen">
      <SplitDetailPage />
    </div>
  );
}

export default App;
