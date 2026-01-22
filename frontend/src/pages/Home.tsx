import reactLogo from "../assets/react.svg";

export default function HomePage() {
  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex justify-center space-x-8 mb-8">
        <img src={"/vite.svg"} className="h-12 mb-4" alt="Vite logo" />
        <img src={reactLogo} className="h-12 mb-4" alt="React logo" />
      </div>
      <p className="text-center">
        Initialized with Vite, React, TypeScript and Tailwind CSS
      </p>
    </div>
  );
}
