
export const validateRequireEnvs = (envs: string[]) => {
  const requiredEnvs = [];
  for (const env of envs) {
    if (!env) {
      requiredEnvs.push(env);
    }
  }

  if (requiredEnvs.length > 0) {
    throw new Error(`These envs are required ${requiredEnvs.join(",")}`);
  }
};