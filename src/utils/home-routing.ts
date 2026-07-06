export function getHomeRoute(
  roles: string[],
): 'BsmMain' | 'AgencyMain' | 'OrgMain' | 'ClientMain' {
  if (roles.includes('BUS_STATION_MANAGER')) return 'BsmMain';
  if (roles.includes('ORGANISATION')) return 'OrgMain';
  if (roles.includes('AGENCE_VOYAGE')) return 'AgencyMain';
  if (roles.includes('USAGER')) return 'ClientMain';
  return 'ClientMain';
}
