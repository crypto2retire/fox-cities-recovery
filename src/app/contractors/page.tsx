import { getContractors } from "@/lib/data-store";
import { ContractorList } from "@/components/ContractorList";

export default function ContractorsPage() {
  const contractors = getContractors();
  return <ContractorList contractors={contractors} />;
}
