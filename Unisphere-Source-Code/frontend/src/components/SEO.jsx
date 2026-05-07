import React, { useEffect } from 'react';

/**
 * SEO Component for dynamic meta tag management
 * Industry approach: Updates document title and meta tags for social sharing (OpenGraph) and SEO.
 */
export const SEO = ({ 
  title, 
  description, 
  image = '/logo-meta.png', 
  url = window.location.href,
  type = 'website' 
}) => {
  const siteName = 'Unisphere';
  const fullTitle = `${title} | ${siteName}`;

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Update Meta Tags
    const updateMeta = (name, content, attr = 'name') => {
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (element) {
        element.setAttribute('content', content);
      } else {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        element.setAttribute('content', content);
        document.head.appendChild(element);
      }
    };

    updateMeta('description', description);
    
    // Open Graph
    updateMeta('og:title', fullTitle, 'property');
    updateMeta('og:description', description, 'property');
    updateMeta('og:image', image, 'property');
    updateMeta('og:url', url, 'property');
    updateMeta('og:type', type, 'property');

    // Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', image);

  }, [fullTitle, description, image, url, type]);

  return null; // This component doesn't render anything
};
