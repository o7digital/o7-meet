import { createApplication } from './app.mjs';
const { server } = await createApplication();
server.listen(process.env.PORT || 8080, '0.0.0.0', () => console.log('O7 Meet listening on :' + (process.env.PORT || 8080)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
