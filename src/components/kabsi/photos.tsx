import type { CSSProperties } from "react";
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
import carWashWide1600 from "@/assets/photos/car-wash-wide-1600.webp";
import carWashWide800 from "@/assets/photos/car-wash-wide-800.webp";
import carWashTall1600 from "@/assets/photos/car-wash-tall-1600.webp";
import carWashTall800 from "@/assets/photos/car-wash-tall-800.webp";
import dentalClinicWide1600 from "@/assets/photos/dental-clinic-wide-1600.webp";
import dentalClinicWide800 from "@/assets/photos/dental-clinic-wide-800.webp";
import floristWide1600 from "@/assets/photos/florist-wide-1600.webp";
import floristWide800 from "@/assets/photos/florist-wide-800.webp";
import floristTall1600 from "@/assets/photos/florist-tall-1600.webp";
import floristTall800 from "@/assets/photos/florist-tall-800.webp";
import lashBrowWide1600 from "@/assets/photos/lash-brow-wide-1600.webp";
import lashBrowWide800 from "@/assets/photos/lash-brow-wide-800.webp";
import lashBrowTall1600 from "@/assets/photos/lash-brow-tall-1600.webp";
import lashBrowTall800 from "@/assets/photos/lash-brow-tall-800.webp";
import opticianWide1600 from "@/assets/photos/optician-wide-1600.webp";
import opticianWide800 from "@/assets/photos/optician-wide-800.webp";
import opticianTall1600 from "@/assets/photos/optician-tall-1600.webp";
import opticianTall800 from "@/assets/photos/optician-tall-800.webp";
import petGroomingWide1600 from "@/assets/photos/pet-grooming-wide-1600.webp";
import petGroomingWide800 from "@/assets/photos/pet-grooming-wide-800.webp";
import petGroomingTall1600 from "@/assets/photos/pet-grooming-tall-1600.webp";
import petGroomingTall800 from "@/assets/photos/pet-grooming-tall-800.webp";
import tattooWide1600 from "@/assets/photos/tattoo-wide-1600.webp";
import tattooWide800 from "@/assets/photos/tattoo-wide-800.webp";
import tattooTall1600 from "@/assets/photos/tattoo-tall-1600.webp";
import tattooTall800 from "@/assets/photos/tattoo-tall-800.webp";
import vetWide1600 from "@/assets/photos/vet-wide-1600.webp";
import vetWide800 from "@/assets/photos/vet-wide-800.webp";
import vetTall1600 from "@/assets/photos/vet-tall-1600.webp";
import vetTall800 from "@/assets/photos/vet-tall-800.webp";
import yogaPilatesWide1600 from "@/assets/photos/yoga-pilates-wide-1600.webp";
import yogaPilatesWide800 from "@/assets/photos/yoga-pilates-wide-800.webp";
import yogaPilatesTall1600 from "@/assets/photos/yoga-pilates-tall-1600.webp";
import yogaPilatesTall800 from "@/assets/photos/yoga-pilates-tall-800.webp";
import barberCutPortrait1067 from "@/assets/photos/barber-cut-portrait-1067.webp";
import barberCutPortrait640 from "@/assets/photos/barber-cut-portrait-640.webp";
import nailTechnicianPortrait1067 from "@/assets/photos/nail-technician-portrait-1067.webp";
import nailTechnicianPortrait640 from "@/assets/photos/nail-technician-portrait-640.webp";
import restaurantDiningPortrait1067 from "@/assets/photos/restaurant-dining-portrait-1067.webp";
import restaurantDiningPortrait640 from "@/assets/photos/restaurant-dining-portrait-640.webp";
import autoGaragePortrait1067 from "@/assets/photos/auto-garage-portrait-1067.webp";
import autoGaragePortrait640 from "@/assets/photos/auto-garage-portrait-640.webp";
import bakeryWindowPortrait1067 from "@/assets/photos/bakery-window-portrait-1067.webp";
import bakeryWindowPortrait640 from "@/assets/photos/bakery-window-portrait-640.webp";
import gymTrainingPortrait1067 from "@/assets/photos/gym-training-portrait-1067.webp";
import gymTrainingPortrait640 from "@/assets/photos/gym-training-portrait-640.webp";
import aestheticTreatmentPortrait1067 from "@/assets/photos/aesthetic-treatment-portrait-1067.webp";
import aestheticTreatmentPortrait640 from "@/assets/photos/aesthetic-treatment-portrait-640.webp";
import physioStretchPortrait1067 from "@/assets/photos/physio-stretch-portrait-1067.webp";
import physioStretchPortrait640 from "@/assets/photos/physio-stretch-portrait-640.webp";
import massageTherapistPortrait1067 from "@/assets/photos/massage-therapist-portrait-1067.webp";
import massageTherapistPortrait640 from "@/assets/photos/massage-therapist-portrait-640.webp";
import barberShaveTall1067 from "@/assets/photos/barber-shave-tall-1067.webp";
import barberShaveTall600 from "@/assets/photos/barber-shave-tall-600.webp";
import spaFacialTall1067 from "@/assets/photos/spa-facial-tall-1067.webp";
import spaFacialTall600 from "@/assets/photos/spa-facial-tall-600.webp";
import bakeryWindowTall1067 from "@/assets/photos/bakery-window-tall-1067.webp";
import bakeryWindowTall600 from "@/assets/photos/bakery-window-tall-600.webp";
import autoMechanicTall1067 from "@/assets/photos/auto-mechanic-tall-1067.webp";
import autoMechanicTall600 from "@/assets/photos/auto-mechanic-tall-600.webp";
import gymTrainingTall1067 from "@/assets/photos/gym-training-tall-1067.webp";
import gymTrainingTall600 from "@/assets/photos/gym-training-tall-600.webp";
import founder800 from "@/assets/photos/founder-rashid-800.webp";
import founder400 from "@/assets/photos/founder-rashid-400.webp";

/** `sw` is the small file's width when it is not the usual 800 (landscape) or 533 (portrait). */
export type Photo = {
  large: string;
  small: string;
  w: number;
  h: number;
  alt: string;
  sw?: number;
};
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

/** Industries 2 (B-006): a 4:5 crop of a landscape photo, 853 by 1067 and 512 by 640, for portrait cards. */
const p45 = (large: string, small: string, alt: string): Photo => ({
  large,
  small,
  w: 853,
  h: 1067,
  sw: 512,
  alt,
});
/** Industries 2: a 2:3 crop of a landscape photo, 711 by 1067 and 400 by 600, for a trade's tall slot. */
const p23 = (large: string, small: string, alt: string): Photo => ({
  large,
  small,
  w: 711,
  h: 1067,
  sw: 400,
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
  // Industries 2 (5 Nov 2026): the nine new trades, and crops of earlier photos (docs/PHOTOS.md).
  carWashWide: land(
    carWashWide1600,
    carWashWide800,
    "A car washer soaping a car door with a sponge",
  ),
  carWashTall: port(carWashTall1600, carWashTall800, "A blue car covered in soap at a car wash"),
  dentalClinicWide: land(
    dentalClinicWide1600,
    dentalClinicWide800,
    "A dentist showing a patient her X-ray on a screen",
  ),
  floristWide: land(
    floristWide1600,
    floristWide800,
    "Inside a florist's shop full of flowers and hanging lamps",
  ),
  floristTall: port(
    floristTall1600,
    floristTall800,
    "Potted flowers outside a florist's shop door",
  ),
  lashBrowWide: land(
    lashBrowWide1600,
    lashBrowWide800,
    "An eye with lash extensions and shaped brows, close up",
  ),
  lashBrowTall: port(
    lashBrowTall1600,
    lashBrowTall800,
    "A client's eye with fresh lash extensions",
  ),
  opticianWide: land(
    opticianWide1600,
    opticianWide800,
    "A child having an eye test at an optician's",
  ),
  opticianTall: port(
    opticianTall1600,
    opticianTall800,
    "Glasses frames on glass shelves at an optician's",
  ),
  petGroomingWide: land(
    petGroomingWide1600,
    petGroomingWide800,
    "A groomer trimming a small white dog's fur",
  ),
  petGroomingTall: port(
    petGroomingTall1600,
    petGroomingTall800,
    "A happy dog being bathed by a groomer",
  ),
  tattooWide: land(tattooWide1600, tattooWide800, "A tattoo artist in black gloves inking an arm"),
  tattooTall: port(tattooTall1600, tattooTall800, "A tattoo artist working on a client's forearm"),
  vetWide: land(vetWide1600, vetWide800, "A vet in scrubs treating an animal in surgery"),
  vetTall: port(vetTall1600, vetTall800, "A vet checking a white cat on the table"),
  yogaPilatesWide: land(
    yogaPilatesWide1600,
    yogaPilatesWide800,
    "A yoga class stretching forward on mats",
  ),
  yogaPilatesTall: port(
    yogaPilatesTall1600,
    yogaPilatesTall800,
    "A yoga class in a bright studio, arms raised",
  ),
  barberCutPortrait: p45(
    barberCutPortrait1067,
    barberCutPortrait640,
    "A barber cutting a client's hair",
  ),
  nailTechnicianPortrait: p45(
    nailTechnicianPortrait1067,
    nailTechnicianPortrait640,
    "A nail technician painting a client's nails",
  ),
  restaurantDiningPortrait: p45(
    restaurantDiningPortrait1067,
    restaurantDiningPortrait640,
    "A busy restaurant dining room in the evening",
  ),
  autoGaragePortrait: p45(
    autoGaragePortrait1067,
    autoGaragePortrait640,
    "Cars on lifts in a bright repair garage",
  ),
  bakeryWindowPortrait: p45(
    bakeryWindowPortrait1067,
    bakeryWindowPortrait640,
    "A baker arranging loaves behind a shop window",
  ),
  gymTrainingPortrait: p45(
    gymTrainingPortrait1067,
    gymTrainingPortrait640,
    "A man training with battle ropes in a gym",
  ),
  aestheticTreatmentPortrait: p45(
    aestheticTreatmentPortrait1067,
    aestheticTreatmentPortrait640,
    "A practitioner giving a patient a facial treatment",
  ),
  physioStretchPortrait: p45(
    physioStretchPortrait1067,
    physioStretchPortrait640,
    "A physiotherapist stretching a patient's arm",
  ),
  massageTherapistPortrait: p45(
    massageTherapistPortrait1067,
    massageTherapistPortrait640,
    "A massage therapist working with a client",
  ),
  barberShaveTall: p23(
    barberShaveTall1067,
    barberShaveTall600,
    "A barber trimming a client's beard",
  ),
  spaFacialTall: p23(
    spaFacialTall1067,
    spaFacialTall600,
    "A spa therapist giving a client a face massage",
  ),
  bakeryWindowTall: p23(
    bakeryWindowTall1067,
    bakeryWindowTall600,
    "A baker arranging loaves behind a shop window",
  ),
  autoMechanicTall: p23(
    autoMechanicTall1067,
    autoMechanicTall600,
    "A mechanic working under a classic car",
  ),
  gymTrainingTall: p23(
    gymTrainingTall1067,
    gymTrainingTall600,
    "A man training with battle ropes in a gym",
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
  style,
}: {
  photo: Photo;
  sizes: string;
  className?: string | undefined;
  /** An object-position for a crop (Design 8). */
  style?: CSSProperties | undefined;
  priority?: boolean | undefined;
  decorative?: boolean | undefined;
}) {
  return (
    <img
      src={photo.small}
      srcSet={`${photo.small} ${photo.sw ?? (photo.w === 1600 ? 800 : 533)}w, ${photo.large} ${photo.w}w`}
      sizes={sizes}
      width={photo.w}
      height={photo.h}
      alt={decorative ? "" : photo.alt}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={className}
      style={style}
    />
  );
}
