import { PageHeader } from "@/components/ui";
import ContractForm from "../contract-form";
import { createContract } from "../actions";

export default function NewContractPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New contract" />
      <ContractForm action={createContract} submitLabel="Save contract" />
    </div>
  );
}
