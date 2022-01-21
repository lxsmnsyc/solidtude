import { JSX } from 'solid-js';

interface DynamicMessageProps {
  message: string;
}

export default function DynamicMessage(props: DynamicMessageProps): JSX.Element {
  return <h1>Hello {props.message}</h1>;
}
