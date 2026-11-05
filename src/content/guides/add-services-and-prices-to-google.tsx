import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 14. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "add-services-and-prices-to-google",
  title: "How do I add services and prices to my Google profile?",
  description:
    "How to add services, prices, a menu or products to your Google Business Profile, which businesses can, and what Google rejects, in the UK and the UAE.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Services and prices",
  answer:
    "Open your Business Profile while signed in, select Edit services, pick the services Google suggests or add your own, then open each one to add a price and a description. Restaurants and cafes use Edit menu instead, and shops selling physical goods use Edit products.",
  inShort: [
    "Google offers the services editor to businesses in certain categories, so you may not see it.",
    "Put prices in the price field, never in a service's name: Google rejects names with prices.",
    "The menu editor is for food and drink businesses only.",
    "Menu changes can take 24 to 48 hours to show on Google Maps and Search.",
  ],
  sections: [
    {
      id: "who-can",
      heading: "Can every business add services to Google?",
      answer:
        "No. Google says businesses in certain categories, like service businesses, might have the option to show their services on their profile, and calls the menu, services and products editors limited availability. Which editor you get depends on your category: services for most trades, a menu for food and drink, and products for shops.",
      body: (
        <>
          <ul>
            <li>
              <b>Services editor:</b> service businesses, such as a salon, a clinic or a garage,
              when Google offers it for your category.
            </li>
            <li>
              <b>Menu editor:</b> Google says it is for food and drink businesses only.
            </li>
            <li>
              <b>Product editor:</b> Google says it suits a local store that sells physical goods,
              especially one without barcodes, without a website to buy from, or without fresh stock
              data.
            </li>
          </ul>
          <p>
            If you do not see the option you expect, check your main category first. Google's help
            links the services editor to your business category, and the right category is explained
            in{" "}
            <GuideLink slug="choose-google-business-profile-categories">
              how to choose your Google Business Profile categories
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "add-services",
      heading: "How do I add my services?",
      answer:
        "Go to your Business Profile, select Edit services, choose the services you offer from the suggestions and select Save. Google's suggestions are tailored to your type of business, for example 'Install faucet' or 'Repair toilet' for a plumber.",
      body: (
        <Steps
          items={[
            "Sign in to the Google Account that manages your profile and go to your Business Profile.",
            "Select Edit services.",
            "Select the services you offer. For more, select Add more services.",
            "If a service is not in the list, select Add custom service and type its name.",
            "Select Save.",
          ]}
        />
      ),
    },
    {
      id: "prices",
      heading: "How do I add a price and a description to a service?",
      answer:
        "Open Edit services, select the service, and fill in its price and description, then select Save. Google says the price belongs in that field: custom service names that include prices, phone numbers, personal information, profanity or gibberish are rejected automatically.",
      body: (
        <>
          <p>
            Group services into categories when you offer different kinds, for example cuts, colour
            and treatments in a salon. Google lets you add a service category with{" "}
            <b>Edit services</b> and then <b>Add a new business category</b>, and add the services
            you offer under it.
          </p>
          <Callout kind="warn" title="Keep prices current">
            A price on Google that is out of date is the price customers expect at the till. When
            you change your prices, change them on your profile the same day, and remove a service
            you stopped with Delete service.
          </Callout>
          <p>
            Write a service the way customers ask for it: "Skin fade" or "Gel manicure", not a
            slogan. Google's help says that when local customers search for an offering you provide,
            that service may be highlighted on your profile, and that in the Google Maps app
            customers can see your full list under "Services".
          </p>
        </>
      ),
    },
    {
      id: "menu",
      heading: "How does a restaurant or cafe add its menu and prices?",
      answer:
        "Go to your Business Profile, select Edit menu, then add menu sections and items with their descriptions and prices, and select Save. Google says changes can take 24 to 48 hours to show on Maps and Search, and customers find the items under Menu.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile and select Edit menu.",
              "Select Add menu section, enter a name such as Breakfast or Desserts, and add an item.",
              "Select Add menu item for each dish, with its description and price, then Save.",
              "To remove a dish, open it and select Delete at the bottom; deleting a section removes all its items.",
            ]}
          />
          <p>
            Google lists other ways to keep a menu right. You can upload a photo or PDF of your menu
            under Photos of menu, and Google offers an experimental tool that turns a one-page menu
            photo into menu items with AI, which you review before you publish. You can add a link
            to your menu under Menu link. Google may also copy menu data from your website, and when
            it finds several menu sources you choose your preferred one in the Full menu tab.
          </p>
          <p>
            Google says that if your menu comes through the Business Profile API you may not have
            the editor, and that a menu for several profiles at once must be updated through the
            API.
          </p>
        </>
      ),
    },
    {
      id: "products",
      heading: "Can a shop add products and prices?",
      answer:
        "Yes, with the product editor: go to your Business Profile, click Edit products, fill in the form and click Publish, and the items appear on your profile on Google Search. Google says products must follow its shopping ads policy, and a breach can remove all the products you uploaded.",
      body: (
        <p>
          If a Merchant Center account is already linked to your profile, Google says Edit products
          leads to managing products there instead. Google also offers a way to show in-store
          products by connecting your till system to its Local Inventory app, and lists that for
          retail businesses in the US, Canada, the UK and Ireland.
        </p>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE for the services and menu editors. The difference is products: Google lists showing in-store products through the Local Inventory app for retailers in the US, Canada, the UK and Ireland, which leaves out the UAE.",
      body: (
        <>
          <p>
            A shop in the UAE can still try the product editor, whose page names no country list,
            though its scene generation tool is for merchants in the US only. Write prices in the
            currency customers pay in, pounds in the UK and dirhams in the UAE, and keep the service
            names in the language your customers search in.
          </p>
          <p>
            Your description can say what you offer in a sentence, but Google asks it to focus on
            the business rather than promotions, prices or sales, so prices belong in services or
            the menu. Ideas for the description are in{" "}
            <GuideLink slug="google-business-description-examples">
              what to write in your Google business description
            </GuideLink>
            .
          </p>
        </>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Kabsi does not add or edit services, menus or products on Google yet: you do that on your
          profile with the steps above, and filling them in through Kabsi comes later. Today the
          Profile Coach checklist, on Essentials and Pro, lists services and products as part of a
          complete Google profile and shows them as missing from what you told Kabsi, with a plain
          reason.
        </p>
        <p>
          The services and prices you confirm in Kabsi are what it uses in review replies and posts,
          and it never invents a service or a price. When two sources give different answers about
          something customers see, such as services or prices, Kabsi asks you which is right and
          leaves that fact out until you choose. Nothing goes on Google without your yes.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Why was my custom service rejected?",
      a: "Google says custom services that break its policy are rejected automatically, and names profanity, gibberish, personal information, prices and phone numbers in the service name. Put the price in the price field and keep the name to what the service is.",
    },
    {
      q: "A customer added a wrong dish name to my menu. Can I fix it?",
      a: "Yes. In the Google Maps app, open your profile, tap Menu, tap the dish and choose Suggest an edit, then Edit dish name or Mark dish as incorrect. Google says your dish names get priority over customers' and it aims to post edits within a few days.",
    },
  ],
  sources: [
    {
      title: "Google: Manage your services on your Business Profile",
      url: "https://support.google.com/business/answer/9455399?hl=en",
      read: READ,
    },
    {
      title: "Google: About the menu editor",
      url: "https://support.google.com/business/answer/9455840?hl=en",
      read: READ,
    },
    {
      title: "Google: About product editor",
      url: "https://support.google.com/business/answer/9330323?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/14368911?hl=en",
      read: READ,
    },
    {
      title: "Google: Complete your Business Profile on Google",
      url: "https://support.google.com/business/answer/10515606?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your restaurant's popular dish names",
      url: "https://support.google.com/business/answer/9322475?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "spa-and-massage", "restaurant", "auto-repair"],
  related: [
    "choose-google-business-profile-categories",
    "google-business-description-examples",
    "google-profile-checklist-restaurants-cafes",
  ],
  summary:
    "How to add services, prices, a menu or products to a Google Business Profile with Google's services, menu and product editors, which businesses can, and what Google rejects.",
};
