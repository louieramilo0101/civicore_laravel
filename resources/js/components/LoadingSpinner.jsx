import React from 'react';

const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
        xl: 'w-16 h-16 border-4'
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div 
                className={`
                    ${sizeClasses[size]} 
                    border-blue-600 border-t-transparent 
                    rounded-full 
                    animate-spin
                `}
                role="status"
                aria-label="Loading"
            ></div>
            {message && (
                <p className="mt-3 text-gray-600 text-sm font-medium animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );
};

export default LoadingSpinner;

