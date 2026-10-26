// Web copies of the photos Rashid chose (docs/PHOTOS.md), 1600 and 800 px on the long side.
import bakeryCounter1600 from "@/assets/photos/bakery-counter-1600.webp";
import bakeryCounter800 from "@/assets/photos/bakery-counter-800.webp";
import bakeryWindow1600 from "@/assets/photos/bakery-window-1600.webp";
import bakeryWindow800 from "@/assets/photos/bakery-window-800.webp";
import barberCut1600 from "@/assets/photos/barber-cut-1600.webp";
import barberCut800 from "@/assets/photos/barber-cut-800.webp";
import barberShave1600 from "@/assets/photos/barber-shave-1600.webp";
import barberShave800 from "@/assets/photos/barber-shave-800.webp";
import cafeBarista1600 from "@/assets/photos/cafe-barista-1600.webp";
import cafeBarista800 from "@/assets/photos/cafe-barista-800.webp";
import cafeCounter1600 from "@/assets/photos/cafe-counter-1600.webp";
import cafeCounter800 from "@/assets/photos/cafe-counter-800.webp";
import dentistPatient1600 from "@/assets/photos/dentist-patient-1600.webp";
import dentistPatient800 from "@/assets/photos/dentist-patient-800.webp";
import phoneReading1600 from "@/assets/photos/phone-reading-1600.webp";
import phoneReading800 from "@/assets/photos/phone-reading-800.webp";
import phoneShop1600 from "@/assets/photos/phone-shop-1600.webp";
import phoneShop800 from "@/assets/photos/phone-shop-800.webp";
import phoneTyping1600 from "@/assets/photos/phone-typing-1600.webp";
import phoneTyping800 from "@/assets/photos/phone-typing-800.webp";
import salonStudio1600 from "@/assets/photos/salon-studio-1600.webp";
import salonStudio800 from "@/assets/photos/salon-studio-800.webp";
import salonTablet1600 from "@/assets/photos/salon-tablet-1600.webp";
import salonTablet800 from "@/assets/photos/salon-tablet-800.webp";
import salonWash1600 from "@/assets/photos/salon-wash-1600.webp";
import salonWash800 from "@/assets/photos/salon-wash-800.webp";
import massageTherapist1600 from "@/assets/photos/massage-therapist-1600.webp";
import massageTherapist800 from "@/assets/photos/massage-therapist-800.webp";
import spaFacial1600 from "@/assets/photos/spa-facial-1600.webp";
import spaFacial800 from "@/assets/photos/spa-facial-800.webp";
import aestheticTreatment1600 from "@/assets/photos/aesthetic-treatment-1600.webp";
import aestheticTreatment800 from "@/assets/photos/aesthetic-treatment-800.webp";
import aestheticLaser1600 from "@/assets/photos/aesthetic-laser-1600.webp";
import aestheticLaser800 from "@/assets/photos/aesthetic-laser-800.webp";
import autoGarage1600 from "@/assets/photos/auto-garage-1600.webp";
import autoGarage800 from "@/assets/photos/auto-garage-800.webp";
import autoMechanic1600 from "@/assets/photos/auto-mechanic-1600.webp";
import autoMechanic800 from "@/assets/photos/auto-mechanic-800.webp";
import gymTraining1600 from "@/assets/photos/gym-training-1600.webp";
import gymTraining800 from "@/assets/photos/gym-training-800.webp";
import nailTechnician1600 from "@/assets/photos/nail-technician-1600.webp";
import nailTechnician800 from "@/assets/photos/nail-technician-800.webp";
import nailDesk1600 from "@/assets/photos/nail-desk-1600.webp";
import nailDesk800 from "@/assets/photos/nail-desk-800.webp";
import physioStretch1600 from "@/assets/photos/physio-stretch-1600.webp";
import physioStretch800 from "@/assets/photos/physio-stretch-800.webp";
import physioBack1600 from "@/assets/photos/physio-back-1600.webp";
import physioBack800 from "@/assets/photos/physio-back-800.webp";
import restaurantDining1600 from "@/assets/photos/restaurant-dining-1600.webp";
import restaurantDining800 from "@/assets/photos/restaurant-dining-800.webp";
import restaurantTables1600 from "@/assets/photos/restaurant-tables-1600.webp";
import restaurantTables800 from "@/assets/photos/restaurant-tables-800.webp";
import restaurantKitchen1600 from "@/assets/photos/restaurant-kitchen-1600.webp";
import restaurantKitchen800 from "@/assets/photos/restaurant-kitchen-800.webp";
import restaurantCooks1600 from "@/assets/photos/restaurant-cooks-1600.webp";
import restaurantCooks800 from "@/assets/photos/restaurant-cooks-800.webp";
import founder800 from "@/assets/photos/founder-rashid-800.webp";
import founder400 from "@/assets/photos/founder-rashid-400.webp";

export type Photo = { large: string; small: string; w: number; h: number; alt: string };
const land = (large: string, small: string, alt: string): Photo => ({
  large,
  small,
  w: 1600,
  h: 1067,
  alt,
});
const port = (large: string, small: string, alt: string): Photo => ({
  large,
  small,
  w: 1067,
  h: 1600,
  alt,
});

export const PHOTOS = {
  bakeryCounter: land(
    bakeryCounter1600,
    bakeryCounter800,
    "A baker behind a counter full of bread",
  ),
  bakeryWindow: land(
    bakeryWindow1600,
    bakeryWindow800,
    "A baker arranging loaves behind a shop window",
  ),
  barberCut: land(barberCut1600, barberCut800, "A barber cutting a client's hair"),
  barberShave: land(barberShave1600, barberShave800, "A barber trimming a client's beard"),
  cafeBarista: port(cafeBarista1600, cafeBarista800, "A barista smiling at the espresso machine"),
  cafeCounter: land(cafeCounter1600, cafeCounter800, "A cafe owner at the counter"),
  dentistPatient: port(dentistPatient1600, dentistPatient800, "A dentist treating a patient"),
  phoneReading: port(phoneReading1600, phoneReading800, "A woman reading a message on her phone"),
  phoneShop: land(phoneShop1600, phoneShop800, "A phone in a shop owner's hand"),
  phoneTyping: land(phoneTyping1600, phoneTyping800, "Hands typing a message on a phone"),
  salonStudio: port(salonStudio1600, salonStudio800, "A stylist working in a warmly lit studio"),
  salonTablet: land(
    salonTablet1600,
    salonTablet800,
    "A salon owner looking at a tablet in her salon",
  ),
  salonWash: land(salonWash1600, salonWash800, "A stylist washing a client's hair"),
  massageTherapist: land(
    massageTherapist1600,
    massageTherapist800,
    "A massage therapist working with a client",
  ),
  spaFacial: land(spaFacial1600, spaFacial800, "A spa therapist giving a client a face massage"),
  aestheticTreatment: land(
    aestheticTreatment1600,
    aestheticTreatment800,
    "A practitioner giving a patient a facial treatment",
  ),
  aestheticLaser: port(aestheticLaser1600, aestheticLaser800, "A laser treatment in a clinic"),
  autoGarage: land(autoGarage1600, autoGarage800, "Cars on lifts in a bright repair garage"),
  autoMechanic: land(autoMechanic1600, autoMechanic800, "A mechanic working under a classic car"),
  gymTraining: land(gymTraining1600, gymTraining800, "A man training with battle ropes in a gym"),
  nailTechnician: land(
    nailTechnician1600,
    nailTechnician800,
    "A nail technician painting a client's nails",
  ),
  nailDesk: port(nailDesk1600, nailDesk800, "A nail technician working with a client at her desk"),
  physioStretch: land(
    physioStretch1600,
    physioStretch800,
    "A physiotherapist stretching a patient's arm",
  ),
  physioBack: port(physioBack1600, physioBack800, "A physiotherapist treating a patient's back"),
  restaurantDining: land(
    restaurantDining1600,
    restaurantDining800,
    "A busy restaurant dining room in the evening",
  ),
  restaurantTables: port(
    restaurantTables1600,
    restaurantTables800,
    "Warmly lit tables in a restaurant",
  ),
  restaurantKitchen: land(
    restaurantKitchen1600,
    restaurantKitchen800,
    "Cooks at work in a restaurant kitchen",
  ),
  restaurantCooks: land(
    restaurantCooks1600,
    restaurantCooks800,
    "Cooks preparing orders at a restaurant counter",
  ),
} satisfies Record<string, Photo>;

/** Rashid Abou Hamzy, square, 800 and 400 px. For About and the founder line only; a placeholder he may replace. */
export const FOUNDER = {
  large: founder800,
  small: founder400,
  w: 800,
  h: 800,
  alt: "Rashid Abou Hamzy, founder of Kabsi",
};

/** A photo with width, height and srcset. Lazy unless it is the hero. */
export function Img({
  photo,
  sizes,
  className,
  priority = false,
  decorative = false,
}: {
  photo: Photo;
  sizes: string;
  className?: string | undefined;
  priority?: boolean | undefined;
  decorative?: boolean | undefined;
}) {
  return (
    <img
      src={photo.small}
      srcSet={`${photo.small} ${photo.w === 1600 ? 800 : 533}w, ${photo.large} ${photo.w}w`}
      sizes={sizes}
      width={photo.w}
      height={photo.h}
      alt={decorative ? "" : photo.alt}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}
