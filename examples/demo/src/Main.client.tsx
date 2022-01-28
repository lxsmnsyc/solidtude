import { JSX } from 'solid-js';
import { ClientFlagProps } from 'solidtude-runtime';

interface MainProps extends ClientFlagProps {
  children: JSX.Element;
}

export default function Main(props: MainProps): JSX.Element {
  return (
    <main>
      <h1>Counter App Example</h1>
      {props.children}
    </main>
  );
}
