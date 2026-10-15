# Synthetic pre-refresh comparison

Captured before any B1 font edits from the existing production renderer. `resume.json` freezes the complete synthetic `fixture('typical')` data. `poppins.pdf` is the corresponding **exactly two-page** old-font output, with embedded Poppins Light, SemiBold and ExtraLight subsets. Its separate original font license is retained in `Poppins-OFL.txt`. No original personal resume is included.

Keep these unchanged through B2. Render the identical `resume.json` through the current renderer for the before/after comparison; do not substitute a shorter fixture to force a page count. Poppins TTFs are deliberately removed from active assets. The historical PDF embeds its own subsets and remains inspectable without those files. `../typical.pdf` is the current reviewed Source Sans 3 B2 baseline.

Old baseline SHA-256: `7213c5c4d8b49726cf9796eda75cdd58cd8a73949e5d697a5df2739ad4bdc02c`.
