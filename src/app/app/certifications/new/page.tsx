import { PageHeader } from "@/components/ui";
import CertificationForm from "../certification-form";
import { createCertification } from "../actions";

export default function NewCertificationPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New certification" />
      <CertificationForm
        action={createCertification}
        submitLabel="Save certification"
      />
    </div>
  );
}
