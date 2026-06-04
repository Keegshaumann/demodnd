/**
 * Renders a JSON-LD <script> for structured data (rich results). The `<` escape
 * prevents a "</script>" sequence in any user-controlled string (listing title,
 * seller name, …) from breaking out of the script element.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
