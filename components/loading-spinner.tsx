interface LoadingSpinnerProps {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  color = '#3b82f6', 
  size = 'md',
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div 
        className={`${sizeClasses[size]} animate-spin rounded-full border-b-2`}
        style={{ borderColor: color }}
      ></div>
      {text && (
        <span className="mt-4 text-gray-600 animate-pulse">{text}</span>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80"
        style={{ 
          backdropFilter: 'blur(4px)',
          background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`
        }}
      >
        {spinner}
      </div>
    );
  }
  
  return spinner;
}

// Global loading overlay
export function GlobalLoadingOverlay({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-90">
      <div className="relative">
        <div className="h-16 w-16 animate-spin rounded-full border-[6px] border-gray-200 border-t-blue-500"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
        </div>
      </div>
      <p className="mt-6 text-lg font-medium text-gray-700 animate-pulse">
        Loading dashboard data...
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Please wait while we fetch your latest clinic information
      </p>
    </div>
  );
}