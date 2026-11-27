# Import a product source

Read for a supplied PDF, DOCX, Markdown, text file or pasted product description.

Extract the readable text and structure faithfully, including relevant tables/images where the host exposes them. Q-Rex supplies extracted PDF/DOCX text, not embedded images or guaranteed layout. Identify concrete extraction gaps; do not assume every empty page contains requirements or claim unread material was inspected. If consequential content cannot otherwise be recovered, request accessible text or the relevant images under the shared question boundary. A PDF with no readable text needs OCR before upload.

Map requirements to the [PRD template](prd-template.md) as `spec`, preserving citations, contradictions and relevant unmapped content as open issues. Record source type, original filename and date. Keep unrelated background in the source. Surface proposed scope/test-level exclusions for review. Attribute only what the source actually says.

Return to the skill's evidence-gap step. Reuse prior applicable observations and discover the requested menu's additional reachable behavior; importing a source neither invalidates earlier evidence nor limits scope unless the user says so. Attribute additional live findings as `observed` and reconcile source-versus-actual discrepancies before review.
