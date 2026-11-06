type Address = {
  firstName: string;
  lastName: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
};

// A postal address as staff read it on a label: name, company, lines, city line, country, phone.
export function AddressBlock({ address }: { address: Address }) {
  const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(", ");
  return (
    <address className="space-y-0.5 text-sm not-italic">
      <p className="font-medium">
        {address.firstName} {address.lastName}
      </p>
      {address.company && <p>{address.company}</p>}
      <p>{address.line1}</p>
      {address.line2 && <p>{address.line2}</p>}
      <p>{cityLine}</p>
      <p>{address.country}</p>
      {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
    </address>
  );
}
