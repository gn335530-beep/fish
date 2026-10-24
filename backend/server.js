const app = require("./app");

const port = Number(process.env.PORT) || 3001;

app.listen(port, function () {
  console.log("FishMatch backend is running at http://localhost:" + port);
});
