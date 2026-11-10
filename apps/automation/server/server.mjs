import { createApp } from "./app.mjs";

// This service runs only on the developer's machine until hosted access and execution are implemented.
const host = "127.0.0.1";
const port = 3111;

createApp().listen(port, host);
