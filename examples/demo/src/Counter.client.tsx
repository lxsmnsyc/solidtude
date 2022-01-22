import { createSignal, JSX } from 'solid-js';

interface CountProps {
  initialValue: number;
}

export default function Counter(props: CountProps): JSX.Element {
  const [count, setCount] = createSignal(props.initialValue);

  function increment() {
    setCount((c) => c + 1);
  }
  function decrement() {
    setCount((c) => c - 1);
  }

  return (
    <>
      <button onClick={increment}>Increment</button>
      <span>Count: {count()}</span>
      <button onClick={decrement}>Decrement</button>
    </>
  );
}
