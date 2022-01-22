import { JSX } from 'solid-js';
import { renderToString } from 'solid-js/web';
import * as fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import path from 'path';
import Counter from './Counter.client';

function App(): JSX.Element {
  return (
    <html>
      <head>
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

const app = fastify.fastify({
  logger: true,
});

(async () => {
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'client'),
    prefix: '/assets/',
  });

  app.get('/', async (_, reply) => {
    await reply.code(200)
      .header('Content-Type', 'text/html')
      .send(`<!DOCTYPE html>${renderToString(() => <App />)}`);
  });

  app.listen(3000, '0.0.0.0', (err, address) => {
    if (err) {
      app.log.error(err.message);
      process.exit(1);
    }
    app.log.info(`server listening on ${address}`);
  });
})().catch(console.error);
