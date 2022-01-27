import { JSX } from 'solid-js';
import { HydrationScript } from 'solid-js/web';
import { SolidtudeStyles } from 'solidtude-runtime';
import Counter from './Counter.client';
import Main from './Main.client';

export default function App(): JSX.Element {
  return (
    <html lang="en">
      <head>
        <script type="module" src="/@vite/client" />
        <title>Solid Server Components</title>
        <SolidtudeStyles />
        <HydrationScript />
        <style>
          {`
            main {
              display: flex;
              flex-direction: column;
            }
            div {
              display: flex;
            }
          `}
        </style>
      </head>
      <body>
        <main>
          <Counter initialValue={100} />
          <Main>
            <p>This is a server-side paragraph.</p>
          </Main>
        </main>
      </body>
    </html>
  );
}
