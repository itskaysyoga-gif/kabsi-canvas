// Industries 2 (5 Nov 2026): the nine new trades' photos and the crops of earlier photos (docs/PHOTOS.md). Their own
// module, so Home's first screen does not carry their addresses (the speed gate's script budget); only the industry pages,
// /for and the lower part of Home load it.
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
import beautySalonWide1600 from "@/assets/photos/beauty-salon-wide-1600.webp";
import beautySalonWide800 from "@/assets/photos/beauty-salon-wide-800.webp";
import beautySalonTall1600 from "@/assets/photos/beauty-salon-tall-1600.webp";
import beautySalonTall800 from "@/assets/photos/beauty-salon-tall-800.webp";
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
import { land, port, type Photo } from "./photos";

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

export const MORE_PHOTOS = {
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
  beautySalonWide: land(
    beautySalonWide1600,
    beautySalonWide800,
    "A makeup artist applying eyeliner to a client at a lit mirror",
  ),
  beautySalonTall: port(
    beautySalonTall1600,
    beautySalonTall800,
    "A stylist blow drying a client's hair in a bright salon",
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
