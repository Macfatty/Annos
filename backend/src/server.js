require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`Servern körs på http://localhost:${PORT}`);
    console.log(`Frontend: ${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}`);
    console.log(
      `Admin Panel: ${(process.env.FRONTEND_ORIGIN || "http://localhost:5173")}/admin`
    );
  }
});

module.exports = server;
