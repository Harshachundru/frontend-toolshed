// Loaded only through import() by LazyLoadDemo, so the bundler puts it in its own chunk.
export function openModal() {
  return 'Modal code arrived as a separate chunk and ran.'
}
