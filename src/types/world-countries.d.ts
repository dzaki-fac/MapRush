declare module "world-countries" {
  export interface WorldCountry {
    name: {
      common: string;
      official: string;
      native?: Record<string, { official: string; common: string }>;
    };
    cca2: string;
    cca3: string;
    ccn3: string;
    altSpellings: string[];
    independent?: boolean;
    unMember: boolean;
    region: string;
    subregion?: string;
    flag: string;
  }

  const countries: WorldCountry[];
  export default countries;
}
