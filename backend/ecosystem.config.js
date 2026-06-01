module.exports = {
  apps: [
    {
      name: 'champ-backend',
      script: 'src/server.js',
      cwd: '/Users/mac/CHAMP-app/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/Users/mac/.pm2/logs/champ-backend-error.log',
      out_file: '/Users/mac/.pm2/logs/champ-backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
