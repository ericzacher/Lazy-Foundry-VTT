export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-700/50 rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-1/4 mb-3"></div>
          <div className="h-3 bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function ErrorAlert({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div className="bg-red-500/20 text-red-400 p-4 rounded mb-4 flex justify-between items-center">
      <span>{error}</span>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-300 font-bold"
      >
        ×
      </button>
    </div>
  );
}
