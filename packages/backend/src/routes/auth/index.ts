import register from "./register.js";
import login from "./login.js";
import type { AppType } from "../../index.js";

export default (fastify:AppType) => {
    fastify.register(register,{
        prefix:"/register"
    })
    fastify.register(login,{
        prefix:"/login"
    })
}