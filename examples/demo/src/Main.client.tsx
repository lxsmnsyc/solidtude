import { JSX } from 'solid-js';
import { ClientComponent } from 'solidtude/core';

type MainProps = ClientComponent<{
  children: JSX.Element;
}>

export default function Main(props: MainProps): JSX.Element {
  return (
    <main>
      <h1>Counter App Example</h1>
      {props.children}
    </main>
  );
}
