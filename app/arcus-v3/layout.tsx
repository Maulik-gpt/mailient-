'use client';
/**
 * Arcus V3 — App Shell Layout
 * Three-zone layout: sidebar (240px) + main content (flex-grow)
 * No top navbar. Navigation is lateral in the sidebar.
 */
import './tokens.css';
import './arcus.css';
import React from 'react';

export default function ArcusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="arcus-shell">
      {children}
    </div>
  );
}
