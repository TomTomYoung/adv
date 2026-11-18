// These world routes use places introduced after the historical geography fixtures.
// Load their original quest scripts when rebuilding an edition against those maps.
export function useQuestsBeforeGeographyExpansion(edition) {
  delete edition.geographyUpgrade;
  for (const id of ['q007','q009','q010','q011','q014','q015','q017','q018']) {
    delete edition.questOverrides[id];
  }
}
