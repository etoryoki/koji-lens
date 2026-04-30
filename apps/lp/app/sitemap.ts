import type { MetadataRoute } from "next";

const BASE_URL = "https://lens.kojihq.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          ja: BASE_URL,
          en: `${BASE_URL}/en`,
        },
      },
    },
    {
      url: `${BASE_URL}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: {
          ja: BASE_URL,
          en: `${BASE_URL}/en`,
        },
      },
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: {
          ja: `${BASE_URL}/contact`,
          en: `${BASE_URL}/en/contact`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: {
          ja: `${BASE_URL}/contact`,
          en: `${BASE_URL}/en/contact`,
        },
      },
    },
    {
      url: `${BASE_URL}/legal/tos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: {
        languages: {
          ja: `${BASE_URL}/legal/tos`,
          en: `${BASE_URL}/en/legal/tos`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/legal/tos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: {
        languages: {
          ja: `${BASE_URL}/legal/tos`,
          en: `${BASE_URL}/en/legal/tos`,
        },
      },
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: {
        languages: {
          ja: `${BASE_URL}/legal/privacy`,
          en: `${BASE_URL}/en/legal/privacy`,
        },
      },
    },
    {
      url: `${BASE_URL}/en/legal/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: {
        languages: {
          ja: `${BASE_URL}/legal/privacy`,
          en: `${BASE_URL}/en/legal/privacy`,
        },
      },
    },
    {
      url: `${BASE_URL}/legal/tokushoho`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
