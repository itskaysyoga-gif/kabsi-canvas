// The owner's words for the fields Google Protection watches (K-18, K-19). One place, so Home, Google Profile and the
// emails never name a field two ways.
export const FIELD_LABEL: Record<string, string> = {
  name: "Business name",
  phone: "Phone",
  website: "Website",
  address: "Address",
  regular_hours: "Opening hours",
  main_category: "Main category",
  open_status: "Open status",
  map_pin: "Map pin",
};

export const fieldLabel = (field: string) => FIELD_LABEL[field] ?? field.replace(/_/g, " ");
