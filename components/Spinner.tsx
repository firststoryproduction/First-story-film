'use client'

interface SpinnerProps {
    fullScreen?: boolean;
    withSidebar?: boolean;
    className?: string;
}

export default function Spinner({ fullScreen = false, withSidebar = false, className = "" }: SpinnerProps) {
    const containerClasses = fullScreen 
        ? `fixed inset-0 bg-[#f1f5f9] flex items-center justify-center z-[9999] ${withSidebar ? 'lg:pl-72' : ''}`
        : `flex items-center justify-center w-full ${className}`;

    return (
        <div className={containerClasses}>
            <div className="relative flex items-center justify-center">
                {/* Outer Glow Ring */}
                <div className="absolute w-20 h-20 bg-indigo-500/5 rounded-full animate-pulse blur-xl"></div>
                
                {/* Main Spinner */}
                <div className="w-14 h-14 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin shadow-inner"></div>
                
                {/* Inner Static Pulse */}
                <div className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-ping opacity-75"></div>
            </div>
        </div>
    );
}
