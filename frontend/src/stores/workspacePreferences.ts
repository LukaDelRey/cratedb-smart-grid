import { reactive, watch } from 'vue'

const defaults = {
  showMap: true,
  showMapControls: true,
  showMetrics: true,
  showAlarms: true,
  showCorrelation: true,
  showRootCause: true,
  showEvents: true,
  showBlackout: true,
  showTopRisk: true,
  showForecast: true,
  showInsights: true,
  showRiskMap: true,
  notificationWarnings: true,
  notificationInfo: true,
  notificationLimit: 5
}
export const displayPreferenceKeys = ['showMap', 'showMapControls', 'showMetrics', 'showAlarms', 'showCorrelation', 'showRootCause', 'showEvents', 'showBlackout', 'showTopRisk', 'showForecast', 'showInsights', 'showRiskMap'] as const
const key = 'crate-workspace-preferences'
export const workspacePreferences = reactive({ ...defaults })
try {
  const saved = JSON.parse(localStorage.getItem(key) || '{}')
  for (const field of [...displayPreferenceKeys, 'notificationWarnings', 'notificationInfo'] as const) {
    if (typeof saved[field] === 'boolean') workspacePreferences[field] = saved[field]
  }
  if ([5, 10, 20].includes(saved.notificationLimit)) workspacePreferences.notificationLimit = saved.notificationLimit
} catch { /* Keep defaults if browser storage is unavailable or invalid. */ }
watch(workspacePreferences, value => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Preferences still work for this session. */ }
})

export function resetWorkspacePreferences(section: 'display' | 'notifications') {
  if (section === 'display') {
    for(const field of displayPreferenceKeys) workspacePreferences[field] = defaults[field]
  } else {
    workspacePreferences.notificationWarnings = defaults.notificationWarnings
    workspacePreferences.notificationInfo = defaults.notificationInfo
    workspacePreferences.notificationLimit = defaults.notificationLimit
  }
}
