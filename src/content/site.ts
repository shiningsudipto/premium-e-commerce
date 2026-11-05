// Site-wide editorial content for the header drawer and footer (Premium Touch design). Header
// navigation itself comes from the "main" menu in the admin. Paths are relative to the market prefix.

export const brandTagline = "Handcrafted in Bangladesh.";

export const brandBlurb = "Handcrafted leather goods, made in small batches in Bangladesh and delivered nationwide.";

export const drawerLinks = [
  { label: "Account", path: "/account" },
  { label: "Track an order", path: "/account/orders" },
];

export const footerColumns = [
  {
    title: "Shop",
    links: [
      { label: "Bags", path: "/categories/bags" },
      { label: "Wallets", path: "/categories/wallets" },
      { label: "Belts", path: "/categories/belts" },
      { label: "Travel", path: "/categories/travel-bags" },
      { label: "Gift cards", path: "/pages/gift-cards" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Shipping", path: "/pages/shipping" },
      { label: "Returns", path: "/pages/returns" },
      { label: "Warranty", path: "/pages/warranty" },
      { label: "Leather care", path: "/pages/leather-care" },
      { label: "Contact us", path: "/pages/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our craft", path: "/pages/our-craft" },
      { label: "Journal", path: "/pages/journal" },
      { label: "Affiliate programme", path: "/affiliate/apply" },
      { label: "Careers", path: "/pages/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", path: "/pages/terms-of-service" },
      { label: "Privacy policy", path: "/pages/privacy-policy" },
      { label: "Refund policy", path: "/pages/refund-policy" },
    ],
  },
];

export const paymentMarks = ["Cash on delivery", "bKash", "Visa", "Mastercard"];

export const socials = [
  { label: "Instagram", icon: "camera", url: "https://www.instagram.com/" },
  { label: "Facebook", icon: "chat", url: "https://www.facebook.com/" },
  { label: "YouTube", icon: "play", url: "https://www.youtube.com/" },
] as const;
