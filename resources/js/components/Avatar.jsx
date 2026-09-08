// Offline-ready Avatar Component with BoringAvatars fallback
import React from 'react';
import BoringAvatar from "boring-avatars";

/** Renders a user avatar from an image source or deterministic fallback. */
const Avatar = ({ name, src, size = 12, className = '' }) => {
    // CiviCORE Branded Palette
    const colors = ['#0f172a', '#d4a574', '#64748b', '#1e293b', '#926a41'];

    // Convert Tailwind-style size units to pixels
    // size 12 = 3rem = 48px
    // size 24 = 6rem = 96px
    const pixelSize = size * 4;

    return (
        <div 
            className={`rounded-3xl overflow-hidden shadow-sm relative flex items-center justify-center bg-white ${className}`}
            style={{ 
                width: `${pixelSize}px`,
                height: `${pixelSize}px`,
            }}
        >
            {src && !src.startsWith('LIBRARY_PICK:') ? (
                <img src={src} className="w-full h-full object-cover" alt={name} />
            ) : (
                <BoringAvatar
                    size={pixelSize}
                    name={src?.startsWith('LIBRARY_PICK:') ? src.split(':')[1] : (name || "User")}
                    variant="beam"
                    colors={colors}
                />
            )}
            
            {/* Subtle glass texture overlay for premium feel */}
            <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};

export default Avatar;
