import { createComponent, JSX, mergeProps } from 'solid-js';
import { render, template, hydrate } from 'solid-js/web';
import { onLoad, onMedia, onVisible } from './scheduler';
import getRoot from './get-root';

interface PropsWithChildren {
  children?: string;
}

type SolidtudeRoot<P extends PropsWithChildren> = (
  id: string,
  props: P,
  strategy?: Strategy,
  hydratable?: boolean,
) => Promise<void>;
type SolidtudeComp<P> = (props: Omit<P, 'children'> & { children?: JSX.Element }) => JSX.Element;

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

type Strategy = MediaQueryStrategy | VisibilityStrategy | LoadStrategy;

export interface ClientProps {
  'client:load'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
}

export default function createSolidtudeRoot<P extends PropsWithChildren>(
  source: () => Promise<{ default: SolidtudeComp<P> }>,
): SolidtudeRoot<P> {
  return async (id, { children, ...props }, strategy, hydratable) => {
    const renderCallback = async () => {
      const Comp = (await source()).default;
      const marker = getRoot(id);
      const root = (children
        ? () => (
          createComponent(Comp, mergeProps(props, {
            get children() {
              return template(`<solidtude-fragment>${children.replace(/&lt;/g, '<')}</solidtude-fragment>`, 2);
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
