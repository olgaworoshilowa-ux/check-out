/** Works locally and on GitHub Pages (`base: /check-out/`). */
export function asset(filename: string) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}assets/${filename}`
}
