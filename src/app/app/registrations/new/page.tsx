import { PageHeader } from "@/components/ui";
import RegistrationForm from "../registration-form";
import { createRegistration } from "../actions";

export default function NewRegistrationPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New registration" />
      <RegistrationForm
        action={createRegistration}
        submitLabel="Save registration"
      />
    </div>
  );
}
