import React from 'react';

export default function BrandMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="brand-mark-green" x1="64" y1="36" x2="450" y2="486" gradientUnits="userSpaceOnUse">
          <stop stopColor="#218b63" />
          <stop offset="1" stopColor="#0c5c43" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#brand-mark-green)" />
      <path d="M112 115c0-24 20-44 44-44h200c24 0 44 20 44 44v223c0 24-20 44-44 44H244l-87 64v-64h-1c-24 0-44-20-44-44V115Z" fill="#fff" />
      <path d="M172 170h168M172 227h105" fill="none" stroke="#b9d9c8" strokeLinecap="round" strokeWidth="24" />
      <path d="m178 302 49 49 108-112" fill="none" stroke="#16805a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="34" />
    </svg>
  );
}
