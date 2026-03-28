import makeApp from "./app/makeApp.js";

const app = await makeApp()

void app.listen({
    port:app.config.PORT
})