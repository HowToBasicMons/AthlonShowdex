# Image assets

Drop image files used by the extension here. Webpack copies everything matched by the file-loader
(`*.png`, `*.jpg`, `*.gif`, `*.webp`, `*.svg`, …) to the build root by **filename**, so reference them
via `getResourceUrl('<filename>')` from `@showdex/utils/core`.

## Easter egg
- **`nidotheking.png`** — the thug-life urchin in the bottom-left of the Calcdex (see
  `src/components/app/NidoEasterEgg`). Save the image at exactly this path/filename. If it's missing,
  the easter egg simply hides itself (no broken-image icon).
