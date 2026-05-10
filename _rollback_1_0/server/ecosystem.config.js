module.exports = {
  apps: [
    {
      name: "fillword",
      script: "./server.js",
      cwd: "/opt/fillword/server",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
