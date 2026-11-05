import SavedSearchForm from "../search-form";
import { createSavedSearch } from "../actions";

export default function NewSavedSearchPage() {
  return (
    <div className="space-y-5">
      <SavedSearchForm
        action={createSavedSearch}
        submitLabel="Save search"
      />
    </div>
  );
}
