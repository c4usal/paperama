import { notFound, redirect } from "next/navigation";

import { fetchWorkByOpenAlexId } from "@/lib/openalex/works";
import { resolvePaper } from "@/lib/mock-papers";

type PaperPageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy share links — redirect straight to the open-access page. */
export default async function PaperPage({ params }: PaperPageProps) {
  const { id } = await params;

  const mock = resolvePaper(id);
  if (mock) {
    redirect(mock.oaUrl);
  }

  if (/^W\d+$/i.test(id)) {
    const card = await fetchWorkByOpenAlexId(id);
    if (card) redirect(card.oaUrl);
  }

  notFound();
}
