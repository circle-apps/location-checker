import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from "/vite.svg";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="flex gap-8 mb-8">
        <a
          href="https://vite.dev"
          target="_blank"
          className="hover:scale-110 transition-transform"
        >
          <img src={viteLogo} className="h-24 w-24" alt="Vite logo" />
        </a>
        <a
          href="https://react.dev"
          target="_blank"
          className="hover:scale-110 transition-transform"
        >
          <img
            src={reactLogo}
            className="h-24 w-24 animate-spin-slow"
            alt="React logo"
          />
        </a>
      </div>
      <h1 className="text-5xl font-bold mb-8">Vite + React</h1>
      <div className="text-center space-y-4">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          count is {count}
        </button>
        <p className="text-gray-300">
          Edit{" "}
          <code className="bg-gray-800 px-2 py-1 rounded">src/App.tsx</code> and
          save to test HMR
        </p>
      </div>
      <p className="mt-8 text-gray-400">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App
