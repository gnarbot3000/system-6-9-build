window.SYSTEM69_MERCH = [
  {
    slug: "endless-loop-tee",
    name: "Endless Loop Tee",
    price: 36,
    sizes: "Sizes S–XXL — sold out in every size.",
    description:
      "Soft black tee with cream/gold SYSTEM 6.9 chest mark, woven endless-loop cable icon, and a quiet lake-horizon line. Back: oversized 6.9 with “ENDLESS SHUTTLE · COMMUNITY DIY.” Built for dock mornings and DIY build days.",
    images: [
      { src: "tee-front.png", alt: "Endless Loop Tee — front" },
      { src: "tee-back.png", alt: "Endless Loop Tee — back" },
      { src: "tee-lifestyle.png", alt: "Endless Loop Tee — lifestyle" }
    ]
  },
  {
    slug: "community-diy-trucker",
    name: "Community DIY Trucker",
    price: 32,
    sizes: "One size (adjustable) — sold out.",
    description:
      "Charcoal foam front, black mesh, embroidered SYSTEM 6.9 patch. Keeps the sun off while you tension Dyneema or watch the shuttle run.",
    images: [
      { src: "trucker-front.png", alt: "Community DIY Trucker — front" },
      { src: "trucker-side.png", alt: "Community DIY Trucker — side" },
      { src: "trucker-lifestyle.png", alt: "Community DIY Trucker — lifestyle" }
    ]
  },
  {
    slug: "shoreline-cowboy",
    name: "Shoreline Cowboy",
    price: 58,
    sizes: "One size — sold out.",
    description:
      "Weathered tan straw western with black leather band and brass 6.9 pin. Lake-country energy for the long golden hour after a successful mock loop.",
    images: [
      { src: "cowboy-front.png", alt: "Shoreline Cowboy — front" },
      { src: "cowboy-side.png", alt: "Shoreline Cowboy — side" },
      { src: "cowboy-lifestyle.png", alt: "Shoreline Cowboy — lifestyle" }
    ]
  },
  {
    slug: "gold-mirror-shades",
    name: "Gold Mirror Shades",
    price: 78,
    sizes: "One size — sold out.",
    description:
      "Matte black acetate, gold mirror lenses, temple etching with endless-loop + 6.9. Built for glare on open water when you’re spotting the traveler.",
    images: [
      { src: "shades-front.png", alt: "Gold Mirror Shades — front" },
      { src: "shades-side.png", alt: "Gold Mirror Shades — side" },
      { src: "shades-lifestyle.png", alt: "Gold Mirror Shades — lifestyle" }
    ]
  }
];

window.system69MerchBySlug = function (slug) {
  var list = window.SYSTEM69_MERCH || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].slug === slug) return list[i];
  }
  return null;
};
