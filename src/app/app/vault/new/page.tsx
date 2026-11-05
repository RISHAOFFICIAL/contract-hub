import { PageHeader } from "@/components/ui";
import VaultForm from "../vault-form";
import { createVaultDocument } from "../actions";

export default function NewVaultDocumentPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New document" />
      <VaultForm action={createVaultDocument} submitLabel="Save document" />
    </div>
  );
}
