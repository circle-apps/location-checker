interface StatusIndicatorProps {
  isLiveActive: boolean;
  loading: boolean;
  error: { message: string; details: string } | null;
  statusMessage: string;
  accuracyInfo: string;
}

export function StatusIndicator({
  isLiveActive,
  loading,
  error,
  statusMessage,
  accuracyInfo,
}: StatusIndicatorProps) {
  return (
    <>
      <div className="flex items-center gap-2 py-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isLiveActive
              ? "bg-green-500 animate-pulse"
              : error
              ? "bg-red-500"
              : loading
              ? "bg-yellow-500"
              : "bg-gray-400"
          }`}
        />
        <span className="text-sm text-gray-700">{statusMessage}</span>
      </div>

      <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
        {accuracyInfo}
      </div>
    </>
  );
}
