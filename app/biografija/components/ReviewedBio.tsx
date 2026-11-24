export default function ReviewedBio({ paragraphs, sources, language }: {
  paragraphs: readonly string[]
  sources: readonly { name: string; href: string }[]
  language: "sr" | "en"
}) {
  return <>
    {paragraphs.map(paragraph => <p key={paragraph} className="mb-4">{paragraph}</p>)}
    <p className="mt-3 text-sm">
      <span className="font-semibold">{language === "en" ? "Sources" : "Izvori"}</span>
      {sources.map(source => <span key={source.href}>
        {" · "}<a href={source.href} className="underline underline-offset-2">{source.name}</a>
      </span>)}
    </p>
  </>
}
