require("dotenv").config();
const app=require("./app");
const port=Number(process.env.PORT||3004);
app.listen(port,"0.0.0.0",()=>console.log(`inscripciones-service: http://localhost:${port}`));
