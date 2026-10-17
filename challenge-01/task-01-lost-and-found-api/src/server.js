import { createApp } from './app.js';
import { createStore } from './store.js';

const app = createApp(createStore());
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Lost & Found API: http://localhost:${port}`));
