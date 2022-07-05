import { createSignal, JSX } from 'solid-js';
import { ClientComponent } from 'solidtude/core';

type CountProps = ClientComponent<{
  initialValue: number;
}>

export default function Counter(props: CountProps): JSX.Element {
  const [count, setCount] = createSignal(props.initialValue);

  function increment() {
    setCount((c) => c + 1);
  }
  function decrement() {
    setCount((c) => c - 1);
  }

  return (
    <div>
      <button onClick={increment}>Increment</button>
      <span>Count: {count()}</span>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
}
