import { getContractors } from "@/lib/data-store";
import { searchWithScan } from "@/lib/search";
import { ContractorList } from "@/components/ContractorList";

export const dynamic = "force-dynamic";

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; city?: string; state?: string }>;
}) {
  const params = await searchParams;

  // Scan-on-search: if a real category/city returns nothing, run a grounded
  // market scan so the directory self-builds for cold markets. Any newly-scanned
  // contractors are persisted, so the full list below already includes them.
  let scanned = false;
  let scannedCategory: string | undefined;
  if (params.q || params.category) {
    const outcome = await searchWithScan({
      q: params.q,
      category: params.category,
      city: params.city,
      state: params.state,
    });
    scanned = outcome.scanned;
    scannedCategory = outcome.scannedCategory;
  }

  const contractors = await getContractors();
  return (
    <ContractorList
      contractors={contractors}
      scanned={scanned}
      scannedCategory={scannedCategory}
    />
  );
}
