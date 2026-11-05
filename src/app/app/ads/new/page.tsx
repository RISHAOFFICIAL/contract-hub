import AdForm from "../ad-form";
import { createAd } from "../actions";

export default function NewAdPage() {
  return <AdForm action={createAd} submitLabel="Save draft" />;
}
