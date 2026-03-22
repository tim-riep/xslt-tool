import fastify from "fastify";
const app = fastify({
    logger:true
})

void app.listen({
    port:3000
})