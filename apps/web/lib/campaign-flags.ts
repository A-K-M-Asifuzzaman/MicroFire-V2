/** True only when this deployment serves the reviewed public campaign (the same gate as /missions/play). */
export function campaignPlayable(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MICROFIRE_PUBLIC_CAMPAIGN_ENABLED === '1' && env.MICROFIRE_PUBLIC_CAMPAIGN_REVIEWED_PROTOCOL === 'public-campaign-v1';
}
