export const isUri: (value: string) => boolean;
export const isUriReference: (value: string) => boolean;
export const isAbsoluteUri: (value: string) => boolean;

export const isIri: (value: string) => boolean;
export const isIriReference: (value: string) => boolean;
export const isAbsoluteIri: (value: string) => boolean;

export const parseUri: (value: string) => IdentifierComponents;
export const parseUriReference: (value: string) => IdentifierComponents;
export const parseAbsoluteUri: (value: string) => IdentifierComponents;

export const parseIri: (value: string) => IdentifierComponents;
export const parseIriReference: (value: string) => IdentifierComponents;
export const parseAbsoluteIri: (value: string) => IdentifierComponents;

export const resolveReference: (uriReference: string, baseUri: string, type?: "uri" | "iri") => string;

export type IdentifierComponents = {
  scheme: string;
  authority: string;
  userinfo: string;
  host: string;
  port: string;
  path: string;
  query: string;
  fragment: string;
};
