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

export const throwError = (statusCode: number, errorMessage: any) => {
  const error = new Error(errorMessage) as Error & { statusCode: number };
  error.statusCode = statusCode;
  console.log({statusCode: error.statusCode, smsg : error.message})
  throw error;
};
