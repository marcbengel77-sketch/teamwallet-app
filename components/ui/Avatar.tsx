
import React from 'react';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, fallbackText, size = 'md', className, ...props }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-md',
    xl: 'h-16 w-16 text-lg',
  };

  const currentSizeClasses = sizeClasses[size];

  return (
    <div
      className={`relative flex shrink-0 overflow-hidden rounded-full ${currentSizeClasses} ${className || ''}`}
      {...props}
    >
      {src ? (
        <img
          className="aspect-square h-full w-full object-cover"
          src={src}
          alt={alt || 'Avatar'}
          onError={(e) => {
            // Fallback to text if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-gray-800">
          {fallbackText ? fallbackText.slice(0, 2).toUpperCase() : '?'}
        </div>
      )}
    </div>
  );
};

export default Avatar;
