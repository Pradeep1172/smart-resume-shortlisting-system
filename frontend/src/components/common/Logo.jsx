import React from 'react';

export default function Logo({
  size = 'md',
  textColor = 'dark',
  showText = true,
  animated = false,
  tagline = 'SMART RECRUITMENT PORTAL',
  className = '',
}) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-28',
  };

  const heightClass = sizeClasses[size] || size;
  const src = showText ? '/shortlistiq-logo.png' : '/shortlistiq-logo-icon.png';

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img
        src={src}
        alt="ShortlistIQ"
        className={`${heightClass} w-auto max-w-full object-contain`}
        draggable={false}
        decoding="sync"
      />
    </div>
  );
}
