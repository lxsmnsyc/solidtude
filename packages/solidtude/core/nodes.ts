export function getRoot(id: string): Element {
  const marker = document.querySelector(`solidtude-root[data-ssc="${id}"]`);
  if (marker) {
    return marker;
  }
  throw new Error(`Missing <solidtude-root> with id ${id}`);
}
export function getFragment(id: string): Element | null {
  return document.querySelector(`template[data-ssc="${id}"]`);
}
