import type { SiteContent } from "./site";

// Bangla edition of the site-wide editorial content (see site.ts). Same paths and icons; brand
// names (bKash, Visa, Instagram, …) stay as shoppers know them.

export const siteBn: SiteContent = {
  brandTagline: "বাংলাদেশে হাতে তৈরি।",
  brandBlurb: "হাতে তৈরি চামড়াজাত পণ্য, বাংলাদেশে অল্প অল্প করে তৈরি এবং সারা দেশে ডেলিভারি।",
  drawerLinks: [
    { label: "অ্যাকাউন্ট", path: "/account" },
    { label: "অর্ডার ট্র্যাক করুন", path: "/account/orders" },
  ],
  footerColumns: [
    {
      title: "শপ",
      links: [
        { label: "ব্যাগ", path: "/categories/bags" },
        { label: "ওয়ালেট", path: "/categories/wallets" },
        { label: "বেল্ট", path: "/categories/belts" },
        { label: "ট্রাভেল", path: "/categories/travel-bags" },
        { label: "গিফট কার্ড", path: "/pages/gift-cards" },
      ],
    },
    {
      title: "সহায়তা",
      links: [
        { label: "ডেলিভারি", path: "/pages/shipping" },
        { label: "রিটার্ন", path: "/pages/returns" },
        { label: "ওয়ারেন্টি", path: "/pages/warranty" },
        { label: "চামড়ার যত্ন", path: "/pages/leather-care" },
        { label: "যোগাযোগ", path: "/pages/contact" },
      ],
    },
    {
      title: "প্রতিষ্ঠান",
      links: [
        { label: "আমাদের কারিগরি", path: "/pages/our-craft" },
        { label: "জার্নাল", path: "/pages/journal" },
        { label: "অ্যাফিলিয়েট প্রোগ্রাম", path: "/affiliate/apply" },
        { label: "ক্যারিয়ার", path: "/pages/careers" },
      ],
    },
    {
      title: "আইনি তথ্য",
      links: [
        { label: "সেবার শর্তাবলি", path: "/pages/terms-of-service" },
        { label: "প্রাইভেসি পলিসি", path: "/pages/privacy-policy" },
        { label: "রিফান্ড পলিসি", path: "/pages/refund-policy" },
      ],
    },
  ],
  paymentMarks: ["ক্যাশ অন ডেলিভারি", "bKash", "Visa", "Mastercard"],
  socials: [
    { label: "Instagram", icon: "camera", url: "https://www.instagram.com/" },
    { label: "Facebook", icon: "chat", url: "https://www.facebook.com/" },
    { label: "YouTube", icon: "play", url: "https://www.youtube.com/" },
  ],
};
