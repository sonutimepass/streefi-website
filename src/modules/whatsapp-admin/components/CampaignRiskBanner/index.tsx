'use client';

/**
 * Campaign Risk Warning Banner
 * 
 * Displays critical warnings when:
 * - Failed rate > 8%
 * - Daily cap > 80% of Meta limit
 * - Template sync outdated (> 7 days)
 * 
 * Makes risk LOUD and visible.
 */

interface RiskBannerProps {
  campaigns?: Array<{
    id: string;
    name: string;
    status: string;
    sentCount: number;
    failedCount: number;
    dailyCap?: number;
    templateName: string;
  }>;
  metaDailyLimit?: number;
  lastTemplateSync?: string;
}

export default function CampaignRiskBanner({ campaigns = [], metaDailyLimit = 1000, lastTemplateSync }: RiskBannerProps) {
  const risks: Array<{ severity: 'critical' | 'warning'; message: string; campaign?: string }> = [];

  // Check each running campaign
  campaigns.forEach(campaign => {
    if (campaign.status !== 'RUNNING') return;

    const totalProcessed = campaign.sentCount + campaign.failedCount;
    if (totalProcessed === 0) return;

    // Risk 1: High failure rate (> 8%)
    const failureRate = (campaign.failedCount / totalProcessed) * 100;
    if (failureRate > 8) {
      risks.push({
        severity: failureRate > 15 ? 'critical' : 'warning',
        message: `High failure rate: ${failureRate.toFixed(1)}% (${campaign.failedCount}/${totalProcessed})`,
        campaign: campaign.name,
      });
    }

    // Risk 2: Daily cap too aggressive (> 80% of Meta limit)
    if (campaign.dailyCap && campaign.dailyCap > metaDailyLimit * 0.8) {
      risks.push({
        severity: 'warning',
        message: `Daily cap at ${Math.round((campaign.dailyCap / metaDailyLimit) * 100)}% of Meta limit (${campaign.dailyCap}/${metaDailyLimit})`,
        campaign: campaign.name,
      });
    }

    // Risk 3: No daily cap set
    if (!campaign.dailyCap || campaign.dailyCap === 0) {
      risks.push({
        severity: 'critical',
        message: 'No daily cap configured - UNSAFE',
        campaign: campaign.name,
      });
    }
  });

  // Risk 4: Template sync outdated (> 7 days)
  if (lastTemplateSync) {
    const syncDate = new Date(lastTemplateSync);
    const daysSinceSync = Math.floor((Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSync > 7) {
      risks.push({
        severity: daysSinceSync > 14 ? 'critical' : 'warning',
        message: `Templates not synced in ${daysSinceSync} days - template status may be outdated`,
      });
    }
  }

  // No risks - don't render banner
  if (risks.length === 0) {
    return null;
  }

  const criticalRisks = risks.filter(r => r.severity === 'critical');
  const warningRisks = risks.filter(r => r.severity === 'warning');

  return (
    <div className="mb-6 space-y-3">
      {/* Critical Risks */}
      {criticalRisks.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 rounded-r-lg shadow-md">
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wide">
                  🚨 Critical Risk - Immediate Action Required
                </h3>
                <div className="mt-2 text-sm text-red-800 space-y-2">
                  {criticalRisks.map((risk, idx) => (
                    <div key={idx} className="flex items-start">
                      <span className="font-mono text-red-600 mr-2">▸</span>
                      <div>
                        {risk.campaign && <span className="font-semibold">[{risk.campaign}]</span>}{' '}
                        {risk.message}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-red-700 font-medium">
                  ⚠️ These issues can trigger Meta restrictions. Pause campaigns and investigate.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Risks */}
      {warningRisks.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg shadow-sm">
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-yellow-900">
                  ⚠️ Warning - Review Recommended
                </h3>
                <div className="mt-2 text-sm text-yellow-800 space-y-1">
                  {warningRisks.map((risk, idx) => (
                    <div key={idx} className="flex items-start">
                      <span className="font-mono text-yellow-600 mr-2">•</span>
                      <div>
                        {risk.campaign && <span className="font-semibold">[{risk.campaign}]</span>}{' '}
                        {risk.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quality Monitoring Reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center text-xs text-blue-800">
          <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Daily Checklist:</span>
          <span className="ml-1">Check Meta Quality Rating • Monitor block rate % • Review template approvals</span>
        </div>
      </div>
    </div>
  );
}
