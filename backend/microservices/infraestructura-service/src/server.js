require("dotenv").config();
const app = require("./app");
const port = Number(process.env.PORT || 3003);
app.listen(port, "0.0.0.0", () => {
  console.log(`infraestructura-service: http://localhost:${port}`);
});
