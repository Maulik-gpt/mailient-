'use client';
import { useState, useEffect } from 'react';

export function useRelativeTime(dateStr: string | null | undefined) {
  const [relative, setRelative] = useState('');

  useEffect(() => {
    if (!dateStr) return;
    
    const update = () => {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) setRelative('Just now');
      else if (mins < 60) setRelative(`${mins} min ago`);
      else if (mins < 1440) setRelative(`${Math.floor(mins / 60)}h ago`);
      else setRelative(`${Math.floor(mins / 1440)}d ago`);
    };
    
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [dateStr]);

  return relative;
}
