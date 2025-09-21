export interface Config {
  'auto-approve': boolean;
}

const CONFIG_KEY = 'repl-demo-2025-config';

export async function getConfig(env: any): Promise<Config> {
  try {
    const configStr = await env.KV.get(CONFIG_KEY);
    if (configStr) {
      const config = JSON.parse(configStr);
      console.log('Loaded config from KV:', config);
      return config;
    } else {
      console.log('No config found in KV, using default config');
    }
  } catch (error) {
    console.error('Error reading config from KV:', error);
  }
  
  // Return default config if no config exists or error occurred
  const defaultConfig = {
    'auto-approve': false
  };
  console.log('Using default config:', defaultConfig);
  return defaultConfig;
}

export async function setConfig(env: any, config: Config): Promise<void> {
  try {
    await env.KV.put(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error writing config to KV:', error);
    throw new Error('Failed to save config');
  }
}

export async function updateConfig(env: any, updates: Partial<Config>): Promise<Config> {
  const currentConfig = await getConfig(env);
  const newConfig = { ...currentConfig, ...updates };
  await setConfig(env, newConfig);
  return newConfig;
}
