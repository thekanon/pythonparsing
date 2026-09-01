module.exports = {
  apps: [
    {
      name: "newsorder-reddit-scraper",
      cwd: __dirname,
      script: "./scripts/run-local-reddit-scraper.sh",
      interpreter: "none",
      autorestart: true,
      max_memory_restart: "1G",
      time: true,
    },
    {
      name: "newsorder-local-web",
      cwd: __dirname,
      script: "/home/leedo/.npm-global/bin/pnpm",
      args: "--filter @newsorder/web start --hostname 127.0.0.1 --port 3300",
      interpreter: "none",
      autorestart: true,
      max_memory_restart: "1G",
      time: true,
      env: {
        NODE_ENV: "production",
        NEWSORDER_RUNTIME_MODE: "fixture",
        NEXT_PUBLIC_APP_URL: "https://sentence.doowiki.dev",
        DATABASE_URL: "postgresql://newsorder@127.0.0.1:55432/newsorder",
      },
    },
  ],
};
