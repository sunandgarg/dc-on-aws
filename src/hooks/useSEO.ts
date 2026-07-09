import { useEffect } from "react";

export function useSEO({ 
  title, 
  description, 
  keywords 
}: { 
  title?: string; 
  description?: string; 
  keywords?: string;
}) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | DekhoCampus`;
    }
    
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }

    if (keywords) {
      let meta = document.querySelector('meta[name="keywords"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'keywords');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', keywords);
    }

    return () => {
      document.title = 'DekhoCampus - Find Your Dream College';
    };
  }, [title, description, keywords]);
}
