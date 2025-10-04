if (require.main === module) {
  // Starta server direkt
  app.listen(PORT, () => {
    console.log(`🚀 Servern körs på http://localhost:${PORT}`);
    console.log(`🌐 Frontend: ${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}`);
    console.log(`📊 Admin Panel: ${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/admin`);
  });
}

module.exports = app;
module.exports.corsOptions = corsOptions;
