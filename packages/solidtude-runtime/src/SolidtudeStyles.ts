import { JSX } from 'solid-js';
import { getHydrationKey, ssr } from 'solid-js/web';

const TEMPLATE = ['<style', '>solidtude-root, solidtude-fragment { display: contents }</style>'];

export default function SolidtudeStyles(): JSX.Element {
  return ssr(TEMPLATE, getHydrationKey()) as unknown as JSX.Element;
}
