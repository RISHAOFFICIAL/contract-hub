import { PageHeader } from "@/components/ui";
import SupplierForm from "../supplier-form";
import { createSupplier } from "../actions";

export default function NewSupplierPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New supplier" />
      <SupplierForm action={createSupplier} submitLabel="Save supplier" />
    </div>
  );
}
