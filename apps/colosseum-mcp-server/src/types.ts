/**
 * Types mirror the live JSON shape at https://ColosseumOrg.github.io/hackathon-resources/current.json,
 * verified directly against a fetch of the corpus (not guessed from docs).
 */

export interface HackathonInfo {
  name: string;
  slug: string;
}

export interface SponsorLink {
  label: string;
  url: string;
}

export interface Sponsor {
  name: string;
  slug: string;
  links: SponsorLink[];
  tags: string[];
  accentColor: string;
  hasSkill: boolean;
  skillRepositoryUrl?: string;
  skillInstallCommand?: string;
  content: string;
}

export interface RpcProviderLink {
  label: string;
  url: string;
}

export interface RpcProvider {
  name: string;
  description: string;
  offer: string;
  links: RpcProviderLink[];
}

export interface ResourceLink {
  hyperlink: string;
  url: string;
  description: string;
}

export interface ResourceLinkGroup {
  id: string;
  title: string;
  links: ResourceLink[];
}

export interface ResourceSection {
  id: string;
  title: string;
  summary: string;
  groups: ResourceLinkGroup[];
}

export interface ResourceGroupRef {
  id: string;
  title: string;
  sections: ResourceSection[];
}

export interface ColosseumCorpus {
  hackathon: HackathonInfo;
  sponsors: Sponsor[];
  comingSoon: Sponsor[];
  resources: ResourceSection[];
  rpcProviders: RpcProvider[];
  resourceGroups: ResourceGroupRef[];
}
