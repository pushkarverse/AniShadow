module.exports = {
  apps: [
    {
      name: "ani-shadow",
      script: "dist-server/index.mjs",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      // Optional Scrapling sidecar (Python). The API server keeps working
      // with native fetch if this app is stopped or Python is unavailable.
      name: "ani-shadow-sidecar",
      script: "scripts/run-sidecar.mjs",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "400M",
      max_restarts: 5,
      env: {
        SCRAPLING_PORT: "3002",
      },
    },
  ],
};
