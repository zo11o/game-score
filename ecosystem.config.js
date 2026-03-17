/**
 * PM2 配置文件
 *
 * 使用方法：
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart game-score
 *   pm2 logs game-score
 *   pm2 monit
 */
module.exports = {
  apps: [
    {
      name: 'game-score',
      script: 'server.js',
      cwd: '/home/deploy/game-score', // 根据实际部署路径修改
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/deploy/.pm2/logs/game-score-error.log',
      out_file: '/home/deploy/.pm2/logs/game-score-out.log',
      merge_logs: true,
      // 生产环境变量
      env_production: {
        NODE_ENV: 'production',
        DATABASE_URL: 'file:./data/prod.db',
        HOSTNAME: '0.0.0.0',
        PORT: 3000,
      },
    },
  ],
};
