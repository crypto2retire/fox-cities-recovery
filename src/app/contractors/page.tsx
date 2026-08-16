import { getContractors } from "@/lib/data-store";
import { ContractorList } from "@/components/ContractorList";

export const dynamic = "force-dynamic";

export default async function ContractorsPage() {
  const contractors = await getContractors();
  return <ContractorList contractors={contractors} />;
}
