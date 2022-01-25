import { JSX } from 'solid-js';
import Counter from './Counter.client';

export default function App(): JSX.Element {
  return (
    <html lang="en">
      <head>
        <script type="module" src="/@vite/client" />
        <title>Solid Server Components</title>
      </head>
      <body>
        <div>
          <h1>Counter App Example</h1>
          <Counter initialValue={100} />
        </div>
      </body>
    </html>
  );
}
