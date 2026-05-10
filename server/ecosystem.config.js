module.exports = {
  apps: [
    {
      name: "fillword",
      script: "./server.js",
      cwd: "/opt/fillword/server",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        SPARK_API_PASSWORD: process.env.SPARK_API_PASSWORD,
        SPARK_MODEL: process.env.SPARK_MODEL,
        SPARK_API_BASE_URL: process.env.SPARK_API_BASE_URL,
        SPARK_TIMEOUT_MS: process.env.SPARK_TIMEOUT_MS
      }
    }
  ]
};
