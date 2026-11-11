/**
 * Типы данных проекта (JSDoc, без TypeScript).
 *
 * @typedef {'confirmed'|'partial'|'needs_check'|'agency_claim'} FactStatus
 * @typedef {'verified'|'sponsor_listed'|'claims_only'|'needs_check'} AgencyVerificationStatus
 *
 * @typedef {Object} Source
 * @property {string} id
 * @property {string} title
 * @property {string} publisher
 * @property {string} url
 * @property {'official'|'agency'|'registry'|'design'} kind
 * @property {'ok'|'blocked'|'partial'|'not_reviewed'} status
 * @property {string} checkedAt   ISO-дата проверки
 * @property {string} note
 *
 * @typedef {Object} Agency
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} cities
 * @property {{city:string,address:string|null,sourceId:string}[]} offices
 * @property {{website:string|null,phones:{label:string,value:string,href:string}[],emails:string[],social:{type:string,url:string}[],sourceId:string}} contacts
 * @property {{claimedNames:string[],sponsorIds:string[],relationStatus:'agency_claim'|'confirmed'|'not_named',relationNote:string,officialRecordUrl:string|null}|null} usSponsor
 * @property {string[]} services
 * @property {{text:string,sourceId:string}[]} claims
 * @property {{label:string,amount:number,currency:string,season:string|null,included:string[],notIncluded:string[],sourceId:string,asOf:string,note?:string,stale?:boolean,closed?:boolean,prefix?:string}[]} publishedPrices
 * @property {AgencyVerificationStatus} verificationStatus
 * @property {string[]} sources
 * @property {string} lastVerifiedAt
 *
 * @typedef {Object} Plan
 * @property {'lite'|'classic'|'all-in'} id
 * @property {string} name
 * @property {number} price   стоимость за год в currency
 * @property {string} currency
 * @property {'year'} period
 * @property {string[]} features
 *
 * @typedef {Object} LeadInput
 * @property {string} name
 * @property {string} contact     телефон или email
 * @property {string} city
 * @property {string} planId
 * @property {string} [message]
 * @property {boolean} consent
 */
export {};
