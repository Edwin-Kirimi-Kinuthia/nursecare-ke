/**
 * Renders a schema.org JSON-LD block.
 *
 * The `<` escaping is required: JSON-LD is injected as raw HTML, so an unescaped
 * `<` in any data-derived string could close the script tag early. Follows the
 * pattern in the Next.js JSON-LD guide.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
