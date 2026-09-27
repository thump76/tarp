/**
 * Photos for the home page. Drop the file in public/images/home/ with the name below and set
 * `ready: true`. Until then the page shows a placeholder the same shape, and in development it
 * also prints the file name and a prompt you can use for a stand-in (Nano Banana, Midjourney etc).
 *
 * Aim for JPEGs around 2400px on the long side; next/image resizes them per device.
 */
export type PhotoSlot = "hero" | "organiser" | "choosing" | "handover" | "aisle" | "evening";

export type PhotoSpec = { file: string; ready: boolean; alt: string; ratio: string; prompt: string };

const STYLE =
  "Documentary photograph, 35mm lens, natural overcast daylight, warm muted colours, shallow depth of field, candid, British outdoor farmers' market, no readable text or logos on signs, no one looking at the camera.";

export const HOME_PHOTOS: Record<PhotoSlot, PhotoSpec> = {
  hero: {
    file: "hero.jpg",
    ready: false,
    alt: "Shoppers browsing produce stalls at a busy weekend market",
    ratio: "4:5 portrait",
    prompt: `A busy Sunday farmers' market seen at eye level along a row of stalls with canvas gazebos. Shoppers with tote bags browse crates of vegetables and loaves; a stallholder in an apron chats to a customer. ${STYLE}`,
  },
  organiser: {
    file: "organiser.jpg",
    ready: false,
    alt: "Market organiser checking the line-up on a tablet during early-morning set-up",
    ratio: "4:5 portrait",
    prompt: `Early morning set-up at a market in a park. A market organiser in a fleece and hi-vis vest holds a tablet, checking a list, while traders unload vans and put up gazebos behind. Soft low sunlight, slight mist. ${STYLE}`,
  },
  choosing: {
    file: "choosing.jpg",
    ready: false,
    alt: "A customer choosing tomatoes from a wooden crate",
    ratio: "3:4 portrait",
    prompt: `Close-up of a customer's hands choosing heritage tomatoes from a wooden crate at a market stall, a paper bag half full. ${STYLE}`,
  },
  handover: {
    file: "handover.jpg",
    ready: false,
    alt: "A baker handing a paper bag of bread across the stall",
    ratio: "3:4 portrait",
    prompt: `A baker behind a market stall hands a brown paper bag with a sourdough loaf across the table to a customer. Baskets of bread in the foreground. ${STYLE}`,
  },
  aisle: {
    file: "aisle.jpg",
    ready: false,
    alt: "A row of market stalls with bunting and people walking between them",
    ratio: "3:4 portrait",
    prompt: `Looking down a lively aisle between two rows of market stalls in the grounds of an old castle, bunting overhead, families and dogs walking through. ${STYLE}`,
  },
  evening: {
    file: "evening.jpg",
    ready: false,
    alt: "Market stalls lit by festoon lights at dusk",
    ratio: "16:9 landscape",
    prompt: `A winter evening market at dusk, stalls lit by warm festoon lights, steam rising from a hot food stall, people gathered in coats. Deep blue sky. Documentary photograph, 35mm lens, warm colours, candid, British, no readable text or logos, no one looking at the camera.`,
  },
};
