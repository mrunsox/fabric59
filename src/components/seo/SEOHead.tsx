import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  noindex,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);

    if (noindex) {
      setMeta("robots", "noindex, nofollow");
    }

    if (ogTitle || title) {
      setMeta("og:title", ogTitle || title, true);
      setMeta("twitter:title", ogTitle || title);
    }
    if (ogDescription || description) {
      setMeta("og:description", ogDescription || description, true);
      setMeta("twitter:description", ogDescription || description);
    }

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    return () => {
      // Reset to defaults on unmount
      document.title = "Fabric59 | Five9 Integration Hub for CRM & Agent Lifecycle Management";
    };
  }, [title, description, canonical, ogTitle, ogDescription, noindex]);

  return null;
}
