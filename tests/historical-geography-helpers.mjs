// These world routes use places introduced after the historical geography fixtures.
// Load their original quest scripts when rebuilding an edition against those maps.
export function useQuestsBeforeGeographyExpansion(edition) {
  delete edition.geographyUpgrade;
  for (const id of ['q007','q009','q010','q011','q014','q015','q017','q018','q020','q021','q022','q023','q024','q025','q026','q027','q028','q029','q030','q101','q102','q103','q104','q105','q106','q107','q108','q109']) {
    delete edition.questOverrides[id];
  }
}
