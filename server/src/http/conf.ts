interface ServerConfig {
  port: number;
  host: string;
}

export function loadServerConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  };
}

