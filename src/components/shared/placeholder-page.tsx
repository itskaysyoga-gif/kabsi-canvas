export function PlaceholderPage({ title, sentence }: { title: string; sentence: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="font-display text-5xl leading-none text-kb-ink sm:text-6xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-kb-stone">{sentence}</p>
    </div>
  );
}
