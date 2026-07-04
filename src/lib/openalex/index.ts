export { getOpenAlexMailto, openAlexFetch, OpenAlexError, shortOpenAlexId } from "@/lib/openalex/client";
export { reconstructAbstract, abstractToSnippet } from "@/lib/openalex/abstract";
export { isAllowedOaUrl, isEligibleOpenAccessWork, resolveOaUrl } from "@/lib/openalex/oa-url";
export { normalizeWork, normalizeWorks } from "@/lib/openalex/normalize";
export { fetchWorksByConcept, fetchWorksByTopicSlug, fetchWorksByOpenAlexIds, fetchWorkByOpenAlexId } from "@/lib/openalex/works";
export type { OpenAlexWork, OpenAlexWorksResponse } from "@/lib/openalex/types";
