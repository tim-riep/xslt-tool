import makeApp from "./app/makeApp.js";

const app = await makeApp()

await app.ready()

void app.listen({
    port:app.config.PORT
})