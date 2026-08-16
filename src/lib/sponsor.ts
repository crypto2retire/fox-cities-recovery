// Sponsor products + payment links.
// Listings are ALWAYS free and equal. These are clearly-labeled ads, never part of the directory.

export interface SponsorProduct {
  id: "event" | "sidebar" | "directory";
  name: string;
  rate: string;
  slots: number;
  placement: string;
  audience: string;
  features: string[];
}

export const SPONSOR_PRODUCTS: SponsorProduct[] = [
  {
    id: "event",
    name: "Event Sponsor",
    rate: "$499/month",
    slots: 1,
    placement: "event",
    audience: "Tornado-affected residents in active recovery — highest intent.",
    features: [
      "Most prominent placement — top of the storm landing page",
      "Only 1 slot available (no competition)",
      "Highest-intent audience",
      "Clearly labeled ADVERTISEMENT",
    ],
  },
  {
    id: "sidebar",
    name: "Sidebar Sponsor",
    rate: "$249/month",
    slots: 4,
    placement: "sidebar",
    audience: "Homeowners actively comparing local contractors.",
    features: [
      "Shown on every contractor detail page",
      "Up to 4 sponsor slots",
      "Reaches people ready to hire",
      "Clearly labeled ADVERTISEMENT",
    ],
  },
  {
    id: "directory",
    name: "Directory Banner",
    rate: "$199/month",
    slots: 2,
    placement: "directory",
    audience: "Everyone browsing the contractor directory.",
    features: [
      "Seen by everyone searching contractors",
      "2 sponsor slots",
      "Best value for broad reach",
      "Clearly labeled ADVERTISEMENT",
    ],
  },
];

// Stripe Payment Links — paste the URLs here once created.
// (Stripe dashboard → Payment Links → Create → copy the link.)
// Empty string = the buy button falls back to a contact-email form.
export const PAYMENT_LINKS: Record<string, string> = {
  event: "",
  sidebar: "",
  directory: "",
};

export const ADS_CONTACT_EMAIL = "ads@foxcitiesrecovery.com";

export function getSponsorAction(id: string): { href: string; label: string; external: boolean } {
  const link = PAYMENT_LINKS[id];
  if (link) {
    return { href: link, label: "Buy Now", external: true };
  }
  return {
    href: `mailto:${ADS_CONTACT_EMAIL}?subject=${encodeURIComponent(`Sponsor inquiry: ${id}`)}`,
    label: "Contact to Sponsor",
    external: false,
  };
}
