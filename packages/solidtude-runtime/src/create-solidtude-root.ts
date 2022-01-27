import { createComponent, JSX, mergeProps } from 'solid-js';
import { render, hydrate } from 'solid-js/web';
import { onLoad, onMedia, onVisible } from './scheduler';
import { getRoot, getFragment } from './nodes';

type SolidtudeRoot<P> = (
  id: string,
  props: P,
  strategy?: Strategy,
  hydratable?: boolean,
) => Promise<void>;
type SolidtudeComp<P> = (props: P & { children?: JSX.Element }) => JSX.Element;

interface MediaQueryStrategy {
  type: 'media';
  value: string;
}

interface VisibilityStrategy {
  type: 'visible';
  value: string;
}

interface LoadStrategy {
  type: 'load';
  value?: undefined;
}

export type Strategy = MediaQueryStrategy | VisibilityStrategy | LoadStrategy;

export interface ClientFlagProps {
  'client:load'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
  'client:only'?: boolean;
}

export default function createSolidtudeRoot<P>(
  source: () => Promise<{ default: SolidtudeComp<P> }>,
): SolidtudeRoot<P> {
  return async (id, props, strategy, hydratable) => {
    const renderCallback = async () => {
      const Comp = (await source()).default;
      const marker = getRoot(id);
      const fragment = getFragment(id);
      const root = (fragment
        ? () => (
          createComponent(Comp, mergeProps(props, {
            get children() {
              const node = document.createElement('solidtude-fragment');
              node.innerHTML = fragment.innerHTML;
              return node;
            },
          }))
        )
        : () => createComponent(Comp, props)
      );
      if (hydratable) {
        hydrate(root, marker, {
          renderId: id,
        });
      } else {
        render(root, marker);
      }
    };

    if (strategy) {
      switch (strategy.type) {
        case 'media':
          onMedia(strategy.value, renderCallback);
          break;
        case 'load':
          onLoad(renderCallback);
          break;
        case 'visible':
          onVisible(strategy.value, renderCallback);
          break;
        default:
          await renderCallback();
          break;
      }
    } else {
      await renderCallback();
    }
  };
}
