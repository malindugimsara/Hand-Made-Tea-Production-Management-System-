import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-8">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 dark:border-teal-900 border-t-teal-600 dark:border-t-teal-400 rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-sm font-semibold text-teal-800 dark:text-teal-300 animate-pulse">
        Loading...
      </p>
    </div>
  );
}
