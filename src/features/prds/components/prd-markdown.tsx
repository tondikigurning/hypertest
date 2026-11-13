import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PrdMarkdown({ content }: { content: string }) {
  return (
    <article className="prd-document">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href, ...props }) => {
            const external = href?.startsWith("https://") || href?.startsWith("http://");
            return (
              <a
                href={href}
                {...props}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
              >
                {children}
                {external && (
                  <span className="prd-external-link" aria-hidden="true">
                    {" "}
                    ↗
                  </span>
                )}
              </a>
            );
          },
          img: ({ alt, src }) => {
            const remote = src?.startsWith("https://") || src?.startsWith("http://");
            if (!remote) {
              return <span className="prd-image-unavailable">Image: {alt || src || "Unavailable"}</span>;
            }
            return <img src={src} alt={alt || ""} loading="lazy" />;
          },
          table: ({ children, ...props }) => (
            <section className="prd-table-scroll" aria-label="Document table">
              <table {...props}>{children}</table>
            </section>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
