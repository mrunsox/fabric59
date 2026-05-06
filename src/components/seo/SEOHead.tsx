import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
}

const DEFAULT_OG_IMAGE = "https://fabric59.com/og-image.png";
const DEFAULT_TITLE =
  "Fabric59 | Five9-Native Control Plane & Legal-Intake Bridge";

export function SEOHead({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = "website",
  noindex,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(
        `meta[${attr}="${name}"]`,
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(
        `link[rel="${rel}"]`,
      ) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    setMeta("description", description);
    setMeta(
      "robots",
      noindex ? "noindex, nofollow" : "index, follow",
    );

    const finalTitle = ogTitle || title;
    const finalDesc = ogDescription || description;
    const finalImage = ogImage || DEFAULT_OG_IMAGE;

    // Open Graph
    setMeta("og:type", ogType, true);
    setMeta("og:site_name", "Fabric59", true);
    setMeta("og:title", finalTitle, true);
    setMeta("og:description", finalDesc, true);
    setMeta("og:image", finalImage, true);
    setMeta("og:image:alt", finalTitle, true);
    if (canonical) setMeta("og:url", canonical, true);

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:site", "@Fabric59");
    setMeta("twitter:title", finalTitle);
    setMeta("twitter:description", finalDesc);
    setMeta("twitter:image", finalImage);

    if (canonical) setLink("canonical", canonical);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, canonical, ogTitle, ogDescription, ogImage, ogType, noindex]);

  return null;
}
