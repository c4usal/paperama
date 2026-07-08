import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // OpenNext Cloudflare needs webpack; Turbopack builds break at runtime (ChunkLoadError).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "journals.plos.org", pathname: "/**" },
      { protocol: "https", hostname: "www.ncbi.nlm.nih.gov", pathname: "/**" },
      { protocol: "https", hostname: "ncbi.nlm.nih.gov", pathname: "/**" },
      { protocol: "https", hostname: "www.ebi.ac.uk", pathname: "/**" },
      { protocol: "https", hostname: "europepmc.org", pathname: "/**" },
      { protocol: "https", hostname: "arxiv.org", pathname: "/**" },
      { protocol: "https", hostname: "www.mdpi.com", pathname: "/**" },
      { protocol: "https", hostname: "pub.mdpi-res.com", pathname: "/**" },
      { protocol: "https", hostname: "www.frontiersin.org", pathname: "/**" },
      { protocol: "https", hostname: "media.springernature.com", pathname: "/**" },
      { protocol: "https", hostname: "ars.els-cdn.com", pathname: "/**" },
      { protocol: "https", hostname: "d2csxpduxe849s.cloudfront.net", pathname: "/**" },
      { protocol: "https", hostname: "zenodo.org", pathname: "/**" },
      { protocol: "https", hostname: "bmcbioinformatics.biomedcentral.com", pathname: "/**" },
      { protocol: "https", hostname: "microbiomejournal.biomedcentral.com", pathname: "/**" },
      { protocol: "https", hostname: "www.nature.com", pathname: "/**" },
      { protocol: "https", hostname: "static.cambridge.org", pathname: "/**" },
      { protocol: "https", hostname: "cdn.elifesciences.org", pathname: "/**" },
    ],
  },
};

export default nextConfig;
