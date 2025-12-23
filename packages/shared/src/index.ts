export type ServiceHealth = {
  status: "ok" | "degraded";
  timestamp: string;
};

export const formatHealth = (): ServiceHealth => ({
  status: "ok",
  timestamp: new Date().toISOString()
});
