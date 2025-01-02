interface ToastProps {
  message: string;
  type: "error" | "warning" | "success";
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
      <div
        className={`rounded-lg shadow-lg p-4 max-w-md ${
          type === "error"
            ? "bg-red-100 border-l-4 border-red-500 text-red-700"
            : type === "warning"
            ? "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700"
            : "bg-green-100 border-l-4 border-green-500 text-green-700"
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {type === "error" && (
              <svg
                className="w-6 h-6 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <p className="text-sm font-medium break-words">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
