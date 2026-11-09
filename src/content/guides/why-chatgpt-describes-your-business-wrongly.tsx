import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import type { GuideDoc } from "./types";

// Guides 3, earlier guide rewritten on the template. Claims about OpenAI and Perplexity are from their developer pages
// below, read on 5 Nov 2026 (OpenAI's help article on ChatGPT search could not be read that day, so it is not a source).
// Claims about Google are from Google's help pages below, read the same day.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "why-chatgpt-describes-your-business-wrongly",
  title: "Why does ChatGPT describe my business wrongly?",
  description:
    "Where ChatGPT and Perplexity get the details they give about a local business, why one can be out of date, and what to check, in order.",
  publishAt: "2026-11-04T00:00:00Z",
  updated: READ,
  checked: READ,
  topic: "AI assistants",
  answer:
    "When ChatGPT or Perplexity answers with a web search, it builds the answer from pages it finds and cites some of them, so an old page or a site that still lists your old hours or phone number can end up in the answer. Open the sources the answer cites, then correct your Google profile, your website and the other sites that list you, so every page it might read says the same thing.",
  inShort: [
    "ChatGPT and Perplexity can search the web and cite the pages they used.",
    "An old page or another site with your old details can carry a wrong time or number.",
    "Check the cited sources first, then your Google profile, your website and the other sites.",
    "No one can make an assistant say something. You can make sure what it reads is right.",
  ],
  sections: [
    {
      id: "where-answers-come-from",
      heading: "Where does ChatGPT get details about my business?",
      answer:
        "OpenAI's developer guide says web search lets its models access up-to-date information from the internet and give answers with sourced citations. Perplexity describes its API the same way: web-grounded answers with built-in citations. So when an answer about your business cites pages, those are pages it used, though OpenAI says the full list it consulted is often longer.",
      body: (
        <>
          <p>
            OpenAI's guide says its API gives access to the fine-tuned models and tool used by
            Search in ChatGPT, that inline citations show only the most relevant references, and
            that the number of pages the model consulted is often greater than the number of
            citations. It also describes a setting where the model itself decides whether to search
            at all.
          </p>
          <p>
            In plain words: some answers come with a fresh search and links, and some do not.
            Neither OpenAI nor Perplexity says which pages it will read for a given question.
          </p>
        </>
      ),
    },
    {
      id: "why-wrong",
      heading: "Why would it give an old closing time or phone number?",
      answer:
        "A common reason is a page that still says the old thing. Three causes worth checking are an old page of your own that was never updated, another site that lists you with old details, and your website and your Google profile saying different things.",
      body: (
        <ul>
          <li>
            <b>An old page:</b> a past menu, an event page or an old price list on your own site
            that still shows last year's hours.
          </li>
          <li>
            <b>Another site that lists you:</b> a directory, a booking site or a local article that
            has your old phone number or address.
          </li>
          <li>
            <b>Two versions:</b> your website footer says you close at 18:00 and your Google profile
            says 19:00, so the two disagree and an answer can repeat either one.
          </li>
        </ul>
      ),
    },
    {
      id: "location",
      heading: "Why does it answer differently for different people?",
      answer:
        "The wording of the question changes what gets searched for. OpenAI's developer guide also shows that a developer using its API can set an approximate user location, such as a country and a city, for a web search.",
      body: (
        <p>
          The way the question is asked matters too: "salon open late Saturday" and "best salon near
          Dubai Marina" are different searches. When you test, write down the exact question, the
          assistant and the date, so you can compare like with like next time. Nothing here differs
          between the UK and the UAE except the places and words people use.
        </p>
      ),
    },
    {
      id: "what-to-check",
      heading: "What should I check, and in what order?",
      answer:
        "Start with the pages the answer cites: OpenAI says citations show the most relevant references, though the model may have read more. Then make your Google profile and your website say the same correct thing, and then fix the other sites that list you, starting with any the answer cited.",
      body: (
        <Steps
          items={[
            "Ask the assistant the question a customer would ask, and save the answer with the date.",
            "Open each source it cites and find the detail it got wrong.",
            <>
              Check your <b>Google profile</b>: name, address, phone, website and hours, with
              special hours for holidays.
            </>,
            "Check your own website: the contact page, the footer and any page that shows hours or prices.",
            "Correct or ask the other sites that list you to correct their page, starting with the cited ones.",
            "After your fixes, ask the same question again and compare it with the answer you saved.",
          ]}
        />
      ),
    },
    {
      id: "google-profile",
      heading: "Why does my Google profile matter here?",
      answer:
        "Because Google also compares what other pages say. Google's help says it gathers information from different sources, such as user reports and licensed content, and may update your profile if those sources say your information is wrong or out of date.",
      body: (
        <>
          <p>
            Google says that when a suggested edit needs your review you have 4 days to accept or
            reject it, and that if you do not respond, Google may publish it when it is supported by
            other public information, such as your business website. An old website can therefore
            change your Google profile, not only an AI answer.
          </p>
          <p>
            Google's guidelines also ask that your business name match your real-world name as used
            consistently on your storefront, website and stationery. How to keep every place in step
            is in{" "}
            <GuideLink slug="keep-your-hours-and-details-the-same-everywhere">
              keep your hours and details the same everywhere
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "cannot-control",
      heading: "Can I ask ChatGPT to correct what it says?",
      answer:
        "Not directly in a way that sticks. Neither OpenAI's nor Perplexity's developer pages offer a business a way to set its own answer, so the practical fix is to correct the pages the answer is built from and check again later.",
      body: (
        <Callout kind="warn" title="What no one can promise">
          No one can promise what an assistant will say, or that it will name your business at all.
          Anyone selling a promised mention in AI answers is selling something they cannot control.
          The facts in the places it reads are what you control.
        </Callout>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi asks a few questions a customer might ask on ChatGPT and Perplexity through their
          API, which can differ from their apps: 3 a month on Essentials, 10 every 2 weeks on Pro.
          When an answer names your business and states a fact differently from what you confirmed,
          such as Sunday hours, your phone or your address, it shows the assistant's exact sentence,
          the question and the date, with one line on Home and in your weekly report. Kabsi cannot
          change what an assistant says.
        </p>
        <p>
          Where the fix is on your Google profile, Kabsi opens a task to fix it there, after your
          yes. Your website and other sites stay yours to change. The free check includes one
          ChatGPT answer and shows which fact differs from your Google profile.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Is ChatGPT reading my Google profile?",
      a: "OpenAI's developer guide does not list which sites it reads. Look at the sources the answer cites: if one is a page with your old details, fix that page, wherever it is.",
    },
    {
      q: "How long until a corrected page shows in the answer?",
      a: "Neither OpenAI nor Perplexity gives a time on these pages. Ask the same question again after a few days and compare it with the answer you saved.",
    },
  ],
  sources: [
    {
      title: "OpenAI: Web search (API guide)",
      url: "https://developers.openai.com/api/docs/guides/tools-web-search",
      read: READ,
    },
    {
      title: "Perplexity: API overview",
      url: "https://docs.perplexity.ai/getting-started/overview",
      read: READ,
    },
    {
      title: "Google: Understand Google updates on your Business Profile",
      url: "https://support.google.com/business/answer/3480441?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "restaurant", "cafe", "medical-and-aesthetic-clinic"],
  related: [
    "keep-your-hours-and-details-the-same-everywhere",
    "someone-changed-my-hours-on-google",
    "how-to-set-holiday-hours-on-google",
  ],
  summary:
    "Why ChatGPT or Perplexity can give a wrong detail about a local business, where the answer comes from, and what to check in order: cited sources, Google profile, website, other sites.",
};
